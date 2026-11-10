// Run at least hourly from your host's scheduler. No HTTP cron secret is needed.
import { getDb } from "../src/lib/db";
import { maintainRetention } from "../src/lib/lifecycle/retention";
try {
  await maintainRetention();
  console.log("retention_maintenance_complete");
} catch {
  console.error("retention_maintenance_failed");
  process.exitCode = 1;
} finally {
  await getDb().$disconnect();
}
