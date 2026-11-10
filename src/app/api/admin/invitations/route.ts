// District admins grant membership in their own district, never via user metadata.
import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { adminClient } from "@/lib/supabase/server";
import { api, HttpError, jsonBody, limit } from "@/lib/http";
export const POST = api(async (request: Request) => {
  const actor = await getCurrentUser();
  if (!actor) throw new HttpError(401, "Unauthorized.");
  if (actor.role !== "DISTRICT_ADMIN" || !actor.districtId)
    throw new HttpError(403, "District admin required.");
  await limit(`invite:${actor.id}`, 20, 3600);
  const input = await jsonBody(
    request,
    z.object({
      name: z.string().min(1).max(120),
      email: z.email().transform((v) => v.toLowerCase()),
      role: z.enum(["SCHOOL_ADMIN", "TEACHER"]),
      schoolId: z.string(),
    }),
  );
  const db = getDb();
  if (
    !(await db.school.findFirst({
      where: { id: input.schoolId, districtId: actor.districtId },
    }))
  )
    throw new HttpError(404, "School not found.");
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw new HttpError(409, "Account already provisioned.");
  const client = adminClient();
  const { data, error } = await client.auth.admin.inviteUserByEmail(
    input.email,
  );
  if (error || !data.user) throw new HttpError(503, "Invitation unavailable.");
  try {
    const user = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { ...input, districtId: actor.districtId!, authId: data.user.id },
      });
      await tx.auditEvent.create({
        data: {
          districtId: actor.districtId!,
          actorId: actor.id,
          action: "USER_INVITED",
          recordId: user.id,
        },
      });
      return user;
    });
    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    // Compensate an incomplete provisioning operation; the invite cannot enter.
    await client.auth.admin.deleteUser(data.user.id);
    throw error;
  }
});
