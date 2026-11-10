// Database leases fence stale workers. External calls may repeat after a crash,
// but conditional commits make each stored stage/result idempotent.
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { acknowledge, deadLetter, visibilitySeconds } from "./queue";
import { analyze, transcribe } from "./provider";
import {
  transcriptSchema,
  analysisSchema,
  validateAnalysis,
  ProcessingError,
  maxAttempts,
  retryDelay,
} from "./contracts";

type Message = { msg_id: bigint; message: { runId?: string } };
export type Providers = {
  transcribe: typeof transcribe;
  analyze: typeof analyze;
};
const terminal = ["READY", "FAILED", "SUPERSEDED"];

export async function workOne(providers: Providers = { transcribe, analyze }) {
  const db = getDb();
  const [message] = await db.$queryRaw<
    Message[]
  >`SELECT * FROM pgmq.read('evaluations', ${visibilitySeconds}::integer, 1)`;
  if (!message) return false;
  const runId = message.message?.runId;
  if (typeof runId !== "string") {
    await db.$transaction((tx) => acknowledge(tx, message.msg_id));
    return true;
  }
  const existing = await db.evaluationRun.findUnique({
    where: { id: runId },
    include: { recording: true, observation: true },
  });
  if (!existing || terminal.includes(existing.state)) {
    await db.$transaction((tx) => acknowledge(tx, message.msg_id));
    return true;
  }
  const leaseToken = randomUUID();
  const claimed = await db.evaluationRun.updateMany({
    where: {
      id: runId,
      state: { in: ["QUEUED", "TRANSCRIBING", "ANALYZING"] },
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
    },
    data: {
      leaseToken,
      leaseUntil: new Date(Date.now() + visibilitySeconds * 1000),
      attempts: { increment: 1 },
    },
  });
  if (!claimed.count) return true; // Another live worker owns the durable lease.
  // Re-read after claiming: the previous owner may have written a checkpoint
  // between message delivery and lease acquisition.
  const run = await db.evaluationRun.findUniqueOrThrow({
    where: { id: runId },
    include: { recording: true, observation: true },
  });
  if (run.leaseToken !== leaseToken) return true;
  const attempt = run.attempts;
  await db.stageAttempt.updateMany({
    where: { runId, finishedAt: null },
    data: { finishedAt: new Date(), errorCode: "worker_interrupted" },
  });
  const abort = new AbortController();
  // Bound each run, even when a provider stops responding indefinitely.
  const timeout = setTimeout(() => abort.abort(), 10 * 60_000);
  const heartbeat = setInterval(() => {
    void db
      .$transaction(async (tx) => {
        const renewed = await tx.evaluationRun.updateMany({
          where: { id: runId, leaseToken, leaseUntil: { gt: new Date() } },
          data: { leaseUntil: new Date(Date.now() + visibilitySeconds * 1000) },
        });
        if (!renewed.count) {
          abort.abort();
          return;
        }
        await tx.$queryRaw`SELECT pgmq.set_vt('evaluations', ${message.msg_id}::bigint, ${visibilitySeconds}::integer)`;
      })
      .catch(() => abort.abort());
  }, 20_000);
  let stageId: string | undefined;
  try {
    if (attempt > maxAttempts) throw new ProcessingError("attempts_exhausted");
    if (
      run.observation.deletingAt ||
      run.observation.recordingVersion !== run.inputVersion ||
      run.observation.status === "FINALIZED" ||
      run.recording.deletedAt
    ) {
      await db.$transaction(async (tx) => {
        await tx.evaluationRun.updateMany({
          where: { id: runId, leaseToken },
          data: {
            state: "SUPERSEDED",
            leaseToken: null,
            leaseUntil: null,
            finishedAt: new Date(),
          },
        });
        await acknowledge(tx, message.msg_id);
      });
      return true;
    }
    let transcript = run.transcript
      ? transcriptSchema.parse(run.transcript)
      : null;
    if (!transcript) {
      const stage = await db.stageAttempt.create({
        data: { runId, number: attempt, stage: "TRANSCRIBING" },
      });
      stageId = stage.id;
      await db.evaluationRun.updateMany({
        where: { id: runId, leaseToken },
        data: { state: "TRANSCRIBING" },
      });
      transcript = transcriptSchema.parse(
        await providers.transcribe(run.recording, abort.signal),
      );
      const checkpoint = await db.evaluationRun.updateMany({
        where: { id: runId, leaseToken, leaseUntil: { gt: new Date() } },
        data: {
          transcript: transcript as Prisma.InputJsonValue,
          state: "ANALYZING",
        },
      });
      if (!checkpoint.count) throw new ProcessingError("lease_lost");
      await db.stageAttempt.update({
        where: { id: stageId },
        data: { finishedAt: new Date() },
      });
    }
    const stage = await db.stageAttempt.create({
      data: { runId, number: attempt, stage: "ANALYZING" },
    });
    stageId = stage.id;
    const analysis = await providers.analyze(
      transcript,
      run.observation,
      abort.signal,
    );
    analysisSchema.parse(analysis);
    validateAnalysis(analysis, transcript);
    await db.$transaction(async (tx) => {
      // Lock observation before checking its version; uploads/finalization use the
      // same lock, so a replacement cannot race a worker's final commit.
      await tx.$queryRaw`SELECT id FROM "Observation" WHERE id = ${run.observationId} FOR UPDATE`;
      const current = await tx.observation.findUniqueOrThrow({
        where: { id: run.observationId },
      });
      const owned = await tx.evaluationRun.updateMany({
        where: { id: runId, leaseToken, leaseUntil: { gt: new Date() } },
        data: {
          state:
            !current.deletingAt &&
            current.recordingVersion === run.inputVersion &&
            current.status !== "FINALIZED"
              ? "READY"
              : "SUPERSEDED",
          analysis: analysis as Prisma.InputJsonValue,
          errorCode: null,
          leaseToken: null,
          leaseUntil: null,
          finishedAt: new Date(),
        },
      });
      if (!owned.count) throw new ProcessingError("lease_lost");
      if (
        !current.deletingAt &&
        current.recordingVersion === run.inputVersion &&
        current.status !== "FINALIZED"
      ) {
        await tx.transcription.deleteMany({
          where: { observationId: run.observationId },
        });
        await tx.transcription.create({
          data: {
            observationId: run.observationId,
            provider: transcript!.provider,
            model: transcript!.model,
            text: transcript!.text,
            segments: {
              create: transcript!.segments.map((s) => ({
                ...s,
                speakerType: "UNKNOWN" as const,
              })),
            },
          },
        });
        const insight = analysis.insight;
        const data = {
          summary: insight.summary,
          metricsJson: insight.metrics,
          recommendations: insight.recommendations,
          sentimentJson: insight.sentiment,
          heatmapJson: insight.heatmap,
          highlightsJson: insight.highlights,
          illustrationKey: insight.illustrationKey,
        };
        await tx.insight.upsert({
          where: { observationId: run.observationId },
          create: { observationId: run.observationId, ...data },
          update: data,
        });
        await tx.observation.update({
          where: { id: run.observationId },
          data: { status: "ANALYZED" },
        });
      }
      await tx.stageAttempt.update({
        where: { id: stageId },
        data: { finishedAt: new Date() },
      });
      await acknowledge(tx, message.msg_id);
    });
  } catch (error) {
    // Transport errors are transient. Schema/refusal/configuration errors are
    // permanent, and raw provider error details never enter the database.
    const failure =
      error instanceof ProcessingError
        ? error
        : new ProcessingError(
            error instanceof TypeError || abort.signal.aborted
              ? "provider_transport"
              : "invalid_provider_result",
            error instanceof TypeError || abort.signal.aborted,
          );
    await db.$transaction(async (tx) => {
      const failed = await tx.evaluationRun.updateMany({
        where: { id: runId, leaseToken, leaseUntil: { gt: new Date() } },
        data: {
          state:
            failure.retryable && attempt < maxAttempts ? "QUEUED" : "FAILED",
          errorCode: failure.code,
          leaseToken: null,
          leaseUntil: null,
          finishedAt:
            failure.retryable && attempt < maxAttempts ? null : new Date(),
        },
      });
      if (!failed.count) return; // An expired worker cannot alter its replacement.
      if (stageId)
        await tx.stageAttempt.update({
          where: { id: stageId },
          data: { finishedAt: new Date(), errorCode: failure.code },
        });
      if (failure.retryable && attempt < maxAttempts) {
        await tx.$queryRaw`SELECT pgmq.set_vt('evaluations', ${message.msg_id}::bigint, ${retryDelay(attempt)}::integer)`;
      } else await deadLetter(tx, runId, message.msg_id);
    });
  } finally {
    clearInterval(heartbeat);
    clearTimeout(timeout);
  }
  return true;
}
