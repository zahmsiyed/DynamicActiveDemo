// Approval is one locked transaction: scores, feedback, publication snapshot,
// audit event and unique in-app notification either all commit or all roll back.
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { editableObservation } from "@/lib/jobs/requests";
import { getDb } from "@/lib/db";
import { api, HttpError, jsonBody } from "@/lib/http";
import { categories } from "@/lib/jobs/contracts";
export const POST = api(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { user } = await editableObservation(id);
    const body = await jsonBody(
      request,
      z.object({
        runId: z.string(),
        feedback: z.string().trim().min(1).max(10000),
        scores: z
          .array(
            z.object({
              category: z.enum(categories),
              score: z.number().int().min(1).max(5),
              note: z.string().max(2000),
            }),
          )
          .length(6),
      }),
    );
    if (new Set(body.scores.map((s) => s.category)).size !== 6)
      throw new HttpError(400, "Review every rubric category once.");
    await getDb().$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Observation" WHERE id = ${id} FOR UPDATE`;
      const observation = await tx.observation.findUniqueOrThrow({
        where: { id },
      });
      if (observation.status === "FINALIZED") return; // Repeated clicks are harmless.
      const run = await tx.evaluationRun.findFirst({
        where: {
          id: body.runId,
          observationId: id,
          inputVersion: observation.recordingVersion,
          state: "READY",
        },
      });
      if (!run)
        throw new HttpError(
          409,
          "The current recording must finish processing before review.",
        );
      await tx.evaluationScore.deleteMany({ where: { observationId: id } });
      await tx.evaluationScore.createMany({
        data: body.scores.map((s) => ({ ...s, observationId: id })),
      });
      await tx.feedback.create({
        data: {
          observationId: id,
          authorId: user.id,
          teacherId: observation.teacherId,
          body: body.feedback,
        },
      });
      await tx.observation.update({
        where: { id },
        data: { status: "FINALIZED", observedAt: new Date() },
      });
      const revision = await tx.reportRevision.create({
        data: {
          observationId: id,
          approvedBy: user.id,
          sourceCreatedAt: run.createdAt,
          snapshot: {
            scores: body.scores,
            feedback: body.feedback,
            transcript: run.transcript,
            analysis: run.analysis,
          } as Prisma.InputJsonValue,
        },
      });
      await tx.notification.create({
        data: {
          userId: observation.teacherId,
          observationId: id,
          type: `REPORT_READY:${revision.id}`,
          title: "Observation report ready",
          body: "Your reviewed classroom evaluation is ready.",
        },
      });
      await tx.auditEvent.create({
        data: {
          districtId: observation.districtId,
          actorId: user.id,
          action: "REPORT_FINALIZED",
          recordId: revision.id,
        },
      });
    });
    return NextResponse.json({ ok: true });
  },
);
