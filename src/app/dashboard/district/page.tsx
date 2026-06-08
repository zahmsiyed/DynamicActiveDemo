// Phase 4 district dashboard.
// This server component is protected by role and then loads district-wide data.

import { DashboardShell } from "@/components/dashboard-shell";
import {
  MetricGrid,
  ObservationTable,
  SchoolRows,
  StatusSummary,
} from "@/components/dashboard-widgets";
import { requireCurrentUser } from "@/lib/auth";
import { getDistrictDashboardData } from "@/lib/dashboard-data";

export default async function DistrictDashboardPage() {
  const user = await requireCurrentUser(["DISTRICT_ADMIN"]);
  const dashboard = await getDistrictDashboardData(user);

  return (
    <DashboardShell
      user={user}
      eyebrow="District dashboard"
      title="District-wide evaluation overview"
      description="Monitor schools, teacher coverage, observation completion, and AI insight readiness across the district."
    >
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
