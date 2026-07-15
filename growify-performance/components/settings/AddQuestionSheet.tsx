"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useHeads } from "@/hooks/queries/useHeads";

interface AddQuestionSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (headId: string, text: string, type: "rating" | "number") => Promise<unknown>;
}

export default function AddQuestionSheet({ open, title, onClose, onSubmit }: AddQuestionSheetProps) {
  const { data: heads } = useHeads();
  const [headId, setHeadId] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState<"rating" | "number">("rating");
  const [pending, setPending] = useState(false);

  async function handleCreate() {
    if (!headId || !text.trim()) {
      toast.error("Pick a category and enter the question text.");
      return;
    }
    setPending(true);
    try {
      await onSubmit(headId, text.trim(), type);
      toast.success("Question added.");
      setText("");
      onClose();
    } catch {
      toast.error("Couldn't add the question.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 px-4">
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Category</label>
            <select
              value={headId}
              onChange={(e) => setHeadId(e.target.value)}
              className="h-8 w-full rounded-lg border border-hair bg-transparent px-2.5 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">Select a category…</option>
              {heads?.map((head) => (
                <option key={head.id} value={head.id}>
                  {head.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Answer type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "rating" | "number")}
              className="h-8 w-full rounded-lg border border-hair bg-transparent px-2.5 text-sm focus:border-brand focus:outline-none"
            >
              <option value="rating">Rating (1–4 scale)</option>
              <option value="number">Number (type in a figure)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-ink-soft">Question</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="What should this question ask?"
              className="w-full rounded-lg border border-hair bg-transparent px-2.5 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2.5">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={pending}>
            Add question
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
