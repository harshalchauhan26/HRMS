"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FITCO_LABELS } from "@/data/constants";
import { useSaveFitco } from "@/hooks/queries/useMemberships";
import type { ApiMembershipDetail, Quarter } from "@/types/api";

interface FitcoChartProps {
  membershipId: string;
  period: Quarter | "overall";
  fitco: ApiMembershipDetail["fitco"];
  color: string;
  editable: boolean;
}

export default function FitcoChart({ membershipId, period, fitco, color, editable }: FitcoChartProps) {
  const canSave = editable && period !== "overall";
  const valueByPhase = new Map(fitco.map((f) => [f.phase, f.value]));
  const [drafts, setDrafts] = useState<Record<number, string>>(() =>
    Object.fromEntries([1, 2, 3, 4, 5].map((phase) => [phase, valueByPhase.get(phase)?.toString() ?? ""]))
  );
  const saveFitco = useSaveFitco(membershipId);

  function handleSave() {
    if (period === "overall") return;
    saveFitco.mutate(
      {
        period: period as Quarter,
        fitco: [1, 2, 3, 4, 5]
          .filter((phase) => drafts[phase] !== "")
          .map((phase) => ({ phase, value: Number(drafts[phase]) })),
      },
      {
        onSuccess: () => toast.success("FITCO scores saved."),
        onError: () => toast.error("Couldn't save FITCO scores."),
      }
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        {FITCO_LABELS.map((label, i) => {
          const phase = i + 1;
          const value = valueByPhase.get(phase) ?? null;
          return (
            <div key={label} className="flex-1 text-center">
              <div className="flex h-13.5 items-end overflow-hidden rounded-lg border border-hair2 bg-canvas">
                <div
                  className="w-full rounded-b-md transition-[height] duration-500 ease-out"
                  style={{ height: `${value ?? 0}%`, background: color }}
                />
              </div>
              {canSave ? (
                <input
                  value={drafts[phase]}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [phase]: e.target.value }))}
                  placeholder="—"
                  className="mt-1 w-full rounded border border-hair bg-transparent px-1 py-0.5 text-center font-mono text-xs focus:border-brand focus:outline-none"
                />
              ) : (
                <div className="mt-1 font-mono text-xs font-semibold">{value != null ? Math.round(value) : "—"}</div>
              )}
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </div>
          );
        })}
      </div>
      {canSave && (
        <Button size="sm" className="mt-3" onClick={handleSave} disabled={saveFitco.isPending}>
          Save FITCO
        </Button>
      )}
      {editable && period === "overall" && (
        <p className="mt-2 text-[11px] text-muted-foreground">Switch to a specific quarter to edit FITCO.</p>
      )}
    </div>
  );
}
