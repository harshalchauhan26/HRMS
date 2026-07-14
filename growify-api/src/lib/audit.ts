import { db } from "../db/client";
import { auditLogs } from "../db/schema";

/**
 * Actor identity comes from the `x-actor-name` header, set client-side from whichever demo role
 * is currently picked (see useAuthStore) — there's no real authenticated session yet, so this is
 * "who clicked this on this machine," not a verified identity.
 */
export function actorNameFromRequest(req: { header(name: string): string | undefined }): string | null {
  const name = req.header("x-actor-name");
  return name && name.trim() ? name.trim() : null;
}

export async function logAudit(
  membershipId: string,
  action: string,
  summary: string,
  actorName: string | null
) {
  await db.insert(auditLogs).values({ membershipId, action, summary, actorName });
}
