"use client";

import { usePeriodStore } from "@/store/usePeriodStore";
import { cn } from "@/lib/utils";
import type { PeriodParam } from "@/types/api";

const OPTIONS: { value: PeriodParam; label: string }[] = [
  { value: "overall", label: "Overall" },
  { value: "q1", label: "Q1 · Apr-Jun" },
  { value: "q2", label: "Q2 · Jul-Sep" },
  { value: "q3", label: "Q3 · Oct-Dec" },
  { value: "q4", label: "Q4 · Jan-Mar" },
];

export default function PeriodToggle({ className }: { className?: string }) {
  const period = usePeriodStore((s) => s.period);
  const setPeriod = usePeriodStore((s) => s.setPeriod);

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-full border border-hair bg-panel p-1", className)}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setPeriod(opt.value)}
          className={cn(
            "rounded-full px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors",
            period === opt.value
              ? "bg-brand text-white"
              : "text-muted-foreground hover:bg-hair2 hover:text-ink"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
