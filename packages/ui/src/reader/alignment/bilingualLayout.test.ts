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
      interlinearLinesOf(
        links,
        exampleShortBook,
        exampleShortBookTranslation,
        0,
        1,
      ),
    ).toEqual([{ at: 39, text: "El perro quiere comer. Tiene hambre." }]);
  });

  it("translates a sentence that runs on into the next paragraph there", () => {
    expect(
      interlinearLinesOf(runOnLinks, twoParagraphs, translationOfTwo, 0, 1),
    ).toEqual([
      { at: 5, text: "Two three." },
      { at: 11, text: "Four." },
    ]);
  });

  it("leaves out a translation whose sentence's quote no longer matches the book", () => {
    const stale: TranslationLink[] = [
      {
        spans: [{ ...span(0, 1, 6, 11), quote: "drei." }],
        translation_spans: [span(0, 1, 0, 5)],
      },
    ];
    expect(
      interlinearLinesOf(stale, twoParagraphs, translationOfTwo, 0, 1),
    ).toEqual([]);
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
    const unlinkedMiddle: Document = {
      ...translationOfTwo,
      chapters: [{ title: null, paragraphs: ["One.", "Aside.", "Two."] }],
    };
    const middle = parallelRowsOf(
      [
        { spans: [span(0, 0, 0, 5)], translation_spans: [span(0, 0, 0, 4)] },
        { spans: [span(0, 1, 0, 5)], translation_spans: [span(0, 2, 0, 4)] },
      ],
      twoParagraphs,
      unlinkedMiddle,
    );
    expect(middle.besideParagraph(0, 1)).toEqual([address(1), address(2)]);
  });

  it("puts the unlinked paragraphs before a chapter's first linked one beside its title", () => {
    expect(rows.besideTitle(1)).toEqual([address(3)]);
  });

  it("puts the unlinked paragraphs at the start of the translation beside the first chapter's title", () => {
    expect(rows.besideTitle(0)).toEqual([address(0)]);
  });

  it("leaves out of a chapter's first paragraph the text shown beside its title", () => {
    expect(rows.besideParagraph(1, 0)).toEqual([address(4)]);
  });

  it("puts the unlinked paragraphs before an untitled chapter's first linked one beside that paragraph", () => {
    const untitled: Document = {
      ...exampleShortBook,
      chapters: exampleShortBook.chapters.map((chapter) => ({
        ...chapter,
        title: null,
      })),
    };
    const plain = parallelRowsOf(links, untitled, exampleShortBookTranslation);
    expect(plain.besideParagraph(1, 0)).toEqual([address(3), address(4)]);
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
