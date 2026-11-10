// This server component is protected by role and then loads district-wide data.

import { DashboardPagination } from "@/components/dashboard-pagination";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  MetricGrid,
  ObservationTable,
  SchoolRows,
  StatusSummary,
} from "@/components/dashboard-widgets";
import { requireCurrentUser } from "@/lib/auth";
import { getDistrictDashboardData } from "@/lib/dashboard-data";

export default async function DistrictDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const user = await requireCurrentUser(["DISTRICT_ADMIN"]);
  const { cursor } = await searchParams;
  const dashboard = await getDistrictDashboardData(user, cursor);

  return (
    <DashboardShell
      user={user}
      eyebrow="District dashboard"
      hideDashboardLink
      title="District-wide evaluation overview"
      description="Monitor schools, teacher coverage, observation completion, and AI insight readiness across the district."
    >
      <DashboardPagination
        path="/dashboard/district"
        nextCursor={dashboard.nextCursor}
        hasCursor={!!cursor}
      />
      <MetricGrid metrics={dashboard.metrics} />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
        <SchoolRows schools={dashboard.schools} />
        <StatusSummary counts={dashboard.statusCounts} />
      </div>

      <ObservationTable
        title="Recent district observations"
        observations={dashboard.observations}
        emptyMessage="No observations exist in this district yet."
      />
    </DashboardShell>
  );
}
