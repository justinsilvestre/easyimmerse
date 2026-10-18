import type { TranslationLink } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { translationLocationFor } from "./readerTranslation.ts";

const links: TranslationLink[] = [
  {
    spans: [{ chapter_index: 0, paragraph_index: 2, start: 0, end: 9 }],
    translation_spans: [
      { chapter_index: 1, paragraph_index: 4, start: 3, end: 12 },
    ],
  },
];

describe("translationLocationFor", () => {
  it("opens at the start of the translation paragraph linked from the place's paragraph", () => {
    expect(
      translationLocationFor(links, {
        chapterIndex: 0,
        paragraphIndex: 2,
        offset: 5,
      }),
    ).toEqual({ chapterIndex: 1, paragraphIndex: 4, offset: 0 });
  });

  it("gives no place when no link leaves the place's paragraph", () => {
    expect(
      translationLocationFor(links, {
        chapterIndex: 0,
        paragraphIndex: 3,
        offset: 0,
      }),
    ).toBeUndefined();
  });

  it("gives no place when the book is not aligned with its translation", () => {
    expect(
      translationLocationFor(null, {
        chapterIndex: 0,
        paragraphIndex: 2,
        offset: 0,
      }),
    ).toBeUndefined();
  });
});
