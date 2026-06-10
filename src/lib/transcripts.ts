// Phase 6 and Phase 8 transcript helpers.
// The database tables already existed from Phase 2; this file gives the app a
// safe way to format, read, create, and generate transcript records.

import { readFile } from "fs/promises";
import path from "path";

import {
  ObservationStatus,
  SpeakerType,
  type AudioUpload,
  type Prisma,
} from "@prisma/client";

import { hasExpectedAudioContainerSignature } from "@/lib/audio-uploads";
import { getDb } from "@/lib/db";
import { canViewObservation, type ObservationUser } from "@/lib/observations";

// Every transcript query should return segments in classroom-time order.
export const transcriptInclude = {
  segments: {
    orderBy: {
      startMs: "asc",
    },
  },
} satisfies Prisma.TranscriptionInclude;

// Prisma result type for a transcript with ordered timestamp segments.
export type TranscriptWithSegments = Prisma.TranscriptionGetPayload<{
  include: typeof transcriptInclude;
}>;

// Speaker labels keep raw enum values out of the UI.
export const speakerTypeLabels: Record<SpeakerType, string> = {
  TEACHER: "Teacher",
  STUDENT: "Student",
  GROUP: "Group",
  UNKNOWN: "Unknown",
};

// Speaker styles make teacher/student turns easy to scan in the transcript.
export const speakerTypeStyles: Record<SpeakerType, string> = {
  TEACHER: "border-sky-200 bg-sky-50 text-sky-700",
  STUDENT: "border-emerald-200 bg-emerald-50 text-emerald-700",
  GROUP: "border-violet-200 bg-violet-50 text-violet-700",
  UNKNOWN: "border-stone-200 bg-stone-50 text-stone-600",
};

type FallbackTranscriptSegment = {
  speakerLabel: string;
  speakerType: SpeakerType;
  startMs: number;
  endMs: number;
  confidence: number;
  text: string;
};

type TranscriptSegmentInput = {
  speakerLabel: string;
  speakerType: SpeakerType;
  startMs: number;
  endMs: number;
  confidence: number | null;
  text: string;
};

type OpenAiDiarizedSegment = {
  speaker?: unknown;
  speaker_label?: unknown;
  start?: unknown;
  end?: unknown;
  text?: unknown;
  confidence?: unknown;
};

type OpenAiDiarizedResponse = {
  text?: unknown;
  segments?: unknown;
};

// Format milliseconds as m:ss so timestamps are readable in a lesson transcript.
export function formatTranscriptTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Format one transcript segment's time range.
export function formatTranscriptRange(startMs: number, endMs: number) {
  return `${formatTranscriptTime(startMs)}-${formatTranscriptTime(endMs)}`;
}

// The transcript duration is the end time of the final segment.
export function transcriptDurationMs(
  segments: Pick<FallbackTranscriptSegment, "endMs">[]
) {
  return segments.reduce((duration, segment) => Math.max(duration, segment.endMs), 0);
}

// These fallback segments mirror diarized transcription output: each row has a
// speaker, start/end time, and text.
export function buildFallbackTranscriptSegments(): FallbackTranscriptSegment[] {
  return [
    {
      speakerLabel: "Teacher",
      speakerType: SpeakerType.TEACHER,
      startMs: 0,
      endMs: 7200,
      confidence: 0.93,
      text: "Before we solve, what do you notice about the problem?",
    },
    {
      speakerLabel: "Student 1",
      speakerType: SpeakerType.STUDENT,
      startMs: 7600,
      endMs: 11800,
      confidence: 0.88,
      text: "There are two steps because we need to compare both groups.",
    },
    {
      speakerLabel: "Teacher",
      speakerType: SpeakerType.TEACHER,
      startMs: 12400,
      endMs: 19700,
      confidence: 0.91,
      text: "Say more about the comparison. What evidence helped you decide?",
    },
    {
      speakerLabel: "Student 2",
      speakerType: SpeakerType.STUDENT,
      startMs: 20400,
      endMs: 26200,
      confidence: 0.87,
      text: "The table shows the first group changed faster at the beginning.",
    },
    {
      speakerLabel: "Group",
      speakerType: SpeakerType.GROUP,
      startMs: 27000,
      endMs: 35200,
      confidence: 0.82,
      text: "Students discuss in pairs and point back to their notes.",
    },
    {
      speakerLabel: "Teacher",
      speakerType: SpeakerType.TEACHER,
      startMs: 36000,
      endMs: 45800,
      confidence: 0.9,
      text: "I heard several teams using evidence. Let's connect those ideas to our claim.",
    },
  ];
}

// Store a plain text transcript alongside the timestamped segment rows.
export function buildFallbackTranscriptText(segments: FallbackTranscriptSegment[]) {
  return segments
    .map((segment) => `${segment.speakerLabel}: ${segment.text}`)
    .join("\n");
}

// Convert one segment list into the plain transcript text stored in Prisma.
function buildTranscriptText(segments: TranscriptSegmentInput[]) {
  return segments
    .map((segment) => `${segment.speakerLabel}: ${segment.text}`)
    .join("\n");
}

// Real diarization labels are model-generated, so we infer only the labels that
// the rest of the prototype knows how to style.
function inferSpeakerType(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("teacher")) return SpeakerType.TEACHER;
  if (normalized.includes("student")) return SpeakerType.STUDENT;
  if (normalized.includes("group") || normalized.includes("class")) {
    return SpeakerType.GROUP;
  }

  return SpeakerType.UNKNOWN;
}

// Convert OpenAI seconds into database milliseconds.
function secondsToMs(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value * 1000))
    : 0;
}

// The diarized response is external data, so validate every field before
// storing it.
function parseOpenAiDiarizedSegments(
  response: OpenAiDiarizedResponse
): TranscriptSegmentInput[] {
  if (!Array.isArray(response.segments)) return [];

  return response.segments
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const segment = item as OpenAiDiarizedSegment;
      const rawLabel = segment.speaker ?? segment.speaker_label;
      const speakerLabel =
        typeof rawLabel === "string" && rawLabel.trim()
          ? rawLabel.trim()
          : `Speaker ${index + 1}`;
      const text = typeof segment.text === "string" ? segment.text.trim() : "";
      const confidence =
        typeof segment.confidence === "number" ? segment.confidence : null;

      if (!text) return null;

      return {
        speakerLabel,
        speakerType: inferSpeakerType(speakerLabel),
        startMs: secondsToMs(segment.start),
        endMs: secondsToMs(segment.end),
        confidence,
        text,
      };
    })
    .filter((segment): segment is TranscriptSegmentInput => Boolean(segment));
}

// Store a transcript by replacing any previous generated transcript rows.
async function replaceObservationTranscript({
  model,
  observationId,
  provider,
  segments,
  text,
}: {
  model: string;
  observationId: string;
  provider: string;
  segments: TranscriptSegmentInput[];
  text: string;
}) {
  const db = getDb();

  await db.transcription.deleteMany({
    where: {
      observationId,
    },
  });

  return db.transcription.create({
    data: {
      observationId,
      provider,
      model,
      text,
      segments: {
        create: segments.map((segment) => ({
          speakerLabel: segment.speakerLabel,
          speakerType: segment.speakerType,
          startMs: segment.startMs,
          endMs: segment.endMs,
          confidence: segment.confidence,
          text: segment.text,
        })),
      },
    },
    include: transcriptInclude,
  });
}

// Resolve local upload paths without allowing arbitrary file reads.
function resolveStoredUploadPath(storagePath: string | null) {
  if (!storagePath) return null;

  const uploadRoot = path.resolve(process.cwd(), ".uploads");
  const filePath = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    storagePath
  );

  if (filePath !== uploadRoot && !filePath.startsWith(`${uploadRoot}${path.sep}`)) {
    return null;
  }

  return filePath;
}

// Route handlers can use this when OPENAI_API_KEY is absent or a real
// transcription attempt fails.
export async function createFallbackTranscriptFromUpload(
  observationId: string,
  status: ObservationStatus,
  scheduledAt: Date | null,
  observedAt: Date | null
) {
  const segments = buildFallbackTranscriptSegments();
  const segmentInputs = segments.map((segment) => ({
    ...segment,
    confidence: segment.confidence,
  }));
  const transcript = await replaceObservationTranscript({
    observationId,
    provider: "demo-fallback",
    model: "phase-8-fallback-transcript",
    text: buildFallbackTranscriptText(segments),
    segments: segmentInputs,
  });

  const shouldKeepCurrentStatus =
    status === ObservationStatus.FINALIZED || status === ObservationStatus.ANALYZED;

  await getDb().observation.update({
    where: {
      id: observationId,
    },
    data: {
      status: shouldKeepCurrentStatus ? status : ObservationStatus.TRANSCRIBED,
      observedAt: observedAt ?? scheduledAt ?? new Date(),
    },
    select: {
      id: true,
    },
  });

  return transcript;
}

// Keep observation status updates consistent for real and fallback transcripts.
async function markObservationTranscribed(
  observationId: string,
  status: ObservationStatus,
  scheduledAt: Date | null,
  observedAt: Date | null
) {
  const shouldKeepCurrentStatus =
    status === ObservationStatus.FINALIZED || status === ObservationStatus.ANALYZED;

  await getDb().observation.update({
    where: {
      id: observationId,
    },
    data: {
      status: shouldKeepCurrentStatus ? status : ObservationStatus.TRANSCRIBED,
      observedAt: observedAt ?? scheduledAt ?? new Date(),
    },
    select: {
      id: true,
    },
  });
}

// Use the OpenAI Transcription API with diarization when a key and upload file
// are available. This function returns null if the API is intentionally skipped.
export async function transcribeUploadWithOpenAi({
  apiKey,
  audioUpload,
  observationId,
}: {
  apiKey: string | undefined;
  audioUpload: Pick<AudioUpload, "fileName" | "mimeType" | "storagePath">;
  observationId: string;
}) {
  if (!apiKey) return null;

  const filePath = resolveStoredUploadPath(audioUpload.storagePath);

  if (!filePath) return null;

  const fileBytes = await readFile(filePath);

  if (
    !hasExpectedAudioContainerSignature(
      Buffer.from(fileBytes),
      audioUpload.mimeType
    )
  ) {
    throw new Error(
      "invalid_audio_file: Stored upload does not match a supported audio or video container."
    );
  }

  const formData = new FormData();
  const file = new File([new Uint8Array(fileBytes)], audioUpload.fileName, {
    type: audioUpload.mimeType,
  });

  formData.append("file", file);
  formData.append("model", "gpt-4o-transcribe-diarize");
  formData.append("response_format", "diarized_json");
  formData.append("chunking_strategy", "auto");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI transcription failed with ${response.status}: ${errorText.slice(
        0,
        240
      )}`
    );
  }

  const transcription = (await response.json()) as OpenAiDiarizedResponse;
  const segments = parseOpenAiDiarizedSegments(transcription);
  const text =
    typeof transcription.text === "string" && transcription.text.trim()
      ? transcription.text.trim()
      : buildTranscriptText(segments);

  if (!segments.length || !text) {
    throw new Error("OpenAI transcription returned no usable transcript segments.");
  }

  return replaceObservationTranscript({
    observationId,
    provider: "openai",
    model: "gpt-4o-transcribe-diarize",
    text,
    segments,
  });
}

// Generate the final transcript for one uploaded recording. If there is no
// OPENAI_API_KEY, or the real API call cannot produce usable segments, the app
// stores the deterministic fallback transcript so demos remain reliable.
export async function generateTranscriptForObservation(
  observationId: string,
  user: ObservationUser
) {
  if (user.role !== "SCHOOL_ADMIN" || !user.schoolId || !user.districtId) {
    return {
      error: "Only school admins can generate transcripts in Phase 8.",
      status: 403,
    };
  }

  const observation = await getDb().observation.findUnique({
    where: {
      id: observationId,
    },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      observedAt: true,
      teacherId: true,
      schoolId: true,
      districtId: true,
      audioUpload: true,
    },
  });

  if (
    !observation ||
    observation.schoolId !== user.schoolId ||
    observation.districtId !== user.districtId
  ) {
    return { error: "Observation not found.", status: 404 };
  }

  if (!observation.audioUpload) {
    return {
      error: "Upload a classroom recording before generating a transcript.",
      status: 400,
    };
  }

  let transcript: TranscriptWithSegments | null = null;
  let source: "openai" | "fallback" = "fallback";
  let fallbackReason = process.env.OPENAI_API_KEY ? "" : "missing_api_key";

  try {
    transcript = await transcribeUploadWithOpenAi({
      apiKey: process.env.OPENAI_API_KEY,
      audioUpload: observation.audioUpload,
      observationId: observation.id,
    });

    if (transcript) {
      source = "openai";
      await markObservationTranscribed(
        observation.id,
        observation.status,
        observation.scheduledAt,
        observation.observedAt
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("invalid_audio_file")) {
      fallbackReason = error.message;
    } else {
      fallbackReason =
        error instanceof Error ? `openai_error: ${error.message}` : "openai_error";
    }
  }

  if (!transcript && !fallbackReason) {
    fallbackReason = "stored_upload_unavailable";
  }

  if (!transcript) {
    transcript = await createFallbackTranscriptFromUpload(
      observation.id,
      observation.status,
      observation.scheduledAt,
      observation.observedAt
    );
  }

  return {
    source,
    fallbackReason,
    status: source === "openai" ? 201 : 200,
    transcript,
  };
}

// Load the transcript for one observation only after applying the same
// district/school/teacher visibility rules as the report page.
export async function getObservationTranscriptForUser(
  observationId: string,
  user: ObservationUser
) {
  const observation = await getDb().observation.findUnique({
    where: {
      id: observationId,
    },
    select: {
      id: true,
      title: true,
      teacherId: true,
      schoolId: true,
      districtId: true,
      transcription: {
        include: transcriptInclude,
      },
    },
  });

  if (!observation || !canViewObservation(user, observation)) {
    return null;
  }

  return observation;
}

// Create a demo transcript for a school admin's observation when no audio upload
// or real transcription exists yet. This keeps Phase 6 testable on its own.
export async function createFallbackTranscriptForObservation(
  observationId: string,
  user: ObservationUser
) {
  if (user.role !== "SCHOOL_ADMIN" || !user.schoolId || !user.districtId) {
    return {
      error: "Only school admins can create fallback transcripts in Phase 6.",
      status: 403,
    };
  }

  const db = getDb();
  const observation = await db.observation.findUnique({
    where: {
      id: observationId,
    },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      observedAt: true,
      teacherId: true,
      schoolId: true,
      districtId: true,
      transcription: {
        include: transcriptInclude,
      },
    },
  });

  if (
    !observation ||
    observation.schoolId !== user.schoolId ||
    observation.districtId !== user.districtId
  ) {
    return { error: "Observation not found.", status: 404 };
  }

  if (observation.transcription) {
    return {
      created: false,
      status: 200,
      transcript: observation.transcription,
    };
  }

  const segments = buildFallbackTranscriptSegments();
  const text = buildFallbackTranscriptText(segments);
  const shouldKeepCurrentStatus =
    observation.status === ObservationStatus.FINALIZED ||
    observation.status === ObservationStatus.ANALYZED;

  const [transcript] = await db.$transaction([
    db.transcription.create({
      data: {
        observationId: observation.id,
        provider: "demo-fallback",
        model: "phase-6-seeded-transcript",
        text,
        segments: {
          create: segments.map((segment) => ({
            speakerLabel: segment.speakerLabel,
            speakerType: segment.speakerType,
            startMs: segment.startMs,
            endMs: segment.endMs,
            confidence: segment.confidence,
            text: segment.text,
          })),
        },
      },
      include: transcriptInclude,
    }),
    db.observation.update({
      where: {
        id: observation.id,
      },
      data: {
        status: shouldKeepCurrentStatus
          ? observation.status
          : ObservationStatus.TRANSCRIBED,
        observedAt:
          observation.observedAt ?? observation.scheduledAt ?? new Date(),
      },
      select: {
        id: true,
      },
    }),
  ]);

  return {
    created: true,
    status: 201,
    transcript,
  };
}
