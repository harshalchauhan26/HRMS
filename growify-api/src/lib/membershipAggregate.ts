import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { fitcoScores, heads, jobRoles, memberships, questions, scores, targets, teams, users } from "../db/schema";
import { HttpError } from "./asyncHandler";
import { averageByGroup, QUARTERS, type PeriodParam, type Quarter } from "./periods";

export interface QuestionWithScore {
  id: string;
  headId: string;
  text: string;
  scope: "shared" | "personal";
  value: number | null;
  note: string | null;
}

export interface HeadWithQuestions {
  id: string;
  name: string;
  orderIndex: number;
  average: number | null;
  questions: QuestionWithScore[];
}

export interface MembershipDetail {
  id: string;
  user: { id: string; name: string; email: string };
  team: { id: string; name: string; departmentId: string };
  jobRole: { id: string; name: string; level: string };
  isLead: boolean;
  isActive: boolean;
  offboardedAt: string | null;
  period: PeriodParam;
  targets: { metric: string; target: number | null; actual: number | null }[];
  fitco: { phase: number; value: number }[];
  heads: HeadWithQuestions[];
  overall: number | null;
  hasScores: boolean;
}

export interface MembershipHistoryPoint {
  period: Quarter;
  overall: number | null;
  base: number | null;
  hasScores: boolean;
}

interface RawMembershipData {
  row: {
    membership: typeof memberships.$inferSelect;
    user: typeof users.$inferSelect;
    team: typeof teams.$inferSelect;
    jobRole: typeof jobRoles.$inferSelect;
  };
  allHeads: (typeof heads.$inferSelect)[];
  effectiveQuestions: ((typeof questions.$inferSelect) & { scope: "shared" | "personal" })[];
  allTargetRows: (typeof targets.$inferSelect)[];
  allFitcoRows: (typeof fitcoScores.$inferSelect)[];
  allScoreRows: (typeof scores.$inferSelect)[];
}

/**
 * All the DB round-trips a membership's scorecard needs, fetched once. Reused by both
 * getMembershipDetail (one period) and getMembershipHistory (all 4 quarters) so the latter
 * doesn't re-fetch the same rows 4 times — each round trip to this Supabase instance costs
 * ~1-3s (see the perf note in growify-api/src/routes/memberships.ts), so avoiding repeat fetches
 * matters more than avoiding repeat computation.
 */
async function loadRawMembershipData(membershipId: string): Promise<RawMembershipData> {
  const [row] = await db
    .select({
      membership: memberships,
      user: users,
      team: teams,
      jobRole: jobRoles,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .innerJoin(teams, eq(memberships.teamId, teams.id))
    .innerJoin(jobRoles, eq(memberships.jobRoleId, jobRoles.id))
    .where(eq(memberships.id, membershipId));

  if (!row) throw new HttpError(404, `Membership ${membershipId} not found`);

  const [allHeads, sharedQuestions, personalQuestions, allTargetRows, allFitcoRows] = await Promise.all([
    db.select().from(heads).orderBy(heads.orderIndex),
    db
      .select()
      .from(questions)
      .where(and(eq(questions.jobRoleId, row.jobRole.id), isNull(questions.membershipId))),
    db.select().from(questions).where(eq(questions.membershipId, membershipId)),
    db.select().from(targets).where(eq(targets.membershipId, membershipId)),
    db.select().from(fitcoScores).where(eq(fitcoScores.membershipId, membershipId)),
  ]);

  const effectiveQuestions = [
    ...sharedQuestions.map((q) => ({ ...q, scope: "shared" as const })),
    ...personalQuestions.map((q) => ({ ...q, scope: "personal" as const })),
  ];
  const questionIds = effectiveQuestions.map((q) => q.id);

  const allScoreRows = questionIds.length
    ? await db
        .select()
        .from(scores)
        .where(and(eq(scores.membershipId, membershipId), inArray(scores.questionId, questionIds)))
    : [];

  return { row, allHeads, effectiveQuestions, allTargetRows, allFitcoRows, allScoreRows };
}

/** Pure — no DB access. Projects already-fetched raw rows onto one period or "overall". */
function computeDetailForPeriod(raw: RawMembershipData, period: PeriodParam): MembershipDetail {
  const { row, allHeads, effectiveQuestions, allTargetRows, allFitcoRows, allScoreRows } = raw;

  // period scoping: a specific quarter filters to that quarter's rows; "overall" averages across
  // whichever quarters have data.
  const scoreValueByQuestion =
    period === "overall"
      ? averageByGroup(allScoreRows, (s) => s.questionId, (s) => s.value)
      : new Map(
          allScoreRows.filter((s) => s.period === period).map((s) => [s.questionId, s.value])
        );
  const scoreNoteByQuestion = new Map(
    allScoreRows
      .filter((s) => period === "overall" || s.period === period)
      .filter((s) => s.note)
      .map((s) => [s.questionId, s.note as string])
  );

  const targetValueByMetric =
    period === "overall"
      ? averageByGroup(allTargetRows, (t) => t.metric, (t) => (t.target != null ? Number(t.target) : null))
      : new Map(
          allTargetRows
            .filter((t) => t.period === period)
            .map((t) => [t.metric, t.target != null ? Number(t.target) : null])
        );
  const actualValueByMetric =
    period === "overall"
      ? averageByGroup(allTargetRows, (t) => t.metric, (t) => (t.actual != null ? Number(t.actual) : null))
      : new Map(
          allTargetRows
            .filter((t) => t.period === period)
            .map((t) => [t.metric, t.actual != null ? Number(t.actual) : null])
        );
  const metrics = new Set([...targetValueByMetric.keys(), ...actualValueByMetric.keys()]);

  const fitcoValueByPhase =
    period === "overall"
      ? averageByGroup(allFitcoRows, (f) => String(f.phase), (f) => Number(f.value))
      : new Map(
          allFitcoRows.filter((f) => f.period === period).map((f) => [String(f.phase), Number(f.value)])
        );

  const headsWithQuestions: HeadWithQuestions[] = allHeads.map((head) => {
    const headQuestions = effectiveQuestions
      .filter((q) => q.headId === head.id)
      .map((q) => ({
        id: q.id,
        headId: q.headId,
        text: q.text,
        scope: q.scope,
        value: scoreValueByQuestion.get(q.id) ?? null,
        note: scoreNoteByQuestion.get(q.id) ?? null,
      }));
    const scored = headQuestions.filter((q) => q.value != null);
    const average = scored.length
      ? scored.reduce((sum, q) => sum + (q.value as number), 0) / scored.length
      : null;
    return { id: head.id, name: head.name, orderIndex: head.orderIndex, average, questions: headQuestions };
  });

  const scoredHeads = headsWithQuestions.filter((h) => h.average != null);
  const overall = scoredHeads.length
    ? scoredHeads.reduce((sum, h) => sum + (h.average as number), 0) / scoredHeads.length
    : null;

  return {
    id: row.membership.id,
    user: { id: row.user.id, name: row.user.name, email: row.user.email },
    team: { id: row.team.id, name: row.team.name, departmentId: row.team.departmentId },
    jobRole: { id: row.jobRole.id, name: row.jobRole.name, level: row.jobRole.level },
    isLead: row.membership.isLead,
    isActive: row.membership.isActive,
    offboardedAt: row.membership.offboardedAt ? row.membership.offboardedAt.toISOString() : null,
    period,
    targets: [...metrics].map((metric) => ({
      metric,
      target: targetValueByMetric.get(metric) ?? null,
      actual: actualValueByMetric.get(metric) ?? null,
    })),
    fitco: [1, 2, 3, 4, 5]
      .filter((phase) => fitcoValueByPhase.has(String(phase)))
      .map((phase) => ({ phase, value: fitcoValueByPhase.get(String(phase))! })),
    heads: headsWithQuestions,
    overall,
    hasScores: scoreValueByQuestion.size > 0,
  };
}

/** Loads the full scorecard for one membership, scoped to a quarter or the "overall" (cross-quarter average) view. */
export async function getMembershipDetail(
  membershipId: string,
  period: PeriodParam
): Promise<MembershipDetail> {
  const raw = await loadRawMembershipData(membershipId);
  return computeDetailForPeriod(raw, period);
}

/** Per-quarter overall score + base actual, for the profile page's trend strip — one raw fetch, not four. */
export async function getMembershipHistory(membershipId: string): Promise<MembershipHistoryPoint[]> {
  const raw = await loadRawMembershipData(membershipId);
  return QUARTERS.map((period) => {
    const detail = computeDetailForPeriod(raw, period);
    const base = detail.targets.find((t) => t.metric === "base")?.actual ?? null;
    return { period, overall: detail.overall, base, hasScores: detail.hasScores };
  });
}
