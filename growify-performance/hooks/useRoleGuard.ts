"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, type AuthRole } from "@/store/useAuthStore";

interface RoleGuardOptions {
  /** Route is admin-only (departments, department teams list, settings). */
  adminOnly?: boolean;
  /** Route is scoped to a team (`/teams/[teamId]`) — lead/member must match their own team. */
  teamId?: string;
}

interface RoleGuardResult {
  role: AuthRole | null;
  allowed: boolean;
}

/** Redirects unauthenticated or out-of-scope visitors; render nothing until `allowed`. Waits for
 * SessionBoot's initial GET /api/auth/me check (`hydrated`) before redirecting, so a real
 * session isn't bounced to /login while that request is still in flight. */
export function useRoleGuard(opts: RoleGuardOptions = {}): RoleGuardResult {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const hydrated = useAuthStore((s) => s.hydrated);

  const allowed =
    !!role &&
    (!opts.adminOnly || role.tier === "admin") &&
    (!opts.teamId || role.tier === "admin" || role.teamId === opts.teamId);

  useEffect(() => {
    if (!hydrated) return;
    if (!role) {
      router.replace("/login");
      return;
    }
    if (!allowed) {
      router.replace(role.teamId ? `/teams/${role.teamId}` : "/login");
    }
  }, [role, hydrated, allowed, router]);

  return { role, allowed };
}
