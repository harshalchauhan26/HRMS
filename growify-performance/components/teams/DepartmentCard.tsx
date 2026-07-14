import { baseColor, pct } from "@/lib/format";
import IconDeleteButton from "@/components/common/IconDeleteButton";
import IconRestoreButton from "@/components/common/IconRestoreButton";
import Pill from "@/components/common/Pill";

interface DepartmentCardProps {
  name: string;
  teamCount: number;
  memberCount: number;
  avgBase: number | null;
  isActive?: boolean;
  onClick: () => void;
  onDelete?: () => Promise<unknown>;
  onRestore?: () => Promise<unknown>;
}

export default function DepartmentCard({
  name,
  teamCount,
  memberCount,
  avgBase,
  isActive = true,
  onClick,
  onDelete,
  onRestore,
}: DepartmentCardProps) {
  const color = baseColor(avgBase);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-hair bg-panel p-5 pl-6 text-left shadow-(--shadow-card) transition-transform hover:-translate-y-0.5 hover:border-[#CFCDEF] hover:shadow-lg"
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-brand" />
      {!isActive && onRestore ? (
        <IconRestoreButton
          title="Restore department"
          onConfirm={onRestore}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100"
        />
      ) : (
        isActive &&
        onDelete && (
          <IconDeleteButton
            title="Delete department"
            confirmMessage={`Delete "${name}"? All ${memberCount} active employee(s) across its ${teamCount} team(s) will be automatically offboarded, and the department archived (not erased — recoverable later).`}
            onConfirm={onDelete}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100"
          />
        )
      )}
      <div className="flex items-center gap-2">
        <h3 className="font-heading text-base font-semibold">{name}</h3>
        {!isActive && <Pill tone="warn">Archived</Pill>}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {teamCount} teams · {memberCount} members
      </div>
      <div className="mt-4 flex gap-5">
        <Stat value={String(memberCount)} label="Members" />
        <Stat value={pct(avgBase)} label="Avg base" color={color.color} />
        <Stat value={String(teamCount)} label="Teams" />
      </div>
    </div>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div>
      <div className="font-mono text-xl font-semibold" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="mt-0.5 text-[10.5px] tracking-wide text-muted-foreground uppercase">{label}</div>
    </div>
  );
}
