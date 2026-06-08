// Phase 4 teacher dashboard.
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

      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <h2 className="font-semibold text-white">Latest AI lesson summary</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
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
