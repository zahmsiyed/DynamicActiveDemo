// Synthetic tenants use random IDs. Cleanup is limited to IDs this fixture owns.
import { randomUUID } from "node:crypto";
import { test as base, expect, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { categories } from "../../src/lib/jobs/contracts";
import type { Providers } from "../../src/lib/jobs/worker";

export const password = "Test-only-password-927!";
export const transcript = {
  provider: "test-fixture",
  model: "test",
  text: "What evidence supports your answer?",
  segments: [
    {
      speakerLabel: "A",
      text: "What evidence supports your answer?",
      startMs: 0,
      endMs: 2000,
    },
  ],
};
export const providers: Providers = {
  async transcribe() {
    return transcript;
  },
  async analyze() {
    return {
      model: "test",
      suggestions: categories.map((category) => ({
        category,
        score: 3,
        rationale: "Review evidence.",
        evidence: [{ segmentIndex: 0, quote: transcript.text }],
      })),
      insight: {
        summary: "Students are asked to explain their evidence.",
        metrics: {
          teacherTalkRatio: 0,
          studentTalkRatio: 0,
          questionCount: 1,
          fillerWordCount: 0,
          positiveReinforcementCount: 0,
          pacingScore: 50,
          clarityScore: 50,
          pacingNotes: "Short sample.",
        },
        recommendations: [],
        sentiment: {
          overall: "neutral",
          positiveMoments: 0,
          correctionMoments: 0,
          confidence: 0.5,
        },
        heatmap: [],
        highlights: [
          { quote: transcript.text, reason: "Evidence", startMs: 0 },
        ],
        illustrationKey: "CLARITY_STEPS",
      },
    };
  },
};
// Minimal WAV fixture; provider contracts run with injected outputs, not live AI.
export function wav() {
  const bytes = Buffer.alloc(48);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(40, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24);
  bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(4, 40);
  return bytes;
}
export async function login(api: APIRequestContext, email: string) {
  const response = await api.post("/api/auth/login", {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
}
export async function completeUpload(api: APIRequestContext, id: string) {
  const response = await api.post(`/api/observations/${id}/uploads`, {
    data: {
      fileName: "class.wav",
      mimeType: "audio/wav",
      sizeBytes: wav().length,
      authorized: true,
    },
  });
  expect(response.status()).toBe(201);
  const { signedUrl, uploadId } = await response.json();
  const stored = await api.put(signedUrl, {
    data: wav(),
    headers: { "Content-Type": "audio/wav" },
  });
  expect(stored.ok()).toBeTruthy();
  const completed = await api.post(
    `/api/observations/${id}/uploads/${uploadId}/complete`,
  );
  expect(completed.status()).toBe(202);
  return { ...(await completed.json()), uploadId } as {
    runId: string;
    uploadId: string;
  };
}

export const test = base.extend<{ env: Awaited<ReturnType<typeof provision>> }>(
  {
    env: async ({}, provideFixture) => {
      // Worker imports read these variables too; the app server receives the same
      // dedicated project through playwright.config.ts.
      process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
      process.env.SUPABASE_URL = process.env.E2E_SUPABASE_URL;
      process.env.SUPABASE_SERVICE_ROLE_KEY =
        process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_RECORDINGS_BUCKET =
        process.env.E2E_RECORDINGS_BUCKET;
      const env = await provision();
      try {
        await provideFixture(env);
      } finally {
        await env.cleanup();
      }
    },
  },
);
export { expect };

export async function provision() {
  const db = new PrismaClient({ datasourceUrl: process.env.E2E_DATABASE_URL });
  const auth = createClient(
    process.env.E2E_SUPABASE_URL!,
    process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const key = randomUUID();
  const district = await db.district.create({
    data: {
      name: `E2E ${key}`,
      recordingRetentionDays: 30,
      transcriptRetentionDays: 60,
      reportRetentionDays: 365,
      policyVersion: 1,
    },
  });
  const otherDistrict = await db.district.create({
    data: { name: `E2E other ${key}` },
  });
  const school = await db.school.create({
    data: { name: "First school", districtId: district.id },
  });
  const otherSchool = await db.school.create({
    data: { name: "Second school", districtId: district.id },
  });
  const foreignSchool = await db.school.create({
    data: { name: "Other tenant", districtId: otherDistrict.id },
  });
  const ownedAuthIds: string[] = [];
  const createUser = async (
    label: string,
    role: "DISTRICT_ADMIN" | "SCHOOL_ADMIN" | "TEACHER",
    districtId = district.id,
    schoolId: string | null = school.id,
  ) => {
    const email = `e2e-${label}-${key}@example.com`;
    const { data, error } = await auth.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error("Test auth provisioning failed.");
    ownedAuthIds.push(data.user.id);
    return db.user.create({
      data: {
        name: label,
        email,
        role,
        districtId,
        schoolId,
        authId: data.user.id,
      },
    });
  };
  const admin = await createUser("admin", "SCHOOL_ADMIN");
  const teacher = await createUser("teacher", "TEACHER");
  const peer = await createUser("peer", "TEACHER");
  const districtAdmin = await createUser(
    "district",
    "DISTRICT_ADMIN",
    district.id,
    null,
  );
  const otherAdmin = await createUser(
    "other-school",
    "SCHOOL_ADMIN",
    district.id,
    otherSchool.id,
  );
  const foreignAdmin = await createUser(
    "other-tenant",
    "SCHOOL_ADMIN",
    otherDistrict.id,
    foreignSchool.id,
  );
  async function createObservation(title = "Test evaluation") {
    return db.observation.create({
      data: {
        title,
        subject: "Science",
        gradeLevel: "7",
        teacherId: teacher.id,
        observerId: admin.id,
        schoolId: school.id,
        districtId: district.id,
        status: "SCHEDULED",
      },
    });
  }
  const observation = await createObservation();
  async function cleanup() {
    const rows = await db.recordingVersion.findMany({
      where: {
        observation: { districtId: { in: [district.id, otherDistrict.id] } },
      },
    });
    if (rows.length)
      await auth.storage
        .from(process.env.E2E_RECORDINGS_BUCKET!)
        .remove(rows.map((r) => r.storagePath));
    // Remove only this fixture's messages; queues are never globally purged.
    await db.$executeRaw`DELETE FROM pgmq.q_evaluations WHERE message->>'runId' IN (SELECT id FROM "EvaluationRun" WHERE "observationId" IN (SELECT id FROM "Observation" WHERE "districtId" IN (${district.id}, ${otherDistrict.id})))`;
    await db.$executeRaw`DELETE FROM pgmq.q_evaluation_dead_letters WHERE message->>'runId' IN (SELECT id FROM "EvaluationRun" WHERE "observationId" IN (SELECT id FROM "Observation" WHERE "districtId" IN (${district.id}, ${otherDistrict.id})))`;
    await db.observation.deleteMany({
      where: { districtId: { in: [district.id, otherDistrict.id] } },
    });
    await db.auditEvent.deleteMany({
      where: { districtId: { in: [district.id, otherDistrict.id] } },
    });
    await db.user.deleteMany({
      where: { districtId: { in: [district.id, otherDistrict.id] } },
    });
    await db.school.deleteMany({
      where: { districtId: { in: [district.id, otherDistrict.id] } },
    });
    await db.district.deleteMany({
      where: { id: { in: [district.id, otherDistrict.id] } },
    });
    for (const id of ownedAuthIds) await auth.auth.admin.deleteUser(id);
    await db.$disconnect();
  }
  return {
    db,
    auth,
    key,
    district,
    school,
    otherSchool,
    foreignSchool,
    admin,
    teacher,
    peer,
    districtAdmin,
    otherAdmin,
    foreignAdmin,
    observation,
    createObservation,
    createUser,
    ownedAuthIds,
    cleanup,
  };
}
