import type { FlashcardFieldKind, FlashcardPreset } from "@easyimmerse/types";
import { useId } from "react";
import { detectFlashcardPreset } from "../detectFlashcardPreset.ts";
import { FieldLegend } from "./FieldLabel.tsx";

const presetChoices: {
  preset: FlashcardPreset;
  title: string;
  description: string;
}[] = [
  {
    preset: "beginner",
    title: "Beginner",
    description: "Adds pronunciation and translations.",
  },
  {
    preset: "intermediate",
    title: "Intermediate",
    description: "Definitions in your language.",
  },
  {
    preset: "advanced",
    title: "Advanced",
    description: "Definitions in the target language.",
  },
];

/**
 * A segmented control for applying a preset set of flashcard fields.
 * The preset whose fields equal the included fields is shown as selected.
 */
export function FlashcardPresetPicker({
  includedFields,
  onPresetChosen,
}: {
  includedFields: readonly FlashcardFieldKind[];
  onPresetChosen: (preset: FlashcardPreset) => void;
}) {
  const groupName = useId();
  const selectedPreset = detectFlashcardPreset(includedFields);
  return (
    <fieldset>
      <FieldLegend>Preset</FieldLegend>
      <div className="grid gap-1 rounded-lg bg-gray-200 dark:bg-gray-800 p-1 sm:grid-cols-3">
        {presetChoices.map((choice) => (
          <PresetSegment
            key={choice.preset}
            groupName={groupName}
            title={choice.title}
            description={choice.description}
            isSelected={choice.preset === selectedPreset}
            onSelect={() => onPresetChosen(choice.preset)}
          />
        ))}
      </div>
      {selectedPreset === null && (
        <p className="mt-2 text-xs text-fg-muted">
          Your field selection does not match a preset.
        </p>
      )}
    </fieldset>
  );
}

function PresetSegment({
  groupName,
  title,
  description,
  isSelected,
  onSelect,
}: {
  groupName: string;
  title: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const id = useId();
  return (
    <label className="flex cursor-pointer flex-col rounded-md px-3 py-2 text-left has-checked:bg-white dark:has-checked:bg-gray-700 has-checked:shadow has-checked:ring-1 has-checked:ring-gray-400 dark:has-checked:ring-gray-400 has-focus-visible:ring-2 has-focus-visible:ring-accent hover:bg-white/60 dark:hover:bg-gray-700/50">
      <input
        type="radio"
        name={groupName}
        checked={isSelected}
        onChange={onSelect}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        className="sr-only"
      />
      <span id={`${id}-title`} className="text-sm font-medium text-fg">
        {title}
      </span>
      <span id={`${id}-description`} className="text-xs text-fg-muted">
        {description}
      </span>
    </label>
  );
}
