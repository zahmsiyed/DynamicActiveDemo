// Explicit replay resets the bounded attempt budget while preserving history.
import { NextResponse } from "next/server";
import { editableObservation } from "@/lib/jobs/requests";
import { getDb } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
import { enqueue } from "@/lib/jobs/queue";
export const POST = api(async (_request: Request, { params }: { params: Promise<{ id: string; runId: string }> }) => {
  const { id, runId } = await params;
  const { user } = await editableObservation(id);
  await getDb().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Observation" WHERE id = ${id} FOR UPDATE`;
    const observation = await tx.observation.findUniqueOrThrow({ where: { id } });
    const run = await tx.evaluationRun.findFirst({ where: { id: runId, observationId: id }, include: { recording: true } });
    if (!run) throw new HttpError(404, "Run not found.");
    if (run.state !== "FAILED" || run.inputVersion !== observation.recordingVersion || observation.status === "FINALIZED" || run.recording.deletedAt) throw new HttpError(409, "This run cannot be retried.");
    await tx.evaluationRun.update({ where: { id: runId }, data: { state: "QUEUED", attempts: 0, errorCode: null, finishedAt: null } });
    await tx.auditEvent.create({ data: { districtId: observation.districtId, actorId: user.id, action: "RUN_REPLAYED", recordId: runId } });
    await enqueue(tx, runId);
  });
  return NextResponse.json({ runId, statusUrl: `/api/observations/${id}/runs` }, { status: 202 });
});
