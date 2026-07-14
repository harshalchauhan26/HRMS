"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import SwotQuadrant from "@/components/swot/SwotQuadrant";
import { useMembershipDetail } from "@/hooks/queries/useMemberships";
import { useGenerateSwot, useSwotLatest } from "@/hooks/queries/useSwot";
import type { PeriodParam } from "@/types/api";

interface SwotDrawerProps {
  membershipId: string | null;
  period: PeriodParam;
  onClose: () => void;
}

export default function SwotDrawer({ membershipId, period, onClose }: SwotDrawerProps) {
  const { data: detail } = useMembershipDetail(membershipId, period);
  const { data: report, isLoading } = useSwotLatest(membershipId, period);
  const generate = useGenerateSwot(membershipId ?? "");

  if (!membershipId || !detail) return null;

  function handleGenerate() {
    generate.mutate(period, {
      onSuccess: () => toast.success("SWOT generated from the latest scores + KPI snapshot."),
      onError: () => toast.error("Couldn't generate a SWOT report."),
    });
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-lg" side="right">
        <SheetHeader className="flex-row items-center gap-3 border-b border-hair py-4.5 pr-14 pl-6">
          <span className="flex items-center gap-1 rounded-md bg-brand px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
            <Sparkles className="size-3" /> AI
          </span>
          <SheetTitle className="text-[17px]">SWOT — {detail.user.name}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-4 rounded-lg bg-canvas px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
            Drafted from a deterministic signal layer (head averages, KPI bands vs level calibration, FITCO)
            then composed into narrative. Every point below carries the metric it came from. HR reviews and
            confirms before it&apos;s final.
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : report ? (
            <>
              <SwotQuadrant tone="strength" title="Strengths" points={report.evidence.strengths} />
              <SwotQuadrant tone="weakness" title="Weaknesses" points={report.evidence.weaknesses} />
              <SwotQuadrant tone="opportunity" title="Opportunities" points={report.evidence.opportunities} />
              <SwotQuadrant tone="threat" title="Threats" points={report.evidence.threats} />
            </>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">
              No SWOT generated yet for this period. Generate one from the current scores and KPIs.
            </p>
          )}

          <div className="mt-1 flex gap-2.5">
            <Button size="sm" onClick={handleGenerate} disabled={generate.isPending}>
              {report ? "Regenerate" : "Generate SWOT"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
