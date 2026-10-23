import type { LibrarySegment, LibraryText } from "@easyimmerse/types";

/** A segment of a library item's text, for tests, with the given fields changed. */
export function exampleLibrarySegment(changes: Partial<LibrarySegment> = {}) {
  return {
    index: 0,
    chapter_index: null,
    start_ms: 1000,
    end_ms: 3000,
    screenshot_at_ms: 2000,
    text: "Der Hund schläft.",
    translation: "The dog sleeps.",
    words: [
      {
        start: 4,
        end: 8,
        entry: {
          term: "Hund",
          reading: null,
          l1_definition: "dog",
          l2_definition: "ein Haustier",
        },
      },
    ],
    ...changes,
  } satisfies LibrarySegment;
}

/** The text of a video item with two cues, the second without a translation, for tests. */
export const exampleLibraryVideoText: LibraryText = {
  segments: [
    exampleLibrarySegment(),
    exampleLibrarySegment({
      index: 1,
      start_ms: 4000,
      end_ms: 6000,
      text: "Er träumt.",
      translation: null,
      words: [],
    }),
  ],
  chapter_titles: [],
};
