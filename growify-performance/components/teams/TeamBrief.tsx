import InitialsAvatar from "@/components/common/InitialsAvatar";
import { baseColor, pct, scoreColor, teamAccentColor } from "@/lib/format";
import type { ApiTeamDetail } from "@/types/api";

export default function TeamBrief({ team }: { team: ApiTeamDetail }) {
  const all = team.lead ? [team.lead, ...team.members] : team.members;
  const bases = all
    .map((m) => m.targets.find((t) => t.metric === "base")?.actual ?? null)
    .filter((v): v is number => v != null);
  const avgBase = bases.length ? bases.reduce((a, b) => a + b, 0) / bases.length : null;

  const comps = all.map((m) => m.overall).filter((v): v is number => v != null);
  const avgComp = comps.length ? comps.reduce((a, b) => a + b, 0) / comps.length : null;
  const scoredCount = all.filter((m) => m.hasScores).length;

  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl border border-hair bg-panel px-5 pl-6 py-4.5 shadow-(--shadow-card)">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: teamAccentColor(team.id) }} />

      <div className="mb-4 flex items-center gap-3">
        {team.lead ? (
          <InitialsAvatar id={team.lead.id} name={team.lead.user.name} />
        ) : (
          <div className="grid size-8 place-items-center rounded-full bg-hair2 text-xs text-muted-foreground">—</div>
        )}
        <div>
          <div className="font-heading text-[15px] font-semibold">{team.name} — team brief</div>
          <div className="text-[11.5px] text-muted-foreground">
            {team.lead ? `Led by ${team.lead.user.name}` : "No lead assigned yet"} · {all.length} members
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-hair overflow-hidden rounded-xl border border-hair sm:grid-cols-4 sm:divide-y-0">
        <Cell label="Members" value={String(all.length)} />
        <Cell label="Team base achieved" value={pct(avgBase)} color={baseColor(avgBase).color} />
        <Cell label="Avg competency" value={avgComp ? avgComp.toFixed(2) : "—"} color={scoreColor(avgComp)} />
        <Cell label="Reviews done" value={`${scoredCount}/${all.length}`} />
      </div>
    </div>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-panel px-4 py-3">
      <div className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
