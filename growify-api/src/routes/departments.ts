import { Router } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { departments, jobRoles, memberships, targets, teams, users } from "../db/schema";
import { asyncHandler, HttpError } from "../lib/asyncHandler";
import { actorNameFromRequest } from "../lib/audit";
import { cascadeOffboardTeams } from "../lib/cascadeArchive";
import { averageByGroup, parsePeriodParam } from "../lib/periods";

export const departmentsRouter = Router();

const createDepartmentSchema = z.object({ name: z.string().min(1) });
const renameDepartmentSchema = z.object({ name: z.string().min(1) });

/** Average of the "base" metric's `actual` across a set of memberships, scoped to a period. */
async function avgBaseForMemberships(membershipIds: string[], period: ReturnType<typeof parsePeriodParam>) {
  if (!membershipIds.length) return null;
  const rows = await db
    .select()
    .from(targets)
    .where(inArray(targets.membershipId, membershipIds));
  const baseRows = rows.filter((r) => r.metric === "base" && r.actual != null);
  const scoped = period === "overall" ? baseRows : baseRows.filter((r) => r.period === period);
  if (!scoped.length) return null;
  const byMembership = averageByGroup(scoped, (r) => r.membershipId, (r) => Number(r.actual));
  const values = [...byMembership.values()];
  return values.reduce((a, b) => a + b, 0) / values.length;
}

departmentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const period = parsePeriodParam(req.query.period);
    const includeInactive = req.query.includeInactive === "true";
    const allDepartments = includeInactive
      ? await db.select().from(departments)
      : await db.select().from(departments).where(eq(departments.isActive, true));
    const allTeams = await db.select().from(teams);
    const allMemberships = await db
      .select({ id: memberships.id, teamId: memberships.teamId })
      .from(memberships)
      .where(eq(memberships.isActive, true));

    const result = await Promise.all(
      allDepartments.map(async (dept) => {
        const deptTeams = allTeams.filter((t) => t.departmentId === dept.id);
        const deptTeamIds = new Set(deptTeams.map((t) => t.id));
        const deptMembershipIds = allMemberships
          .filter((m) => deptTeamIds.has(m.teamId))
          .map((m) => m.id);
        return {
          ...dept,
          teamCount: deptTeams.length,
          memberCount: deptMembershipIds.length,
          avgBase: await avgBaseForMemberships(deptMembershipIds, period),
        };
      })
    );
    res.json(result);
  })
);

departmentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createDepartmentSchema.parse(req.body);
    const [created] = await db.insert(departments).values(body).returning();
    res.status(201).json(created);
  })
);

departmentsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = renameDepartmentSchema.parse(req.body);
    const [department] = await db.select().from(departments).where(eq(departments.id, req.params.id));
    if (!department) throw new HttpError(404, `Department ${req.params.id} not found`);

    const [updated] = await db
      .update(departments)
      .set({ name: body.name })
      .where(eq(departments.id, req.params.id))
      .returning();
    res.json(updated);
  })
);

departmentsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const [department] = await db.select().from(departments).where(eq(departments.id, req.params.id));
    if (!department) throw new HttpError(404, `Department ${req.params.id} not found`);

    const deptTeams = await db.select().from(teams).where(eq(teams.departmentId, req.params.id));
    const actorName = actorNameFromRequest(req);

    // Archive, don't hard-delete: a real DELETE here would cascade and wipe every current and
    // former member's whole performance history (scores/targets/FITCO/SWOT). Instead, auto-offboard
    // active members, archive the teams, archive the department — everything stays recoverable.
    const offboarded = await cascadeOffboardTeams(
      deptTeams.map((t) => t.id),
      `the "${department.name}" department was deleted.`,
      actorName
    );

    if (deptTeams.length) {
      await db
        .update(teams)
        .set({ isActive: false, archivedAt: new Date(), leadMembershipId: null })
        .where(
          inArray(
            teams.id,
            deptTeams.map((t) => t.id)
          )
        );
    }

    await db
      .update(departments)
      .set({ isActive: false, archivedAt: new Date() })
      .where(eq(departments.id, req.params.id));

    res.json({ archivedTeams: deptTeams.length, offboardedCount: offboarded.length });
  })
);

departmentsRouter.post(
  "/:id/restore",
  asyncHandler(async (req, res) => {
    const [department] = await db.select().from(departments).where(eq(departments.id, req.params.id));
    if (!department) throw new HttpError(404, `Department ${req.params.id} not found`);

    const [updated] = await db
      .update(departments)
      .set({ isActive: true, archivedAt: null })
      .where(eq(departments.id, req.params.id))
      .returning();
    res.json(updated);
  })
);

departmentsRouter.get(
  "/:id/teams",
  asyncHandler(async (req, res) => {
    const period = parsePeriodParam(req.query.period);
    const [department] = await db.select().from(departments).where(eq(departments.id, req.params.id));
    if (!department) throw new HttpError(404, `Department ${req.params.id} not found`);

    const includeInactive = req.query.includeInactive === "true";
    const deptTeams = includeInactive
      ? await db.select().from(teams).where(eq(teams.departmentId, req.params.id))
      : await db
          .select()
          .from(teams)
          .where(and(eq(teams.departmentId, req.params.id), eq(teams.isActive, true)));
    const allMemberships = await db
      .select({ id: memberships.id, teamId: memberships.teamId })
      .from(memberships)
      .where(
        and(
          inArray(memberships.teamId, deptTeams.map((t) => t.id)),
          eq(memberships.isActive, true)
        )
      );
    const leadUsers = await db
      .select({ membershipId: memberships.id, name: users.name })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(inArray(memberships.id, deptTeams.map((t) => t.leadMembershipId).filter((id): id is string => !!id)));
    const leadNameByMembershipId = new Map(leadUsers.map((l) => [l.membershipId, l.name]));

    const result = await Promise.all(
      deptTeams.map(async (team) => {
        const teamMembershipIds = allMemberships.filter((m) => m.teamId === team.id).map((m) => m.id);
        return {
          ...team,
          memberCount: teamMembershipIds.length,
          avgBase: await avgBaseForMemberships(teamMembershipIds, period),
          leadName: team.leadMembershipId ? (leadNameByMembershipId.get(team.leadMembershipId) ?? null) : null,
        };
      })
    );
    res.json(result);
  })
);

departmentsRouter.get(
  "/:id/employees",
  asyncHandler(async (req, res) => {
    const [department] = await db.select().from(departments).where(eq(departments.id, req.params.id));
    if (!department) throw new HttpError(404, `Department ${req.params.id} not found`);

    const deptTeams = await db.select().from(teams).where(eq(teams.departmentId, req.params.id));
    if (!deptTeams.length) return res.json([]);

    const includeInactive = req.query.includeInactive === "true";
    const rows = await db
      .select({
        membershipId: memberships.id,
        isLead: memberships.isLead,
        isActive: memberships.isActive,
        offboardedAt: memberships.offboardedAt,
        userId: users.id,
        name: users.name,
        email: users.email,
        teamId: teams.id,
        teamName: teams.name,
        jobRoleId: jobRoles.id,
        jobRoleName: jobRoles.name,
        jobRoleLevel: jobRoles.level,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(teams, eq(memberships.teamId, teams.id))
      .innerJoin(jobRoles, eq(memberships.jobRoleId, jobRoles.id))
      .where(
        includeInactive
          ? inArray(memberships.teamId, deptTeams.map((t) => t.id))
          : and(
              inArray(memberships.teamId, deptTeams.map((t) => t.id)),
              eq(memberships.isActive, true)
            )
      );

    res.json(rows);
  })
);
