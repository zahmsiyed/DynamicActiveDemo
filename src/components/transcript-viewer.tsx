// Phase 6 and Phase 10 transcript viewer.
// This server component renders timestamped transcript segments, keeps the
// Phase 6 fallback button available, and marks Phase 10 AI evidence rows.

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
  highlightedStartMs?: number[];
  transcription: TranscriptView | null;
};

// Convert confidence decimals into readable percentages.
function formatConfidence(confidence: number | null) {
  if (confidence === null) return "n/a";

  return `${Math.round(confidence * 100)}%`;
}

// AI highlights often point to a segment start time. The small tolerance covers
// generated values that land just inside the speaker turn.
function isHighlightedSegment(
  segment: Pick<TranscriptSegmentView, "endMs" | "startMs">,
  highlightedStartMs: number[]
) {
  return highlightedStartMs.some(
    (startMs) => startMs >= segment.startMs - 500 && startMs <= segment.endMs + 500
  );
}

export function TranscriptViewer({
  observationId,
  canCreateFallback,
  highlightedStartMs = [],
  transcription,
}: TranscriptViewerProps) {
  if (!transcription) {
    return (
      <section className="rounded-[1.5rem] border border-brand-line bg-brand-card p-5 shadow-sm">
        <h2 className="font-semibold text-brand-ink">Transcript</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-muted">
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
    <section className="rounded-[1.5rem] border border-brand-line bg-brand-card shadow-sm">
      <div className="border-b border-brand-line px-5 py-4">
        <h2 className="font-semibold text-brand-ink">Timestamped transcript</h2>
      </div>

      <div className="grid gap-3 border-b border-brand-line p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[1.25rem] border border-brand-line bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
            Segments
          </p>
          <p className="mt-2 font-mono text-lg text-brand-ink">
            {transcription.segments.length}
          </p>
        </div>

        <div className="rounded-[1.25rem] border border-brand-line bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
            Duration
          </p>
          <p className="mt-2 font-mono text-lg text-brand-ink">
            {formatTranscriptTime(durationMs)}
          </p>
        </div>

        <div className="rounded-[1.25rem] border border-brand-line bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
            Speakers
          </p>
          <p className="mt-2 font-mono text-lg text-brand-ink">{speakerCount}</p>
        </div>

        <div className="rounded-[1.25rem] border border-brand-line bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
            Source
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-brand-ink">
            {transcription.provider}
          </p>
          <p className="mt-1 truncate text-xs text-brand-muted">
            {transcription.model}
          </p>
        </div>
      </div>

      <div className="divide-y divide-brand-line">
        {transcription.segments.map((segment) => {
          const isHighlighted = isHighlightedSegment(segment, highlightedStartMs);

          return (
            <article
              className={`grid gap-3 px-4 py-4 text-sm lg:grid-cols-[110px_180px_1fr_120px] ${
                isHighlighted ? "bg-brand-soft" : ""
              }`}
              key={segment.id}
            >
              <p className="font-mono text-brand-muted">
                {formatTranscriptRange(segment.startMs, segment.endMs)}
              </p>

              <div>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${speakerTypeStyles[segment.speakerType]}`}
                >
                  {speakerTypeLabels[segment.speakerType]}
                </span>
                <p className="mt-2 font-semibold text-brand-ink">
                  {segment.speakerLabel}
                </p>
              </div>

              <p className="leading-6 text-brand-ink">{segment.text}</p>

              <div className="space-y-2">
                {isHighlighted ? (
                  <span className="inline-flex rounded-full border border-brand-coral/20 bg-white px-2 py-0.5 text-xs font-semibold text-brand-coral-dark">
                    Insight highlight
                  </span>
                ) : null}
                <p className="font-mono text-xs text-brand-muted">
                  {formatConfidence(segment.confidence)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
