"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { baseColor, pct } from "@/lib/format";
import { useSaveTargets } from "@/hooks/queries/useMemberships";
import type { ApiMembershipDetail, Quarter } from "@/types/api";

export const METRIC_LABELS: { metric: string; label: string }[] = [
  { metric: "base", label: "Base (%)" },
  { metric: "incentive", label: "Incentive (%)" },
  { metric: "eoss", label: "EOSS (%)" },
];

interface TargetsEditorProps {
  membershipId: string;
  period: Quarter | "overall";
  targets: ApiMembershipDetail["targets"];
  editable: boolean;
}

export default function TargetsEditor({ membershipId, period, targets, editable }: TargetsEditorProps) {
  const canSave = editable && period !== "overall";
  const [drafts, setDrafts] = useState<Record<string, { target: string; actual: string }>>(() =>
    Object.fromEntries(
      METRIC_LABELS.map(({ metric }) => {
        const row = targets.find((t) => t.metric === metric);
        return [
          metric,
          {
            target: row?.target != null ? String(Math.round(row.target * 100)) : "",
            actual: row?.actual != null ? String(Math.round(row.actual * 100)) : "",
          },
        ];
      })
    )
  );
  const saveTargets = useSaveTargets(membershipId);

  function setDraft(metric: string, field: "target" | "actual", value: string) {
    setDrafts((prev) => ({ ...prev, [metric]: { ...prev[metric], [field]: value } }));
  }

  function handleSave() {
    if (period === "overall") return;
    saveTargets.mutate(
      {
        period: period as Quarter,
        targets: METRIC_LABELS.map(({ metric }) => ({
          metric,
          target: drafts[metric].target === "" ? null : Number(drafts[metric].target) / 100,
          actual: drafts[metric].actual === "" ? null : Number(drafts[metric].actual) / 100,
        })),
      },
      {
        onSuccess: () => toast.success("Targets saved."),
        onError: () => toast.error("Couldn't save targets."),
      }
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5 text-[10px] font-semibold tracking-wide text-faint uppercase">
        <span className="flex-1">Metric</span>
        <span className="w-16 text-right">Target</span>
        <span className="w-16 text-right">Actual</span>
      </div>
      {METRIC_LABELS.map(({ metric, label }) => {
        const row = targets.find((t) => t.metric === metric);
        return (
          <div key={metric} className="flex items-center gap-2.5">
            <span className="flex-1 text-xs text-ink-soft">{label}</span>
            {canSave ? (
              <>
                <input
                  value={drafts[metric].target}
                  onChange={(e) => setDraft(metric, "target", e.target.value)}
                  placeholder="—"
                  className="w-16 rounded-md border border-hair bg-transparent px-2 py-1 text-right font-mono text-[12.5px] focus:border-brand focus:outline-none"
                />
                <input
                  value={drafts[metric].actual}
                  onChange={(e) => setDraft(metric, "actual", e.target.value)}
                  placeholder="—"
                  className="w-16 rounded-md border border-hair bg-transparent px-2 py-1 text-right font-mono text-[12.5px] focus:border-brand focus:outline-none"
                />
              </>
            ) : (
              <>
                <span className="w-16 text-right font-mono text-[12.5px] text-muted-foreground">
                  {pct(row?.target ?? null)}
                </span>
                <span
                  className="w-16 text-right font-mono text-[12.5px] font-semibold"
                  style={{ color: baseColor(row?.actual ?? null).color }}
                >
                  {pct(row?.actual ?? null)}
                </span>
              </>
            )}
          </div>
        );
      })}
      {canSave && (
        <Button size="sm" onClick={handleSave} disabled={saveTargets.isPending}>
          Save targets
        </Button>
      )}
      {editable && period === "overall" && (
        <p className="text-[11px] text-muted-foreground">Switch to a specific quarter to edit targets.</p>
      )}
    </div>
  );
}
