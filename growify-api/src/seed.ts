import "dotenv/config";
import { db, queryClient } from "./db/client";
import { heads, jobRoles, questions, users } from "./db/schema";

const HEADS: { title: string; questions: string[] }[] = [
  {
    title: "Overall knowledge / understanding of the role",
    questions: [
      "Builds campaigns from a brief with correct objective, audience, placement & tracking, with few structural errors",
      "Diagnoses the right levers (creative, audience, bid, budget, landing page) in a logical order when a campaign underperforms",
      "Reads a performance export and interprets it correctly, separating a real signal from a misleading number",
      "Explains WHY a campaign is structured or optimised a certain way, not just replicating a template",
      "Understands the brand's positioning and business priority for the accounts they support, beyond the ad metrics",
    ],
  },
  {
    title: "Innovation",
    questions: [
      "Proposes new audience angles, testing ideas or approaches that were not asked of them",
      "Runs structured creative tests (clear variable, adequate sample, defined success metric) rather than 'try stuff'",
      "Grounds ideas in a real observation or data point rather than a hunch",
      "Suggests process or efficiency improvements to how the team works",
      "Experiments within brand guardrails rather than ignoring what the brand allows",
    ],
  },
  {
    title: "Collaboration in team",
    questions: [
      "Briefs designers/editors with clear, performance-grounded direction rather than vague taste",
      "Closes the loop, feeding winning and losing creative learnings back to the creative team",
      "Shares learnings and helps peers rather than working in isolation",
      "Reliable to work alongside — responsive, and does not create downstream bottlenecks",
      "Described by their TL and peers as easy and dependable to work with",
    ],
  },
  {
    title: "Communication with client / representing the organisation",
    questions: [
      "Reports and updates are clear enough that a client or lead can act without a follow-up conversation",
      "Contextualises numbers for the audience rather than just transcribing them",
      "Answers a client question accurately (Jr-Mid) or routes it correctly (Junior) without misrepresenting the account",
      "Flags a campaign direction that conflicts with brand guidelines before it becomes a client-facing issue",
      "Carries themselves professionally in shared/client channels — measured, accurate, on-brand for the agency",
    ],
  },
  {
    title: "Follow process / seamless timely operations",
    questions: [
      "Share of committed deliverables landing on time and complete this period",
      "Low rework required after QA or lead review",
      "Documents their work (campaign changes, test results) so it is traceable by someone else",
      "Flags slippage early rather than letting it surface late",
      "Corrected feedback stays corrected — the same issue does not recur",
    ],
  },
];

const JOB_ROLES: { name: string; level: "Lead" | "Junior-Mid" | "Junior" }[] = [
  { name: "Team Lead", level: "Lead" },
  { name: "Account Manager", level: "Junior-Mid" },
  { name: "Senior Associate", level: "Junior-Mid" },
  { name: "Associate", level: "Junior" },
  { name: "Google SME", level: "Junior-Mid" },
];

async function main() {
  console.log("Seeding job roles...");
  const insertedJobRoles = await db
    .insert(jobRoles)
    .values(JOB_ROLES)
    .onConflictDoNothing({ target: jobRoles.name })
    .returning();
  console.log(`  ${insertedJobRoles.length} inserted (rest already existed).`);

  console.log("Seeding heads + questions...");
  for (let i = 0; i < HEADS.length; i++) {
    const head = HEADS[i];
    const [insertedHead] = await db
      .insert(heads)
      .values({ name: head.title, orderIndex: i })
      .onConflictDoNothing({ target: heads.name })
      .returning();

    const headId =
      insertedHead?.id ??
      (
        await db.query.heads.findFirst({ where: (h, { eq }) => eq(h.name, head.title) })
      )?.id;
    if (!headId) throw new Error(`Failed to resolve head id for "${head.title}"`);

    for (const jobRole of JOB_ROLES) {
      const jobRoleRow = await db.query.jobRoles.findFirst({
        where: (jr, { eq }) => eq(jr.name, jobRole.name),
      });
      if (!jobRoleRow) continue;

      const existing = await db.query.questions.findMany({
        where: (q, { eq, and }) => and(eq(q.headId, headId), eq(q.jobRoleId, jobRoleRow.id)),
      });
      if (existing.length > 0) continue;

      await db.insert(questions).values(
        head.questions.map((text) => ({ headId, jobRoleId: jobRoleRow.id, text }))
      );
    }
  }
  console.log("  Heads + questions seeded for every job role.");

  console.log("Seeding admin user...");
  await db
    .insert(users)
    .values({ name: "Priya", email: "priya@growify.digital", isAdmin: true })
    .onConflictDoNothing({ target: users.email });

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
