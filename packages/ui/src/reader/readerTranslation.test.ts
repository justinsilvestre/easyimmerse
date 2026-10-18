import type { MediaFile, TranslationLink } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  type ReaderTranslation,
  translationLocationFor,
  translationStatusOf,
} from "./readerTranslation.ts";

const links: TranslationLink[] = [
  {
    spans: [{ chapter_index: 0, paragraph_index: 2, start: 0, end: 9 }],
    translation_spans: [
      { chapter_index: 1, paragraph_index: 4, start: 3, end: 12 },
    ],
  },
];

const translationFile = {
  id: "t1",
  project_id: "p1",
  name: "translation.txt",
  source: { kind: "path", path: "/books/translation.txt" },
  created_at_ms: 0,
  track_selection_json: null,
  origin: null,
  translation_media_file_id: null,
} satisfies MediaFile;

function pairedTranslation(
  overrides: Partial<ReaderTranslation> = {},
): ReaderTranslation {
  return {
    candidates: [],
    paired: translationFile,
    document: { title: "Libro", language: "es", chapters: [] },
    language: "es",
    links: null,
    onChoose: () => {},
    onCombine: () => {},
    ...overrides,
  };
}

describe("translationStatusOf", () => {
  it("tells that no translation is ready while the paired one loads", () => {
    expect(translationStatusOf(pairedTranslation({ document: null }))).toBe(
      "absent",
    );
  });

  it("tells that a loaded translation without links is ready to be shown alone", () => {
    expect(translationStatusOf(pairedTranslation())).toBe("unaligned");
  });

  it("tells that a loaded translation with links is aligned", () => {
    expect(translationStatusOf(pairedTranslation({ links }))).toBe("aligned");
  });
});

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
