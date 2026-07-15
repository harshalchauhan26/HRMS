import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { heads } from "../db/schema";
import { asyncHandler, HttpError } from "../lib/asyncHandler";
import { requireAdmin } from "../lib/authz";

export const headsRouter = Router();

const createHeadSchema = z.object({ name: z.string().min(1) });
const updateHeadSchema = z.object({
  name: z.string().min(1).optional(),
  orderIndex: z.number().int().min(0).optional(),
});

headsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(heads).orderBy(heads.orderIndex);
    res.json(rows);
  })
);

headsRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = createHeadSchema.parse(req.body);
    const existing = await db.select().from(heads);
    const [created] = await db
      .insert(heads)
      .values({ name: body.name, orderIndex: existing.length })
      .returning();
    res.status(201).json(created);
  })
);

headsRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = updateHeadSchema.parse(req.body);
    const [head] = await db.select().from(heads).where(eq(heads.id, req.params.id));
    if (!head) throw new HttpError(404, `Head ${req.params.id} not found`);

    const [updated] = await db
      .update(heads)
      .set({
        ...(body.name != null ? { name: body.name } : {}),
        ...(body.orderIndex != null ? { orderIndex: body.orderIndex } : {}),
      })
      .where(eq(heads.id, req.params.id))
      .returning();
    res.json(updated);
  })
);

headsRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [head] = await db.select().from(heads).where(eq(heads.id, req.params.id));
    if (!head) throw new HttpError(404, `Head ${req.params.id} not found`);

    // Hard delete cascades to every question under this category (shared + personal) and any
    // scores against them — heads have no soft-delete/archive concept, unlike
    // departments/teams/memberships. The frontend confirm dialog spells this out.
    await db.delete(heads).where(eq(heads.id, req.params.id));
    res.status(204).end();
  })
);
