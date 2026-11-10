// Published snapshots are retained; teachers cannot see the new draft.
import { NextResponse } from "next/server";
import { editableObservation } from "@/lib/jobs/requests";
import { getDb } from "@/lib/db";
import { api, HttpError } from "@/lib/http";
export const POST = api(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { user } = await editableObservation(id);
  await getDb().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Observation" WHERE id = ${id} FOR UPDATE`;
    const row = await tx.observation.findUniqueOrThrow({ where: { id } });
    if (row.status !== "FINALIZED") throw new HttpError(409, "Report is already open.");
    await tx.observation.update({ where: { id }, data: { status: "SCHEDULED" } });
    await tx.auditEvent.create({ data: { districtId: row.districtId, actorId: user.id, action: "REPORT_REOPENED", recordId: id } });
  });
  return NextResponse.json({ ok: true });
});
