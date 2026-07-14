import InitialsAvatar from "@/components/common/InitialsAvatar";
import RatingBar from "@/components/common/RatingBar";
import IconDeleteButton from "@/components/common/IconDeleteButton";
import IconRestoreButton from "@/components/common/IconRestoreButton";
import Pill from "@/components/common/Pill";
import { baseColor, pct } from "@/lib/format";
import type { ApiTeamSummary } from "@/types/api";

interface TeamCardProps {
  team: ApiTeamSummary;
  accent: string;
  onClick: () => void;
  onDelete?: () => Promise<unknown>;
  onRestore?: () => Promise<unknown>;
}

export default function TeamCard({ team, accent, onClick, onDelete, onRestore }: TeamCardProps) {
  const color = baseColor(team.avgBase);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-hair bg-panel p-5 pl-6 text-left shadow-(--shadow-card) transition-transform hover:-translate-y-0.5 hover:border-[#CFCDEF] hover:shadow-lg"
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
      {!team.isActive && onRestore ? (
        <IconRestoreButton
          title="Restore team"
          onConfirm={onRestore}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100"
        />
      ) : (
        team.isActive &&
        onDelete && (
          <IconDeleteButton
            title="Delete team"
            confirmMessage={`Delete "${team.name}"? All ${team.memberCount} active member(s) will be automatically offboarded, and the team archived (not erased — recoverable later).`}
            onConfirm={onDelete}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100"
          />
        )
      )}
      <div className="flex items-center gap-2">
        <h3 className="font-heading text-base font-semibold">{team.name}</h3>
        {!team.isActive && <Pill tone="warn">Archived</Pill>}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{team.memberCount} members</div>

      <RatingBar percent={(team.avgBase ?? 0) * 100} color={color.color} className="mt-3.5" />

      <div className="mt-2.5">
        <div className="font-mono text-xl font-semibold" style={{ color: color.color }}>
          {pct(team.avgBase)}
        </div>
        <div className="text-[10.5px] tracking-wide text-muted-foreground uppercase">Team base achieved</div>
      </div>

      <div className="mt-3.5 flex items-center gap-2.5 border-t border-hair2 pt-3.5">
        {team.leadName ? (
          <>
            <InitialsAvatar id={team.leadMembershipId ?? team.id} name={team.leadName} size="sm" />
            <span>
              <div className="text-[12.5px] font-semibold">{team.leadName}</div>
              <div className="text-[10.5px] text-muted-foreground">Team Lead</div>
            </span>
          </>
        ) : (
          <span className="text-[12.5px] text-muted-foreground">No lead assigned yet</span>
        )}
      </div>
    </div>
  );
}
