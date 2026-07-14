import { create } from "zustand";

export type Tier = "admin" | "lead" | "member";

export interface AuthRole {
  tier: Tier;
  name: string;
  /** Set for lead/member — which membership + team this session is scoped to. */
  membershipId?: string;
  teamId?: string;
}

interface AuthState {
  role: AuthRole | null;
  /** True once the initial GET /api/auth/me check has resolved (found a session or not) — route
   * guards wait for this before redirecting, so a real session isn't bounced to /login while
   * still loading. See components/common/SessionBoot.tsx. */
  hydrated: boolean;
  setRole: (role: AuthRole) => void;
  setHydrated: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  role: null,
  hydrated: false,
  setRole: (role) => set({ role, hydrated: true }),
  setHydrated: () => set({ hydrated: true }),
  logout: () => set({ role: null, hydrated: true }),
}));
