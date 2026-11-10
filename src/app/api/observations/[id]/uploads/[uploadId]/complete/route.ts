// Metadata verification precedes an atomic version increment + queue send.
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { adminClient } from "@/lib/supabase/admin";
import { editableObservation } from "@/lib/jobs/requests";
import { api, HttpError } from "@/lib/http";
import { enqueue } from "@/lib/jobs/queue";
export const POST = api(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string; uploadId: string }> },
  ) => {
    const { id, uploadId } = await params;
    const { user } = await editableObservation(id);
    const db = getDb();
    const upload = await db.recordingVersion.findFirst({
      where: {
        id: uploadId,
        observationId: id,
        uploadedBy: user.id,
        deletedAt: null,
      },
    });
    if (!upload) throw new HttpError(404, "Upload not found.");
    const existing = await db.evaluationRun.findUnique({
      where: {
        recordingId_rubricVersion: {
          recordingId: uploadId,
          rubricVersion: "v1",
        },
      },
    });
    if (existing)
      return NextResponse.json(
        { runId: existing.id, statusUrl: `/api/observations/${id}/runs` },
        { status: 202 },
      );
    if (upload.expiresAt < new Date())
      throw new HttpError(410, "Upload expired.");
    const { data, error } = await adminClient()
      .storage.from(process.env.SUPABASE_RECORDINGS_BUCKET!)
      .info(upload.storagePath);
    if (
      error ||
      !data ||
      data.size !== upload.sizeBytes ||
      data.contentType !== upload.mimeType
    )
      throw new HttpError(
        400,
        "Uploaded object is missing or has an incorrect size.",
      );
    const run = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Observation" WHERE id = ${id} FOR UPDATE`;
      // Completion is idempotent even when two requests pass the outer check.
      const duplicate = await tx.evaluationRun.findUnique({
        where: {
          recordingId_rubricVersion: {
            recordingId: uploadId,
            rubricVersion: "v1",
          },
        },
      });
      if (duplicate) return duplicate;
      const current = await tx.observation.findUniqueOrThrow({
        where: { id },
        include: { district: true },
      });
      if (current.deletingAt || current.status === "FINALIZED")
        throw new HttpError(409, "Reopen the report first.");
      if (upload.policyVersion !== current.district.policyVersion)
        throw new HttpError(
          409,
          "Retention policy changed. Start a new upload.",
        );
      const updated = await tx.observation.update({
        where: { id },
        data: { recordingVersion: { increment: 1 }, status: "RECORDED" },
      });
      await tx.recordingVersion.update({
        where: { id: uploadId },
        data: {
          completedAt: new Date(),
          expiresAt: new Date(
            Date.now() + current.district.recordingRetentionDays! * 86400_000,
          ),
        },
      });
      const metadata = {
        fileName: upload.fileName,
        mimeType: upload.mimeType,
        sizeBytes: upload.sizeBytes,
        storagePath: upload.storagePath,
      };
      await tx.audioUpload.upsert({
        where: { observationId: id },
        create: { observationId: id, ...metadata },
        update: metadata,
      });
      await tx.evaluationRun.updateMany({
        where: {
          observationId: id,
          state: { in: ["QUEUED", "TRANSCRIBING", "ANALYZING", "READY"] },
        },
        data: { state: "SUPERSEDED", leaseToken: null, leaseUntil: null },
      });
      await tx.transcription.deleteMany({ where: { observationId: id } });
      await tx.insight.deleteMany({ where: { observationId: id } });
      const row = await tx.evaluationRun.create({
        data: {
          observationId: id,
          recordingId: uploadId,
          inputVersion: updated.recordingVersion,
        },
      });
      await enqueue(tx, row.id);
      await tx.auditEvent.create({
        data: {
          districtId: updated.districtId,
          actorId: user.id,
          action: "RECORDING_ACCEPTED",
          recordId: uploadId,
        },
      });
      return row;
    });
    return NextResponse.json(
      { runId: run.id, statusUrl: `/api/observations/${id}/runs` },
      { status: 202 },
    );
  },
);
