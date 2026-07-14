"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateJobRole } from "@/hooks/queries/useJobRoles";

const LEVELS = ["Lead", "Junior-Mid", "Junior"] as const;

export default function CreateJobRoleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("Junior");
  const createJobRole = useCreateJobRole();

  function handleCreate() {
    if (!name.trim()) return;
    createJobRole.mutate(
      { name: name.trim(), level },
      {
        onSuccess: () => {
          toast.success(`Job role "${name.trim()}" created.`);
          setName("");
          onClose();
        },
        onError: () => toast.error("Couldn't create the job role — name may already exist."),
      }
    );
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>New job role</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 px-4">
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Media Buyer" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as (typeof LEVELS)[number])}
              className="h-8 w-full rounded-lg border border-hair bg-transparent px-2.5 text-sm focus:border-brand focus:outline-none"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2.5">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={createJobRole.isPending}>
            Create
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
