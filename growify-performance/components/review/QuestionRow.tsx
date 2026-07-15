import ScoreSegmentedControl from "@/components/review/ScoreSegmentedControl";
import IconDeleteButton from "@/components/common/IconDeleteButton";
import Pill from "@/components/common/Pill";

interface QuestionRowProps {
  question: string;
  type: "rating" | "number";
  value: number | null;
  note: string;
  onChangeValue: (value: number | null) => void;
  onChangeNote: (note: string) => void;
  /** Read-only display of the other layer (self vs reviewer), shown once it exists. */
  otherLabel: string;
  otherValue: number | null;
  otherNote: string | null;
  /** Only personal (per-person) questions can be deleted here — shared, role-level questions are
   * managed on the Question sets settings page instead. Omit to hide the delete button. */
  isPersonal?: boolean;
  onDelete?: () => Promise<unknown>;
}

export default function QuestionRow({
  question,
  type,
  value,
  note,
  onChangeValue,
  onChangeNote,
  otherLabel,
  otherValue,
  otherNote,
  isPersonal,
  onDelete,
}: QuestionRowProps) {
  return (
    <div className="border-b border-hair2 py-3 last:border-0">
      <div className="mb-2.5 flex items-start gap-2 text-[12.5px] leading-snug text-ink-soft">
        <span className="flex-1">{question}</span>
        {isPersonal && <Pill tone="dashed">Personal</Pill>}
        {isPersonal && onDelete && (
          <IconDeleteButton
            title="Delete personal question"
            confirmMessage="Delete this question? Any score already given for it is gone too."
            onConfirm={onDelete}
          />
        )}
      </div>
      <div className="flex items-center gap-2.5">
        {type === "rating" ? (
          <ScoreSegmentedControl value={value} onChange={onChangeValue} />
        ) : (
          <input
            type="number"
            value={value ?? ""}
            onChange={(e) => onChangeValue(e.target.value === "" ? null : Number(e.target.value))}
            placeholder="Enter a number"
            className="h-8.5 w-32 shrink-0 rounded-lg border border-hair bg-transparent px-2.5 text-right font-mono text-[13px] focus:border-brand focus:outline-none"
          />
        )}
        <textarea
          value={note}
          onChange={(e) => onChangeNote(e.target.value)}
          rows={2}
          placeholder="Notes — describe the work / evidence behind this score"
          className="flex-1 resize-y rounded-md border border-dashed border-hair bg-transparent px-2.5 py-1.5 text-xs text-ink-soft focus:border-solid focus:border-brand focus:outline-none"
        />
      </div>
      {(otherValue != null || otherNote) && (
        <div className="mt-2 rounded-md bg-canvas px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <b className="font-semibold text-ink-soft">{otherLabel}:</b>{" "}
          {otherValue != null ? otherValue : "—"}
          {otherNote ? ` — ${otherNote}` : ""}
        </div>
      )}
    </div>
  );
}
