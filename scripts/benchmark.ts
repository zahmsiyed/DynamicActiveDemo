// Report actual run timings; no asserted one-minute performance target.
import { getDb } from "../src/lib/db";
const db = getDb();
try {
  const run = await db.evaluationRun.findUnique({
    where: { id: process.argv[2] || "" },
    include: { stages: { orderBy: { startedAt: "asc" } }, recording: true },
  });
  if (!run) throw new Error("Supply a completed evaluation run ID.");
  console.log(
    JSON.stringify(
      {
        runId: run.id,
        bytes: run.recording.sizeBytes,
        state: run.state,
        totalMs: run.finishedAt
          ? run.finishedAt.getTime() - run.createdAt.getTime()
          : null,
        queueWaitMs: run.stages[0]
          ? run.stages[0].startedAt.getTime() - run.createdAt.getTime()
          : null,
        stages: run.stages.map((s) => ({
          stage: s.stage,
          ms: s.finishedAt
            ? s.finishedAt.getTime() - s.startedAt.getTime()
            : null,
          errorCode: s.errorCode,
        })),
      },
      null,
      2,
    ),
  );
} finally {
  await db.$disconnect();
}
