import { Router } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import {
  auditLogs,
  fitcoScores,
  jobRoles,
  memberships,
  questions,
  scores,
  swotReports,
  targets,
  teams,
  users,
} from "../db/schema";
import { asyncHandler, HttpError } from "../lib/asyncHandler";
import { actorNameFromRequest, logAudit } from "../lib/audit";
import {
  requireAdmin,
  requireAdminOrMembershipTeamAccess,
  requireAdminOrMembershipTeamLead,
} from "../lib/authz";
import { getMembershipDetail, getMembershipHistory } from "../lib/membershipAggregate";
import { buildSwot } from "../lib/swot";
import { parsePeriodParam } from "../lib/periods";

export const membershipsRouter = Router();

const quarterSchema = z.enum(["q1", "q2", "q3", "q4"]);

const updateMembershipSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  jobRoleId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  isLead: z.boolean().optional(),
});

const addQuestionSchema = z.object({
  headId: z.string().uuid(),
  text: z.string().min(1),
});

const putScoresSchema = z.object({
  period: quarterSchema,
  scores: z.array(
    z.object({
      questionId: z.string().uuid(),
      value: z.number().int().min(1).max(4).nullable(),
      note: z.string().nullable().optional(),
    })
  ),
});

const putTargetsSchema = z.object({
  period: quarterSchema,
  targets: z.array(
    z.object({
      metric: z.string().min(1),
      target: z.number().nullable().optional(),
      actual: z.number().nullable().optional(),
    })
  ),
});

const putFitcoSchema = z.object({
  period: quarterSchema,
  fitco: z.array(z.object({ phase: z.number().int().min(1).max(5), value: z.number() })),
});

async function requireMembership(id: string) {
  const [row] = await db.select().from(memberships).where(eq(memberships.id, id));
  if (!row) throw new HttpError(404, `Membership ${id} not found`);
  return row;
}

membershipsRouter.get(
  "/:id",
  requireAdminOrMembershipTeamAccess("id"),
  asyncHandler(async (req, res) => {
    const period = parsePeriodParam(req.query.period);
    const detail = await getMembershipDetail(req.params.id, period);
    res.json(detail);
  })
);

membershipsRouter.post(
  "/:id/questions",
  requireAdminOrMembershipTeamLead("id"),
  asyncHandler(async (req, res) => {
    const body = addQuestionSchema.parse(req.body);
    await requireMembership(req.params.id);
    const [created] = await db
      .insert(questions)
      .values({ headId: body.headId, membershipId: req.params.id, text: body.text })
      .returning();
    res.status(201).json(created);
  })
);

membershipsRouter.put(
  "/:id/scores",
  requireAdminOrMembershipTeamLead("id"),
  asyncHandler(async (req, res) => {
    const body = putScoresSchema.parse(req.body);
    await requireMembership(req.params.id);

    // Batched as at most one upsert + one delete statement — not one round trip per
    // question — since each PUT can cover all 25 questions and this API talks to a
    // remote Postgres instance where per-query network latency adds up fast.
    const toUpsert = body.scores.filter((s) => s.value != null);
    const toDelete = body.scores.filter((s) => s.value == null);

    if (toUpsert.length) {
      await db
        .insert(scores)
        .values(
          toUpsert.map((s) => ({
            membershipId: req.params.id,
            questionId: s.questionId,
            period: body.period,
            value: s.value as number,
            note: s.note ?? null,
          }))
        )
        .onConflictDoUpdate({
          target: [scores.membershipId, scores.questionId, scores.period],
          set: { value: sql`excluded.value`, note: sql`excluded.note`, updatedAt: new Date() },
        });
    }
    if (toDelete.length) {
      await db
        .delete(scores)
        .where(
          and(
            eq(scores.membershipId, req.params.id),
            eq(scores.period, body.period),
            inArray(
              scores.questionId,
              toDelete.map((s) => s.questionId)
            )
          )
        );
    }

    if (toUpsert.length || toDelete.length) {
      await logAudit(
        req.params.id,
        "scores.updated",
        `Updated ${toUpsert.length} score(s) and cleared ${toDelete.length} for ${body.period.toUpperCase()}.`,
        actorNameFromRequest(req)
      );
    }

    const detail = await getMembershipDetail(req.params.id, body.period);
    res.json(detail);
  })
);

membershipsRouter.put(
  "/:id/targets",
  requireAdminOrMembershipTeamLead("id"),
  asyncHandler(async (req, res) => {
    const body = putTargetsSchema.parse(req.body);
    await requireMembership(req.params.id);

    if (body.targets.length) {
      await db
        .insert(targets)
        .values(
          body.targets.map((t) => ({
            membershipId: req.params.id,
            period: body.period,
            metric: t.metric,
            target: t.target != null ? t.target.toString() : null,
            actual: t.actual != null ? t.actual.toString() : null,
          }))
        )
        .onConflictDoUpdate({
          target: [targets.membershipId, targets.period, targets.metric],
          set: { target: sql`excluded.target`, actual: sql`excluded.actual`, updatedAt: new Date() },
        });
    }

    if (body.targets.length) {
      await logAudit(
        req.params.id,
        "targets.updated",
        `Updated ${body.targets.length} target(s) for ${body.period.toUpperCase()}.`,
        actorNameFromRequest(req)
      );
    }

    const detail = await getMembershipDetail(req.params.id, body.period);
    res.json(detail);
  })
);

membershipsRouter.put(
  "/:id/fitco",
  requireAdminOrMembershipTeamLead("id"),
  asyncHandler(async (req, res) => {
    const body = putFitcoSchema.parse(req.body);
    await requireMembership(req.params.id);

    if (body.fitco.length) {
      await db
        .insert(fitcoScores)
        .values(
          body.fitco.map((f) => ({
            membershipId: req.params.id,
            period: body.period,
            phase: f.phase,
            value: f.value.toString(),
          }))
        )
        .onConflictDoUpdate({
          target: [fitcoScores.membershipId, fitcoScores.period, fitcoScores.phase],
          set: { value: sql`excluded.value`, updatedAt: new Date() },
        });
    }

    if (body.fitco.length) {
      await logAudit(
        req.params.id,
        "fitco.updated",
        `Updated ${body.fitco.length} FITCO phase(s) for ${body.period.toUpperCase()}.`,
        actorNameFromRequest(req)
      );
    }

    const detail = await getMembershipDetail(req.params.id, body.period);
    res.json(detail);
  })
);

membershipsRouter.get(
  "/:id/swot/latest",
  requireAdminOrMembershipTeamAccess("id"),
  asyncHandler(async (req, res) => {
    const period = parsePeriodParam(req.query.period);
    await requireMembership(req.params.id);
    const [latest] = await db
      .select()
      .from(swotReports)
      .where(and(eq(swotReports.membershipId, req.params.id), eq(swotReports.period, period)))
      .orderBy(desc(swotReports.createdAt))
      .limit(1);
    res.json(latest ?? null);
  })
);

membershipsRouter.post(
  "/:id/swot/generate",
  requireAdminOrMembershipTeamAccess("id"),
  asyncHandler(async (req, res) => {
    const period = parsePeriodParam(req.body?.period);
    await requireMembership(req.params.id);
    const detail = await getMembershipDetail(req.params.id, period);
    const evidence = buildSwot(detail);
    const [created] = await db
      .insert(swotReports)
      .values({ membershipId: req.params.id, period, evidence })
      .returning();
    res.status(201).json(created);
  })
);

membershipsRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = updateMembershipSchema.parse(req.body);
    const membership = await requireMembership(req.params.id);

    const changes: string[] = [];

    if (body.name || body.email) {
      const set: Partial<{ name: string; email: string }> = {};
      if (body.name) set.name = body.name;
      if (body.email) set.email = body.email.toLowerCase();
      await db.update(users).set(set).where(eq(users.id, membership.userId));
      if (body.name) changes.push(`name → ${body.name}`);
      if (body.email) changes.push(`email → ${body.email}`);
    }

    if (body.teamId && body.teamId !== membership.teamId) {
      const [team] = await db.select().from(teams).where(eq(teams.id, body.teamId));
      if (!team) throw new HttpError(404, `Team ${body.teamId} not found`);
      changes.push(`moved to ${team.name}`);
    }

    if (body.jobRoleId && body.jobRoleId !== membership.jobRoleId) {
      const [jobRole] = await db.select().from(jobRoles).where(eq(jobRoles.id, body.jobRoleId));
      if (!jobRole) throw new HttpError(404, `Job role ${body.jobRoleId} not found`);
      changes.push(`role → ${jobRole.name}`);
    }

    const targetTeamId = body.teamId ?? membership.teamId;

    const membershipSet: Partial<{ teamId: string; jobRoleId: string; isLead: boolean }> = {};
    if (body.teamId) membershipSet.teamId = body.teamId;
    if (body.jobRoleId) membershipSet.jobRoleId = body.jobRoleId;
    if (body.isLead != null) membershipSet.isLead = body.isLead;

    if (Object.keys(membershipSet).length) {
      await db.transaction(async (tx) => {
        if (body.isLead) {
          // Only one lead per team: demote whoever currently holds it (in the target team).
          await tx
            .update(memberships)
            .set({ isLead: false })
            .where(and(eq(memberships.teamId, targetTeamId), eq(memberships.isLead, true)));
        }
        await tx.update(memberships).set(membershipSet).where(eq(memberships.id, req.params.id));
        if (body.isLead) {
          await tx.update(teams).set({ leadMembershipId: req.params.id }).where(eq(teams.id, targetTeamId));
        }
      });
    }
    if (body.isLead != null) changes.push(body.isLead ? "made team lead" : "removed as team lead");

    if (changes.length) {
      await logAudit(req.params.id, "employee.updated", `Updated: ${changes.join(", ")}.`, actorNameFromRequest(req));
    }

    const detail = await getMembershipDetail(req.params.id, "overall");
    res.json(detail);
  })
);

membershipsRouter.post(
  "/:id/offboard",
  requireAdminOrMembershipTeamLead("id"),
  asyncHandler(async (req, res) => {
    const membership = await requireMembership(req.params.id);
    if (!membership.isActive) throw new HttpError(409, "This employee is already offboarded.");

    await db.transaction(async (tx) => {
      await tx
        .update(memberships)
        .set({ isActive: false, offboardedAt: new Date() })
        .where(eq(memberships.id, req.params.id));
      if (membership.isLead) {
        await tx.update(teams).set({ leadMembershipId: null }).where(eq(teams.id, membership.teamId));
      }
    });

    await logAudit(req.params.id, "employee.offboarded", "Marked as offboarded.", actorNameFromRequest(req));
    res.json({ ok: true });
  })
);

membershipsRouter.post(
  "/:id/reactivate",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const membership = await requireMembership(req.params.id);
    if (membership.isActive) throw new HttpError(409, "This employee is already active.");

    await db
      .update(memberships)
      .set({ isActive: true, offboardedAt: null })
      .where(eq(memberships.id, req.params.id));

    await logAudit(req.params.id, "employee.reactivated", "Reactivated.", actorNameFromRequest(req));
    res.json({ ok: true });
  })
);

membershipsRouter.get(
  "/:id/audit",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await requireMembership(req.params.id);
    const rows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.membershipId, req.params.id))
      .orderBy(desc(auditLogs.createdAt));
    res.json(rows);
  })
);

membershipsRouter.get(
  "/:id/history",
  requireAdmin,
  asyncHandler(async (req, res) => {
    // One shared raw-data fetch for all 4 quarters, not 4 separate round trips — see the perf
    // note on loadRawMembershipData in membershipAggregate.ts.
    const history = await getMembershipHistory(req.params.id);
    res.json(history);
  })
);
