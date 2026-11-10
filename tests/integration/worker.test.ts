// Real PostgreSQL/PGMQ integration checks require an isolated Supabase test DB.
// Providers are injected so failure/restart scenarios are reproducible.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { provision, providers, transcript } from "../e2e/fixtures";
import { enqueue } from "../../src/lib/jobs/queue";
import { workOne } from "../../src/lib/jobs/worker";
import { getDb } from "../../src/lib/db";
import { ProcessingError } from "../../src/lib/jobs/contracts";

if (
  !process.env.E2E_DATABASE_URL ||
  !process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ||
  !process.env.E2E_SUPABASE_URL ||
  !process.env.E2E_RECORDINGS_BUCKET
)
  throw new Error("Integration tests require dedicated E2E_* credentials.");
process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
process.env.SUPABASE_URL = process.env.E2E_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
process.env.SUPABASE_RECORDINGS_BUCKET = process.env.E2E_RECORDINGS_BUCKET;

async function fixture() {
  const env = await provision();
  const row = await env.db.recordingVersion.create({
    data: {
      observationId: env.observation.id,
      storagePath: `tests/${randomUUID()}.wav`,
      fileName: "test.wav",
      mimeType: "audio/wav",
      sizeBytes: 48,
      uploadedBy: env.admin.id,
      policyVersion: 1,
      authorizedAt: new Date(),
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });
  await env.db.observation.update({
    where: { id: env.observation.id },
    data: { recordingVersion: 1 },
  });
  const run = await env.db.$transaction(async (tx) => {
    const run = await tx.evaluationRun.create({
      data: {
        observationId: env.observation.id,
        recordingId: row.id,
        inputVersion: 1,
      },
    });
    await enqueue(tx, run.id);
    return run;
  });
  return { ...env, run };
}
async function visible(runId: string) {
  await getDb()
    .$executeRaw`UPDATE pgmq.q_evaluations SET vt = now() WHERE message->>'runId' = ${runId}`;
}

test("concurrent workers persist a stage only once", async () => {
  const env = await fixture();
  try {
    let calls = 0;
    const provider = {
      ...providers,
      async transcribe() {
        calls++;
        return transcript;
      },
    };
    await Promise.all([workOne(provider), workOne(provider)]);
    assert.equal(calls, 1);
    assert.equal(
      (
        await env.db.evaluationRun.findUniqueOrThrow({
          where: { id: env.run.id },
        })
      ).state,
      "READY",
    );
    assert.equal(
      await env.db.transcription.count({
        where: { observationId: env.observation.id },
      }),
      1,
    );
  } finally {
    await env.cleanup();
  }
});
test("crashed worker lease expires and a new worker resumes", async () => {
  const env = await fixture();
  try {
    await env.db.evaluationRun.update({
      where: { id: env.run.id },
      data: {
        state: "TRANSCRIBING",
        attempts: 1,
        leaseToken: "crashed",
        leaseUntil: new Date(Date.now() - 1000),
      },
    });
    await workOne(providers);
    assert.equal(
      (
        await env.db.evaluationRun.findUniqueOrThrow({
          where: { id: env.run.id },
        })
      ).state,
      "READY",
    );
  } finally {
    await env.cleanup();
  }
});
test("analysis retry reuses its durable transcript checkpoint", async () => {
  const env = await fixture();
  try {
    let transcriptions = 0;
    await workOne({
      ...providers,
      async transcribe() {
        transcriptions++;
        return transcript;
      },
      async analyze() {
        throw new ProcessingError("provider_http_503", true);
      },
    });
    await visible(env.run.id);
    await workOne({
      ...providers,
      async transcribe() {
        transcriptions++;
        return transcript;
      },
    });
    assert.equal(transcriptions, 1);
    assert.equal(
      (
        await env.db.evaluationRun.findUniqueOrThrow({
          where: { id: env.run.id },
        })
      ).state,
      "READY",
    );
  } finally {
    await env.cleanup();
  }
});
test("replacement recording fences an already running worker", async () => {
  const env = await fixture();
  try {
    await workOne({
      ...providers,
      async analyze(...args) {
        await env.db.observation.update({
          where: { id: env.observation.id },
          data: { recordingVersion: 2 },
        });
        return providers.analyze(...args);
      },
    });
    assert.equal(
      await env.db.transcription.count({
        where: { observationId: env.observation.id },
      }),
      0,
    );
    assert.equal(
      (
        await env.db.evaluationRun.findUniqueOrThrow({
          where: { id: env.run.id },
        })
      ).state,
      "SUPERSEDED",
    );
  } finally {
    await env.cleanup();
  }
});
test("duplicate delivery after success does not rewrite results", async () => {
  const env = await fixture();
  try {
    await workOne(providers);
    const before = await env.db.transcription.findUniqueOrThrow({
      where: { observationId: env.observation.id },
    });
    await env.db.$transaction((tx) => enqueue(tx, env.run.id));
    await workOne(providers);
    assert.equal(
      (
        await env.db.transcription.findUniqueOrThrow({
          where: { observationId: env.observation.id },
        })
      ).id,
      before.id,
    );
  } finally {
    await env.cleanup();
  }
});
test("queue send rolls back with its domain transaction", async () => {
  const env = await fixture();
  try {
    const marker = randomUUID();
    await assert.rejects(
      env.db.$transaction(async (tx) => {
        await enqueue(tx, marker);
        throw new Error("rollback");
      }),
    );
    const [count] = await env.db.$queryRaw<
      { count: bigint }[]
    >`SELECT count(*) FROM pgmq.q_evaluations WHERE message->>'runId' = ${marker}`;
    assert.equal(Number(count.count), 0);
  } finally {
    await env.cleanup();
  }
});
test("cross-tenant school assignment is rejected by PostgreSQL", async () => {
  const env = await fixture();
  try {
    await assert.rejects(
      env.db.user.update({
        where: { id: env.teacher.id },
        data: { schoolId: env.foreignSchool.id },
      }),
    );
  } finally {
    await env.cleanup();
  }
});
test("invented evidence cannot become a ready evaluation", async () => {
  const env = await fixture();
  try {
    await workOne({
      ...providers,
      async analyze(...args) {
        const output = await providers.analyze(...args);
        output.suggestions[0].evidence[0].quote = "Invented evidence";
        return output;
      },
    });
    const run = await env.db.evaluationRun.findUniqueOrThrow({
      where: { id: env.run.id },
    });
    assert.equal(run.state, "FAILED");
    assert.equal(run.analysis, null);
    assert.equal(
      await env.db.insight.count({
        where: { observationId: env.observation.id },
      }),
      0,
    );
  } finally {
    await env.cleanup();
  }
});
// Drop the shared worker client after the suite so the Node process exits cleanly.
test.after(async () => {
  await getDb().$disconnect();
});

test("published transcript copies expire after their checkpoint is cleared", async () => {
  const env = await fixture();
  try {
    const old = new Date(Date.now() - 61 * 86400_000);
    const revision = await env.db.reportRevision.create({
      data: {
        observationId: env.observation.id,
        approvedBy: env.admin.id,
        sourceCreatedAt: old,
        snapshot: {
          scores: [],
          feedback: "Reviewed.",
          transcript,
          analysis: { evidence: transcript.text },
        },
      },
    });
    const { maintainRetention } =
      await import("../../src/lib/lifecycle/retention");
    await maintainRetention();
    const row = await env.db.reportRevision.findUniqueOrThrow({
      where: { id: revision.id },
    });
    assert.equal((row.snapshot as Record<string, unknown>).transcript, null);
    assert.equal((row.snapshot as Record<string, unknown>).analysis, null);
  } finally {
    await env.cleanup();
  }
});
