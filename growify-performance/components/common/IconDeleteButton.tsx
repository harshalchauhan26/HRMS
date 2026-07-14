"use client";

import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

export default function IconDeleteButton({
  title = "Delete",
  confirmMessage,
  onConfirm,
  disabled,
  disabledReason,
  className,
}: {
  title?: string;
  confirmMessage: string;
  onConfirm: () => Promise<unknown>;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
}) {
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) {
      if (disabledReason) toast.error(disabledReason);
      return;
    }
    if (!window.confirm(confirmMessage)) return;
    onConfirm().catch((err) => toast.error(err instanceof ApiError ? err.message : "Couldn't delete."));
  }

  return (
    <button
      onClick={handleClick}
      title={title}
      className={cn(
        "rounded-lg p-1.5 text-faint transition-colors hover:bg-destructive/10 hover:text-destructive",
        className
      )}
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
