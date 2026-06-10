// This server component is protected by role and then loads teacher-only data.

import { DashboardShell } from "@/components/dashboard-shell";
import {
  FeedbackList,
  MetricGrid,
  ObservationTable,
  RecommendationList,
} from "@/components/dashboard-widgets";
import { requireCurrentUser } from "@/lib/auth";
import { getTeacherDashboardData } from "@/lib/dashboard-data";

export default async function TeacherDashboardPage() {
  const user = await requireCurrentUser(["TEACHER"]);
  const dashboard = await getTeacherDashboardData(user);

  return (
    <DashboardShell
      user={user}
      eyebrow="Teacher dashboard"
      title="My observation growth"
      description="Review finalized reports, feedback history, transcript insight summaries, and recommendations from classroom observations."
    >
      <MetricGrid metrics={dashboard.metrics} />

      <section className="rounded-[1.5rem] border border-brand-line bg-brand-card p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-coral">
              Coaching signal
            </p>
            <h2 className="mt-2 text-lg font-semibold text-brand-ink">
              Latest AI lesson summary
            </h2>
          </div>
          <span className="w-fit rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-coral-dark">
            Teacher view
          </span>
        </div>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-brand-muted">
          {dashboard.latestSummary}
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <RecommendationList recommendations={dashboard.recommendations} />
        <FeedbackList feedback={dashboard.feedback} />
      </div>

      <ObservationTable
        title="My observation reports"
        observations={dashboard.observations}
        emptyMessage="No observations are attached to your teacher account yet."
      />
    </DashboardShell>
  );
}
