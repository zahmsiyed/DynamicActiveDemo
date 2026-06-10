"use client";

// The report page is server-rendered, while this client component owns the
// click, loading state, API error, and brief source message after transcription.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type TranscribeButtonProps = {
  hasTranscript: boolean;
  observationId: string;
};

type TranscribeApiResponse = {
  error?: string;
  fallbackReason?: string | null;
  source?: "openai" | "fallback";
};

// Keep API implementation details out of the UI while still explaining why a
// fallback transcript may have been saved.
function readFallbackMessage(reason: string | null | undefined) {
  if (!reason) {
    return "Demo fallback transcript saved for this prototype run.";
  }

  if (reason === "missing_api_key") {
    return "Demo fallback transcript saved because OPENAI_API_KEY was not available to the server.";
  }

  if (reason === "stored_upload_unavailable") {
    return "Demo fallback transcript saved because the local upload file was not available.";
  }

  if (reason.startsWith("invalid_audio_file")) {
    return "Demo fallback transcript saved because the stored upload is not a valid audio or video file.";
  }

  if (reason.startsWith("openai_error")) {
    return "Demo fallback transcript saved because OpenAI could not process this recording.";
  }

  return "Demo fallback transcript saved.";
}

export function TranscribeButton({
  hasTranscript,
  observationId,
}: TranscribeButtonProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleTranscribe() {
    setError("");
    setMessage("");

    startTransition(async () => {
      const response = await fetch(
        `/api/observations/${observationId}/transcribe`,
        {
          method: "POST",
        }
      );
      const result = (await response.json()) as TranscribeApiResponse;

      if (!response.ok) {
        setError(result.error ?? "Transcript could not be generated.");
        return;
      }

      setMessage(
        result.source === "openai"
          ? "OpenAI diarized transcript saved."
          : readFallbackMessage(result.fallbackReason)
      );

      // Refresh reloads the server report so the stored transcript rows appear.
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      <button
        className="rounded-full bg-brand-coral px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-coral-dark disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={handleTranscribe}
        type="button"
      >
        {isPending
          ? "Generating transcript..."
          : hasTranscript
            ? "Regenerate final transcript"
            : "Generate final transcript"}
      </button>

      {message ? (
        <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
