// This server component turns stored insight data into a polished report surface
// with summary cards, charts, recommendation illustrations, and transcript
// evidence cards.

import { InsightIllustration } from "@prisma/client";

import {
  type InsightMetricView,
  type InsightRecommendationView,
  type InsightView,
} from "@/lib/insight-view";
import { formatTranscriptTime } from "@/lib/transcripts";

type InsightPanelProps = {
  insight: InsightView | null;
};

type MetricCard = {
  detail: string;
  label: string;
  tone: string;
  value: string;
};

const priorityStyles: Record<InsightRecommendationView["priority"], string> = {
  high: "border-rose-200 bg-rose-50 text-rose-700",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  unknown: "border-stone-200 bg-stone-50 text-stone-600",
};

const illustrationLabels: Record<InsightIllustration, string> = {
  CLARITY_STEPS: "Clarity steps",
  PACING_GAUGE: "Pacing gauge",
  PARTICIPATION_BALANCE: "Participation balance",
  PATIENCE_CLOCK: "Patience clock",
};

function formatOptionalNumber(value: number | null, suffix = "") {
  return value === null ? "n/a" : `${value}${suffix}`;
}

function formatConfidence(value: number | null) {
  if (value === null) return "n/a";

  return value <= 1 ? `${Math.round(value * 100)}%` : `${Math.round(value)}%`;
}

function buildMetricCards(metrics: InsightMetricView): MetricCard[] {
  return [
    {
      detail: "Student voice",
      label: "Student talk",
      tone: "border-emerald-200 bg-emerald-50",
      value: formatOptionalNumber(metrics.studentTalkRatio, "%"),
    },
    {
      detail: "Teacher voice",
      label: "Teacher talk",
      tone: "border-sky-200 bg-sky-50",
      value: formatOptionalNumber(metrics.teacherTalkRatio, "%"),
    },
    {
      detail: "Checks for thinking",
      label: "Questions",
      tone: "border-violet-200 bg-violet-50",
      value: formatOptionalNumber(metrics.questionCount),
    },
    {
      detail: "Lesson flow",
      label: "Pacing",
      tone: "border-amber-200 bg-amber-50",
      value: formatOptionalNumber(metrics.pacingScore, "/100"),
    },
  ];
}

function percentWidth(value: number | null) {
  return `${Math.max(0, Math.min(100, value ?? 0))}%`;
}

function recommendationNumber(index: number) {
  return (index + 1).toString().padStart(2, "0");
}

function readBalanceLabel(metrics: InsightMetricView) {
  const studentTalk = metrics.studentTalkRatio ?? 0;

  if (studentTalk >= 45) return "Balanced participation";
  if (studentTalk >= 30) return "Teacher-led with student entry points";
  return "Teacher-led discussion";
}

function InsightIllustrationGraphic({
  illustrationKey,
}: {
  illustrationKey: InsightIllustration;
}) {
  if (illustrationKey === InsightIllustration.PATIENCE_CLOCK) {
    return (
      <div className="relative h-28 w-28 rounded-full border border-brand-line bg-white">
        <div className="absolute inset-3 rounded-full border border-brand-line" />
        <div className="absolute left-1/2 top-1/2 h-10 w-0.5 origin-bottom -translate-x-1/2 -translate-y-full bg-brand-coral" />
        <div className="absolute left-1/2 top-1/2 h-7 w-0.5 origin-bottom -translate-x-1/2 -translate-y-full rotate-90 bg-brand-gold" />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-ink" />
      </div>
    );
  }

  if (illustrationKey === InsightIllustration.PARTICIPATION_BALANCE) {
    return (
      <div className="flex h-28 w-28 items-end justify-center gap-3 rounded-2xl border border-brand-line bg-white p-4">
        <div className="h-20 w-5 rounded-t bg-brand-coral" />
        <div className="h-14 w-5 rounded-t bg-brand-gold" />
        <div className="h-8 w-5 rounded-t bg-brand-rose" />
      </div>
    );
  }

  if (illustrationKey === InsightIllustration.CLARITY_STEPS) {
    return (
      <div className="grid h-28 w-28 grid-cols-3 items-end gap-2 rounded-2xl border border-brand-line bg-white p-4">
        {[36, 58, 82].map((height, index) => (
          <div
            className="flex items-center justify-center rounded-t bg-brand-coral text-xs font-semibold text-white"
            key={height}
            style={{ height: `${height}%` }}
          >
            {index + 1}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative h-28 w-28 rounded-2xl border border-brand-line bg-white p-4">
      <div className="absolute inset-x-4 bottom-5 h-12 rounded-t-full border-x border-t border-brand-gold" />
      <div className="absolute bottom-5 left-1/2 h-10 w-0.5 origin-bottom -translate-x-1/2 rotate-45 bg-brand-coral" />
      <div className="absolute bottom-4 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-brand-ink" />
    </div>
  );
}

function TalkBalanceChart({ metrics }: { metrics: InsightMetricView }) {
  const teacherTalk = metrics.teacherTalkRatio ?? 0;
  const studentTalk = metrics.studentTalkRatio ?? 0;

  return (
    <div className="rounded-[1.25rem] border border-brand-line bg-white p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-brand-ink">Talk balance</h3>
          <p className="mt-1 text-xs text-brand-muted">
            {readBalanceLabel(metrics)}
          </p>
        </div>
        <p className="font-mono text-xs text-brand-muted">
          T {teacherTalk}% / S {studentTalk}%
        </p>
      </div>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-brand-soft">
        <div
          className="bg-brand-coral"
          style={{ width: percentWidth(teacherTalk) }}
        />
        <div
          className="bg-brand-gold"
          style={{ width: percentWidth(studentTalk) }}
        />
      </div>

      <div className="mt-3 flex justify-between text-xs text-brand-muted">
        <span>Teacher</span>
        <span>Students</span>
      </div>
    </div>
  );
}

function ScoreBars({ metrics }: { metrics: InsightMetricView }) {
  const scoreRows = [
    ["Pacing", metrics.pacingScore, "bg-brand-gold"],
    ["Clarity", metrics.clarityScore, "bg-brand-coral"],
  ] as const;

  return (
    <div className="rounded-[1.25rem] border border-brand-line bg-white p-4">
      <h3 className="text-sm font-semibold text-brand-ink">Instructional scores</h3>
      <div className="mt-4 space-y-4">
        {scoreRows.map(([label, value, colorClass]) => (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-brand-muted">{label}</span>
              <span className="font-mono text-brand-ink">
                {formatOptionalNumber(value, "/100")}
              </span>
            </div>
            <div className="h-2 rounded-full bg-brand-soft">
              <div
                className={`h-2 rounded-full ${colorClass}`}
                style={{ width: percentWidth(value) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightPanel({ insight }: InsightPanelProps) {
  if (!insight) {
    return (
      <section className="rounded-[1.5rem] border border-brand-line bg-brand-card p-5 shadow-sm">
        <h2 className="font-semibold text-brand-ink">AI insight</h2>
        <p className="mt-3 text-sm leading-6 text-brand-muted">
          No AI insight has been generated for this observation yet.
        </p>
      </section>
    );
  }

  const metricCards = buildMetricCards(insight.metrics);

  return (
    <section className="rounded-[1.5rem] border border-brand-line bg-brand-card shadow-sm">
      <div className="border-b border-brand-line px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-brand-ink">AI insight</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-muted">
              {insight.summary}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <InsightIllustrationGraphic illustrationKey={insight.illustrationKey} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
                Coaching theme
              </p>
              <p className="mt-2 text-sm font-semibold text-brand-coral-dark">
                {illustrationLabels[insight.illustrationKey]}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metricCards.map((metric) => (
            <div
              className={`rounded-[1.25rem] border p-4 ${metric.tone}`}
              key={metric.label}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
                {metric.label}
              </p>
              <p className="mt-3 font-mono text-2xl text-brand-ink">
                {metric.value}
              </p>
              <p className="mt-1 text-xs text-brand-muted">{metric.detail}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TalkBalanceChart metrics={insight.metrics} />
          <ScoreBars metrics={insight.metrics} />
        </div>

        {insight.metrics.pacingNotes ? (
          <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              Pacing note
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {insight.metrics.pacingNotes}
            </p>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <h3 className="text-sm font-semibold text-brand-ink">
              Coaching recommendations
            </h3>
            <div className="mt-3 grid gap-3">
              {insight.recommendations.length ? (
                insight.recommendations.map((recommendation, index) => (
                  <article
                    className="rounded-[1.25rem] border border-brand-line bg-white p-4"
                    key={recommendation.title}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-coral font-mono text-xs font-semibold text-white">
                        {recommendationNumber(index)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <h4 className="font-semibold text-brand-ink">
                            {recommendation.title}
                          </h4>
                          <span
                            className={`w-fit rounded-full border px-2 py-0.5 text-xs uppercase ${priorityStyles[recommendation.priority]}`}
                          >
                            {recommendation.priority}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-brand-muted">
                          {recommendation.body}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-brand-muted">
                  Recommendations were not present in the stored insight.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.25rem] border border-brand-line bg-white p-4">
              <h3 className="text-sm font-semibold text-brand-ink">Sentiment</h3>
              <p className="mt-2 text-sm font-semibold capitalize text-brand-coral-dark">
                {insight.sentiment.overall}
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-xs text-brand-muted">
                <div>
                  <dt>Positive</dt>
                  <dd className="mt-1 font-mono text-brand-ink">
                    {formatOptionalNumber(insight.sentiment.positiveMoments)}
                  </dd>
                </div>
                <div>
                  <dt>Correction</dt>
                  <dd className="mt-1 font-mono text-brand-ink">
                    {formatOptionalNumber(insight.sentiment.correctionMoments)}
                  </dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd className="mt-1 font-mono text-brand-ink">
                    {formatConfidence(insight.sentiment.confidence)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-[1.25rem] border border-brand-line bg-white p-4">
              <h3 className="text-sm font-semibold text-brand-ink">
                Participation heatmap
              </h3>
              <div className="mt-4 space-y-4">
                {insight.heatmap.map((row) => (
                  <div key={row.label}>
                    <div className="mb-1 flex justify-between text-xs text-brand-muted">
                      <span>{row.label}</span>
                      <span>
                        T {row.teacher}% / S {row.students}%
                      </span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-brand-soft">
                      <div
                        className="bg-brand-coral"
                        style={{ width: percentWidth(row.teacher) }}
                      />
                      <div
                        className="bg-brand-gold"
                        style={{ width: percentWidth(row.students) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-brand-ink">
            Highlighted transcript evidence
          </h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {insight.highlights.map((highlight) => (
              <article
                className="rounded-[1.25rem] border border-brand-coral/20 bg-brand-soft p-4"
                key={`${highlight.startMs}-${highlight.quote}`}
              >
                <p className="font-mono text-xs text-brand-coral-dark">
                  {formatTranscriptTime(highlight.startMs)}
                </p>
                <p className="mt-2 text-sm leading-6 text-brand-ink">
                  &quot;{highlight.quote}&quot;
                </p>
                <p className="mt-2 text-xs leading-5 text-brand-muted">
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
