// Formatting and scoped transcript reads. Generation is owned by the job worker.
import { SpeakerType } from "@prisma/client";
import { getDb } from "@/lib/db";
import { observationScope } from "@/lib/access";
import type { ObservationUser } from "@/lib/observations";
const transcriptInclude = {
  segments: { orderBy: { startMs: "asc" as const } },
};
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
export function transcriptDurationMs(segments: { endMs: number }[]) {
  return segments.reduce(
    (duration, segment) => Math.max(duration, segment.endMs),
    0,
  );
}

export async function getObservationTranscriptForUser(
  observationId: string,
  user: ObservationUser,
) {
  const observation = await getDb().observation.findFirst({
    where: {
      id: observationId,
      ...observationScope(user),
    },
    select: {
      id: true,
      title: true,
      status: true,
      teacherId: true,
      schoolId: true,
      districtId: true,
      transcription: {
        include: transcriptInclude,
      },
    },
  });

  if (!observation) {
    return null;
  }

  return observation;
}
