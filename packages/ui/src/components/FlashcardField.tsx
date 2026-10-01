import { actions } from "@easyimmerse/state";
import type { FlashcardField as Field, TimeRange } from "@easyimmerse/types";
import { useId } from "react";
import { flashcardFieldLabels } from "../flashcardFieldLabels.ts";
import { formatClip } from "../formatClip.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { ScreenshotField } from "./ScreenshotField.tsx";

/** Shows one field of the card being edited, with a control suited to its kind and a button that removes it from the card. */
export function FlashcardField({
  field,
  clip,
}: {
  field: Field;
  clip: TimeRange | null;
}) {
  const dispatch = useAppDispatch();
  const controlId = useId();
  const label = flashcardFieldLabels[field.kind];
  const hasTextControl =
    field.kind !== "context_audio" && field.kind !== "screenshot";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        {hasTextControl ? (
          <label
            htmlFor={controlId}
            className="text-sm font-medium text-fg-soft"
          >
            {label}
          </label>
        ) : (
          <span className="text-sm font-medium text-fg-soft">{label}</span>
        )}
        {field.kind !== "word" && (
          <button
            type="button"
            aria-label={`Remove ${label}`}
            className="rounded px-1 text-xs text-fg-muted hover:bg-surface-muted hover:text-fg"
            onClick={() => dispatch(actions.flashcardFieldToggled(field.kind))}
          >
            Remove
          </button>
        )}
      </div>
      {field.kind === "context_audio" && <ClipSummary clip={clip} />}
      {field.kind === "screenshot" && <ScreenshotField value={field.value} />}
      {hasTextControl && (
        <textarea
          id={controlId}
          value={field.value}
          rows={field.value.includes("\n") ? 3 : 1}
          className="field-sizing-content min-h-9 resize-y rounded border border-line-strong px-2 py-1.5 focus:border-accent focus:outline-none"
          onChange={(event) =>
            dispatch(
              actions.flashcardFieldEdited(field.kind, event.target.value),
            )
          }
        />
      )}
    </div>
  );
}

function ClipSummary({ clip }: { clip: TimeRange | null }) {
  if (clip === null)
    return <p className="text-sm text-fg-muted">This card has no clip.</p>;
  return (
    <p className="text-sm">
      <span className="tabular-nums">{formatClip(clip)}</span>
      <span className="block text-fg-muted">
        The audio is cut from the media when the deck is exported.
      </span>
    </p>
  );
}
