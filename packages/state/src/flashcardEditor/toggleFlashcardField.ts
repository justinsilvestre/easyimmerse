import type { FlashcardField, FlashcardFieldKind } from "@easyimmerse/types";
import { flashcardFieldOrder } from "./flashcardFieldOrder.ts";

/** Removes the field of the given kind, or adds it with an empty value in its canonical position. */
export function toggleFlashcardField(
  fields: readonly FlashcardField[],
  kind: FlashcardFieldKind,
): FlashcardField[] {
  if (fields.some((field) => field.kind === kind))
    return fields.filter((field) => field.kind !== kind);
  return flashcardFieldOrder.flatMap((orderedKind) =>
    orderedKind === kind
      ? [{ kind, value: "" }]
      : fields.filter((field) => field.kind === orderedKind),
  );
}
