"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJobRoles } from "@/hooks/queries/useJobRoles";
import { useAddMember } from "@/hooks/queries/useTeams";

export default function AddMemberSheet({
  teamId,
  open,
  onClose,
}: {
  teamId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobRoleId, setJobRoleId] = useState("");
  const [isLead, setIsLead] = useState(false);
  const { data: jobRoles } = useJobRoles();
  const addMember = useAddMember(teamId);

  function reset() {
    setName("");
    setEmail("");
    setJobRoleId("");
    setIsLead(false);
  }

  function handleCreate() {
    if (!name.trim() || !email.trim() || !jobRoleId) {
      toast.error("Name, email and job role are required.");
      return;
    }
    addMember.mutate(
      { name: name.trim(), email: email.trim(), jobRoleId, isLead },
      {
        onSuccess: () => {
          toast.success(`${name.trim()} added to the team.`);
          reset();
          onClose();
        },
        onError: () => toast.error("Couldn't add the member — check the email isn't already used elsewhere."),
      }
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent side="right" className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Add member</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 px-4">
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@growify.digital"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Job role</label>
            <select
              value={jobRoleId}
              onChange={(e) => setJobRoleId(e.target.value)}
              className="h-8 w-full rounded-lg border border-hair bg-transparent px-2.5 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">Select a role…</option>
              {jobRoles?.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <input type="checkbox" checked={isLead} onChange={(e) => setIsLead(e.target.checked)} />
            This person is the team lead
          </label>
        </div>
        <SheetFooter className="flex-row justify-end gap-2.5">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={addMember.isPending}>
            Add member
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
