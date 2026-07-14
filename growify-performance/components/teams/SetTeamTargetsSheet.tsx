"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSetTeamTargets } from "@/hooks/queries/useTeams";
import { METRIC_LABELS } from "@/components/teams/TargetsEditor";
import type { Quarter } from "@/types/api";

export default function SetTeamTargetsSheet({
  teamId,
  teamName,
  memberCount,
  period,
  open,
  onClose,
}: {
  teamId: string;
  teamName: string;
  memberCount: number;
  period: Quarter;
  open: boolean;
  onClose: () => void;
}) {
  const [metric, setMetric] = useState(METRIC_LABELS[0].metric);
  const [value, setValue] = useState("");
  const setTeamTargets = useSetTeamTargets(teamId);

  function handleApply() {
    const target = value === "" ? null : Number(value) / 100;
    if (value !== "" && Number.isNaN(target)) {
      toast.error("Enter a number.");
      return;
    }
    setTeamTargets.mutate(
      { period, metric, target },
      {
        onSuccess: (data) => {
          toast.success(`Applied to ${data.updated} member(s) of ${teamName}.`);
          setValue("");
          onClose();
        },
        onError: () => toast.error("Couldn't set team targets — try again."),
      }
    );
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Set team targets</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 px-4">
          <p className="text-xs text-muted-foreground">
            Applies one goal to all {memberCount} active member{memberCount === 1 ? "" : "s"} of {teamName} for{" "}
            {period.toUpperCase()}. Already-recorded achieved values are untouched — this only sets the target
            each person is measured against; you can still override it per person afterward.
          </p>
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Metric</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="h-8 w-full rounded-lg border border-hair bg-transparent px-2.5 text-sm focus:border-brand focus:outline-none"
            >
              {METRIC_LABELS.map((m) => (
                <option key={m.metric} value={m.metric}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Target (%)</label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 85"
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
            />
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2.5">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply} disabled={setTeamTargets.isPending}>
            Apply to team
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
