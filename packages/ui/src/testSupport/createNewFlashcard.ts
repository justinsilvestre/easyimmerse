import type { NewFlashcard } from "@easyimmerse/types";

/** Builds a card with a word and a context field and no clip, changed by the overrides. */
export function createNewFlashcard(
  overrides: Partial<NewFlashcard> = {},
): NewFlashcard {
  return {
    media_id: "m1",
    fields: [
      { kind: "word", value: "Katze" },
      { kind: "context", value: "Die Katze schläft." },
    ],
    tags: [],
    clip: null,
    screenshot_ms: null,
    ...overrides,
  };
}
