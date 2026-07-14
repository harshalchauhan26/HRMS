import type { ApiAuditEntry } from "@/types/api";

export default function AuditLog({ entries }: { entries: ApiAuditEntry[] }) {
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">No history yet.</p>;
  }

  return (
    <div className="space-y-2.5">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 rounded-xl border border-hair px-3.5 py-2.5">
          <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-brand" />
          <div className="min-w-0">
            <div className="text-[13px]">{entry.summary}</div>
            <div className="text-[11px] text-muted-foreground">
              {entry.actorName ?? "Unknown"} · {new Date(entry.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
