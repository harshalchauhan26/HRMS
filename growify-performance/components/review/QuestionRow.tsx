import ScoreSegmentedControl from "@/components/review/ScoreSegmentedControl";

interface QuestionRowProps {
  question: string;
  value: number | null;
  note: string;
  onChangeValue: (value: number | null) => void;
  onChangeNote: (note: string) => void;
}

export default function QuestionRow({ question, value, note, onChangeValue, onChangeNote }: QuestionRowProps) {
  return (
    <div className="border-b border-hair2 py-3 last:border-0">
      <div className="mb-2.5 text-[12.5px] leading-snug text-ink-soft">{question}</div>
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
