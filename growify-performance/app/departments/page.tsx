"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import DepartmentCard from "@/components/teams/DepartmentCard";
import AddTile from "@/components/common/AddTile";
import PeriodToggle from "@/components/common/PeriodToggle";
import SearchInput from "@/components/common/SearchInput";
import CreateDepartmentSheet from "@/components/departments/CreateDepartmentSheet";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import {
  useDeleteDepartment,
  useDepartments,
  useRestoreDepartment,
} from "@/hooks/queries/useDepartments";
import { usePeriodStore } from "@/store/usePeriodStore";

export default function DepartmentsPage() {
  const { allowed } = useRoleGuard({ adminOnly: true });
  const router = useRouter();
  const period = usePeriodStore((s) => s.period);
  const [showArchived, setShowArchived] = useState(false);
  const { data: departments, isLoading } = useDepartments(period, showArchived);
  const deleteDepartment = useDeleteDepartment();
  const restoreDepartment = useRestoreDepartment();
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredDepartments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments ?? [];
    return (departments ?? []).filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, query]);

  if (!allowed) return null;

  return (
    <AppLayout breadcrumbs={[{ label: "Departments", href: "/departments" }]}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11.5px] font-semibold tracking-wide text-brand uppercase">Workspace</div>
          <h1 className="mt-1.5 font-heading text-[28px] font-semibold tracking-tight">Departments</h1>
          <p className="text-[13.5px] text-muted-foreground">
            Each department holds its own teams, roles and scorecards.
          </p>
        </div>
        <PeriodToggle />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search departments…" className="max-w-xs" />
        <label className="flex items-center gap-1.5 text-xs text-ink-soft">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDepartments.map((dept) => (
          <DepartmentCard
            key={dept.id}
            name={dept.name}
            teamCount={dept.teamCount}
            memberCount={dept.memberCount}
            avgBase={dept.avgBase}
            isActive={dept.isActive}
            onClick={() => router.push(`/departments/${dept.id}`)}
            onDelete={() => deleteDepartment.mutateAsync(dept.id)}
            onRestore={() => restoreDepartment.mutateAsync(dept.id)}
          />
        ))}
        <AddTile label="New department" onClick={() => setCreateOpen(true)} />
      </div>

      <CreateDepartmentSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppLayout>
  );
}
