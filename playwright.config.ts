// E2E requires a dedicated Supabase project; no Docker or production credentials.
import { defineConfig } from "@playwright/test";
const required = [
  "E2E_DATABASE_URL",
  "E2E_SUPABASE_URL",
  "E2E_SUPABASE_PUBLISHABLE_KEY",
  "E2E_SUPABASE_SERVICE_ROLE_KEY",
  "E2E_RECORDINGS_BUCKET",
];
const listing = process.argv.includes("--list");
if (!listing && required.some((name) => !process.env[name]))
  throw new Error(
    `E2E requires dedicated test credentials: ${required.join(", ")}`,
  );
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1, // Real queue assertions run deterministically against a dedicated DB.
  fullyParallel: false,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: listing
    ? undefined
    : {
        command: "npm run build && npm run start -- --port 3001",
        url: "http://localhost:3001/login",
        reuseExistingServer: false,
        timeout: 180_000,
        env: {
          DATABASE_URL: process.env.E2E_DATABASE_URL!,
          DIRECT_URL: process.env.E2E_DATABASE_URL!,
          SUPABASE_URL: process.env.E2E_SUPABASE_URL!,
          SUPABASE_PUBLISHABLE_KEY: process.env.E2E_SUPABASE_PUBLISHABLE_KEY!,
          SUPABASE_SERVICE_ROLE_KEY: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!,
          SUPABASE_RECORDINGS_BUCKET: process.env.E2E_RECORDINGS_BUCKET!,
          APP_ORIGIN: "http://localhost:3001",
          OPENAI_API_KEY: "", // Never spend API credits in CI.
        },
      },
});
