import type { Document, TextSpan } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  clampSpanToDocument,
  compareSpans,
  spanContains,
  spansOfParagraph,
  textOfSpan,
  textOfSpans,
} from "./textSpans.ts";

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

function createDocument(): Document {
  return {
    title: "Book",
    language: "de",
    chapters: [
      { title: "I", paragraphs: ["Der Hund schläft.", "Die Katze isst."] },
      { title: "II", paragraphs: ["Gute Nacht 🌙 alle."] },
    ],
  };
}

describe("compareSpans", () => {
  it("orders a span of an earlier chapter first", () => {
    expect(compareSpans(span(0, 5, 9, 10), span(1, 0, 0, 1))).toBeLessThan(0);
  });

  it("orders a span of a later paragraph last", () => {
    expect(compareSpans(span(0, 2, 0, 1), span(0, 1, 9, 10))).toBeGreaterThan(
      0,
    );
  });

  it("orders spans of one paragraph by their start", () => {
    expect(compareSpans(span(0, 0, 4, 5), span(0, 0, 2, 9))).toBeGreaterThan(0);
  });

  it("treats equal spans as equal", () => {
    expect(compareSpans(span(0, 0, 1, 2), span(0, 0, 1, 2))).toBe(0);
  });
});

describe("spanContains", () => {
  it("contains the location at its start", () => {
    expect(
      spanContains(span(0, 1, 4, 9), {
        chapterIndex: 0,
        paragraphIndex: 1,
        offset: 4,
      }),
    ).toBe(true);
  });

  it("does not contain the location at its end", () => {
    expect(
      spanContains(span(0, 1, 4, 9), {
        chapterIndex: 0,
        paragraphIndex: 1,
        offset: 9,
      }),
    ).toBe(false);
  });

  it("does not contain a location in another paragraph", () => {
    expect(
      spanContains(span(0, 1, 4, 9), {
        chapterIndex: 0,
        paragraphIndex: 2,
        offset: 5,
      }),
    ).toBe(false);
  });
});

describe("spansOfParagraph", () => {
  it("returns the paragraph's spans in document order", () => {
    expect(
      spansOfParagraph(
        [span(0, 1, 5, 9), span(1, 1, 0, 2), span(0, 1, 0, 4)],
        0,
        1,
      ),
    ).toEqual([span(0, 1, 0, 4), span(0, 1, 5, 9)]);
  });
});

describe("clampSpanToDocument", () => {
  it("keeps a span inside its paragraph as it is", () => {
    expect(clampSpanToDocument(span(0, 0, 4, 8), createDocument())).toEqual(
      span(0, 0, 4, 8),
    );
  });

  it("cuts the end of a span to the paragraph's length", () => {
    expect(clampSpanToDocument(span(0, 1, 4, 99), createDocument())).toEqual(
      span(0, 1, 4, 15),
    );
  });

  it("empties a span that starts past the paragraph's end", () => {
    expect(clampSpanToDocument(span(0, 1, 20, 30), createDocument())).toEqual(
      span(0, 1, 15, 15),
    );
  });

  it("returns null for a paragraph the document does not have", () => {
    expect(clampSpanToDocument(span(1, 1, 0, 2), createDocument())).toBeNull();
  });

  it("returns null for a chapter the document does not have", () => {
    expect(clampSpanToDocument(span(2, 0, 0, 2), createDocument())).toBeNull();
  });
});

describe("textOfSpan", () => {
  it("returns the text the span covers", () => {
    expect(textOfSpan(createDocument(), span(0, 0, 4, 8))).toBe("Hund");
  });

  it("counts offsets in UTF-16 code units", () => {
    expect(textOfSpan(createDocument(), span(1, 0, 11, 18))).toBe("🌙 alle");
  });

  it("returns an empty string for a span outside the document", () => {
    expect(textOfSpan(createDocument(), span(3, 0, 0, 2))).toBe("");
  });
});

describe("textOfSpans", () => {
  it("joins the texts with single spaces", () => {
    expect(
      textOfSpans(createDocument(), [span(0, 0, 0, 17), span(0, 1, 0, 15)]),
    ).toBe("Der Hund schläft. Die Katze isst.");
  });

  it("leaves out spans outside the document", () => {
    expect(
      textOfSpans(createDocument(), [span(0, 0, 4, 8), span(5, 0, 0, 2)]),
    ).toBe("Hund");
  });
});
