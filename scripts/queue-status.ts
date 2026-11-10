// Operator health output includes counts and timings only, never classroom data.
import { getDb } from "../src/lib/db";
const db = getDb();
try {
  const [metrics] = await db.$queryRaw<
    { queue_length: bigint; oldest_msg_age: number | null }[]
  >`SELECT queue_length, oldest_msg_age FROM pgmq.metrics('evaluations')`;
  const [dead] = await db.$queryRaw<
    { queue_length: bigint }[]
  >`SELECT queue_length FROM pgmq.metrics('evaluation_dead_letters')`;
  const alive = await db.workerHeartbeat.count({
    where: { seenAt: { gt: new Date(Date.now() - 60_000) } },
  });
  console.log(
    JSON.stringify({
      queued: Number(metrics.queue_length),
      oldestSeconds: metrics.oldest_msg_age,
      deadLetters: Number(dead.queue_length),
      liveWorkers: alive,
    }),
  );
  if (
    !alive ||
    Number(dead.queue_length) > 0 ||
    (metrics.oldest_msg_age || 0) > 300
  )
    process.exitCode = 1;
} finally {
  await db.$disconnect();
}
