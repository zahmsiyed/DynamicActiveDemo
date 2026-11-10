// Pollable progress survives browser refreshes. Teachers cannot inspect drafts.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { observationScope } from "@/lib/access";
import { api, HttpError } from "@/lib/http";
export const GET = api(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Unauthorized.");
  const { id } = await params;
  const row = await getDb().observation.findFirst({ where: { id, ...observationScope(user) } });
  if (!row) throw new HttpError(404, "Observation not found.");
  const run = await getDb().evaluationRun.findFirst({ where: { observationId: id, inputVersion: row.recordingVersion }, orderBy: { createdAt: "desc" }, select: { id: true, state: true, attempts: true, errorCode: true, analysis: true, createdAt: true, finishedAt: true, stages: { orderBy: { startedAt: "asc" } } } });
  return NextResponse.json({ run });
});
