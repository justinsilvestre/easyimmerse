import type { FlashcardFieldKind, FlashcardPreset } from "@easyimmerse/types";

/** The fields each preset includes, in canonical order. Mirrors `preset_fields` in the core crate. */
export const flashcardPresetFields: Record<
  FlashcardPreset,
  readonly FlashcardFieldKind[]
> = {
  beginner: [
    "word",
    "word_pronunciation",
    "l1_definition",
    "context",
    "context_translation",
    "context_pronunciation",
    "context_audio",
    "screenshot",
  ],
  intermediate: [
    "word",
    "l1_definition",
    "context",
    "context_translation",
    "context_audio",
    "screenshot",
  ],
  advanced: ["word", "l2_definition", "context", "context_audio", "screenshot"],
};
