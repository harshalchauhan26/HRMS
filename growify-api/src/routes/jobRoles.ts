import { Router } from "express";
import { eq, isNull, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { jobRoles, questions } from "../db/schema";
import { asyncHandler, HttpError } from "../lib/asyncHandler";
import { requireAdmin } from "../lib/authz";

export const jobRolesRouter = Router();

const createJobRoleSchema = z.object({
  name: z.string().min(1),
  level: z.enum(["Lead", "Junior-Mid", "Junior"]),
});

const createQuestionSchema = z.object({
  headId: z.string().uuid(),
  text: z.string().min(1),
});

jobRolesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(jobRoles).orderBy(jobRoles.createdAt);
    res.json(rows);
  })
);

jobRolesRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = createJobRoleSchema.parse(req.body);
    const [created] = await db.insert(jobRoles).values(body).returning();
    res.status(201).json(created);
  })
);

jobRolesRouter.get(
  "/:id/questions",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(questions)
      .where(and(eq(questions.jobRoleId, req.params.id), isNull(questions.membershipId)));
    res.json(rows);
  })
);

jobRolesRouter.post(
  "/:id/questions",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = createQuestionSchema.parse(req.body);
    const [jobRole] = await db.select().from(jobRoles).where(eq(jobRoles.id, req.params.id));
    if (!jobRole) throw new HttpError(404, `Job role ${req.params.id} not found`);

    const [created] = await db
      .insert(questions)
      .values({ headId: body.headId, jobRoleId: req.params.id, text: body.text })
      .returning();
    res.status(201).json(created);
  })
);

jobRolesRouter.delete(
  "/:id/questions/:questionId",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const deleted = await db
      .delete(questions)
      .where(
        and(
          eq(questions.id, req.params.questionId),
          eq(questions.jobRoleId, req.params.id),
          isNull(questions.membershipId)
        )
      )
      .returning();
    if (!deleted.length) throw new HttpError(404, "Question not found for this role.");
    res.status(204).end();
  })
);
