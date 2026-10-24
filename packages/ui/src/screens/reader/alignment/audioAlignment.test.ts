import type { Document, TimedSpan } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { segmentAt, segmentsOfParagraph } from "./audioAlignment.ts";

function segment(
  paragraphIndex: number,
  start: number,
  end: number,
  startMs: number,
  endMs: number,
): TimedSpan {
  return {
    span: { chapter_index: 0, paragraph_index: paragraphIndex, start, end },
    start_ms: startMs,
    end_ms: endMs,
  };
}

const book: Document = {
  title: "Book",
  language: "de",
  chapters: [
    { title: null, paragraphs: ["Der Hund. Er schläft tief.", "Gute Nacht."] },
  ],
};

const first = segment(0, 0, 10, 0, 1000);
const second = segment(0, 11, 20, 1000, 2500);
const third = segment(1, 0, 8, 2500, 4000);

describe("segmentAt", () => {
  it("finds the segment whose text holds the location", () => {
    expect(
      segmentAt([first, second, third], book, {
        chapterIndex: 0,
        paragraphIndex: 0,
        offset: 12,
      }),
    ).toBe(second);
  });

  it("returns null for text no segment covers", () => {
    expect(
      segmentAt([first, second, third], book, {
        chapterIndex: 0,
        paragraphIndex: 0,
        offset: 10,
      }),
    ).toBeNull();
  });

  it("returns null where the segment's quote no longer matches the text", () => {
    const stale = { ...second, span: { ...second.span, quote: "Gute Nach" } };
    expect(
      segmentAt([first, stale, third], book, {
        chapterIndex: 0,
        paragraphIndex: 0,
        offset: 12,
      }),
    ).toBeNull();
  });
});

describe("segmentsOfParagraph", () => {
  it("returns the paragraph's segments in document order", () => {
    expect(segmentsOfParagraph([third, second, first], 0, 0)).toEqual([
      first,
      second,
    ]);
  });
});
