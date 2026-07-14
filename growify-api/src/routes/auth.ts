import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import { asyncHandler, HttpError } from "../lib/asyncHandler";
import {
  clearSessionCookie,
  loadAuthContext,
  requireAuth,
  setSessionCookie,
  signSession,
  type AuthContext,
} from "../lib/session";

export const authRouter = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const googleSchema = z.object({ idToken: z.string().min(1) });

export type PublicRole =
  | { tier: "admin"; name: string }
  | { tier: "lead" | "member"; name: string; membershipId: string; teamId: string };

/**
 * Projects an AuthContext to the shape the frontend's role store expects. MVP assumption: a
 * non-admin person has at most one active membership — if someone is later added to a second
 * team, this just picks the first and ignores the rest (not a current feature, not worth the
 * extra complexity of multi-team sessions yet).
 */
function publicRole(auth: AuthContext): PublicRole | null {
  if (auth.isAdmin) return { tier: "admin", name: auth.name };
  const membership = auth.memberships[0];
  if (!membership) return null;
  return {
    tier: membership.isLead ? "lead" : "member",
    name: auth.name,
    membershipId: membership.membershipId,
    teamId: membership.teamId,
  };
}

function requireRole(auth: AuthContext): PublicRole {
  const role = publicRole(auth);
  if (!role) {
    throw new HttpError(403, "This account has no department/team assigned yet — ask an admin to add you first.");
  }
  return role;
}

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const [user] = await db.select().from(users).where(eq(users.email, body.email.toLowerCase()));
    if (!user || !user.passwordHash) throw new HttpError(401, "Invalid email or password.");

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw new HttpError(401, "Invalid email or password.");

    const auth = await loadAuthContext(user.id);
    const role = requireRole(auth!);

    setSessionCookie(res, signSession(user.id));
    res.json({ role });
  })
);

let googleClient: OAuth2Client | null = null;
function getGoogleClient(): OAuth2Client {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new HttpError(500, "Google sign-in isn't configured on this server yet.");
  }
  if (!googleClient) googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return googleClient;
}

authRouter.post(
  "/google",
  asyncHandler(async (req, res) => {
    const body = googleSchema.parse(req.body);
    const client = getGoogleClient();

    let email: string | undefined;
    try {
      const ticket = await client.verifyIdToken({ idToken: body.idToken, audience: process.env.GOOGLE_CLIENT_ID });
      email = ticket.getPayload()?.email;
    } catch {
      throw new HttpError(401, "Could not verify that Google sign-in.");
    }
    if (!email) throw new HttpError(401, "That Google account has no email.");

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (!user) {
      throw new HttpError(403, `No account found for ${email} — ask an admin to add you as an employee first.`);
    }

    const auth = await loadAuthContext(user.id);
    const role = requireRole(auth!);

    setSessionCookie(res, signSession(user.id));
    res.json({ role });
  })
);

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ role: requireRole(req.auth!) });
  })
);
