import { scoreColor } from "@/lib/format";
import type { ApiMembershipHistoryPoint } from "@/types/api";

const QUARTER_LABEL: Record<string, string> = { q1: "Q1", q2: "Q2", q3: "Q3", q4: "Q4" };

export default function ScoreTrend({ history }: { history: ApiMembershipHistoryPoint[] }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {history.map((point) => (
        <div key={point.period} className="rounded-xl border border-hair p-3 text-center">
          <div className="text-[10px] font-semibold tracking-wide text-faint uppercase">
            {QUARTER_LABEL[point.period]}
          </div>
          <div
            className="mt-1 font-mono text-lg font-semibold"
            style={{ color: point.overall != null ? scoreColor(point.overall) : undefined }}
          >
            {point.overall != null ? point.overall.toFixed(2) : "—"}
          </div>
          <div className="text-[10.5px] text-muted-foreground">
            {point.base != null ? `${Math.round(point.base * 100)}% base` : "no data"}
          </div>
        </div>
      ))}
    </div>
  );
}
