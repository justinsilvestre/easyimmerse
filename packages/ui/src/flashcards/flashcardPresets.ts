import type { FlashcardFieldKey } from "./flashcardFields.ts";

/** A named selection of fields suited to a stage of learning. */
export type FlashcardPreset = "beginner" | "intermediate" | "advanced";

export const flashcardPresetOptions: readonly {
  value: FlashcardPreset;
  label: string;
}[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const presetFields: Record<FlashcardPreset, readonly FlashcardFieldKey[]> = {
  beginner: [
    "word",
    "wordPronunciation",
    "l1Definition",
    "textContext",
    "textContextTranslation",
    "textContextPronunciation",
    "audioContext",
    "screenshot",
    "tags",
  ],
  intermediate: [
    "word",
    "l1Definition",
    "textContext",
    "textContextTranslation",
    "audioContext",
    "screenshot",
    "tags",
  ],
  advanced: [
    "word",
    "l2Definition",
    "textContext",
    "textContextTranslation",
    "audioContext",
    "screenshot",
    "tags",
  ],
};

/** The fields a flashcard starts with under the preset. */
export function fieldsOfPreset(
  preset: FlashcardPreset,
): readonly FlashcardFieldKey[] {
  return presetFields[preset];
}

/** Names the preset whose fields match the selection exactly, or `custom` when none does. */
export function presetMatching(
  fields: readonly FlashcardFieldKey[],
): FlashcardPreset | "custom" {
  const selection = new Set(fields);
  const match = flashcardPresetOptions.find(({ value }) =>
    hasSameMembers(selection, presetFields[value]),
  );
  return match?.value ?? "custom";
}

function hasSameMembers(
  selection: Set<FlashcardFieldKey>,
  fields: readonly FlashcardFieldKey[],
): boolean {
  return (
    selection.size === fields.length &&
    fields.every((field) => selection.has(field))
  );
}
