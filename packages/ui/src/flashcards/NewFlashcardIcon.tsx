import clsx from "clsx";
import { Layers, Plus } from "lucide-react";

/** The flashcard symbol with a small plus, marking every button that makes a new flashcard. */
export function NewFlashcardIcon({ className }: { className?: string }) {
  return (
    <span className={clsx("relative inline-flex", className)} aria-hidden>
      <Layers className="size-full" />
      <Plus
        className="absolute -right-1 -bottom-1 size-[55%] rounded-full bg-surface text-accent-fg"
        strokeWidth={3}
      />
    </span>
  );
}
