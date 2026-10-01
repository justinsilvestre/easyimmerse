import { actions, flashcardFieldOrder } from "@easyimmerse/state";
import type { FlashcardField } from "@easyimmerse/types";
import { useState } from "react";
import { flashcardFieldLabels } from "../flashcardFieldLabels.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";

/** Offers the fields the card lacks, in the order they appear on a card. Hidden once the card has every field. */
export function FlashcardFieldAddMenu({
  fields,
}: {
  fields: readonly FlashcardField[];
}) {
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const missingKinds = flashcardFieldOrder.filter(
    (kind) => !fields.some((field) => field.kind === kind),
  );
  if (missingKinds.length === 0) return null;
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        aria-expanded={isOpen}
        className="text-sm font-medium text-accent-fg hover:underline"
        onClick={() => setIsOpen(!isOpen)}
      >
        Add field
      </button>
      {isOpen && (
        <ul aria-label="Fields to add" className="flex flex-wrap gap-1">
          {missingKinds.map((kind) => (
            <li key={kind}>
              <button
                type="button"
                aria-label={`Add ${flashcardFieldLabels[kind]}`}
                className="rounded-full border border-dashed border-line-strong px-2 py-0.5 text-sm text-fg-soft hover:border-accent hover:text-accent-fg"
                onClick={() => {
                  setIsOpen(false);
                  dispatch(actions.flashcardFieldToggled(kind));
                }}
              >
                {flashcardFieldLabels[kind]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
