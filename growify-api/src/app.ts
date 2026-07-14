import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ZodError } from "zod";
import { HttpError } from "./lib/asyncHandler";
import { requireAuth } from "./lib/session";
import { requireAdmin } from "./lib/authz";
import { authRouter } from "./routes/auth";
import { departmentsRouter } from "./routes/departments";
import { teamsRouter } from "./routes/teams";
import { jobRolesRouter } from "./routes/jobRoles";
import { membershipsRouter } from "./routes/memberships";
import { headsRouter } from "./routes/heads";

export const app = express();

// credentials:true + an explicit origin (not "*") since the session lives in a cookie — the
// browser only ever talks to the Next.js origin though (it proxies /api/* server-side via
// next.config.ts rewrites), so this mostly matters for anyone hitting the API directly.
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000", credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);

// Every route below requires a signed-in session. Departments are admin-only end to end;
// teams/job-roles/memberships/heads each apply their own finer-grained checks per route.
app.use("/api/departments", requireAuth, requireAdmin, departmentsRouter);
app.use("/api/teams", requireAuth, teamsRouter);
app.use("/api/job-roles", requireAuth, jobRolesRouter);
app.use("/api/memberships", requireAuth, membershipsRouter);
app.use("/api/heads", requireAuth, headsRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: err.issues });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
