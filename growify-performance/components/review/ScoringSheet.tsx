"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import InitialsAvatar from "@/components/common/InitialsAvatar";
import QuestionRow from "@/components/review/QuestionRow";
import { scoreColor } from "@/lib/format";
import { useDeletePersonalQuestion, useMembershipDetail, useSaveScores } from "@/hooks/queries/useMemberships";
import type { ApiMembershipDetail, Quarter } from "@/types/api";

const HEAD_BADGE_COLORS = ["#4338CA", "#0891B2", "#7C3AED", "#DB2777", "#0D9488"];

interface ScoringSheetProps {
  membershipId: string | null;
  period: Quarter | "overall";
  /** "self" = the employee's own reflection (no weight in any aggregate); "reviewer" = the TL/HR
   * score that's the official number everywhere else in the app. */
  mode: "self" | "reviewer";
  onClose: () => void;
}

export default function ScoringSheet({ membershipId, period, mode, onClose }: ScoringSheetProps) {
  const quarter = period === "overall" ? null : period;
  const { data: detail } = useMembershipDetail(membershipId, period);
  const saveScores = useSaveScores(membershipId ?? "");
  const deletePersonalQuestion = useDeletePersonalQuestion(membershipId ?? "");

  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, number>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const key = detail ? `${detail.id}:${period}:${mode}` : null;
  if (detail && key !== loadedKey) {
    setLoadedKey(key);
    const values: Record<string, number> = {};
    const notes: Record<string, string> = {};
    for (const head of detail.heads) {
      for (const q of head.questions) {
        const value = mode === "self" ? q.selfValue : q.reviewerValue;
        const note = mode === "self" ? q.selfNote : q.reviewerNote;
        if (value != null) values[q.id] = value;
        if (note) notes[q.id] = note;
      }
    }
    setDraftValues(values);
    setDraftNotes(notes);
  }

  if (!membershipId || !detail || !quarter) return null;

  // Only "rating" questions feed the live /4 average preview — "number" questions are
  // informational data points, same rule as the backend aggregate.
  function headAvg(head: ApiMembershipDetail["heads"][number]): number | null {
    const scored = head.questions.filter((q) => q.type === "rating" && draftValues[q.id] != null);
    return scored.length
      ? scored.reduce((sum, q) => sum + draftValues[q.id], 0) / scored.length
      : null;
  }

  const headAverages = detail.heads.map(headAvg);
  const scoredHeadAverages = headAverages.filter((v): v is number => v != null);
  const liveOverall = scoredHeadAverages.length
    ? scoredHeadAverages.reduce((a, b) => a + b, 0) / scoredHeadAverages.length
    : null;
  const totalQuestions = detail.heads.reduce((sum, h) => sum + h.questions.length, 0);
  const scoredCount = Object.keys(draftValues).length;
  const otherOverall = mode === "self" ? detail.overall : detail.selfOverall;

  function setValue(questionId: string, value: number | null) {
    setDraftValues((prev) => {
      const next = { ...prev };
      if (value == null) delete next[questionId];
      else next[questionId] = value;
      return next;
    });
  }

  function setNote(questionId: string, value: string) {
    setDraftNotes((prev) => {
      const next = { ...prev };
      if (value) next[questionId] = value;
      else delete next[questionId];
      return next;
    });
  }

  function handleSave() {
    if (!quarter) return;
    const allQuestionIds = detail!.heads.flatMap((h) => h.questions.map((q) => q.id));
    saveScores.mutate(
      {
        period: quarter,
        scoredBy: mode,
        scores: allQuestionIds.map((id) => ({
          questionId: id,
          value: draftValues[id] ?? null,
          note: draftNotes[id] ?? null,
        })),
      },
      {
        onSuccess: () => {
          toast.success(mode === "self" ? "Self-assessment saved." : "Review scores saved.");
          onClose();
        },
        onError: () => toast.error("Couldn't save scores."),
      }
    );
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-2xl" side="right">
        <SheetHeader className="flex-row items-center gap-3.5 border-b border-hair py-4.5 pr-14 pl-6">
          <InitialsAvatar id={detail.id} name={detail.user.name} />
          <div>
            <SheetTitle className="text-[17px]">
              {detail.user.name} <span className="font-normal text-muted-foreground">· {mode === "self" ? "Self-assessment" : "Review scoring"}</span>
            </SheetTitle>
            <div className="text-xs text-muted-foreground">
              {detail.jobRole.name} · {detail.jobRole.level} · {detail.team.name}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="font-mono text-[26px] leading-none font-semibold" style={{ color: scoreColor(liveOverall) }}>
              {liveOverall ? liveOverall.toFixed(2) : "—"}
            </div>
            <div className="text-[10px] tracking-wide text-muted-foreground uppercase">
              {mode === "self" ? "Your self-score /4" : "Reviewer overall /4"}
            </div>
            {otherOverall != null && (
              <div className="mt-0.5 text-[10px] text-faint">
                {mode === "self" ? "Reviewer" : "Self"}: {otherOverall.toFixed(2)}
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pt-2 pb-5">
          <div className="my-3.5 rounded-lg bg-canvas px-3 py-2.5 text-[11.5px] text-muted-foreground">
            {mode === "self" ? (
              <>
                Score yourself honestly on what you think you achieved. This is for your own
                reflection — it doesn&apos;t affect your official score, which your team lead / HR sets
                separately.
              </>
            ) : (
              <>
                Score each 1–4. Leave blank where there isn&apos;t enough evidence — blanks are ignored
                in the averages. A {detail.jobRole.level} at 3 meets the bar for their level. This is
                the official score.
              </>
            )}
          </div>

          {detail.heads.map((head, hi) => (
            <div key={head.id} className="mt-4.5 first:mt-0">
              <div className="flex items-center gap-3 border-b border-hair2 py-2.5">
                <span
                  className="grid size-6 shrink-0 place-items-center rounded-md font-mono text-xs font-semibold text-white"
                  style={{ background: HEAD_BADGE_COLORS[hi % HEAD_BADGE_COLORS.length] }}
                >
                  {hi + 1}
                </span>
                <h3 className="flex-1 text-[13px] font-semibold">{head.name.toLowerCase()}</h3>
                <span className="font-mono text-sm font-semibold" style={{ color: scoreColor(headAverages[hi]) }}>
                  {headAverages[hi] != null ? headAverages[hi]!.toFixed(2) : "—"}
                </span>
              </div>
              {head.questions.map((question) => (
                <QuestionRow
                  key={question.id}
                  question={question.text}
                  type={question.type}
                  value={draftValues[question.id] ?? null}
                  note={draftNotes[question.id] ?? ""}
                  onChangeValue={(v) => setValue(question.id, v)}
                  onChangeNote={(v) => setNote(question.id, v)}
                  otherLabel={mode === "self" ? "Reviewer score" : "Self-assessment"}
                  otherValue={mode === "self" ? question.reviewerValue : question.selfValue}
                  otherNote={mode === "self" ? question.reviewerNote : question.selfNote}
                  isPersonal={question.scope === "personal"}
                  onDelete={() => deletePersonalQuestion.mutateAsync(question.id)}
                />
              ))}
            </div>
          ))}
        </div>

        <SheetFooter className="flex-row items-center gap-2.5 border-t border-hair p-4">
          <span className="mr-auto text-xs text-muted-foreground">
            {scoredCount} of {totalQuestions} questions scored
          </span>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saveScores.isPending}>
            {mode === "self" ? "Save self-assessment" : "Save review scores"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
