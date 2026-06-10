// A smoke test is a small end-to-end check that confirms the main demo path is
// still working before a walkthrough or presentation.

import { PrismaClient } from "@prisma/client";

import {
  SESSION_COOKIE,
  roleDashboardPath,
  type AppRole,
} from "../src/lib/session";

// The dev server usually runs on port 3001 in this project so it does not
// conflict with other local Next.js apps. APP_BASE_URL lets you override it.
const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3001";

const prisma = new PrismaClient();

type DemoAccount = {
  label: string;
  email: string;
  password: string;
  role: AppRole;
  dashboardPath: string;
};

type SmokeResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

// These accounts are created by prisma/seed.ts.
const demoAccounts: DemoAccount[] = [
  {
    label: "District Admin",
    email: "district@example.com",
    password: "password123",
    role: "DISTRICT_ADMIN",
    dashboardPath: "/dashboard/district",
  },
  {
    label: "School Admin",
    email: "school@example.com",
    password: "password123",
    role: "SCHOOL_ADMIN",
    dashboardPath: "/dashboard/school",
  },
  {
    label: "Teacher",
    email: "teacher@example.com",
    password: "password123",
    role: "TEACHER",
    dashboardPath: "/dashboard/teacher",
  },
];

const results: SmokeResult[] = [];

// Keep result recording consistent so every check prints the same compact shape.
function record(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
}

// Convert thrown errors into readable one-line smoke test details.
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

// Fetch wrappers use manual redirects so route-guard behavior can be tested.
async function request(path: string, init?: RequestInit) {
  try {
    return await fetch(new URL(path, baseUrl), {
      redirect: "manual",
      ...init,
    });
  } catch (error) {
    throw new Error(
      `Could not reach ${baseUrl}. Start the app with "npm run dev -- --port 3001". ${errorMessage(
        error
      )}`
    );
  }
}

// Browser cookies are HTTP-only in the app, but this script can read Set-Cookie
// response headers because it is acting like a test client.
function cookieFromResponse(response: Response) {
  const headersWithSetCookie = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  const setCookieHeaders =
    headersWithSetCookie.getSetCookie?.() ?? [
      response.headers.get("set-cookie") ?? "",
    ];

  const cookiePattern = new RegExp(`${SESSION_COOKIE}=[^;,]+`);
  const cookie = setCookieHeaders.join(", ").match(cookiePattern)?.[0] ?? "";

  return cookie;
}

// Add the session cookie to a request without exposing it in the console output.
async function authedRequest(
  cookie: string,
  path: string,
  init?: RequestInit
) {
  const headers = new Headers(init?.headers);
  headers.set("Cookie", cookie);

  return request(path, {
    ...init,
    headers,
  });
}

async function login(account: DemoAccount) {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: account.email,
      password: account.password,
    }),
  });

  const body = (await response.json()) as {
    user?: {
      role?: string;
    };
    redirectPath?: string;
  };

  const cookie = cookieFromResponse(response);

  record(
    `${account.label} can sign in`,
    response.status === 200 &&
      body.user?.role === account.role &&
      body.redirectPath === account.dashboardPath &&
      cookie.length > 0,
    `status ${response.status}`
  );

  return cookie;
}

async function checkSignedOutOverview() {
  const response = await request("/");
  const html = await response.text();

  record(
    "Signed-out home page shows public overview",
    response.status === 200 &&
      html.includes("Teacher Evaluation Studio") &&
      html.includes("Sign in"),
    `status ${response.status}`
  );
}

async function checkInvalidLogin() {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "teacher@example.com",
      password: "wrong-password",
    }),
  });

  record(
    "Invalid credentials are rejected",
    response.status === 401,
    `status ${response.status}`
  );
}

async function checkCurrentUser(account: DemoAccount, cookie: string) {
  const response = await authedRequest(cookie, "/api/auth/me");
  const body = (await response.json()) as {
    user?: {
      role?: string;
      email?: string;
    };
  };

  record(
    `${account.label} session resolves through /api/auth/me`,
    response.status === 200 &&
      body.user?.role === account.role &&
      body.user?.email === account.email,
    `status ${response.status}`
  );
}

async function checkDashboardAccess(account: DemoAccount, cookie: string) {
  const response = await authedRequest(cookie, account.dashboardPath);
  const html = await response.text();

  record(
    `${account.label} dashboard loads`,
    response.status === 200 && html.includes(account.label),
    `status ${response.status}`
  );
}

async function checkHomeRedirect(account: DemoAccount, cookie: string) {
  const response = await authedRequest(cookie, "/");
  const location = response.headers.get("location") ?? "";

  record(
    `${account.label} is redirected away from public overview`,
    [307, 308].includes(response.status) && location.includes(account.dashboardPath),
    `status ${response.status}`
  );
}

async function checkCrossRoleDashboardRedirect(cookie: string) {
  const response = await authedRequest(cookie, "/dashboard/school");
  const location = response.headers.get("location") ?? "";

  record(
    "District admin cannot open school admin dashboard",
    [307, 308].includes(response.status) &&
      location.includes(roleDashboardPath("DISTRICT_ADMIN")),
    `status ${response.status}`
  );
}

async function checkObservationList(account: DemoAccount, cookie: string) {
  const response = await authedRequest(cookie, "/api/observations");
  const body = (await response.json()) as {
    observations?: unknown[];
  };

  record(
    `${account.label} receives scoped observations`,
    response.status === 200 &&
      Array.isArray(body.observations) &&
      body.observations.length > 0,
    `status ${response.status}`
  );
}

async function checkReportApi(
  account: DemoAccount,
  cookie: string,
  observationId: string
) {
  const response = await authedRequest(
    cookie,
    `/api/observations/${observationId}`
  );
  const body = (await response.json()) as {
    observation?: {
      id?: string;
    };
  };

  record(
    `${account.label} can open the seeded report API`,
    response.status === 200 && body.observation?.id === observationId,
    `status ${response.status}`
  );
}

async function checkPdfExport(cookie: string, observationId: string) {
  const response = await authedRequest(
    cookie,
    `/api/observations/${observationId}/report.pdf`
  );
  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "";

  record(
    "Teacher report PDF endpoint returns a PDF",
    response.status === 200 &&
      contentType.includes("application/pdf") &&
      bytes.subarray(0, 4).toString("utf8") === "%PDF",
    `status ${response.status}`
  );
}

async function checkRealtimeGuard(cookie: string, observationId: string) {
  const signedOutResponse = await request(
    `/api/realtime/session?observationId=${observationId}`,
    {
      method: "POST",
      body: "not-sdp",
    }
  );

  record(
    "Realtime route rejects signed-out users",
    signedOutResponse.status === 401,
    `status ${signedOutResponse.status}`
  );

  const signedInResponse = await authedRequest(
    cookie,
    `/api/realtime/session?observationId=${observationId}`,
    {
      method: "POST",
      body: "not-sdp",
    }
  );

  const body = (await signedInResponse.json()) as {
    code?: string;
    error?: string;
  };

  // If OPENAI_API_KEY exists, invalid SDP is rejected before any OpenAI call.
  // If the key is missing, the route returns the documented missing-key error.
  record(
    "Realtime route fails safely without starting a live call",
    (signedInResponse.status === 400 &&
      body.error === "A valid SDP offer is required.") ||
      (signedInResponse.status === 503 && body.code === "missing_api_key"),
    `status ${signedInResponse.status}`
  );
}

async function checkDatabaseReadiness() {
  const [
    users,
    observations,
    transcriptions,
    transcriptSegments,
    insights,
    notifications,
    emailLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.observation.count(),
    prisma.transcription.count(),
    prisma.transcriptSegment.count(),
    prisma.insight.count(),
    prisma.notification.count(),
    prisma.emailLog.count(),
  ]);

  record("Database has seeded demo users", users >= 3, `${users} users`);
  record(
    "Database has seeded observations",
    observations >= 2,
    `${observations} observations`
  );
  record(
    "Database has transcript data",
    transcriptions >= 1 && transcriptSegments >= 1,
    `${transcriptions} transcripts, ${transcriptSegments} segments`
  );
  record("Database has insight data", insights >= 1, `${insights} insights`);
  record(
    "Database has notification data",
    notifications >= 1,
    `${notifications} notifications`
  );
  record("Database has email log data", emailLogs >= 1, `${emailLogs} emails`);
}

async function findSeededReportId() {
  const report = await prisma.observation.findFirst({
    where: {
      status: "FINALIZED",
      teacher: {
        email: "teacher@example.com",
      },
    },
    include: {
      audioUpload: true,
      transcription: {
        include: {
          segments: true,
        },
      },
      insight: true,
      notifications: true,
      emailLogs: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  record(
    "Seeded teacher report is ready for demo",
    Boolean(
      report &&
        report.audioUpload &&
        report.transcription &&
        report.transcription.segments.length > 0 &&
        report.insight &&
        report.notifications.length > 0 &&
        report.emailLogs.length > 0
    ),
    report ? report.title : "missing report"
  );

  return report?.id ?? "";
}

async function main() {
  console.log(`Running smoke tests against ${baseUrl}\n`);

  await checkSignedOutOverview();
  await checkInvalidLogin();
  await checkDatabaseReadiness();

  const observationId = await findSeededReportId();
  const cookiesByRole = new Map<AppRole, string>();

  for (const account of demoAccounts) {
    const cookie = await login(account);
    cookiesByRole.set(account.role, cookie);

    if (cookie) {
      await checkCurrentUser(account, cookie);
      await checkDashboardAccess(account, cookie);
      await checkHomeRedirect(account, cookie);
      await checkObservationList(account, cookie);

      if (observationId) {
        await checkReportApi(account, cookie, observationId);
      }
    }
  }

  const districtCookie = cookiesByRole.get("DISTRICT_ADMIN");
  const schoolCookie = cookiesByRole.get("SCHOOL_ADMIN");
  const teacherCookie = cookiesByRole.get("TEACHER");

  if (districtCookie) {
    await checkCrossRoleDashboardRedirect(districtCookie);
  }

  if (teacherCookie && observationId) {
    await checkPdfExport(teacherCookie, observationId);
  }

  if (schoolCookie && observationId) {
    await checkRealtimeGuard(schoolCookie, observationId);
  }

  for (const result of results) {
    const label = result.ok ? "PASS" : "FAIL";
    const detail = result.detail ? ` - ${result.detail}` : "";
    console.log(`${label} ${result.name}${detail}`);
  }

  const failed = results.filter((result) => !result.ok);

  if (failed.length > 0) {
    console.error(`\n${failed.length} smoke test check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("\nAll smoke test checks passed.");
}

main()
  .catch((error) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
