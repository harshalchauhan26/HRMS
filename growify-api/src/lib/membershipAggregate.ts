import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { fitcoScores, heads, jobRoles, memberships, questions, scores, targets, teams, users } from "../db/schema";
import { HttpError } from "./asyncHandler";
import { averageByGroup, QUARTERS, type PeriodParam, type Quarter } from "./periods";

export interface QuestionWithScore {
  id: string;
  headId: string;
  text: string;
  type: "rating" | "number";
  scope: "shared" | "personal";
  /** Self-assessment — informational only, never feeds any aggregate/official number. */
  selfValue: number | null;
  selfNote: string | null;
  /** Team lead / HR review — the official score used everywhere else in the app. */
  reviewerValue: number | null;
  reviewerNote: string | null;
}

export interface HeadWithQuestions {
  id: string;
  name: string;
  orderIndex: number;
  /** Reviewer-only average — "official". */
  average: number | null;
  /** Self-assessment average — informational only. */
  selfAverage: number | null;
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
  /** Reviewer-only overall — the official /4 number shown everywhere (headline stats, SWOT). */
  overall: number | null;
  /** Self-assessment overall — informational only, for the employee's own reflection. */
  selfOverall: number | null;
  hasScores: boolean;
  hasSelfScores: boolean;
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

  const selfScoreRows = allScoreRows.filter((s) => s.scoredBy === "self");
  const reviewerScoreRows = allScoreRows.filter((s) => s.scoredBy === "reviewer");

  // period scoping: a specific quarter filters to that quarter's rows; "overall" averages across
  // whichever quarters have data. `value` is a numeric(12,2) column — postgres.js/drizzle return
  // numeric columns as strings, so every read here goes through Number(...).
  function valueByQuestion(rows: typeof allScoreRows) {
    return period === "overall"
      ? averageByGroup(rows, (s) => s.questionId, (s) => Number(s.value))
      : new Map(rows.filter((s) => s.period === period).map((s) => [s.questionId, Number(s.value)]));
  }
  function noteByQuestion(rows: typeof allScoreRows) {
    return new Map(
      rows
        .filter((s) => period === "overall" || s.period === period)
        .filter((s) => s.note)
        .map((s) => [s.questionId, s.note as string])
    );
  }

  const selfValueByQuestion = valueByQuestion(selfScoreRows);
  const selfNoteByQuestion = noteByQuestion(selfScoreRows);
  const reviewerValueByQuestion = valueByQuestion(reviewerScoreRows);
  const reviewerNoteByQuestion = noteByQuestion(reviewerScoreRows);

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
    const headQuestions: QuestionWithScore[] = effectiveQuestions
      .filter((q) => q.headId === head.id)
      .map((q) => ({
        id: q.id,
        headId: q.headId,
        text: q.text,
        type: q.type,
        scope: q.scope,
        selfValue: selfValueByQuestion.get(q.id) ?? null,
        selfNote: selfNoteByQuestion.get(q.id) ?? null,
        reviewerValue: reviewerValueByQuestion.get(q.id) ?? null,
        reviewerNote: reviewerNoteByQuestion.get(q.id) ?? null,
      }));

    // Only "rating" (1-4) questions feed the /4 averages — "number" questions are informational
    // data points on their own scale, not comparable to a competency rating.
    const ratingQuestions = headQuestions.filter((q) => q.type === "rating");
    const selfScored = ratingQuestions.filter((q) => q.selfValue != null);
    const reviewerScored = ratingQuestions.filter((q) => q.reviewerValue != null);
    const selfAverage = selfScored.length
      ? selfScored.reduce((sum, q) => sum + (q.selfValue as number), 0) / selfScored.length
      : null;
    const average = reviewerScored.length
      ? reviewerScored.reduce((sum, q) => sum + (q.reviewerValue as number), 0) / reviewerScored.length
      : null;

    return { id: head.id, name: head.name, orderIndex: head.orderIndex, average, selfAverage, questions: headQuestions };
  });

  const scoredHeads = headsWithQuestions.filter((h) => h.average != null);
  const overall = scoredHeads.length
    ? scoredHeads.reduce((sum, h) => sum + (h.average as number), 0) / scoredHeads.length
    : null;

  const selfScoredHeads = headsWithQuestions.filter((h) => h.selfAverage != null);
  const selfOverall = selfScoredHeads.length
    ? selfScoredHeads.reduce((sum, h) => sum + (h.selfAverage as number), 0) / selfScoredHeads.length
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
    selfOverall,
    hasScores: reviewerValueByQuestion.size > 0,
    hasSelfScores: selfValueByQuestion.size > 0,
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
