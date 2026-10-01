import type { FlashcardFieldKind } from "@easyimmerse/types";
import { flashcardFieldLabels } from "../flashcardFieldLabels.ts";
import { flashcardFieldOrder } from "../flashcardFieldOrder.ts";
import { CheckboxField } from "./CheckboxField.tsx";
import { FieldLegend } from "./FieldLabel.tsx";

const fieldHints: Partial<Record<FlashcardFieldKind, string>> = {
  word: "In the target language",
  word_pronunciation: "A phonetic spelling or reading",
  context: "The subtitle line the word appears in",
  context_translation: "In your language",
  context_pronunciation: "A phonetic spelling of the sentence",
  context_audio: "Cut from the media at that line",
  screenshot: "A still from the video at that line",
};

/** Checkboxes for choosing which fields new flashcards include. Reports fields in canonical order. */
export function FlashcardFieldPicker({
  includedFields,
  onChange,
}: {
  includedFields: readonly FlashcardFieldKind[];
  onChange: (fields: FlashcardFieldKind[]) => void;
}) {
  const toggle = (toggled: FlashcardFieldKind, isIncluded: boolean) =>
    onChange(
      flashcardFieldOrder.filter((kind) =>
        kind === toggled ? isIncluded : includedFields.includes(kind),
      ),
    );
  return (
    <fieldset>
      <FieldLegend>Fields on new cards</FieldLegend>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {flashcardFieldOrder.map((kind) => (
          <CheckboxField
            key={kind}
            label={flashcardFieldLabels[kind]}
            hint={fieldHints[kind]}
            checked={includedFields.includes(kind)}
            onChange={(isIncluded) => toggle(kind, isIncluded)}
          />
        ))}
      </div>
    </fieldset>
  );
}
