import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PeriodParam } from "@/types/api";

interface PeriodState {
  period: PeriodParam;
  setPeriod: (period: PeriodParam) => void;
}

/** Pure viewing preference (not domain data) — fine to persist directly via zustand. */
export const usePeriodStore = create<PeriodState>()(
  persist(
    (set) => ({
      period: "overall",
      setPeriod: (period) => set({ period }),
    }),
    { name: "growify:period" }
  )
);
