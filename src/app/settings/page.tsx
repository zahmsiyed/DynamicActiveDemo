// District administrators can configure policy and provision school users.
import { requireCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { DistrictSettings } from "@/components/district-settings";
import { DashboardShell } from "@/components/dashboard-shell";
export default async function SettingsPage() {
  const user = await requireCurrentUser(["DISTRICT_ADMIN"]);
  const schools = await getDb().school.findMany({
    where: { districtId: user.districtId! },
    select: { id: true, name: true },
  });
  return (
    <DashboardShell
      user={user}
      eyebrow="Administration"
      title="District settings"
      description="Manage invitations and retention."
    >
      <DistrictSettings schools={schools} />
    </DashboardShell>
  );
}
