// Standalone process: supervise/restart with your host's process manager.
import { randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import { getDb } from "../src/lib/db";
import { workOne } from "../src/lib/jobs/worker";
const id = randomUUID();
let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });
const heartbeat = setInterval(() => {
  void getDb().workerHeartbeat.upsert({ where: { id }, create: { id }, update: { seenAt: new Date() } }).catch(() => console.error("worker_heartbeat_failed"));
}, 15_000);
try {
  while (!stopping) {
    try { if (!await workOne()) await wait(1000); }
    catch { console.error("worker_iteration_failed"); await wait(2000); }
  }
} finally { clearInterval(heartbeat); await getDb().$disconnect(); }
