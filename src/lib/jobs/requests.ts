// All mutation entry points share a current-user and current-record check.
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { canEdit, observationScope } from "@/lib/access";
import { HttpError, limit } from "@/lib/http";
export async function editableObservation(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Unauthorized.");
  if (user.role !== "SCHOOL_ADMIN") throw new HttpError(403, "School admin required.");
  const observation = await getDb().observation.findFirst({ where: { id, ...observationScope(user) }, include: { district: true } });
  if (!observation || !canEdit(user, observation)) throw new HttpError(404, "Observation not found.");
  await limit(`evaluation:${user.id}`, 30);
  return { user, observation };
}
