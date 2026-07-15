"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import IconDeleteButton from "@/components/common/IconDeleteButton";
import RenameSheet from "@/components/common/RenameSheet";
import { useCreateHead, useDeleteHead, useHeads, useRenameHead } from "@/hooks/queries/useHeads";
import { ApiError } from "@/lib/apiClient";
import type { ApiHead } from "@/types/api";

export default function CategoriesPanel() {
  const { data: heads } = useHeads();
  const createHead = useCreateHead();
  const renameHead = useRenameHead();
  const deleteHead = useDeleteHead();
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<ApiHead | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    createHead.mutate(newName.trim().toUpperCase(), {
      onSuccess: () => {
        toast.success("Category added.");
        setNewName("");
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't add category."),
    });
  }

  return (
    <div className="mb-5 rounded-2xl border border-hair bg-panel p-4">
      <div className="mb-3 text-[11px] font-semibold tracking-wide text-faint uppercase">
        Categories — the sections questions are grouped under
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {heads?.map((head) => (
          <div
            key={head.id}
            className="flex items-center gap-1.5 rounded-full border border-hair py-1 pr-1 pl-3 text-[12.5px] font-medium"
          >
            <button
              onClick={() => setRenaming(head)}
              className="hover:text-brand-ink"
              title="Rename category"
            >
              {head.name}
            </button>
            <IconDeleteButton
              title="Delete category"
              confirmMessage={`Delete "${head.name}"? Every question in this category (shared and personal) is deleted too, along with any scores already given for them.`}
              onConfirm={() => deleteHead.mutateAsync(head.id)}
              className="p-1"
            />
          </div>
        ))}
        {!heads?.length && <p className="text-sm text-muted-foreground">No categories yet.</p>}
      </div>
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className="max-w-xs"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <Button size="sm" onClick={handleCreate} disabled={createHead.isPending}>
          + Add category
        </Button>
      </div>

      {renaming && (
        <RenameSheet
          title="Rename category"
          label="Name"
          initialName={renaming.name}
          open={!!renaming}
          isPending={renameHead.isPending}
          onClose={() => setRenaming(null)}
          onSubmit={(name) => renameHead.mutateAsync({ id: renaming.id, name: name.toUpperCase() })}
        />
      )}
    </div>
  );
}
