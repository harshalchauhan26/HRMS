import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PillProps {
  children: ReactNode;
  tone?: "neutral" | "brand" | "ok" | "warn" | "dashed";
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<PillProps["tone"]>, string> = {
  neutral: "bg-hair2 text-ink-soft border border-hair",
  brand: "bg-brand-soft text-brand-ink",
  ok: "bg-okbg text-ok",
  warn: "bg-warnbg text-warn",
  dashed: "border border-dashed border-brand bg-brand-soft text-brand-ink",
};

export default function Pill({ children, tone = "neutral", className }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
