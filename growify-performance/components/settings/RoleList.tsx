import { cn } from "@/lib/utils";
import type { ApiJobRole } from "@/types/api";

export default function RoleList({
  roles,
  selectedId,
  onSelect,
  onAddRole,
}: {
  roles: ApiJobRole[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddRole: () => void;
}) {
  return (
    <div className="space-y-1">
      {roles.map((role) => (
        <button
          key={role.id}
          onClick={() => onSelect(role.id)}
          className={cn(
            "w-full rounded-lg px-3 py-2.5 text-left text-[13px] text-muted-foreground transition-colors",
            role.id === selectedId ? "bg-brand-soft font-semibold text-brand-ink" : "hover:bg-hair2"
          )}
        >
          {role.name}
        </button>
      ))}
      <button
        onClick={onAddRole}
        className="mt-1.5 w-full rounded-lg border border-dashed border-hair px-3 py-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:border-brand hover:text-brand-ink"
      >
        + Add role
      </button>
    </div>
  );
}
