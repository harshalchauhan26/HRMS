"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateDepartment } from "@/hooks/queries/useDepartments";

export default function CreateDepartmentSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const createDepartment = useCreateDepartment();

  function handleCreate() {
    if (!name.trim()) return;
    createDepartment.mutate(name.trim(), {
      onSuccess: () => {
        toast.success(`Department "${name.trim()}" created.`);
        setName("");
        onClose();
      },
      onError: () => toast.error("Couldn't create the department — name may already exist."),
    });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>New department</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. SEO, Content, Design"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
        <SheetFooter className="flex-row justify-end gap-2.5">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={createDepartment.isPending}>
            Create
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
