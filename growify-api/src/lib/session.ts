import jwt from "jsonwebtoken";
import type { Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { memberships, users } from "../db/schema";
import { asyncHandler, HttpError } from "./asyncHandler";

const SESSION_COOKIE = "hrms_session";

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

export interface AuthContext {
  userId: string;
  name: string;
  email: string;
  isAdmin: boolean;
  /** Active memberships only — offboarded ones don't grant access. */
  memberships: { membershipId: string; teamId: string; isLead: boolean }[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function signSession(userId: string): string {
  return jwt.sign({ userId }, sessionSecret(), { expiresIn: "30d" });
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE);
}

export async function loadAuthContext(userId: string): Promise<AuthContext | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;

  const activeMemberships = await db
    .select({ id: memberships.id, teamId: memberships.teamId, isLead: memberships.isLead })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.isActive, true)));

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    memberships: activeMemberships.map((m) => ({
      membershipId: m.id,
      teamId: m.teamId,
      isLead: m.isLead,
    })),
  };
}

/** Requires a valid session cookie; attaches `req.auth`. Mount before any route that reads it. */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) throw new HttpError(401, "Not signed in.");

  let payload: { userId: string };
  try {
    payload = jwt.verify(token, sessionSecret()) as { userId: string };
  } catch {
    throw new HttpError(401, "Session expired — sign in again.");
  }

  const auth = await loadAuthContext(payload.userId);
  if (!auth) throw new HttpError(401, "Account no longer exists.");

  req.auth = auth;
  next();
});
