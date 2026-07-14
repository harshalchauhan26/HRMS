import { db } from "../db/client";
import { auditLogs } from "../db/schema";
import type { AuthContext } from "./session";

/** Actor identity now comes from the verified session (req.auth), not a client-supplied header —
 * safe to treat as a trustworthy audit trail. */
export function actorNameFromRequest(req: { auth?: AuthContext }): string | null {
  return req.auth?.name ?? null;
}

export async function logAudit(
  membershipId: string,
  action: string,
  summary: string,
  actorName: string | null
) {
  await db.insert(auditLogs).values({ membershipId, action, summary, actorName });
}
