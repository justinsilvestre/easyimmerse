import type { Document, TextSpan, TranslationLink } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  linkAt,
  linksOfParagraph,
  translationOfLink,
  translationParagraphsOf,
  translationSpansOf,
} from "./translationAlignment.ts";

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

function link(
  spans: TextSpan[],
  translationSpans: TextSpan[],
): TranslationLink {
  return { spans, translation_spans: translationSpans };
}

const translationDocument: Document = {
  title: "Book",
  language: "en",
  chapters: [
    {
      title: "I",
      paragraphs: ["The dog sleeps.", "The cat eats.", "It is hungry."],
    },
  ],
};

/** The first paragraph's two sentences, then a sentence of the second paragraph that the translation splits in two. */
const dogLink = link([span(0, 0, 0, 17)], [span(0, 0, 0, 15)]);
const catLink = link([span(0, 0, 18, 33)], [span(0, 1, 0, 13)]);
const hungryLink = link(
  [span(0, 1, 0, 20)],
  [span(0, 1, 0, 13), span(0, 2, 0, 13)],
);
/** A sentence that runs from the end of the first paragraph into the second. */
const joinedLink = link(
  [span(0, 0, 34, 40), span(0, 1, 21, 30)],
  [span(0, 2, 0, 2)],
);
/** Text the translation leaves out. */
const omittedLink = link([span(0, 0, 41, 50)], []);

/** The book the links pair with the translation, with paragraphs long enough to hold the links' document spans. */
const book: Document = {
  title: "Buch",
  language: "de",
  chapters: [
    {
      title: "I",
      paragraphs: [
        "Der Hund schläft. Die Katze isst. Sie hat Hunger, sagt man.",
        "Sie ist sehr hungrig, so wie immer.",
      ],
    },
  ],
};

describe("linkAt", () => {
  it("finds the link whose document text holds the location", () => {
    expect(
      linkAt([dogLink, catLink, hungryLink], book, {
        chapterIndex: 0,
        paragraphIndex: 0,
        offset: 20,
      }),
    ).toBe(catLink);
  });

  it("finds a link by any of its document spans", () => {
    expect(
      linkAt([dogLink, joinedLink], book, {
        chapterIndex: 0,
        paragraphIndex: 1,
        offset: 25,
      }),
    ).toBe(joinedLink);
  });

  it("returns null for text no link covers", () => {
    expect(
      linkAt([dogLink, catLink], book, {
        chapterIndex: 0,
        paragraphIndex: 0,
        offset: 17,
      }),
    ).toBeNull();
  });

  it("returns null where the link's quote no longer matches the text", () => {
    const stale = link(
      [{ ...span(0, 0, 18, 33), quote: "Der Hund schläf" }],
      [span(0, 1, 0, 13)],
    );
    expect(
      linkAt([dogLink, stale], book, {
        chapterIndex: 0,
        paragraphIndex: 0,
        offset: 20,
      }),
    ).toBeNull();
  });
});

describe("linksOfParagraph", () => {
  it("returns the links with text in the paragraph, in order", () => {
    expect(
      linksOfParagraph([hungryLink, catLink, dogLink, joinedLink], 0, 0),
    ).toEqual([dogLink, catLink, joinedLink]);
  });

  it("orders a link by its first span in the paragraph", () => {
    expect(linksOfParagraph([joinedLink, hungryLink], 0, 1)).toEqual([
      hungryLink,
      joinedLink,
    ]);
  });
});

describe("translationOfLink", () => {
  it("joins the translation spans with single spaces", () => {
    expect(translationOfLink(translationDocument, hungryLink)).toBe(
      "The cat eats. It is hungry.",
    );
  });

  it("returns an empty string for text the translation leaves out", () => {
    expect(translationOfLink(translationDocument, omittedLink)).toBe("");
  });
});

describe("translationParagraphsOf", () => {
  it("returns each translation paragraph linked from the paragraph once, in order", () => {
    expect(
      translationParagraphsOf(
        [joinedLink, catLink, dogLink, omittedLink],
        0,
        0,
      ),
    ).toEqual([
      { chapterIndex: 0, paragraphIndex: 0 },
      { chapterIndex: 0, paragraphIndex: 1 },
      { chapterIndex: 0, paragraphIndex: 2 },
    ]);
  });

  it("returns nothing for a paragraph no link covers", () => {
    expect(translationParagraphsOf([dogLink, catLink], 0, 3)).toEqual([]);
  });
});

describe("translationSpansOf", () => {
  const links = [
    link([span(0, 0, 0, 5)], [span(0, 0, 0, 4)]),
    link([span(0, 0, 6, 12)], [span(0, 1, 6, 9), span(0, 1, 0, 5)]),
  ];

  it("returns the translation spans of the links that overlap the span, in document order", () => {
    expect(translationSpansOf(links, span(0, 0, 4, 8))).toEqual([
      span(0, 0, 0, 4),
      span(0, 1, 0, 5),
      span(0, 1, 6, 9),
    ]);
  });

  it("returns nothing for a span that only touches a link's end", () => {
    expect(translationSpansOf(links, span(0, 0, 5, 6))).toEqual([]);
  });
});
