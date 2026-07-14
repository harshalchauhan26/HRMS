import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { auditLogs, departments, jobRoles, memberships, targets, teams, users } from "../db/schema";
import { asyncHandler, HttpError } from "../lib/asyncHandler";
import { actorNameFromRequest, logAudit } from "../lib/audit";
import { requireAdmin, requireAdminOrTeamLead, requireAdminOrTeamMember } from "../lib/authz";
import { cascadeOffboardTeams } from "../lib/cascadeArchive";
import { getMembershipDetail } from "../lib/membershipAggregate";
import { parsePeriodParam } from "../lib/periods";

export const teamsRouter = Router();

const createTeamSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().min(1),
});
const renameTeamSchema = z.object({ name: z.string().min(1) });

const addMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  jobRoleId: z.string().uuid(),
  isLead: z.boolean().default(false),
});

const bulkTargetsSchema = z.object({
  period: z.enum(["q1", "q2", "q3", "q4"]),
  metric: z.string().min(1),
  target: z.number().nullable(),
});

teamsRouter.get(
  "/:id",
  requireAdminOrTeamMember("id"),
  asyncHandler(async (req, res) => {
    const period = parsePeriodParam(req.query.period);
    const [team] = await db.select().from(teams).where(eq(teams.id, req.params.id));
    if (!team) throw new HttpError(404, `Team ${req.params.id} not found`);

    const teamMemberships = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.teamId, team.id), eq(memberships.isActive, true)));

    const details = await Promise.all(
      teamMemberships.map((m) => getMembershipDetail(m.id, period))
    );
    const lead = details.find((d) => d.isLead) ?? null;
    const members = details.filter((d) => !d.isLead);

    res.json({
      id: team.id,
      name: team.name,
      departmentId: team.departmentId,
      isActive: team.isActive,
      lead,
      members,
    });
  })
);

teamsRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = createTeamSchema.parse(req.body);
    const [department] = await db.select().from(departments).where(eq(departments.id, body.departmentId));
    if (!department) throw new HttpError(404, `Department ${body.departmentId} not found`);

    const [created] = await db
      .insert(teams)
      .values({ departmentId: body.departmentId, name: body.name })
      .returning();
    res.status(201).json(created);
  })
);

teamsRouter.patch(
  "/:id",
  requireAdminOrTeamLead("id"),
  asyncHandler(async (req, res) => {
    const body = renameTeamSchema.parse(req.body);
    const [team] = await db.select().from(teams).where(eq(teams.id, req.params.id));
    if (!team) throw new HttpError(404, `Team ${req.params.id} not found`);

    const [updated] = await db
      .update(teams)
      .set({ name: body.name })
      .where(eq(teams.id, req.params.id))
      .returning();
    res.json(updated);
  })
);

teamsRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [team] = await db.select().from(teams).where(eq(teams.id, req.params.id));
    if (!team) throw new HttpError(404, `Team ${req.params.id} not found`);

    // Archive, don't hard-delete — same rationale as departments.delete: a real DELETE would
    // cascade and wipe every member's (including already-offboarded ones') performance history.
    const offboarded = await cascadeOffboardTeams(
      [team.id],
      `the "${team.name}" team was deleted.`,
      actorNameFromRequest(req)
    );

    await db
      .update(teams)
      .set({ isActive: false, archivedAt: new Date(), leadMembershipId: null })
      .where(eq(teams.id, req.params.id));

    res.json({ offboardedCount: offboarded.length });
  })
);

teamsRouter.post(
  "/:id/restore",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [team] = await db.select().from(teams).where(eq(teams.id, req.params.id));
    if (!team) throw new HttpError(404, `Team ${req.params.id} not found`);

    const [updated] = await db
      .update(teams)
      .set({ isActive: true, archivedAt: null })
      .where(eq(teams.id, req.params.id))
      .returning();
    res.json(updated);
  })
);

teamsRouter.put(
  "/:id/targets",
  requireAdminOrTeamLead("id"),
  asyncHandler(async (req, res) => {
    const body = bulkTargetsSchema.parse(req.body);
    const [team] = await db.select().from(teams).where(eq(teams.id, req.params.id));
    if (!team) throw new HttpError(404, `Team ${req.params.id} not found`);

    const activeMemberships = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.teamId, team.id), eq(memberships.isActive, true)));

    if (!activeMemberships.length) {
      res.json({ updated: 0 });
      return;
    }

    // Sets only the `target` (goal) column, batched as one upsert — never touches `actual`
    // (achieved), so bulk-setting a team goal can't wipe out performance already recorded per
    // member. Same batching rationale as the per-member scores/targets/fitco PUTs: one round
    // trip per team, not one per member, against a remote DB with multi-second latency.
    await db
      .insert(targets)
      .values(
        activeMemberships.map((m) => ({
          membershipId: m.id,
          period: body.period,
          metric: body.metric,
          target: body.target != null ? body.target.toString() : null,
        }))
      )
      .onConflictDoUpdate({
        target: [targets.membershipId, targets.period, targets.metric],
        set: { target: sql`excluded.target`, updatedAt: new Date() },
      });

    const actorName = actorNameFromRequest(req);
    const goalLabel = body.target != null ? `${Math.round(body.target * 100)}%` : "cleared";
    await db.insert(auditLogs).values(
      activeMemberships.map((m) => ({
        membershipId: m.id,
        action: "targets.team_bulk_applied",
        summary: `Team target set: ${body.metric} → ${goalLabel} for ${body.period.toUpperCase()} (bulk-applied to ${team.name}).`,
        actorName,
      }))
    );

    res.json({ updated: activeMemberships.length });
  })
);

teamsRouter.post(
  "/:id/members",
  requireAdminOrTeamLead("id"),
  asyncHandler(async (req, res) => {
    const body = addMemberSchema.parse(req.body);
    const [team] = await db.select().from(teams).where(eq(teams.id, req.params.id));
    if (!team) throw new HttpError(404, `Team ${req.params.id} not found`);

    const [jobRole] = await db.select().from(jobRoles).where(eq(jobRoles.id, body.jobRoleId));
    if (!jobRole) throw new HttpError(404, `Job role ${body.jobRoleId} not found`);

    const email = body.email.toLowerCase();
    let [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      [user] = await db.insert(users).values({ name: body.name, email }).returning();
    }

    const membership = await db.transaction(async (tx) => {
      if (body.isLead) {
        // Only one lead per team: demote whoever currently holds it.
        await tx
          .update(memberships)
          .set({ isLead: false })
          .where(and(eq(memberships.teamId, team.id), eq(memberships.isLead, true)));
      }
      const [created] = await tx
        .insert(memberships)
        .values({
          userId: user.id,
          teamId: team.id,
          jobRoleId: body.jobRoleId,
          isLead: body.isLead,
        })
        .returning();
      if (body.isLead) {
        await tx.update(teams).set({ leadMembershipId: created.id }).where(eq(teams.id, team.id));
      }
      return created;
    });

    await logAudit(
      membership.id,
      "employee.added",
      `${body.name} added to ${team.name} as ${jobRole.name}${body.isLead ? " (team lead)" : ""}.`,
      actorNameFromRequest(req)
    );

    res.status(201).json(membership);
  })
);
