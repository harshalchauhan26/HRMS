import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE: Record<1 | 2 | 3 | 4, { bg: string; border: string; color: string }> = {
  4: { bg: "var(--okbg)", border: "var(--r4)", color: "var(--r4)" },
  3: { bg: "#E8F0FE", border: "var(--r3)", color: "var(--r3)" },
  2: { bg: "var(--warnbg)", border: "var(--r2)", color: "var(--r2)" },
  1: { bg: "var(--badbg)", border: "var(--r1)", color: "var(--r1)" },
};

interface ScoreSegmentedControlProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

export default function ScoreSegmentedControl({ value, onChange }: ScoreSegmentedControlProps) {
  return (
    <div className="flex shrink-0 gap-1.5">
      {([1, 2, 3, 4] as const).map((v) => {
        const selected = value === v;
        const tone = TONE[v];
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(selected ? null : v)}
            className={cn(
              "grid size-8.5 place-items-center rounded-lg border font-mono text-[13px] font-semibold transition-colors",
              !selected && "border-hair text-muted-foreground hover:border-faint"
            )}
            style={selected ? { background: tone.bg, borderColor: tone.border, color: tone.color } : undefined}
          >
            {v}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onChange(null)}
        title="Clear"
        className="grid size-8.5 place-items-center rounded-lg border border-dashed border-hair text-faint transition-colors hover:border-faint"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
