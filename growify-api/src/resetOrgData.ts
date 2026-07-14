import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, queryClient } from "./db/client";
import { departments, users } from "./db/schema";

/**
 * Wipes demo org data (departments/teams/memberships/scores/targets/fitco/swot/audit-logs —
 * deleting `departments` cascades to all of it) and every user, then seeds exactly one admin
 * account for password login. Deliberately leaves `heads`/`job_roles`/shared `questions` alone —
 * that's the competency scoring framework, not per-org dummy data (see seed.ts), and there's no
 * UI to recreate `heads` if this wiped it.
 */
const ADMIN_EMAIL = "admin@hrms.com";
const ADMIN_PASSWORD = "admin";

async function main() {
  console.log("Deleting all departments (cascades to teams/memberships/scores/targets/fitco/swot/audit-logs)...");
  const deletedDepartments = await db.delete(departments).returning();
  console.log(`  ${deletedDepartments.length} department(s) removed.`);

  console.log("Deleting all users...");
  const deletedUsers = await db.delete(users).returning();
  console.log(`  ${deletedUsers.length} user(s) removed.`);

  console.log("Seeding the one admin account...");
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await db.insert(users).values({
    name: "Admin",
    email: ADMIN_EMAIL,
    isAdmin: true,
    passwordHash,
  });
  console.log(`  Admin account ready: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  console.log("Done. heads/job_roles/questions (the scoring framework) were left untouched.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
