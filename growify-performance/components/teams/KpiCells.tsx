import { baseColor, pct, scoreColor } from "@/lib/format";
import type { ApiMembershipDetail } from "@/types/api";

export default function KpiCells({ detail }: { detail: ApiMembershipDetail }) {
  const base = detail.targets.find((t) => t.metric === "base")?.actual ?? null;
  const incentive = detail.targets.find((t) => t.metric === "incentive")?.actual ?? null;
  const eoss = detail.targets.find((t) => t.metric === "eoss")?.actual ?? null;

  const cells = [
    { label: "Base + Inc", value: pct(base), color: baseColor(base).color },
    { label: "Incentives", value: pct(incentive), color: baseColor(incentive).color },
    { label: "EOSS", value: pct(eoss), color: baseColor(eoss).color },
    {
      label: "Competency",
      value: detail.overall != null ? detail.overall.toFixed(2) : "—",
      color: scoreColor(detail.overall),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label}>
          <div className="text-[10.5px] tracking-wide text-muted-foreground uppercase">{cell.label}</div>
          <div className="mt-1 font-mono text-xl font-semibold" style={{ color: cell.color }}>
            {cell.value}
          </div>
        </div>
      ))}
    </div>
  );
}
