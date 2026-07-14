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
  setRole: (role: AuthRole) => void;
  logout: () => void;
}

/**
 * In-memory only, matching the prototype: refreshing the page drops back to the
 * login screen. Swap for real Supabase Auth session state later.
 */
export const useAuthStore = create<AuthState>((set) => ({
  role: null,
  setRole: (role) => set({ role }),
  logout: () => set({ role: null }),
}));
