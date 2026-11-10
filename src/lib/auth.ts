// Identity comes from Supabase; authorization always comes from current DB state.
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { authClient } from "@/lib/supabase/server";
import { roleDashboardPath, type AppRole } from "@/lib/session";

export async function getCurrentUser() {
  const client = await authClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  const user = await getDb().user.findUnique({
    where: { authId: data.user.id },
    select: {
      id: true, name: true, email: true, role: true, title: true, active: true,
      districtId: true, schoolId: true,
      district: { select: { id: true, name: true } },
      school: { select: { id: true, name: true } },
    },
  });
  return user?.active && user.districtId ? user : null;
}

export async function requireCurrentUser(allowedRoles?: AppRole[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(user.role)) redirect(roleDashboardPath(user.role));
  return user;
}
