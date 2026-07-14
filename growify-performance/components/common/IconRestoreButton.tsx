"use client";

import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

export default function IconRestoreButton({
  title = "Restore",
  onConfirm,
  className,
}: {
  title?: string;
  onConfirm: () => Promise<unknown>;
  className?: string;
}) {
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    onConfirm()
      .then(() => toast.success("Restored."))
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Couldn't restore."));
  }

  return (
    <button
      onClick={handleClick}
      title={title}
      className={cn(
        "rounded-lg p-1.5 text-faint transition-colors hover:bg-brand-soft hover:text-brand-ink",
        className
      )}
    >
      <RotateCcw className="size-3.5" />
    </button>
  );
}
