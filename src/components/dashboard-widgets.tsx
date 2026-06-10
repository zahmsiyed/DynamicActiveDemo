// Shared Phase 4 dashboard widgets.
// These are intentionally simple server components: they receive prepared data
// and render it without fetching or mutating anything.

import Link from "next/link";

import {
  statusLabels,
  statusStyles,
  type DashboardObservation,
} from "@/lib/dashboard-data";

type Metric = {
  label: string;
  value: string;
  detail: string;
};

type StatusCount = {
  label: string;
  count: number;
};

const metricAccentClasses = [
  "from-brand-coral to-brand-peach",
  "from-brand-peach to-brand-gold",
  "from-brand-rose to-brand-coral",
  "from-sky-400 to-cyan-300",
  "from-emerald-400 to-lime-300",
  "from-violet-400 to-brand-rose",
];

const panelClass =
  "rounded-[1.5rem] border border-brand-line bg-brand-card shadow-sm";

function SignalPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={
        active
          ? "rounded-full border border-brand-coral/20 bg-brand-soft px-2.5 py-1 text-brand-coral-dark"
          : "rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-stone-500"
      }
    >
      {label}
    </span>
  );
}

// MetricGrid is used at the top of every dashboard for fast scanning.
export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className="rounded-[1.35rem] border border-brand-line bg-brand-card p-4 shadow-sm"
        >
          <div
            className={`h-1.5 w-12 rounded-full bg-gradient-to-r ${
              metricAccentClasses[index % metricAccentClasses.length]
            }`}
          />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
            {metric.label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-brand-ink">
            {metric.value}
          </p>
          <p className="mt-1 text-xs leading-5 text-brand-muted">{metric.detail}</p>
        </div>
      ))}
    </section>
  );
}

// StatusBadge converts the raw observation status into a readable colored pill.
export function StatusBadge({ status }: { status: DashboardObservation["status"] }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

// ObservationTable is shared across all dashboards because every role needs a
// slightly different view of the same observation records.
export function ObservationTable({
  observations,
  title,
  emptyMessage,
}: {
  observations: DashboardObservation[];
  title: string;
  emptyMessage: string;
}) {
  return (
    <section className={panelClass}>
      <div className="border-b border-brand-line px-5 py-4">
        <h2 className="font-semibold text-brand-ink">{title}</h2>
      </div>

      {observations.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-brand-soft/60 text-xs uppercase tracking-[0.16em] text-brand-muted">
              <tr className="border-b border-brand-line">
                <th className="px-4 py-3 font-medium">Observation</th>
                <th className="px-4 py-3 font-medium">Teacher</th>
                <th className="px-4 py-3 font-medium">School</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Signals</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Report</th>
              </tr>
            </thead>
            <tbody>
              {observations.map((observation) => (
                <tr
                  key={observation.id}
                  className="border-b border-brand-line/70 transition hover:bg-brand-soft/45"
                >
                  <td className="px-4 py-4">
                    <Link
                      className="font-semibold text-brand-ink transition hover:text-brand-coral"
                      href={`/observations/${observation.id}`}
                    >
                      {observation.title}
                    </Link>
                    <p className="mt-1 text-xs text-brand-muted">
                      {observation.subject} | Grade {observation.gradeLevel} |
                      Scheduled {observation.scheduledDate}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-brand-ink">
                    {observation.teacherName}
                  </td>
                  <td className="px-4 py-4 text-brand-muted">
                    {observation.schoolName}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={observation.status} />
                  </td>
                  <td className="px-4 py-4 font-mono text-brand-ink">
                    {observation.averageScore.toFixed(1)}
                  </td>
                  <td className="px-4 py-4 text-xs">
                    <div className="flex flex-wrap gap-1.5">
                      <SignalPill active={observation.hasAudio} label="Audio" />
                      <SignalPill
                        active={observation.hasTranscript}
                        label="Transcript"
                      />
                      <SignalPill active={observation.hasInsight} label="Insight" />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-brand-muted">
                    {observation.updatedDate}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      className="rounded-full border border-brand-coral bg-brand-coral px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-coral-dark"
                      href={`/observations/${observation.id}`}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-brand-muted">{emptyMessage}</p>
      )}
    </section>
  );
}

// StatusSummary renders a compact operational view of the observation pipeline.
export function StatusSummary({ counts }: { counts: StatusCount[] }) {
  const total = counts.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className={`${panelClass} p-5`}>
      <h2 className="font-semibold text-brand-ink">Observation status tracking</h2>
      <p className="mt-2 text-sm leading-6 text-brand-muted">
        A quick read on where reports sit in the coaching workflow.
      </p>
      <div className="mt-5 space-y-4">
        {counts.map((item) => {
          const percent = total ? Math.round((item.count / total) * 100) : 0;

          return (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-brand-ink">{item.label}</span>
                <span className="font-mono text-brand-muted">{item.count}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-brand-soft">
                <div
                  className="h-2 rounded-full bg-brand-coral"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// SchoolRows gives district admins a school-by-school scan.
export function SchoolRows({
  schools,
}: {
  schools: {
    id: string;
    name: string;
    teachers: number;
    admins: number;
    observations: number;
  }[];
}) {
  return (
    <section className={panelClass}>
      <div className="border-b border-brand-line px-5 py-4">
        <h2 className="font-semibold text-brand-ink">Schools in district</h2>
      </div>
      <div className="divide-y divide-brand-line">
        {schools.map((school) => (
          <div
            key={school.id}
            className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <p className="font-semibold text-brand-ink">{school.name}</p>
            <p className="text-brand-muted">{school.teachers} teachers</p>
            <p className="text-brand-muted">{school.admins} admins</p>
            <p className="text-brand-muted">{school.observations} observations</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// TeacherRows gives school admins a teacher-by-teacher scan.
export function TeacherRows({
  teachers,
}: {
  teachers: {
    id: string;
    name: string;
    title: string;
    observations: number;
    averageScore: number;
    latestStatus: string;
  }[];
}) {
  return (
    <section className={panelClass}>
      <div className="border-b border-brand-line px-5 py-4">
        <h2 className="font-semibold text-brand-ink">
          Teacher performance snapshot
        </h2>
      </div>
      <div className="divide-y divide-brand-line">
        {teachers.map((teacher) => (
          <div
            key={teacher.id}
            className="grid gap-3 px-5 py-4 text-sm md:grid-cols-[1fr_auto_auto_auto]"
          >
            <div>
              <p className="font-semibold text-brand-ink">{teacher.name}</p>
              <p className="mt-1 text-xs text-brand-muted">{teacher.title}</p>
            </div>
            <p className="text-brand-muted">{teacher.observations} observations</p>
            <p className="font-mono text-brand-ink">
              {teacher.averageScore.toFixed(1)} avg
            </p>
            <p className="text-brand-muted">{teacher.latestStatus}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// RecommendationList shows teacher-facing AI recommendations from the seeded insight.
export function RecommendationList({
  recommendations,
}: {
  recommendations: { title: string; body: string; priority: string }[];
}) {
  return (
    <section className={`${panelClass} p-5`}>
      <h2 className="font-semibold text-brand-ink">AI-generated recommendations</h2>
      <div className="mt-4 space-y-3">
        {recommendations.length ? (
          recommendations.map((recommendation) => (
            <article
              key={recommendation.title}
              className="rounded-2xl border border-brand-line bg-brand-soft p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-brand-ink">
                  {recommendation.title}
                </h3>
                <span className="rounded-full border border-brand-coral/25 bg-white px-2 py-0.5 text-xs font-semibold uppercase text-brand-coral-dark">
                  {recommendation.priority}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-brand-muted">
                {recommendation.body}
              </p>
            </article>
          ))
        ) : (
          <p className="text-sm text-brand-muted">
            Recommendations will appear after an observation has AI insights.
          </p>
        )}
      </div>
    </section>
  );
}

// FeedbackList gives teachers a chronological scan of administrator feedback.
export function FeedbackList({
  feedback,
}: {
  feedback: {
    id: string;
    observationTitle: string;
    body: string;
    createdDate: string;
  }[];
}) {
  return (
    <section className={`${panelClass} p-5`}>
      <h2 className="font-semibold text-brand-ink">Feedback history</h2>
      <div className="mt-4 space-y-3">
        {feedback.length ? (
          feedback.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-brand-line bg-white p-4"
            >
              <p className="text-sm font-semibold text-brand-ink">
                {item.observationTitle}
              </p>
              <p className="mt-1 text-xs text-brand-muted">{item.createdDate}</p>
              <p className="mt-2 text-sm leading-6 text-brand-muted">
                {item.body}
              </p>
            </article>
          ))
        ) : (
          <p className="text-sm text-brand-muted">
            Feedback will appear here after an administrator leaves notes.
          </p>
        )}
      </div>
    </section>
  );
}
