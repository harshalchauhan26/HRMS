import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { memberships } from "../db/schema";
import { asyncHandler, HttpError } from "./asyncHandler";

export const requireAdmin = asyncHandler(async (req, _res, next) => {
  if (!req.auth?.isAdmin) throw new HttpError(403, "Admin access required.");
  next();
});

async function teamIdForMembership(membershipId: string): Promise<string | null> {
  const [row] = await db
    .select({ teamId: memberships.teamId })
    .from(memberships)
    .where(eq(memberships.id, membershipId));
  return row?.teamId ?? null;
}

/** Admin, or the lead of the team named by req.params[teamIdParam]. */
export function requireAdminOrTeamLead(teamIdParam = "id") {
  return asyncHandler(async (req, _res, next) => {
    if (req.auth!.isAdmin) return next();
    const teamId = req.params[teamIdParam];
    const isLead = req.auth!.memberships.some((m) => m.teamId === teamId && m.isLead);
    if (!isLead) throw new HttpError(403, "Only an admin or this team's lead can do that.");
    next();
  });
}

/** Admin, or anyone with an active membership on the team named by req.params[teamIdParam] — read access. */
export function requireAdminOrTeamMember(teamIdParam = "id") {
  return asyncHandler(async (req, _res, next) => {
    if (req.auth!.isAdmin) return next();
    const teamId = req.params[teamIdParam];
    const belongs = req.auth!.memberships.some((m) => m.teamId === teamId);
    if (!belongs) throw new HttpError(403, "Not authorized for this team.");
    next();
  });
}

/** Admin, or the lead of the team that the membership named by req.params[membershipIdParam] belongs to. */
export function requireAdminOrMembershipTeamLead(membershipIdParam = "id") {
  return asyncHandler(async (req, _res, next) => {
    if (req.auth!.isAdmin) return next();
    const teamId = await teamIdForMembership(req.params[membershipIdParam]);
    const isLead = !!teamId && req.auth!.memberships.some((m) => m.teamId === teamId && m.isLead);
    if (!isLead) throw new HttpError(403, "Only an admin or this team's lead can do that.");
    next();
  });
}

/** Admin, this team's lead, or the membership's own owner — read/own-record access. */
export function requireAdminOrMembershipTeamAccess(membershipIdParam = "id") {
  return asyncHandler(async (req, _res, next) => {
    if (req.auth!.isAdmin) return next();
    const membershipId = req.params[membershipIdParam];
    const isSelf = req.auth!.memberships.some((m) => m.membershipId === membershipId);
    if (isSelf) return next();
    const teamId = await teamIdForMembership(membershipId);
    const isLead = !!teamId && req.auth!.memberships.some((m) => m.teamId === teamId && m.isLead);
    if (!isLead) throw new HttpError(403, "Not authorized for this record.");
    next();
  });
}
