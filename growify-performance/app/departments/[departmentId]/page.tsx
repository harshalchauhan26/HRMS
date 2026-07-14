"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, Pencil, Plus } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import TeamCard from "@/components/teams/TeamCard";
import AddTile from "@/components/common/AddTile";
import PeriodToggle from "@/components/common/PeriodToggle";
import SearchInput from "@/components/common/SearchInput";
import RenameSheet from "@/components/common/RenameSheet";
import ConfirmDeleteButton from "@/components/common/ConfirmDeleteButton";
import CreateTeamSheet from "@/components/teams/CreateTeamSheet";
import EmployeesTable from "@/components/employees/EmployeesTable";
import AddEmployeeSheet from "@/components/employees/AddEmployeeSheet";
import { Button } from "@/components/ui/button";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import {
  useDeleteDepartment,
  useDepartmentEmployees,
  useDepartments,
  useDepartmentTeams,
  useRenameDepartment,
  useRestoreDepartment,
} from "@/hooks/queries/useDepartments";
import { useDeleteTeam, useRestoreTeam } from "@/hooks/queries/useTeams";
import { usePeriodStore } from "@/store/usePeriodStore";
import { teamAccentColor } from "@/lib/format";
import { cn } from "@/lib/utils";
import { downloadCsv, toCsv } from "@/lib/csv";

export default function DepartmentTeamsPage() {
  const { allowed } = useRoleGuard({ adminOnly: true });
  const router = useRouter();
  const params = useParams<{ departmentId: string }>();
  const period = usePeriodStore((s) => s.period);
  // includeInactive: true so this page still resolves the department/teams if the user got
  // here via the "Show archived" list — archived items aren't erased, they should stay reachable.
  const { data: departments } = useDepartments(period, true);
  const [showArchivedTeams, setShowArchivedTeams] = useState(false);
  const { data: teams, isLoading } = useDepartmentTeams(params.departmentId, period, true, showArchivedTeams);
  const [tab, setTab] = useState<"teams" | "employees">("teams");
  const [teamQuery, setTeamQuery] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const { data: employees, isLoading: employeesLoading } = useDepartmentEmployees(
    params.departmentId,
    showInactive
  );
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  const renameDepartment = useRenameDepartment();
  const deleteDepartment = useDeleteDepartment();
  const restoreDepartment = useRestoreDepartment();
  const deleteTeam = useDeleteTeam();
  const restoreTeam = useRestoreTeam();

  const department = departments?.find((d) => d.id === params.departmentId);

  const filteredTeams = useMemo(() => {
    const q = teamQuery.trim().toLowerCase();
    if (!q) return teams ?? [];
    return (teams ?? []).filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, teamQuery]);

  const filteredEmployees = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    if (!q) return employees ?? [];
    return (employees ?? []).filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.teamName.toLowerCase().includes(q) ||
        e.jobRoleName.toLowerCase().includes(q)
    );
  }, [employees, employeeQuery]);

  if (!allowed) return null;

  function exportEmployeesCsv() {
    const csv = toCsv(
      filteredEmployees.map((e) => ({
        name: e.name,
        email: e.email,
        designation: e.jobRoleName,
        team: e.teamName,
        role: e.isLead ? "Team Lead" : "Member",
        status: e.isActive ? "Active" : "Offboarded",
      }))
    );
    downloadCsv(`${department?.name ?? "department"}-employees.csv`, csv);
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Departments", href: "/departments" },
        { label: department?.name ?? "Teams" },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11.5px] font-semibold tracking-wide text-brand uppercase">
            {department?.name ?? "Department"}
            {department && (
              <button
                onClick={() => setRenameOpen(true)}
                className="text-faint hover:text-brand-ink"
                title="Rename department"
              >
                <Pencil className="size-3" />
              </button>
            )}
          </div>
          <h1 className="mt-1.5 font-heading text-[28px] font-semibold tracking-tight">
            {tab === "teams" ? "Teams" : "Employees"}
          </h1>
          <p className="text-[13.5px] text-muted-foreground">
            {tab === "teams"
              ? "Pick a team to open its lead and members."
              : "Everyone in this department, across all its teams."}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <PeriodToggle />
          {department?.isActive && (
            <ConfirmDeleteButton
              label="Delete department"
              confirmMessage={`Delete "${department.name}"? All ${department.memberCount} active employee(s) across its ${department.teamCount} team(s) will be automatically offboarded, and the department archived (not erased — recoverable later).`}
              onConfirm={() => deleteDepartment.mutateAsync(department.id).then(() => router.push("/departments"))}
            />
          )}
        </div>
      </div>

      {department && !department.isActive && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#F0DBB0] bg-warnbg px-4 py-2.5 text-sm text-warn">
          <span>This department is archived — it was deleted, but its history is preserved.</span>
          <Button size="sm" variant="outline" onClick={() => restoreDepartment.mutateAsync(department.id)}>
            Restore department
          </Button>
        </div>
      )}

      <div className="mb-5 flex w-fit items-center gap-1 rounded-xl border border-hair bg-panel p-1">
        <button
          onClick={() => setTab("teams")}
          className={cn(
            "rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
            tab === "teams" ? "bg-brand-soft text-brand-ink" : "text-muted-foreground hover:text-ink-soft"
          )}
        >
          Teams
        </button>
        <button
          onClick={() => setTab("employees")}
          className={cn(
            "rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
            tab === "employees" ? "bg-brand-soft text-brand-ink" : "text-muted-foreground hover:text-ink-soft"
          )}
        >
          Employees
        </button>
      </div>

      {tab === "teams" ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <SearchInput value={teamQuery} onChange={setTeamQuery} placeholder="Search teams…" className="max-w-xs" />
            <label className="flex items-center gap-1.5 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={showArchivedTeams}
                onChange={(e) => setShowArchivedTeams(e.target.checked)}
              />
              Show archived
            </label>
          </div>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                accent={teamAccentColor(team.id)}
                onClick={() => router.push(`/teams/${team.id}`)}
                onDelete={() => deleteTeam.mutateAsync(team.id)}
                onRestore={() => restoreTeam.mutateAsync(team.id)}
              />
            ))}
            <AddTile label="New team" onClick={() => setCreateTeamOpen(true)} />
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SearchInput
                value={employeeQuery}
                onChange={setEmployeeQuery}
                placeholder="Search employees…"
                className="w-64"
              />
              <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                Show offboarded
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={exportEmployeesCsv}
                className="gap-1.5"
                disabled={!filteredEmployees.length}
              >
                <Download className="size-3.5" /> Export CSV
              </Button>
              <Button size="sm" onClick={() => setAddEmployeeOpen(true)} className="gap-1.5" disabled={!teams?.length}>
                <Plus className="size-3.5" /> Add employee
              </Button>
            </div>
          </div>
          {employeesLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!employeesLoading && !teams?.length && (
            <p className="text-sm text-muted-foreground">Create a team first, then add employees to it.</p>
          )}
          {!!teams?.length && <EmployeesTable employees={filteredEmployees} />}
        </>
      )}

      <CreateTeamSheet
        departmentId={params.departmentId}
        open={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
      />
      <AddEmployeeSheet teams={teams ?? []} open={addEmployeeOpen} onClose={() => setAddEmployeeOpen(false)} />
      {department && (
        <RenameSheet
          title="Rename department"
          label="Name"
          initialName={department.name}
          open={renameOpen}
          isPending={renameDepartment.isPending}
          onClose={() => setRenameOpen(false)}
          onSubmit={(name) => renameDepartment.mutateAsync({ id: department.id, name })}
        />
      )}
    </AppLayout>
  );
}
