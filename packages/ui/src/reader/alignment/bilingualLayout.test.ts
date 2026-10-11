import type { Document, TextSpan, TranslationLink } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  exampleShortBook,
  exampleShortBookAlignment,
  exampleShortBookTranslation,
} from "../exampleDocuments.ts";
import { interlinearLinesOf, parallelRowsOf } from "./bilingualLayout.ts";

const alignment = exampleShortBookAlignment("b1", "t1").content;
const links = alignment.kind === "translation" ? alignment.links : [];

function span(
  chapterIndex: number,
  paragraphIndex: number,
  start: number,
  end: number,
): TextSpan {
  return {
    chapter_index: chapterIndex,
    paragraph_index: paragraphIndex,
    start,
    end,
  };
}

const twoParagraphs: Document = {
  title: "Book",
  language: "de",
  chapters: [{ title: null, paragraphs: ["Eins. Zwei", "drei. Vier."] }],
};

const translationOfTwo: Document = {
  title: "Book",
  language: "en",
  chapters: [{ title: null, paragraphs: ["One. Two three.", "Four."] }],
};

/** "Zwei drei." runs from the first paragraph into the second. */
const runOnLinks: TranslationLink[] = [
  { spans: [span(0, 0, 0, 5)], translation_spans: [span(0, 0, 0, 4)] },
  {
    spans: [span(0, 0, 6, 10), span(0, 1, 0, 5)],
    translation_spans: [span(0, 0, 5, 15)],
  },
  { spans: [span(0, 1, 6, 11)], translation_spans: [span(0, 1, 0, 5)] },
];

describe("interlinearLinesOf", () => {
  it("puts the translation of a sentence after its end", () => {
    expect(
      interlinearLinesOf(links, exampleShortBookTranslation, 0, 1, 39),
    ).toEqual([{ at: 39, text: "El perro quiere comer. Tiene hambre." }]);
  });

  it("translates a sentence that runs on into the next paragraph there", () => {
    expect(interlinearLinesOf(runOnLinks, translationOfTwo, 0, 1, 11)).toEqual([
      { at: 5, text: "Two three." },
      { at: 11, text: "Four." },
    ]);
  });
});

describe("parallelRowsOf", () => {
  const rows = parallelRowsOf(
    links,
    exampleShortBook,
    exampleShortBookTranslation,
  );
  const address = (paragraphIndex: number) => ({
    chapterIndex: 0,
    paragraphIndex,
  });

  it("puts an unlinked paragraph of the translation before the next linked one", () => {
    expect(rows.besideParagraph(1, 0)).toEqual([address(3), address(4)]);
  });

  it("pairs a paragraph with the translation linked from it", () => {
    expect(rows.besideParagraph(1, 1)).toEqual([address(5)]);
  });

  it("shows a translation paragraph linked from two paragraphs beside the first only", () => {
    const shared = parallelRowsOf(runOnLinks, twoParagraphs, translationOfTwo);
    expect(shared.besideParagraph(0, 1)).toEqual([address(1)]);
  });

  it("puts the paragraphs of the translation after the last linked one at the end", () => {
    const unlinkedEnd: Document = {
      ...translationOfTwo,
      chapters: [{ title: null, paragraphs: ["One.", "Two.", "The end."] }],
    };
    const ending = parallelRowsOf(
      [{ spans: [span(0, 1, 0, 5)], translation_spans: [span(0, 1, 0, 4)] }],
      twoParagraphs,
      unlinkedEnd,
    );
    expect(ending.besideParagraph(0, 1)).toEqual([
      address(0),
      address(1),
      address(2),
    ]);
  });
});
