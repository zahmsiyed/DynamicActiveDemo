"use client";

// This component owns browser-only APIs: microphone access, WebRTC, the OpenAI
// Realtime data channel, MediaRecorder, and the final recording upload.

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type RealtimeRecorderProps = {
  maxSizeLabel: string;
  observationId: string;
};

type RecorderState = "idle" | "starting" | "recording" | "uploading";

type RealtimeEventPayload = {
  delta?: string;
  error?: { message?: string };
  transcript?: string;
  type?: string;
};

const statusToneClasses = {
  error: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-brand-line bg-white text-brand-muted",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
} as const;

function createRecordingFile(chunks: Blob[]) {
  const rawMimeType = chunks[0]?.type || "audio/webm";
  const mimeType = rawMimeType.split(";")[0] || "audio/webm";
  const extension = mimeType.includes("mp4") ? "m4a" : "webm";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const blob = new Blob(chunks, { type: mimeType });

  return new File([blob], `live-classroom-recording-${timestamp}.${extension}`, {
    type: mimeType,
  });
}

function readRealtimeError(body: string) {
  try {
    const parsed = JSON.parse(body) as { error?: string };

    return parsed.error ?? "Live transcription could not start.";
  } catch {
    return body || "Live transcription could not start.";
  }
}

function chooseRecorderMimeType() {
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }

  if (MediaRecorder.isTypeSupported("audio/webm")) {
    return "audio/webm";
  }

  // Let the browser pick if WebM is not explicitly advertised.
  return "";
}

export function RealtimeRecorder({
  maxSizeLabel,
  observationId,
}: RealtimeRecorderProps) {
  const router = useRouter();
  const [completedTurns, setCompletedTurns] = useState<string[]>([]);
  const [currentDelta, setCurrentDelta] = useState("");
  const [message, setMessage] = useState(
    "Start a live observation to preview transcript deltas while also saving a final recording."
  );
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [statusTone, setStatusTone] =
    useState<keyof typeof statusToneClasses>("info");

  const chunksRef = useRef<Blob[]>([]);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function addCompletedTurn(transcript: string) {
    const trimmedTranscript = transcript.trim();

    if (!trimmedTranscript) return;

    setCompletedTurns((turns) => [...turns, trimmedTranscript]);
    setCurrentDelta("");
  }

  function handleRealtimeEvent(event: MessageEvent<string>) {
    let payload: RealtimeEventPayload;

    try {
      payload = JSON.parse(event.data) as RealtimeEventPayload;
    } catch {
      setStatusTone("error");
      setMessage("Realtime transcription returned an unreadable event.");
      return;
    }

    if (payload.type === "conversation.item.input_audio_transcription.delta") {
      setCurrentDelta((current) => `${current}${payload.delta ?? ""}`);
      return;
    }

    if (
      payload.type === "conversation.item.input_audio_transcription.completed"
    ) {
      addCompletedTurn(payload.transcript ?? "");
      return;
    }

    if (payload.type === "error") {
      setStatusTone("error");
      setMessage(payload.error?.message ?? "Realtime transcription returned an error.");
    }
  }

  function cleanupRealtimeResources() {
    dataChannelRef.current?.close();
    peerConnectionRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());

    dataChannelRef.current = null;
    mediaRecorderRef.current = null;
    peerConnectionRef.current = null;
    streamRef.current = null;
  }

  async function uploadFinalRecording(chunks: Blob[]) {
    if (!chunks.length) {
      setRecorderState("idle");
      setStatusTone("error");
      setMessage("No recording data was captured.");
      cleanupRealtimeResources();
      return;
    }

    setRecorderState("uploading");
    setStatusTone("info");
    setMessage("Uploading the final recording and generating the saved transcript...");

    const formData = new FormData();
    formData.set("file", createRecordingFile(chunks));

    const response = await fetch(`/api/observations/${observationId}/audio`, {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as {
      error?: string;
      fallbackReason?: string | null;
      source?: string;
    };

    if (!response.ok) {
      setRecorderState("idle");
      setStatusTone("error");
      setMessage(result.error ?? "Recording upload failed.");
      cleanupRealtimeResources();
      return;
    }

    setRecorderState("idle");
    setStatusTone("success");
    setMessage(
      result.source === "openai"
        ? "Recording uploaded and final OpenAI transcript saved."
        : "Recording uploaded and fallback transcript saved for the demo."
    );
    cleanupRealtimeResources();
    router.refresh();
  }

  async function connectRealtime(stream: MediaStream) {
    const peerConnection = new RTCPeerConnection();
    const dataChannel = peerConnection.createDataChannel("oai-events");

    peerConnectionRef.current = peerConnection;
    dataChannelRef.current = dataChannel;

    dataChannel.addEventListener("message", handleRealtimeEvent);
    dataChannel.addEventListener("open", () => {
      setStatusTone("success");
      setMessage("Live transcription connected. Speak normally, then stop to upload.");
    });
    dataChannel.addEventListener("close", () => {
      if (recorderState === "recording") {
        setStatusTone("info");
        setMessage("Realtime channel closed. Browser recording is still active.");
      }
    });

    stream.getAudioTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const response = await fetch(
      `/api/realtime/session?observationId=${encodeURIComponent(observationId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      }
    );
    const answerSdp = await response.text();

    if (!response.ok) {
      peerConnection.close();
      dataChannel.close();
      setStatusTone("error");
      setMessage(
        `${readRealtimeError(
          answerSdp
        )} The recorder will still upload final audio when stopped.`
      );
      return;
    }

    await peerConnection.setRemoteDescription({
      type: "answer",
      sdp: answerSdp,
    });
  }

  async function startRecording() {
    setRecorderState("starting");
    setStatusTone("info");
    setMessage("Requesting microphone access...");
    setCompletedTurns([]);
    setCurrentDelta("");
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = chooseRecorderMimeType();
      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      streamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });
      mediaRecorder.addEventListener("stop", () => {
        void uploadFinalRecording(chunksRef.current);
      });

      mediaRecorder.start();
      setRecorderState("recording");
      setMessage("Recording started. Connecting live transcription...");

      await connectRealtime(stream);
    } catch (error) {
      setRecorderState("idle");
      setStatusTone("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Microphone recording could not start."
      );
      cleanupRealtimeResources();
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      setRecorderState("uploading");
      setStatusTone("info");
      setMessage("Stopping the recorder...");
      mediaRecorderRef.current.stop();
      dataChannelRef.current?.close();
      peerConnectionRef.current?.close();
    }
  }

  const transcriptLines = [...completedTurns];

  if (currentDelta.trim()) {
    transcriptLines.push(currentDelta);
  }

  return (
    <section className="rounded-[1.5rem] border border-brand-line bg-brand-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-semibold text-brand-ink">
            Live classroom recording
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-muted">
            Use the browser microphone for a live transcript preview, then
            upload the final recording to the saved transcript workflow when the
            session ends. Final report transcripts still come from the
            server-side file transcription pass.
          </p>
        </div>

        <span className="w-fit rounded-full border border-brand-line bg-white px-3 py-1 text-xs font-semibold text-brand-coral-dark">
          Max upload {maxSizeLabel}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          className="rounded-full bg-brand-coral px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-coral-dark disabled:cursor-not-allowed disabled:opacity-60"
          disabled={recorderState !== "idle"}
          onClick={startRecording}
          type="button"
        >
          {recorderState === "starting" ? "Starting..." : "Start live recording"}
        </button>

        <button
          className="rounded-full border border-brand-line bg-white px-5 py-3 text-sm font-semibold text-brand-ink transition hover:border-brand-coral hover:text-brand-coral disabled:cursor-not-allowed disabled:opacity-60"
          disabled={recorderState !== "recording"}
          onClick={stopRecording}
          type="button"
        >
          {recorderState === "uploading" ? "Uploading..." : "Stop and upload"}
        </button>
      </div>

      <p
        className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${statusToneClasses[statusTone]}`}
      >
        {message}
      </p>

      <div className="mt-5 rounded-[1.25rem] border border-brand-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-brand-ink">
            Live transcript preview
          </h3>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-coral-dark">
            {transcriptLines.length} turns
          </span>
        </div>

        {transcriptLines.length ? (
          <div className="mt-4 space-y-3">
            {transcriptLines.map((line, index) => (
              <p
                className="rounded-2xl border border-brand-line bg-brand-soft px-4 py-3 text-sm leading-6 text-brand-ink"
                key={`${line}-${index}`}
              >
                {line}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-brand-muted">
            Transcript deltas will appear here when the Realtime data channel is
            connected. If Realtime is unavailable, the final uploaded recording
            can still create a saved transcript.
          </p>
        )}
      </div>
    </section>
  );
}
