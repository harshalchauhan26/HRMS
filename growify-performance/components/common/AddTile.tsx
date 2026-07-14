import { Plus } from "lucide-react";

export default function AddTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid min-h-[150px] place-items-center rounded-2xl border border-dashed border-hair text-muted-foreground transition-colors hover:border-brand hover:text-brand-ink"
    >
      <span className="flex flex-col items-center gap-1">
        <Plus className="size-6" />
        <span className="text-[12.5px] font-semibold">{label}</span>
      </span>
    </button>
  );
}
