// Minimal deployment readiness probe. Full authenticated coverage lives in e2e.
const origin = process.env.APP_BASE_URL || "http://localhost:3001";
for (const path of ["/", "/login", "/recover"]) {
  const response = await fetch(new URL(path, origin));
  if (!response.ok) throw new Error(`Smoke probe failed: ${path} (${response.status})`);
  console.log(`PASS ${path}`);
}
export {};
