// Disable application access immediately, even while an Auth token is unexpired.
import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { api, HttpError, jsonBody } from "@/lib/http";
export const PATCH = api(async (request: Request) => {
  const actor = await getCurrentUser();
  if (!actor) throw new HttpError(401, "Unauthorized.");
  if (actor.role !== "DISTRICT_ADMIN" || !actor.districtId)
    throw new HttpError(403, "District admin required.");
  const { id, active } = await jsonBody(
    request,
    z.object({ id: z.string(), active: z.boolean() }),
  );
  const target = await getDb().user.findFirst({
    where: {
      id,
      districtId: actor.districtId,
      role: { not: "DISTRICT_ADMIN" },
    },
  });
  if (!target) throw new HttpError(404, "User not found.");
  await getDb().$transaction([
    getDb().user.update({ where: { id }, data: { active } }),
    getDb().auditEvent.create({
      data: {
        districtId: actor.districtId,
        actorId: actor.id,
        action: active ? "USER_ENABLED" : "USER_DISABLED",
        recordId: id,
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
});
