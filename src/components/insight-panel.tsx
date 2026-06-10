// Phase 9 structured insight panel.
// Prisma JSON fields arrive as unknown data, so this component validates each
// section before rendering it on the report page.

import { type InsightIllustration, type Prisma } from "@prisma/client";

import { formatTranscriptTime } from "@/lib/transcripts";

type InsightPanelProps = {
  insight: {
    summary: string;
    metricsJson: Prisma.JsonValue;
    recommendations: Prisma.JsonValue;
    sentimentJson: Prisma.JsonValue;
    heatmapJson: Prisma.JsonValue;
    highlightsJson: Prisma.JsonValue;
    illustrationKey: InsightIllustration;
  } | null;
};

type Recommendation = {
  title: string;
  body: string;
  priority: string;
};

type HeatmapRow = {
  label: string;
  teacher: number;
  students: number;
};

type Highlight = {
  quote: string;
  reason: string;
  startMs: number;
};

function readRecord(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : null;
}

function readMetric(metrics: Prisma.JsonValue | null | undefined, key: string) {
  const record = readRecord(metrics);
  const value = record?.[key];

  return typeof value === "number" || typeof value === "string" ? value : null;
}

function readRecommendations(
  recommendations: Prisma.JsonValue | null | undefined
): Recommendation[] {
  if (!Array.isArray(recommendations)) return [];

  return recommendations
    .map((item) => {
      const record = readRecord(item);
      const title = record?.title;
      const body = record?.body;
      const priority = record?.priority;

      if (
        typeof title !== "string" ||
        typeof body !== "string" ||
        typeof priority !== "string"
      ) {
        return null;
      }

      return { title, body, priority };
    })
    .filter((item): item is Recommendation => Boolean(item));
}

function readHeatmap(heatmap: Prisma.JsonValue | null | undefined): HeatmapRow[] {
  if (!Array.isArray(heatmap)) return [];

  return heatmap
    .map((item) => {
      const record = readRecord(item);
      const label = record?.label;
      const teacher = record?.teacher;
      const students = record?.students;

      if (
        typeof label !== "string" ||
        typeof teacher !== "number" ||
        typeof students !== "number"
      ) {
        return null;
      }

      return { label, teacher, students };
    })
    .filter((item): item is HeatmapRow => Boolean(item));
}

function readHighlights(
  highlights: Prisma.JsonValue | null | undefined
): Highlight[] {
  if (!Array.isArray(highlights)) return [];

  return highlights
    .map((item) => {
      const record = readRecord(item);
      const quote = record?.quote;
      const reason = record?.reason;
      const startMs = record?.startMs;

      if (
        typeof quote !== "string" ||
        typeof reason !== "string" ||
        typeof startMs !== "number"
      ) {
        return null;
      }

      return { quote, reason, startMs };
    })
    .filter((item): item is Highlight => Boolean(item));
}

function readSentiment(sentiment: Prisma.JsonValue | null | undefined) {
  const record = readRecord(sentiment);

  return {
    confidence: readMetric(sentiment, "confidence"),
    correctionMoments: readMetric(sentiment, "correctionMoments"),
    overall: typeof record?.overall === "string" ? record.overall : "n/a",
    positiveMoments: readMetric(sentiment, "positiveMoments"),
  };
}

function metricRows(metrics: Prisma.JsonValue) {
  return [
    ["Student talk", readMetric(metrics, "studentTalkRatio"), "%"],
    ["Teacher talk", readMetric(metrics, "teacherTalkRatio"), "%"],
    ["Questions", readMetric(metrics, "questionCount"), ""],
    ["Pacing", readMetric(metrics, "pacingScore"), "/100"],
    ["Clarity", readMetric(metrics, "clarityScore"), "/100"],
    ["Reinforcement", readMetric(metrics, "positiveReinforcementCount"), ""],
  ];
}

export function InsightPanel({ insight }: InsightPanelProps) {
  if (!insight) {
    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <h2 className="font-semibold text-white">AI insight</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          No AI insight has been generated for this observation yet.
        </p>
      </section>
    );
  }

  const recommendations = readRecommendations(insight.recommendations);
  const heatmap = readHeatmap(insight.heatmapJson);
  const highlights = readHighlights(insight.highlightsJson);
  const sentiment = readSentiment(insight.sentimentJson);
  const pacingNotes = readMetric(insight.metricsJson, "pacingNotes");

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-white">AI insight</h2>
          <span className="w-fit rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
            {insight.illustrationKey}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-4">
        <p className="max-w-4xl text-sm leading-6 text-slate-300">
          {insight.summary}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {metricRows(insight.metricsJson).map(([label, value, suffix]) => (
            <div
              key={label?.toString()}
              className="rounded-md border border-white/10 bg-slate-900/70 p-3"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                {label}
              </p>
              <p className="mt-2 font-mono text-lg text-white">
                {value ?? "n/a"}
                {value !== null ? suffix : ""}
              </p>
            </div>
          ))}
        </div>

        {typeof pacingNotes === "string" ? (
          <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-100/70">
              Pacing note
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-50">{pacingNotes}</p>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <h3 className="text-sm font-semibold text-white">Recommendations</h3>
            <div className="mt-3 grid gap-3">
              {recommendations.length ? (
                recommendations.map((recommendation) => (
                  <article
                    key={recommendation.title}
                    className="rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-medium text-cyan-50">
                        {recommendation.title}
                      </h4>
                      <span className="rounded-full border border-cyan-300/30 px-2 py-0.5 text-xs uppercase text-cyan-100">
                        {recommendation.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-cyan-50/85">
                      {recommendation.body}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  Recommendations were not present in the stored insight.
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Sentiment</h3>
            <div className="mt-3 rounded-md border border-white/10 bg-slate-900/70 p-3 text-sm">
              <p className="font-medium capitalize text-white">
                {sentiment.overall}
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
                <div>
                  <dt>Positive</dt>
                  <dd className="mt-1 font-mono text-slate-100">
                    {sentiment.positiveMoments ?? "n/a"}
                  </dd>
                </div>
                <div>
                  <dt>Correction</dt>
                  <dd className="mt-1 font-mono text-slate-100">
                    {sentiment.correctionMoments ?? "n/a"}
                  </dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd className="mt-1 font-mono text-slate-100">
                    {sentiment.confidence ?? "n/a"}
                  </dd>
                </div>
              </dl>
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              Participation heatmap
            </h3>
            <div className="mt-3 space-y-3">
              {heatmap.map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>{row.label}</span>
                    <span>
                      T {row.teacher}% / S {row.students}%
                    </span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="bg-cyan-300"
                      style={{ width: `${Math.max(0, Math.min(100, row.teacher))}%` }}
                    />
                    <div
                      className="bg-lime-300"
                      style={{ width: `${Math.max(0, Math.min(100, row.students))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Transcript highlights</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {highlights.map((highlight) => (
              <article
                key={`${highlight.startMs}-${highlight.quote}`}
                className="rounded-md border border-white/10 bg-slate-900/70 p-3"
              >
                <p className="font-mono text-xs text-slate-500">
                  {formatTranscriptTime(highlight.startMs)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  &quot;{highlight.quote}&quot;
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {highlight.reason}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
