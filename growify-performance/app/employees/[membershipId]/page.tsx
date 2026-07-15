"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Download, Pencil, UserX, UserCheck } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import InitialsAvatar from "@/components/common/InitialsAvatar";
import Pill from "@/components/common/Pill";
import PeriodToggle from "@/components/common/PeriodToggle";
import MemberRow from "@/components/teams/MemberRow";
import ScoringSheet from "@/components/review/ScoringSheet";
import SwotDrawer from "@/components/swot/SwotDrawer";
import AddQuestionSheet from "@/components/settings/AddQuestionSheet";
import EditEmployeeSheet from "@/components/employees/EditEmployeeSheet";
import ScoreTrend from "@/components/employees/ScoreTrend";
import AuditLog from "@/components/employees/AuditLog";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/apiClient";
import { downloadCsv, toCsv } from "@/lib/csv";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useDepartments, useDepartmentTeams } from "@/hooks/queries/useDepartments";
import {
  useAddPersonalQuestion,
  useMembershipAudit,
  useMembershipDetail,
  useMembershipHistory,
  useOffboardMembership,
  useReactivateMembership,
} from "@/hooks/queries/useMemberships";
import { usePeriodStore } from "@/store/usePeriodStore";

export default function EmployeeProfilePage() {
  const { allowed } = useRoleGuard({ adminOnly: true });
  const params = useParams<{ membershipId: string }>();
  const period = usePeriodStore((s) => s.period);

  const { data: detail, isLoading } = useMembershipDetail(params.membershipId, period);
  const { data: history } = useMembershipHistory(params.membershipId);
  const { data: auditEntries } = useMembershipAudit(params.membershipId);
  const { data: departments } = useDepartments(period);

  const [scoringOpen, setScoringOpen] = useState(false);
  const [swotOpen, setSwotOpen] = useState(false);
  const [addQuestionOpen, setAddQuestionOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Only needed for the edit sheet's team picker — deferred so viewing a profile doesn't fire
  // an extra round trip against a high-latency DB (see growify-api perf note) for a form nobody opened.
  const { data: deptTeams } = useDepartmentTeams(detail?.team.departmentId ?? "", period, editOpen);

  const addPersonalQuestion = useAddPersonalQuestion(params.membershipId);
  const offboard = useOffboardMembership(params.membershipId);
  const reactivate = useReactivateMembership(params.membershipId);

  if (!allowed) return null;
  if (isLoading || !detail) {
    return (
      <AppLayout breadcrumbs={[{ label: "Departments", href: "/departments" }, { label: "Employee" }]}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppLayout>
    );
  }

  const department = departments?.find((d) => d.id === detail.team.departmentId);

  function exportScorecardCsv() {
    if (!detail) return;
    const rows = [
      ...detail.heads.flatMap((head) =>
        head.questions.map((q) => ({
          section: head.name,
          item: q.text,
          selfValue: q.selfValue,
          selfNote: q.selfNote,
          reviewerValue: q.reviewerValue,
          reviewerNote: q.reviewerNote,
        }))
      ),
      ...detail.targets.map((t) => ({
        section: "Targets",
        item: t.metric,
        selfValue: null,
        selfNote: t.target != null ? `target: ${t.target}` : null,
        reviewerValue: t.actual,
        reviewerNote: null,
      })),
      ...detail.fitco.map((f) => ({
        section: "FITCO",
        item: `Phase ${f.phase}`,
        selfValue: null,
        selfNote: null,
        reviewerValue: f.value,
        reviewerNote: null,
      })),
    ];
    downloadCsv(`${detail.user.name}-scorecard-${period}.csv`, toCsv(rows));
  }

  function handleOffboard() {
    if (!window.confirm(`Offboard ${detail!.user.name}? Their scorecard history stays intact.`)) return;
    offboard
      .mutateAsync()
      .then(() => toast.success(`${detail!.user.name} marked as offboarded.`))
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Couldn't offboard."));
  }

  function handleReactivate() {
    reactivate
      .mutateAsync()
      .then(() => toast.success(`${detail!.user.name} reactivated.`))
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Couldn't reactivate."));
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Departments", href: "/departments" },
        { label: department?.name ?? "Department", href: `/departments/${detail.team.departmentId}` },
        { label: detail.team.name, href: `/teams/${detail.team.id}` },
        { label: detail.user.name },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <InitialsAvatar id={detail.id} name={detail.user.name} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-[24px] font-semibold tracking-tight">{detail.user.name}</h1>
              {detail.isLead && <Pill tone="brand">Team Lead</Pill>}
              {detail.isActive ? <Pill tone="ok">Active</Pill> : <Pill tone="warn">Offboarded</Pill>}
            </div>
            <p className="text-[13px] text-muted-foreground">
              {detail.jobRole.name} · {detail.team.name} · {detail.user.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <PeriodToggle />
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Pencil className="size-3.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" onClick={exportScorecardCsv} className="gap-1.5">
            <Download className="size-3.5" /> Export CSV
          </Button>
          {detail.isActive ? (
            <Button size="sm" variant="outline" onClick={handleOffboard} className="gap-1.5 text-destructive">
              <UserX className="size-3.5" /> Offboard
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleReactivate} className="gap-1.5">
              <UserCheck className="size-3.5" /> Reactivate
            </Button>
          )}
        </div>
      </div>

      {history && (
        <div className="mb-5">
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">
            Score trend · by quarter
          </div>
          <ScoreTrend history={history} />
        </div>
      )}

      <MemberRow
        detail={detail}
        period={period}
        forceOpen
        isOpen
        onToggle={() => {}}
        canEdit={detail.isActive}
        onReviewScore={() => setScoringOpen(true)}
        onSwot={() => setSwotOpen(true)}
        onAddQuestion={() => setAddQuestionOpen(true)}
      />

      <div className="mt-5">
        <div className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">History</div>
        <AuditLog entries={auditEntries ?? []} />
      </div>

      <ScoringSheet
        membershipId={scoringOpen ? detail.id : null}
        period={period}
        mode="reviewer"
        onClose={() => setScoringOpen(false)}
      />
      <SwotDrawer membershipId={swotOpen ? detail.id : null} period={period} onClose={() => setSwotOpen(false)} />
      <AddQuestionSheet
        open={addQuestionOpen}
        title="Add personal question"
        onClose={() => setAddQuestionOpen(false)}
        onSubmit={(headId, text, type) => addPersonalQuestion.mutateAsync({ headId, text, type })}
      />
      <EditEmployeeSheet
        detail={detail}
        teams={deptTeams ?? []}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </AppLayout>
  );
}
