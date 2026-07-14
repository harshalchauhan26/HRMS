import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { memberships, teams, users } from "../db/schema";
import { asyncHandler } from "../lib/asyncHandler";

export const demoRolesRouter = Router();

demoRolesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [admin] = await db.select().from(users).where(eq(users.isAdmin, true));

    const rows = await db
      .select({
        membershipId: memberships.id,
        userId: users.id,
        name: users.name,
        isLead: memberships.isLead,
        teamId: teams.id,
        teamName: teams.name,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(teams, eq(memberships.teamId, teams.id))
      .where(eq(memberships.isActive, true));

    res.json({
      admin: admin ? { id: admin.id, name: admin.name, email: admin.email } : null,
      leads: rows.filter((r) => r.isLead).map(({ isLead, ...r }) => r),
      members: rows.filter((r) => !r.isLead).map(({ isLead, ...r }) => r),
    });
  })
);
