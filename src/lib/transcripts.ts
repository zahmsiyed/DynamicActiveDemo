// Phase 6 transcript helpers.
// The database tables already existed from Phase 2; this file gives the app a
// safe way to format, read, and create demo transcript records.

import {
  ObservationStatus,
  SpeakerType,
  type Prisma,
} from "@prisma/client";

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
  TEACHER: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
  STUDENT: "border-lime-300/30 bg-lime-300/10 text-lime-100",
  GROUP: "border-violet-300/30 bg-violet-300/10 text-violet-100",
  UNKNOWN: "border-slate-500/30 bg-slate-500/10 text-slate-200",
};

type FallbackTranscriptSegment = {
  speakerLabel: string;
  speakerType: SpeakerType;
  startMs: number;
  endMs: number;
  confidence: number;
  text: string;
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

// These fallback segments simulate the output we expect from diarized
// transcription later: each row has a speaker, start/end time, and text.
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
