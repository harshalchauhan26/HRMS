"use client";

import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/apiClient";

export default function ConfirmDeleteButton({
  label = "Delete",
  confirmMessage,
  onConfirm,
  disabled,
  disabledReason,
}: {
  label?: string;
  confirmMessage: string;
  onConfirm: () => Promise<unknown>;
  disabled?: boolean;
  disabledReason?: string;
}) {
  function handleClick() {
    if (disabled) {
      if (disabledReason) toast.error(disabledReason);
      return;
    }
    if (!window.confirm(confirmMessage)) return;
    onConfirm()
      .then(() => toast.success(`${label} succeeded.`))
      .catch((err) => toast.error(err instanceof ApiError ? err.message : `Couldn't ${label.toLowerCase()}.`));
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} className="gap-1.5 text-destructive">
      <Trash2 className="size-3.5" /> {label}
    </Button>
  );
}
