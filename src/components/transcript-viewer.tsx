// Phase 6 transcript viewer.
// This server component renders timestamped transcript segments and only uses a
// tiny client child when a school admin can create demo fallback data.

import { SpeakerType } from "@prisma/client";

import { TranscriptFallbackButton } from "@/components/transcript-fallback-button";
import {
  formatTranscriptRange,
  formatTranscriptTime,
  speakerTypeLabels,
  speakerTypeStyles,
  transcriptDurationMs,
} from "@/lib/transcripts";

type TranscriptSegmentView = {
  id: string;
  speakerLabel: string;
  speakerType: SpeakerType;
  text: string;
  startMs: number;
  endMs: number;
  confidence: number | null;
};

type TranscriptView = {
  provider: string;
  model: string;
  createdAt: Date;
  segments: TranscriptSegmentView[];
};

type TranscriptViewerProps = {
  observationId: string;
  canCreateFallback: boolean;
  transcription: TranscriptView | null;
};

// Convert confidence decimals into readable percentages.
function formatConfidence(confidence: number | null) {
  if (confidence === null) return "n/a";

  return `${Math.round(confidence * 100)}%`;
}

export function TranscriptViewer({
  observationId,
  canCreateFallback,
  transcription,
}: TranscriptViewerProps) {
  if (!transcription) {
    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <h2 className="font-semibold text-white">Transcript</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          No timestamped transcript is stored for this observation yet.
        </p>

        {canCreateFallback ? (
          <TranscriptFallbackButton observationId={observationId} />
        ) : null}
      </section>
    );
  }

  const durationMs = transcriptDurationMs(transcription.segments);
  const speakerCount = new Set(
    transcription.segments.map((segment) => segment.speakerLabel)
  ).size;

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="font-semibold text-white">Timestamped transcript</h2>
      </div>

      <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            Segments
          </p>
          <p className="mt-2 font-mono text-lg text-white">
            {transcription.segments.length}
          </p>
        </div>

        <div className="rounded-md border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            Duration
          </p>
          <p className="mt-2 font-mono text-lg text-white">
            {formatTranscriptTime(durationMs)}
          </p>
        </div>

        <div className="rounded-md border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            Speakers
          </p>
          <p className="mt-2 font-mono text-lg text-white">{speakerCount}</p>
        </div>

        <div className="rounded-md border border-white/10 bg-slate-900/70 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            Source
          </p>
          <p className="mt-2 truncate text-sm text-white">
            {transcription.provider}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {transcription.model}
          </p>
        </div>
      </div>

      <div className="divide-y divide-white/10">
        {transcription.segments.map((segment) => (
          <article
            className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[110px_180px_1fr_90px]"
            key={segment.id}
          >
            <p className="font-mono text-slate-400">
              {formatTranscriptRange(segment.startMs, segment.endMs)}
            </p>

            <div>
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${speakerTypeStyles[segment.speakerType]}`}
              >
                {speakerTypeLabels[segment.speakerType]}
              </span>
              <p className="mt-2 font-medium text-white">{segment.speakerLabel}</p>
            </div>

            <p className="leading-6 text-slate-200">{segment.text}</p>

            <p className="font-mono text-xs text-slate-500">
              {formatConfidence(segment.confidence)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
