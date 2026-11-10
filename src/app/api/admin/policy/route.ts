// District-specific retention is an explicit prerequisite for recording uploads.
import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { api, HttpError, jsonBody } from "@/lib/http";
const days = z.number().int().min(1).max(3650);
export const POST = api(async (request: Request) => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Unauthorized.");
  if (user.role !== "DISTRICT_ADMIN" || !user.districtId)
    throw new HttpError(403, "District admin required.");
  const input = await jsonBody(
    request,
    z.object({
      recordingRetentionDays: days,
      transcriptRetentionDays: days,
      reportRetentionDays: days,
    }),
  );
  const district = await getDb().$transaction(async (tx) => {
    const row = await tx.district.update({
      where: { id: user.districtId! },
      data: { ...input, policyVersion: { increment: 1 } },
    });
    await tx.auditEvent.create({
      data: {
        districtId: row.id,
        actorId: user.id,
        action: "RETENTION_CHANGED",
        recordId: row.id,
      },
    });
    return row;
  });
  return NextResponse.json({ district });
});
