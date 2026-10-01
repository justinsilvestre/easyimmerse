import type { FlashcardFieldKind, FlashcardPreset } from "@easyimmerse/types";
import { flashcardPresetFields } from "./flashcardPresetFields.ts";

const presets = Object.keys(flashcardPresetFields) as FlashcardPreset[];

/** Returns the preset that includes exactly the given fields, or null for a custom selection. */
export function detectFlashcardPreset(
  fields: readonly FlashcardFieldKind[],
): FlashcardPreset | null {
  const included = new Set(fields);
  return (
    presets.find((preset) =>
      hasExactly(flashcardPresetFields[preset], included),
    ) ?? null
  );
}

function hasExactly(
  presetFields: readonly FlashcardFieldKind[],
  included: ReadonlySet<FlashcardFieldKind>,
): boolean {
  return (
    presetFields.length === included.size &&
    presetFields.every((field) => included.has(field))
  );
}
