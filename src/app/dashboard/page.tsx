// `/dashboard` is only a routing hub in Phase 3.
// Middleware usually redirects before this page renders, but this server page
// is a safe fallback if the request reaches it.

import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth";
import { roleDashboardPath } from "@/lib/session";

export default async function DashboardIndexPage() {
  const user = await requireCurrentUser();

  redirect(roleDashboardPath(user.role));
}
