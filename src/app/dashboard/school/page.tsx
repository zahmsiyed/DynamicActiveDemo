// Phase 4 school admin dashboard.
// This server component is protected by role and then loads school-level data.

import Link from "next/link";

import { DashboardShell } from "@/components/dashboard-shell";
import {
  MetricGrid,
  ObservationTable,
  StatusSummary,
  TeacherRows,
} from "@/components/dashboard-widgets";
import { requireCurrentUser } from "@/lib/auth";
import { getSchoolDashboardData } from "@/lib/dashboard-data";

export default async function SchoolDashboardPage() {
  const user = await requireCurrentUser(["SCHOOL_ADMIN"]);
  const dashboard = await getSchoolDashboardData(user);

  return (
    <DashboardShell
      user={user}
      eyebrow="School admin dashboard"
      title="Observation operations"
      description="Track upcoming evaluations, teacher coverage, recording/transcript progress, and reports that still need feedback or finalization."
    >
      <div className="flex">
        <Link
          className="rounded-full bg-brand-coral px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-coral-dark"
          href="/observations/new"
        >
          Create observation
        </Link>
      </div>

      <MetricGrid metrics={dashboard.metrics} />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
        <TeacherRows teachers={dashboard.teacherRows} />
        <StatusSummary counts={dashboard.statusCounts} />
      </div>

      <ObservationTable
        title="Upcoming evaluations"
        observations={dashboard.upcoming}
        emptyMessage="No upcoming evaluations are currently scheduled."
      />

      <ObservationTable
        title="School observation tracker"
        observations={dashboard.observations}
        emptyMessage="No observations exist for this school yet."
      />
    </DashboardShell>
  );
}
