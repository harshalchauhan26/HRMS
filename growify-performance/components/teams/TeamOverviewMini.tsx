import RatingBar from "@/components/common/RatingBar";
import { baseColor, pct } from "@/lib/format";
import type { ApiMembershipDetail } from "@/types/api";

export default function TeamOverviewMini({ members }: { members: ApiMembershipDetail[] }) {
  return (
    <div className="space-y-2.5">
      {members.map((m) => {
        const base = m.targets.find((t) => t.metric === "base")?.actual ?? null;
        const color = baseColor(base);
        return (
          <div key={m.id} className="flex items-center gap-2.5">
            <span className="flex-1 text-[11.5px] leading-tight text-ink-soft">
              {m.user.name} · {m.jobRole.name}
            </span>
            <RatingBar percent={(base ?? 0) * 100} color={color.color} className="w-30 shrink-0" />
            <span className="w-11 shrink-0 text-right font-mono text-[12.5px] font-semibold" style={{ color: color.color }}>
              {pct(base)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
