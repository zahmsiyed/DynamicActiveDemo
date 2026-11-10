// Operator-only bootstrap: npm run district:create -- "District" "Admin" "email" "School".
// No public endpoint can create a district or promote a district administrator.
import { getDb } from "../src/lib/db";
import { adminClient } from "../src/lib/supabase/admin";
const [districtName, adminName, email, schoolName] = process.argv.slice(2);
if (!districtName || !adminName || !email || !schoolName)
  throw new Error(
    "Supply district name, admin name, admin email, and first school name.",
  );
const auth = adminClient();
const db = getDb();
try {
  const { data, error } = await auth.auth.admin.inviteUserByEmail(email);
  if (error || !data.user) throw new Error("Admin invitation failed.");
  try {
    const district = await db.$transaction(async (tx) => {
      const row = await tx.district.create({
        data: { name: districtName, schools: { create: { name: schoolName } } },
      });
      const user = await tx.user.create({
        data: {
          name: adminName,
          email: email.toLowerCase(),
          authId: data.user!.id,
          role: "DISTRICT_ADMIN",
          districtId: row.id,
        },
      });
      await tx.auditEvent.create({
        data: {
          districtId: row.id,
          actorId: "operator",
          action: "DISTRICT_PROVISIONED",
          recordId: user.id,
        },
      });
      return row;
    });
    console.log("District provisioned", { districtId: district.id });
  } catch (error) {
    await auth.auth.admin.deleteUser(data.user.id);
    throw error;
  }
} catch {
  console.error(
    "District provisioning failed; inspect operator configuration.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
