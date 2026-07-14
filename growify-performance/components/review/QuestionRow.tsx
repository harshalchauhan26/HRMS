import ScoreSegmentedControl from "@/components/review/ScoreSegmentedControl";
import IconDeleteButton from "@/components/common/IconDeleteButton";
import Pill from "@/components/common/Pill";

interface QuestionRowProps {
  question: string;
  value: number | null;
  note: string;
  onChangeValue: (value: number | null) => void;
  onChangeNote: (note: string) => void;
  /** Only personal (per-person) questions can be deleted here — shared, role-level questions are
   * managed on the Question sets settings page instead. Omit to hide the delete button. */
  isPersonal?: boolean;
  onDelete?: () => Promise<unknown>;
}

export default function QuestionRow({
  question,
  value,
  note,
  onChangeValue,
  onChangeNote,
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
        <ScoreSegmentedControl value={value} onChange={onChangeValue} />
        <input
          value={note}
          onChange={(e) => onChangeNote(e.target.value)}
          placeholder="Notes / evidence (optional)"
          className="flex-1 rounded-md border border-dashed border-hair bg-transparent px-2.5 py-1.5 text-xs text-ink-soft focus:border-solid focus:border-brand focus:outline-none"
        />
      </div>
    </div>
  );
}
