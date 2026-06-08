// Shared Phase 4 dashboard widgets.
// These are intentionally simple server components: they receive prepared data
// and render it without fetching or mutating anything.

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

// MetricGrid is used at the top of every dashboard for fast scanning.
export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
        >
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            {metric.label}
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
          <p className="mt-1 text-xs text-slate-400">{metric.detail}</p>
        </div>
      ))}
    </section>
  );
}

// StatusBadge converts the raw observation status into a readable colored pill.
export function StatusBadge({ status }: { status: DashboardObservation["status"] }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}
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
    <section className="rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="font-semibold text-white">{title}</h2>
      </div>

      {observations.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 font-medium">Observation</th>
                <th className="px-4 py-3 font-medium">Teacher</th>
                <th className="px-4 py-3 font-medium">School</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Signals</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {observations.map((observation) => (
                <tr key={observation.id} className="border-b border-white/5">
                  <td className="px-4 py-4">
                    <p className="font-medium text-white">{observation.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {observation.subject} | Grade {observation.gradeLevel} |
                      Scheduled {observation.scheduledDate}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-slate-200">
                    {observation.teacherName}
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    {observation.schoolName}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={observation.status} />
                  </td>
                  <td className="px-4 py-4 font-mono text-slate-100">
                    {observation.averageScore.toFixed(1)}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-300">
                    <span>{observation.hasAudio ? "Audio" : "No audio"}</span>
                    <span className="mx-2 text-slate-600">/</span>
                    <span>
                      {observation.hasTranscript ? "Transcript" : "No transcript"}
                    </span>
                    <span className="mx-2 text-slate-600">/</span>
                    <span>{observation.hasInsight ? "Insight" : "No insight"}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-400">
                    {observation.updatedDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-6 text-sm text-slate-400">{emptyMessage}</p>
      )}
    </section>
  );
}

// StatusSummary renders a compact operational view of the observation pipeline.
export function StatusSummary({ counts }: { counts: StatusCount[] }) {
  const total = counts.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h2 className="font-semibold text-white">Observation status tracking</h2>
      <div className="mt-4 space-y-3">
        {counts.map((item) => {
          const percent = total ? Math.round((item.count / total) * 100) : 0;

          return (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{item.label}</span>
                <span className="font-mono text-slate-400">{item.count}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full bg-cyan-300"
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
    <section className="rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="font-semibold text-white">Schools in district</h2>
      </div>
      <div className="divide-y divide-white/10">
        {schools.map((school) => (
          <div
            key={school.id}
            className="grid gap-3 px-4 py-4 text-sm sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <p className="font-medium text-white">{school.name}</p>
            <p className="text-slate-300">{school.teachers} teachers</p>
            <p className="text-slate-300">{school.admins} admins</p>
            <p className="text-slate-300">{school.observations} observations</p>
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
    <section className="rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="font-semibold text-white">Teacher performance snapshot</h2>
      </div>
      <div className="divide-y divide-white/10">
        {teachers.map((teacher) => (
          <div
            key={teacher.id}
            className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1fr_auto_auto_auto]"
          >
            <div>
              <p className="font-medium text-white">{teacher.name}</p>
              <p className="mt-1 text-xs text-slate-400">{teacher.title}</p>
            </div>
            <p className="text-slate-300">{teacher.observations} observations</p>
            <p className="font-mono text-slate-300">
              {teacher.averageScore.toFixed(1)} avg
            </p>
            <p className="text-slate-300">{teacher.latestStatus}</p>
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
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h2 className="font-semibold text-white">AI-generated recommendations</h2>
      <div className="mt-4 space-y-3">
        {recommendations.length ? (
          recommendations.map((recommendation) => (
            <article
              key={recommendation.title}
              className="rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium text-cyan-50">
                  {recommendation.title}
                </h3>
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
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h2 className="font-semibold text-white">Feedback history</h2>
      <div className="mt-4 space-y-3">
        {feedback.length ? (
          feedback.map((item) => (
            <article key={item.id} className="rounded-md bg-slate-900/80 p-3">
              <p className="text-sm font-medium text-white">{item.observationTitle}</p>
              <p className="mt-1 text-xs text-slate-500">{item.createdDate}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-400">
            Feedback will appear here after an administrator leaves notes.
          </p>
        )}
      </div>
    </section>
  );
}
