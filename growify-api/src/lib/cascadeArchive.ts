import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { auditLogs, memberships, users } from "../db/schema";

/**
 * Bulk-offboards every active membership across the given teams in one batched update, not a
 * loop — used when a department or team is deleted, so members get auto-offboarded (history
 * preserved, same as a manual offboard) instead of the delete blocking on non-empty teams.
 * Returns the memberships that were offboarded, for the audit trail and the delete response's
 * offboardedCount.
 */
export async function cascadeOffboardTeams(teamIds: string[], reason: string, actorName: string | null) {
  if (!teamIds.length) return [];

  const toOffboard = await db
    .select({ id: memberships.id, name: users.name })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(and(inArray(memberships.teamId, teamIds), eq(memberships.isActive, true)));

  if (!toOffboard.length) return [];

  await db
    .update(memberships)
    .set({ isActive: false, offboardedAt: new Date() })
    .where(
      inArray(
        memberships.id,
        toOffboard.map((m) => m.id)
      )
    );

  await db.insert(auditLogs).values(
    toOffboard.map((m) => ({
      membershipId: m.id,
      action: "employee.offboarded",
      summary: `Offboarded automatically — ${reason}`,
      actorName,
    }))
  );

  return toOffboard;
}
