import { Router } from "express";
import { db } from "../db/client";
import { heads } from "../db/schema";
import { asyncHandler } from "../lib/asyncHandler";

export const headsRouter = Router();

headsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(heads).orderBy(heads.orderIndex);
    res.json(rows);
  })
);
