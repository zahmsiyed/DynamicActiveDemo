// One fail-closed predicate for lists, reports, transcripts, PDFs, and jobs.
import type { Prisma } from "@prisma/client";
import type { AppRole } from "@/lib/session";
export type Principal = {
  id: string;
  role: AppRole;
  districtId: string | null;
  schoolId: string | null;
};
export function observationScope(
  user: Principal,
): Prisma.ObservationWhereInput {
  if (!user.districtId) return { id: "__denied__" };
  const tenant = { districtId: user.districtId, deletingAt: null };
  if (user.role === "DISTRICT_ADMIN") return tenant;
  if (user.role === "SCHOOL_ADMIN" && user.schoolId)
    return { ...tenant, schoolId: user.schoolId };
  if (user.role === "TEACHER")
    return { ...tenant, teacherId: user.id, status: "FINALIZED" };
  return { id: "__denied__" };
}
export function canEdit(
  user: Principal,
  row: { districtId: string; schoolId: string },
) {
  return (
    user.role === "SCHOOL_ADMIN" &&
    !!user.districtId &&
    !!user.schoolId &&
    user.districtId === row.districtId &&
    user.schoolId === row.schoolId
  );
}
