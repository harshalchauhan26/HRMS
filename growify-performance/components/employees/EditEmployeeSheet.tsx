"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJobRoles } from "@/hooks/queries/useJobRoles";
import { useUpdateMembership } from "@/hooks/queries/useMemberships";
import type { ApiMembershipDetail, ApiTeamSummary } from "@/types/api";

export default function EditEmployeeSheet({
  detail,
  teams,
  open,
  onClose,
}: {
  detail: ApiMembershipDetail;
  teams: ApiTeamSummary[];
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(detail.user.name);
  const [email, setEmail] = useState(detail.user.email);
  const [teamId, setTeamId] = useState(detail.team.id);
  const [jobRoleId, setJobRoleId] = useState(detail.jobRole.id);
  const [isLead, setIsLead] = useState(detail.isLead);
  const { data: jobRoles } = useJobRoles();
  const updateMembership = useUpdateMembership(detail.id);

  useEffect(() => {
    if (open) {
      setName(detail.user.name);
      setEmail(detail.user.email);
      setTeamId(detail.team.id);
      setJobRoleId(detail.jobRole.id);
      setIsLead(detail.isLead);
    }
  }, [open, detail]);

  function handleSave() {
    if (!name.trim() || !email.trim() || !teamId || !jobRoleId) {
      toast.error("Name, email, team and job role are required.");
      return;
    }
    updateMembership.mutate(
      { name: name.trim(), email: email.trim(), teamId, jobRoleId, isLead },
      {
        onSuccess: () => {
          toast.success("Employee updated.");
          onClose();
        },
        onError: () => toast.error("Couldn't save — check the email isn't already used elsewhere."),
      }
    );
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Edit employee</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 px-4">
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Team</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="h-8 w-full rounded-lg border border-hair bg-transparent px-2.5 text-sm focus:border-brand focus:outline-none"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Designation (job role)</label>
            <select
              value={jobRoleId}
              onChange={(e) => setJobRoleId(e.target.value)}
              className="h-8 w-full rounded-lg border border-hair bg-transparent px-2.5 text-sm focus:border-brand focus:outline-none"
            >
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
          <Button size="sm" onClick={handleSave} disabled={updateMembership.isPending}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
