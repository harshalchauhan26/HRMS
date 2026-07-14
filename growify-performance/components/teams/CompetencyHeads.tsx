import RatingBar from "@/components/common/RatingBar";
import { scoreColor } from "@/lib/format";
import type { ApiHeadWithQuestions } from "@/types/api";

export default function CompetencyHeads({ heads }: { heads: ApiHeadWithQuestions[] }) {
  return (
    <div className="space-y-2.5">
      {heads.map((head) => {
        const color = scoreColor(head.average);
        return (
          <div key={head.id} className="flex items-center gap-2.5">
            <span className="flex-1 text-[11.5px] leading-tight text-ink-soft">{head.name}</span>
            <RatingBar percent={((head.average ?? 0) / 4) * 100} color={color} className="w-30 shrink-0" />
            <span className="w-8 shrink-0 text-right font-mono text-[12.5px] font-semibold" style={{ color }}>
              {head.average != null ? head.average.toFixed(1) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
