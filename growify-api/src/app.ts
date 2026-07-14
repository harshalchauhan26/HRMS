import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { ZodError } from "zod";
import { HttpError } from "./lib/asyncHandler";
import { departmentsRouter } from "./routes/departments";
import { teamsRouter } from "./routes/teams";
import { jobRolesRouter } from "./routes/jobRoles";
import { membershipsRouter } from "./routes/memberships";
import { demoRolesRouter } from "./routes/demoRoles";
import { headsRouter } from "./routes/heads";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/departments", departmentsRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/job-roles", jobRolesRouter);
app.use("/api/memberships", membershipsRouter);
app.use("/api/demo-roles", demoRolesRouter);
app.use("/api/heads", headsRouter);

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
