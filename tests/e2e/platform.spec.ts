// These 24 cases use real Auth, Prisma, Storage and PGMQ. Only AI outputs are
// injected at the provider boundary so CI remains deterministic and free of API spend.
import {
  test,
  expect,
  login,
  completeUpload,
  password,
  providers,
  wav,
} from "./fixtures";
import { workOne } from "../../src/lib/jobs/worker";
import { categories, ProcessingError } from "../../src/lib/jobs/contracts";

// Authentication and invitation acceptance (4).
test("school admin signs in through the browser", async ({ page, env }) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(env.admin.email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard\/school/);
});
test("invalid credentials are rejected", async ({ request, env }) => {
  const response = await request.post("/api/auth/login", {
    data: { email: env.admin.email, password: "wrong" },
  });
  expect(response.status()).toBe(401);
});
test("logout prevents protected access", async ({ page, env }) => {
  await login(page.request, env.admin.email);
  await page.goto("/dashboard/school");
  await page.getByRole("button", { name: /sign out|log out/i }).click();
  await page.goto("/observations/" + env.observation.id);
  await expect(page).toHaveURL(/login/);
});
test("invited identity accepts a token hash and sets its password", async ({
  page,
  env,
}) => {
  const email = `e2e-invite-${env.key}@example.com`;
  const { data, error } = await env.auth.auth.admin.generateLink({
    type: "invite",
    email,
  });
  expect(error).toBeNull();
  if (error || !data.user || !data.properties)
    throw new Error("Invitation setup failed.");
  env.ownedAuthIds.push(data.user.id);
  await env.db.user.create({
    data: {
      name: "Invited",
      email,
      role: "TEACHER",
      districtId: env.district.id,
      schoolId: env.school.id,
      authId: data.user.id,
    },
  });
  await page.goto(
    `/auth/confirm?type=invite&token_hash=${data.properties.hashed_token}`,
  );
  await expect(page).toHaveURL(/account/);
  await page.getByLabel(/Password/).fill(password);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByRole("status")).toContainText("Password saved");
});

// Authorization and tenant boundaries (8).
test("signed-out requests cannot read reports", async ({ request, env }) =>
  expect(
    (await request.get(`/api/observations/${env.observation.id}`)).status(),
  ).toBe(401));
test("teachers cannot create observations", async ({ request, env }) => {
  await login(request, env.teacher.email);
  expect((await request.post("/api/observations", { data: {} })).status()).toBe(
    403,
  );
});
test("other districts cannot read observations", async ({ request, env }) => {
  await login(request, env.foreignAdmin.email);
  expect(
    (await request.get(`/api/observations/${env.observation.id}`)).status(),
  ).toBe(404);
});
test("other schools cannot read observations", async ({ request, env }) => {
  await login(request, env.otherAdmin.email);
  expect(
    (await request.get(`/api/observations/${env.observation.id}`)).status(),
  ).toBe(404);
});
test("a teacher cannot read another teacher's finalized report", async ({
  request,
  env,
}) => {
  await env.db.observation.update({
    where: { id: env.observation.id },
    data: { status: "FINALIZED" },
  });
  await login(request, env.peer.email);
  expect(
    (await request.get(`/api/observations/${env.observation.id}`)).status(),
  ).toBe(404);
});
test("PDF access applies tenant scope", async ({ request, env }) => {
  await login(request, env.foreignAdmin.email);
  expect(
    (
      await request.get(`/api/observations/${env.observation.id}/report.pdf`)
    ).status(),
  ).toBe(404);
});
test("transcript access applies publication scope", async ({
  request,
  env,
}) => {
  await login(request, env.teacher.email);
  expect(
    (
      await request.get(`/api/observations/${env.observation.id}/transcript`)
    ).status(),
  ).toBe(404);
});
test("job access applies tenant scope", async ({ request, env }) => {
  await login(request, env.foreignAdmin.email);
  expect(
    (
      await request.get(`/api/observations/${env.observation.id}/runs`)
    ).status(),
  ).toBe(404);
});

// Evaluation workflow (8).
test("admin creates a scheduled observation", async ({ page, env }) => {
  await login(page.request, env.admin.email);
  await page.goto("/observations/new");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Browser-created evaluation");
  await page.getByRole("button", { name: /create observation/i }).click();
  await expect(page).toHaveURL(/observations\/(?!new)/);
});
test("invalid upload metadata is rejected", async ({ request, env }) => {
  await login(request, env.admin.email);
  expect(
    (
      await request.post(`/api/observations/${env.observation.id}/uploads`, {
        data: {
          fileName: "bad.html",
          mimeType: "text/html",
          sizeBytes: 10,
          authorized: true,
        },
      })
    ).status(),
  ).toBe(400);
});
test("retention must be configured before uploads", async ({
  request,
  env,
}) => {
  await env.db.district.update({
    where: { id: env.district.id },
    data: { recordingRetentionDays: null },
  });
  await login(request, env.admin.email);
  expect(
    (
      await request.post(`/api/observations/${env.observation.id}/uploads`, {
        data: {
          fileName: "class.wav",
          mimeType: "audio/wav",
          sizeBytes: 48,
          authorized: true,
        },
      })
    ).status(),
  ).toBe(409);
});
test("upload creates queued work", async ({ page, env }) => {
  await login(page.request, env.admin.email);
  await page.goto(`/observations/${env.observation.id}`);
  await page
    .getByLabel("Classroom recording", { exact: true })
    .setInputFiles({ name: "class.wav", mimeType: "audio/wav", buffer: wav() });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Upload and evaluate" }).click();
  await expect(page.getByTestId("run-state")).toContainText("queued");
});
test("worker stores suggestions without approving scores", async ({
  request,
  env,
}) => {
  await login(request, env.admin.email);
  const { runId } = await completeUpload(request, env.observation.id);
  await workOne(providers);
  const run = await env.db.evaluationRun.findUniqueOrThrow({
    where: { id: runId },
  });
  expect(run.state).toBe("READY");
  expect(
    await env.db.evaluationScore.count({
      where: { observationId: env.observation.id },
    }),
  ).toBe(0);
});
test("review requires feedback and every rubric score", async ({
  request,
  env,
}) => {
  await login(request, env.admin.email);
  const { runId } = await completeUpload(request, env.observation.id);
  await workOne(providers);
  expect(
    (
      await request.post(`/api/observations/${env.observation.id}/review`, {
        data: { runId, feedback: "", scores: [] },
      })
    ).status(),
  ).toBe(400);
});
test("human review finalizes report through browser", async ({ page, env }) => {
  await login(page.request, env.admin.email);
  await completeUpload(page.request, env.observation.id);
  await workOne(providers);
  await page.goto(`/observations/${env.observation.id}`);
  await expect(
    page.getByRole("heading", { name: "Review suggested rubric scores" }),
  ).toBeVisible();
  await page
    .getByLabel("Written feedback", { exact: true })
    .fill("Reviewed all evidence and scores.");
  await page.getByRole("button", { name: "Finalize reviewed report" }).click();
  await expect(
    page.getByText("This report has been reviewed and finalized."),
  ).toBeVisible();
});
test("teacher sees finalized report but never a draft", async ({
  request,
  env,
}) => {
  await login(request, env.teacher.email);
  expect(
    (await request.get(`/api/observations/${env.observation.id}`)).status(),
  ).toBe(404);
  await request.post("/api/auth/logout");
  await login(request, env.admin.email);
  const { runId } = await completeUpload(request, env.observation.id);
  await workOne(providers);
  expect(
    (
      await request.post(`/api/observations/${env.observation.id}/review`, {
        data: {
          runId,
          feedback: "Reviewed.",
          scores: categories.map((category) => ({
            category,
            score: 3,
            note: "Reviewed.",
          })),
        },
      })
    ).status(),
  ).toBe(200);
  await request.post("/api/auth/logout");
  await login(request, env.teacher.email);
  expect(
    (await request.get(`/api/observations/${env.observation.id}`)).status(),
  ).toBe(200);
});

// Failure and recovery (4).
test("permanent provider failure is visible without fake output", async ({
  page,
  env,
}) => {
  await login(page.request, env.admin.email);
  const { runId } = await completeUpload(page.request, env.observation.id);
  await workOne({
    ...providers,
    async transcribe() {
      throw new ProcessingError("provider_not_configured");
    },
  });
  await page.goto(`/observations/${env.observation.id}`);
  await expect(
    page.getByRole("button", { name: "Retry evaluation" }),
  ).toBeVisible();
  expect(
    (await env.db.evaluationRun.findUniqueOrThrow({ where: { id: runId } }))
      .transcript,
  ).toBeNull();
});
test("retries stop after the fifth attempt", async ({ request, env }) => {
  await login(request, env.admin.email);
  const { runId } = await completeUpload(request, env.observation.id);
  await env.db.evaluationRun.update({
    where: { id: runId },
    data: { attempts: 4 },
  });
  await workOne({
    ...providers,
    async transcribe() {
      throw new ProcessingError("provider_http_503", true);
    },
  });
  const run = await env.db.evaluationRun.findUniqueOrThrow({
    where: { id: runId },
  });
  expect(run.state).toBe("FAILED");
  expect(run.attempts).toBe(5);
});
test("only the owning school can replay a failed run", async ({
  request,
  env,
}) => {
  await login(request, env.admin.email);
  const { runId } = await completeUpload(request, env.observation.id);
  await workOne({
    ...providers,
    async transcribe() {
      throw new ProcessingError("provider_not_configured");
    },
  });
  await request.post("/api/auth/logout");
  await login(request, env.foreignAdmin.email);
  expect(
    (
      await request.post(
        `/api/observations/${env.observation.id}/runs/${runId}/retry`,
      )
    ).status(),
  ).toBe(404);
  await request.post("/api/auth/logout");
  await login(request, env.admin.email);
  expect(
    (
      await request.post(
        `/api/observations/${env.observation.id}/runs/${runId}/retry`,
      )
    ).status(),
  ).toBe(202);
  await workOne(providers);
  expect(
    (await env.db.evaluationRun.findUniqueOrThrow({ where: { id: runId } }))
      .state,
  ).toBe("READY");
});
test("duplicate completion produces one evaluation run", async ({
  request,
  env,
}) => {
  await login(request, env.admin.email);
  const { runId, uploadId } = await completeUpload(request, env.observation.id);
  const repeated = await request.post(
    `/api/observations/${env.observation.id}/uploads/${uploadId}/complete`,
  );
  expect(repeated.status()).toBe(202);
  expect((await repeated.json()).runId).toBe(runId);
  expect(
    await env.db.evaluationRun.count({ where: { recordingId: uploadId } }),
  ).toBe(1);
});
