import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  unique,
  check,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const memberLevelEnum = pgEnum("member_level", ["Lead", "Junior-Mid", "Junior"]);

/**
 * Quarterly reporting periods (Indian FY: Apr-Jun / Jul-Sep / Oct-Dec / Jan-Mar). Every
 * period-scoped row (scores, targets, fitco_scores, swot_reports) is stored against exactly
 * one of these four quarters — "Overall" is not a stored row, it's computed on read by
 * averaging across whichever quarters have data. See src/lib/periods.ts.
 */
export const periodEnum = pgEnum("period", ["q1", "q2", "q3", "q4"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  // Deleting a department archives it (and cascades to archive its teams + offboard their
  // members) rather than a hard DELETE — same history-preservation rationale as
  // memberships.isActive. See growify-api/src/routes/departments.ts DELETE /:id.
  isActive: boolean("is_active").notNull().default(true),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobRoles = pgTable("job_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  level: memberLevelEnum("level").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const heads = pgTable("heads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// lead_membership_id -> memberships is a circular reference (teams <-> memberships);
// declared nullable here with the FK added in a later migration once `memberships` exists.
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  leadMembershipId: uuid("lead_membership_id").references((): AnyPgColumn => memberships.id, {
    onDelete: "set null",
  }),
  // Deleting a team archives it (and offboards its members) rather than a hard DELETE — see
  // departments.isActive above and growify-api/src/routes/teams.ts DELETE /:id.
  isActive: boolean("is_active").notNull().default(true),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    jobRoleId: uuid("job_role_id")
      .notNull()
      .references(() => jobRoles.id, { onDelete: "restrict" }),
    isLead: boolean("is_lead").notNull().default(false),
    // Offboarding is a soft-delete: scores/targets/FITCO/SWOT history stays intact (cascade
    // deletes would wipe a departed employee's whole performance record) and read routes filter
    // to isActive=true by default. See growify-api/src/routes/memberships.ts offboard/reactivate.
    isActive: boolean("is_active").notNull().default(true),
    offboardedAt: timestamp("offboarded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("memberships_user_team_unique").on(table.userId, table.teamId)]
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    headId: uuid("head_id")
      .notNull()
      .references(() => heads.id, { onDelete: "cascade" }),
    jobRoleId: uuid("job_role_id").references(() => jobRoles.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id").references(() => memberships.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "questions_owner_xor",
      sql`(${table.jobRoleId} is not null and ${table.membershipId} is null) or (${table.jobRoleId} is null and ${table.membershipId} is not null)`
    ),
  ]
);

export const scores = pgTable(
  "scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    period: periodEnum("period").notNull(),
    value: integer("value").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("scores_membership_question_period_unique").on(
      table.membershipId,
      table.questionId,
      table.period
    ),
    check("scores_value_range", sql`${table.value} between 1 and 4`),
  ]
);

export const targets = pgTable(
  "targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    period: periodEnum("period").notNull(),
    metric: text("metric").notNull(),
    target: numeric("target", { precision: 10, scale: 4 }),
    actual: numeric("actual", { precision: 10, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("targets_membership_period_metric_unique").on(
      table.membershipId,
      table.period,
      table.metric
    ),
  ]
);

export const fitcoScores = pgTable(
  "fitco_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    period: periodEnum("period").notNull(),
    phase: integer("phase").notNull(),
    value: numeric("value", { precision: 6, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("fitco_membership_period_phase_unique").on(
      table.membershipId,
      table.period,
      table.phase
    ),
    check("fitco_phase_range", sql`${table.phase} between 1 and 5`),
  ]
);

// Actor identity here comes from the client-selected demo role (see useAuthStore), not a
// verified session — there's no real auth in this app yet. Good enough for "who clicked this on
// this machine," not a compliance-grade audit trail.
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  membershipId: uuid("membership_id")
    .notNull()
    .references(() => memberships.id, { onDelete: "cascade" }),
  actorName: text("actor_name"),
  action: text("action").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const swotReports = pgTable("swot_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  membershipId: uuid("membership_id")
    .notNull()
    .references(() => memberships.id, { onDelete: "cascade" }),
  // Plain text, not periodEnum: unlike scores/targets/fitco (quarterly inputs), a SWOT report
  // is a derived output and can legitimately be generated+stored for "overall" too.
  period: text("period").notNull(),
  evidence: jsonb("evidence").notNull(),
  summary: text("summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
