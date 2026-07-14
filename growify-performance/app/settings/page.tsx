"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import RoleList from "@/components/settings/RoleList";
import QuestionSetPanel from "@/components/settings/QuestionSetPanel";
import CreateJobRoleSheet from "@/components/settings/CreateJobRoleSheet";
import AddQuestionSheet from "@/components/settings/AddQuestionSheet";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import {
  useAddSharedQuestion,
  useDeleteSharedQuestion,
  useJobRoleQuestions,
  useJobRoles,
} from "@/hooks/queries/useJobRoles";
import { useHeads } from "@/hooks/queries/useHeads";

export default function SettingsPage() {
  const { allowed } = useRoleGuard({ adminOnly: true });
  const { data: jobRoles } = useJobRoles();
  const { data: heads } = useHeads();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [addQuestionOpen, setAddQuestionOpen] = useState(false);

  const activeRoleId = selectedRoleId ?? jobRoles?.[0]?.id ?? null;
  const activeRole = jobRoles?.find((r) => r.id === activeRoleId);
  const { data: questions } = useJobRoleQuestions(activeRoleId);
  const addSharedQuestion = useAddSharedQuestion(activeRoleId ?? "");
  const deleteSharedQuestion = useDeleteSharedQuestion(activeRoleId ?? "");

  if (!allowed) return null;

  return (
    <AppLayout breadcrumbs={[{ label: "Departments", href: "/departments" }, { label: "Question sets" }]}>
      <div className="mb-5">
        <div className="text-[11.5px] font-semibold tracking-wide text-brand uppercase">Admin</div>
        <h1 className="mt-1.5 font-heading text-[28px] font-semibold tracking-tight">Question sets</h1>
        <p className="text-[13.5px] text-muted-foreground">
          Define competency questions per job role. Everyone with that role shares the set — add extras per
          person from their own scorecard.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <RoleList
          roles={jobRoles ?? []}
          selectedId={activeRoleId}
          onSelect={setSelectedRoleId}
          onAddRole={() => setCreateRoleOpen(true)}
        />
        {activeRole && (
          <QuestionSetPanel
            jobRole={activeRole}
            heads={heads ?? []}
            questions={questions ?? []}
            onAddQuestion={() => setAddQuestionOpen(true)}
            onDeleteQuestion={(questionId) => deleteSharedQuestion.mutateAsync(questionId)}
          />
        )}
      </div>

      <CreateJobRoleSheet open={createRoleOpen} onClose={() => setCreateRoleOpen(false)} />
      {activeRoleId && (
        <AddQuestionSheet
          open={addQuestionOpen}
          title={`Add question to ${activeRole?.name ?? "role"}`}
          onClose={() => setAddQuestionOpen(false)}
          onSubmit={(headId, text) => addSharedQuestion.mutateAsync({ headId, text })}
        />
      )}
    </AppLayout>
  );
}
