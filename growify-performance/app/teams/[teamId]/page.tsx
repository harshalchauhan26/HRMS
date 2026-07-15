"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Pencil, Target } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import TeamBrief from "@/components/teams/TeamBrief";
import TeamOverviewMini from "@/components/teams/TeamOverviewMini";
import MemberRow from "@/components/teams/MemberRow";
import ScoringSheet from "@/components/review/ScoringSheet";
import SwotDrawer from "@/components/swot/SwotDrawer";
import AddMemberSheet from "@/components/teams/AddMemberSheet";
import AddQuestionSheet from "@/components/settings/AddQuestionSheet";
import SetTeamTargetsSheet from "@/components/teams/SetTeamTargetsSheet";
import PeriodToggle from "@/components/common/PeriodToggle";
import RenameSheet from "@/components/common/RenameSheet";
import ConfirmDeleteButton from "@/components/common/ConfirmDeleteButton";
import { Button } from "@/components/ui/button";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useDeleteTeam, useRenameTeam, useRestoreTeam, useTeamDetail } from "@/hooks/queries/useTeams";
import { useDepartments } from "@/hooks/queries/useDepartments";
import { useAddPersonalQuestion, useOffboardMember } from "@/hooks/queries/useMemberships";
import { usePeriodStore } from "@/store/usePeriodStore";

export default function TeamDetailPage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const { role, allowed } = useRoleGuard({ teamId: params.teamId });
  const period = usePeriodStore((s) => s.period);
  const { data: team, isLoading } = useTeamDetail(params.teamId, period);
  // includeInactive: true — this page should still resolve the parent department name even if
  // the department itself was archived (not erased) via a cascade delete.
  const { data: departments } = useDepartments(period, true);

  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const [reviewMemberId, setReviewMemberId] = useState<string | null>(null);
  const [selfAssessMemberId, setSelfAssessMemberId] = useState<string | null>(null);
  const [swotMemberId, setSwotMemberId] = useState<string | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addQuestionMemberId, setAddQuestionMemberId] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [setTargetsOpen, setSetTargetsOpen] = useState(false);

  const addPersonalQuestion = useAddPersonalQuestion(addQuestionMemberId ?? "");
  const renameTeam = useRenameTeam();
  const deleteTeam = useDeleteTeam();
  const restoreTeam = useRestoreTeam();
  const offboardMember = useOffboardMember();

  if (!allowed || !role) return null;
  if (isLoading || !team) {
    return (
      <AppLayout breadcrumbs={[{ label: "Teams" }]}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppLayout>
    );
  }

  const isMemberTier = role.tier === "member";
  const canEdit = role.tier === "admin" || role.tier === "lead";
  const all = team.lead ? [team.lead, ...team.members] : team.members;
  const ownDetail = isMemberTier ? all.find((m) => m.id === role.membershipId) : null;
  const department = departments?.find((d) => d.id === team.departmentId);

  function toggle(id: string) {
    setOpenMemberId((prev) => (prev === id ? null : id));
  }

  return (
    <AppLayout
      breadcrumbs={
        role.tier === "admin"
          ? [
              { label: "Departments", href: "/departments" },
              { label: department?.name ?? "Teams", href: `/departments/${team.departmentId}` },
              { label: team.name },
            ]
          : [{ label: team.name }]
      }
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11.5px] font-semibold tracking-wide text-brand uppercase">
            {department?.name ?? "Team"} · {team.name}
            {canEdit && (
              <button
                onClick={() => setRenameOpen(true)}
                className="text-faint hover:text-brand-ink"
                title="Rename team"
              >
                <Pencil className="size-3" />
              </button>
            )}
          </div>
          <h1 className="mt-1.5 font-heading text-[28px] font-semibold tracking-tight">{team.name}</h1>
          <p className="text-[13.5px] text-muted-foreground">
            {isMemberTier
              ? "Team brief up top. Your scorecard is expanded below."
              : "Team brief up top. Click any member — lead included — to expand their card."}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <PeriodToggle />
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => setSetTargetsOpen(true)}
              className="gap-1.5"
              disabled={period === "overall"}
              title={period === "overall" ? "Switch to a specific quarter to set targets" : undefined}
            >
              <Target className="size-3.5" /> Set team targets
            </Button>
          )}
          {canEdit && <Button onClick={() => setAddMemberOpen(true)}>+ Add member</Button>}
          {role.tier === "admin" && (
            <ConfirmDeleteButton
              label="Delete team"
              confirmMessage={`Delete "${team.name}"? All ${all.length} active member(s) will be automatically offboarded, and the team archived (not erased — recoverable later).`}
              onConfirm={() => deleteTeam.mutateAsync(team.id).then(() => router.push(`/departments/${team.departmentId}`))}
            />
          )}
        </div>
      </div>

      {!team.isActive && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#F0DBB0] bg-warnbg px-4 py-2.5 text-sm text-warn">
          <span>This team is archived — it was deleted, but its history is preserved.</span>
          <Button size="sm" variant="outline" onClick={() => restoreTeam.mutateAsync(team.id)}>
            Restore team
          </Button>
        </div>
      )}

      <TeamBrief team={team} />

      {!isMemberTier ? (
        <>
          {team.lead && (
            <MemberRow
              detail={team.lead}
              period={period}
              isOpen={openMemberId === team.lead.id}
              onToggle={() => toggle(team.lead!.id)}
              canEdit={canEdit}
              isSelf={role.membershipId === team.lead.id}
              onReviewScore={setReviewMemberId}
              onSelfAssess={setSelfAssessMemberId}
              onSwot={setSwotMemberId}
              onAddQuestion={setAddQuestionMemberId}
              onViewProfile={role.tier === "admin" ? (id) => router.push(`/employees/${id}`) : undefined}
              onRemove={(id) => offboardMember.mutateAsync(id)}
            />
          )}
          {team.members.map((m) => (
            <MemberRow
              key={m.id}
              detail={m}
              period={period}
              isOpen={openMemberId === m.id}
              onToggle={() => toggle(m.id)}
              canEdit={canEdit}
              isSelf={role.membershipId === m.id}
              onReviewScore={setReviewMemberId}
              onSelfAssess={setSelfAssessMemberId}
              onSwot={setSwotMemberId}
              onAddQuestion={setAddQuestionMemberId}
              onViewProfile={role.tier === "admin" ? (id) => router.push(`/employees/${id}`) : undefined}
              onRemove={(id) => offboardMember.mutateAsync(id)}
            />
          ))}
        </>
      ) : (
        <>
          {ownDetail && (
            <MemberRow
              detail={ownDetail}
              period={period}
              forceOpen
              isOpen
              onToggle={() => {}}
              canEdit={false}
              isSelf
              onReviewScore={() => {}}
              onSelfAssess={setSelfAssessMemberId}
              onSwot={setSwotMemberId}
              onAddQuestion={() => {}}
            />
          )}
          <div className="mt-3.5 rounded-2xl border border-hair bg-panel p-4 shadow-(--shadow-card)">
            <div className="mb-3 text-[11px] font-semibold tracking-wide text-faint uppercase">
              Team overview · read-only
            </div>
            <TeamOverviewMini members={all} />
          </div>
        </>
      )}

      <ScoringSheet
        membershipId={reviewMemberId}
        period={period}
        mode="reviewer"
        onClose={() => setReviewMemberId(null)}
      />
      <ScoringSheet
        membershipId={selfAssessMemberId}
        period={period}
        mode="self"
        onClose={() => setSelfAssessMemberId(null)}
      />
      <SwotDrawer membershipId={swotMemberId} period={period} onClose={() => setSwotMemberId(null)} />
      <AddMemberSheet teamId={team.id} open={addMemberOpen} onClose={() => setAddMemberOpen(false)} />
      <AddQuestionSheet
        open={!!addQuestionMemberId}
        title="Add personal question"
        onClose={() => setAddQuestionMemberId(null)}
        onSubmit={(headId, text, type) => addPersonalQuestion.mutateAsync({ headId, text, type })}
      />
      <RenameSheet
        title="Rename team"
        label="Name"
        initialName={team.name}
        open={renameOpen}
        isPending={renameTeam.isPending}
        onClose={() => setRenameOpen(false)}
        onSubmit={(name) => renameTeam.mutateAsync({ teamId: team.id, name })}
      />
      {period !== "overall" && (
        <SetTeamTargetsSheet
          teamId={team.id}
          teamName={team.name}
          memberCount={all.length}
          period={period}
          open={setTargetsOpen}
          onClose={() => setSetTargetsOpen(false)}
        />
      )}
    </AppLayout>
  );
}
