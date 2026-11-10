// Shared labels only. Role claims from browser cookies are never trusted.
export type AppRole = "DISTRICT_ADMIN" | "SCHOOL_ADMIN" | "TEACHER";
export const roleLabels: Record<AppRole, string> = {
  DISTRICT_ADMIN: "District Admin", SCHOOL_ADMIN: "School Admin", TEACHER: "Teacher",
};
export function roleDashboardPath(role: AppRole) {
  if (role === "DISTRICT_ADMIN") return "/dashboard/district";
  if (role === "SCHOOL_ADMIN") return "/dashboard/school";
  return "/dashboard/teacher";
}
