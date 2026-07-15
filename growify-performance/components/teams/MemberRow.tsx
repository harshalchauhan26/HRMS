"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import { ChevronDown, ClipboardCheck, Lock, Sparkles, UserRound, UserX } from "lucide-react";
import InitialsAvatar from "@/components/common/InitialsAvatar";
import Pill from "@/components/common/Pill";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/apiClient";
import KpiCells from "@/components/teams/KpiCells";
import FitcoChart from "@/components/teams/FitcoChart";
import CompetencyHeads from "@/components/teams/CompetencyHeads";
import TargetsEditor from "@/components/teams/TargetsEditor";
import { baseColor, pct, scoreColor, teamAccentColor } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApiMembershipDetail, Quarter } from "@/types/api";

interface MemberRowProps {
  detail: ApiMembershipDetail;
  period: Quarter | "overall";
  forceOpen?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  /** Admin or this team's lead — governs FITCO/Targets editing, the review-score button, and
   * the remove-from-team button. */
  canEdit: boolean;
  /** Viewing your own record — governs the self-assess button. */
  isSelf?: boolean;
  onReviewScore: (membershipId: string) => void;
  onSelfAssess?: (membershipId: string) => void;
  onSwot: (membershipId: string) => void;
  onAddQuestion: (membershipId: string) => void;
  /** Only admins get a profile page (edit/offboard/audit history are HR-admin actions) — omit to hide the button. */
  onViewProfile?: (membershipId: string) => void;
  /** Quick offboard action for a leaving employee — omit to hide the button (e.g. on the profile
   * page, which already has its own Offboard control in the header). */
  onRemove?: (membershipId: string) => Promise<unknown>;
}

export default function MemberRow({
  detail,
  period,
  forceOpen,
  isOpen,
  onToggle,
  canEdit,
  isSelf,
  onReviewScore,
  onSelfAssess,
  onSwot,
  onAddQuestion,
  onViewProfile,
  onRemove,
}: MemberRowProps) {
  const expanded = forceOpen || isOpen;
  const base = detail.targets.find((t) => t.metric === "base")?.actual ?? null;
  const firstName = detail.user.name.split(" ")[0];
  const showActions = (canEdit || isSelf) && period !== "overall";

  function handleRemove() {
    if (!onRemove) return;
    if (!window.confirm(`Remove ${detail.user.name} from ${detail.team.name}? Their scorecard history stays intact.`))
      return;
    onRemove(detail.id)
      .then(() => toast.success(`${detail.user.name} removed from the team.`))
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Couldn't remove — try again."));
  }

  return (
    <div
      data-member-row={detail.id}
      data-expanded={expanded}
      className="mb-2.5 overflow-hidden rounded-2xl border border-hair bg-panel shadow-(--shadow-card)"
    >
      <div
        className={cn("flex items-center gap-3.5 px-4.5 py-3.5", !forceOpen && "cursor-pointer")}
        onClick={forceOpen ? undefined : onToggle}
      >
        <InitialsAvatar id={detail.id} name={detail.user.name} size="sm" />
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {detail.user.name}
            {detail.isLead && <Pill tone="brand">Team Lead</Pill>}
          </div>
          <div className="text-[11.5px] text-muted-foreground">
            {detail.jobRole.name} · {detail.jobRole.level}
          </div>
        </div>

        <div className="ml-auto hidden items-center gap-5 sm:flex">
          <MiniStat label="Base" value={pct(base)} color={baseColor(base).color} />
          <MiniStat label="Score" value={detail.overall ? detail.overall.toFixed(2) : "—"} color={scoreColor(detail.overall)} />
        </div>

        {detail.hasScores && <Pill tone="ok">✓ Reviewed</Pill>}
        {detail.hasSelfScores && <Pill tone="dashed">Self-assessed</Pill>}

        {onViewProfile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(detail.id);
            }}
            className="flex items-center gap-1 rounded-lg border border-hair px-2 py-1 text-[11px] font-semibold text-ink-soft hover:border-brand hover:text-brand-ink"
            title="View profile"
          >
            <UserRound className="size-3" /> Profile
          </button>
        )}

        {!forceOpen && (
          <ChevronDown
            className={cn("size-4 shrink-0 text-faint transition-transform duration-300", isOpen && "rotate-180")}
          />
        )}
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-hair2 px-4.5 pt-4 pb-5">
            {!canEdit && !isSelf && (
              <div className="mb-3.5 flex items-center gap-2 rounded-lg border border-[#F0DBB0] bg-warnbg px-3 py-2.5 text-xs text-warn">
                <Lock className="size-3.5 shrink-0" />
                Read-only — scores are entered by your team lead.
              </div>
            )}

            <KpiCells detail={detail} />

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <Panel title="FITCO · 5-phase stat">
                <FitcoChart
                  membershipId={detail.id}
                  period={period}
                  fitco={detail.fitco}
                  color={teamAccentColor(detail.team.id)}
                  editable={canEdit}
                />
              </Panel>
              <Panel title="Competency heads · /4 (reviewer)">
                <CompetencyHeads heads={detail.heads} />
              </Panel>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <Panel title={`Targets${canEdit ? " · editable" : ""}`}>
                <TargetsEditor membershipId={detail.id} period={period} targets={detail.targets} editable={canEdit} />
              </Panel>
              <Panel title="Explainable AI">
                <p className="mb-3 text-xs text-muted-foreground">
                  Auto-drafted SWOT from KPI + scorecard signals, every point cites its evidence.
                </p>
                <Button size="sm" onClick={() => onSwot(detail.id)} className="gap-1.5">
                  <Sparkles className="size-3.5" /> View SWOT for {firstName}
                </Button>
              </Panel>
            </div>

            {showActions && (
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                {canEdit && (
                  <Button size="sm" onClick={() => onReviewScore(detail.id)}>
                    {detail.hasScores ? "Edit review score" : "Score (review)"}
                  </Button>
                )}
                {isSelf && onSelfAssess && (
                  <Button size="sm" variant="outline" onClick={() => onSelfAssess(detail.id)} className="gap-1.5">
                    <ClipboardCheck className="size-3.5" />
                    {detail.hasSelfScores ? "Edit self-assessment" : "Self-assess"}
                  </Button>
                )}
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => onAddQuestion(detail.id)}>
                    + Add question for {firstName}
                  </Button>
                )}
                {onRemove && (
                  <Button size="sm" variant="outline" onClick={handleRemove} className="ml-auto gap-1.5 text-destructive">
                    <UserX className="size-3.5" /> Remove from team
                  </Button>
                )}
              </div>
            )}
            {(canEdit || isSelf) && period === "overall" && (
              <div className="mt-4 flex items-center justify-between gap-2.5">
                <p className="text-[11px] text-muted-foreground">
                  Switch to a specific quarter to score competencies.
                </p>
                {onRemove && (
                  <Button size="sm" variant="outline" onClick={handleRemove} className="gap-1.5 text-destructive">
                    <UserX className="size-3.5" /> Remove from team
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-[15px] font-semibold" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-hair p-4">
      <div className="mb-3 text-[11px] font-semibold tracking-wide text-faint uppercase">{title}</div>
      {children}
    </div>
  );
}
