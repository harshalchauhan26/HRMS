"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateTeam } from "@/hooks/queries/useTeams";

export default function CreateTeamSheet({
  departmentId,
  open,
  onClose,
}: {
  departmentId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const createTeam = useCreateTeam();

  function handleCreate() {
    if (!name.trim()) return;
    createTeam.mutate(
      { departmentId, name: name.trim() },
      {
        onSuccess: () => {
          toast.success(`Team "${name.trim()}" created.`);
          setName("");
          onClose();
        },
        onError: () => toast.error("Couldn't create the team."),
      }
    );
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>New team</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Team 5"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
        <SheetFooter className="flex-row justify-end gap-2.5">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={createTeam.isPending}>
            Create
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
