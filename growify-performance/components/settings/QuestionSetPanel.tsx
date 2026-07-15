import { Button } from "@/components/ui/button";
import IconDeleteButton from "@/components/common/IconDeleteButton";
import Pill from "@/components/common/Pill";
import type { ApiHead, ApiJobRole } from "@/types/api";

const HEAD_BADGE_COLORS = ["#4338CA", "#0891B2", "#7C3AED", "#DB2777", "#0D9488"];

export default function QuestionSetPanel({
  jobRole,
  heads,
  questions,
  onAddQuestion,
  onDeleteQuestion,
}: {
  jobRole: ApiJobRole;
  heads: ApiHead[];
  questions: { id: string; headId: string; text: string; type: "rating" | "number" }[];
  onAddQuestion: () => void;
  onDeleteQuestion: (questionId: string) => Promise<unknown>;
}) {
  const headIndexById = new Map(heads.map((h, i) => [h.id, i]));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="text-[13px] text-muted-foreground">
          Showing the <b className="text-ink">{jobRole.name}</b> set — applies to every {jobRole.name} across
          all teams.
        </div>
        <Button size="sm" onClick={onAddQuestion}>
          + Add question
        </Button>
      </div>

      <div className="space-y-2">
        {questions.length === 0 && (
          <p className="text-sm text-muted-foreground">No questions yet for this role.</p>
        )}
        {questions.map((q) => {
          const headIndex = headIndexById.get(q.headId) ?? 0;
          return (
            <div key={q.id} className="flex items-center gap-2.5 rounded-lg border border-hair px-3.5 py-2.5 text-[12.5px]">
              <span
                className="grid size-5 shrink-0 place-items-center rounded-md font-mono text-[10px] font-semibold text-white"
                style={{ background: HEAD_BADGE_COLORS[headIndex % HEAD_BADGE_COLORS.length] }}
              >
                {headIndex + 1}
              </span>
              <span className="flex-1">{q.text}</span>
              <Pill tone={q.type === "number" ? "brand" : "neutral"}>
                {q.type === "number" ? "Number" : "Rating"}
              </Pill>
              <span className="shrink-0 text-[10.5px] text-faint">Shared · all {jobRole.name}s</span>
              <IconDeleteButton
                title="Delete question"
                confirmMessage={`Delete this question? It'll be removed from every ${jobRole.name}'s scorecard, and any scores already given for it are gone too.`}
                onConfirm={() => onDeleteQuestion(q.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
