import type { TimedSpan } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  segmentAt,
  segmentSpokenAt,
  segmentsOfParagraph,
} from "./audioAlignment.ts";

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

const first = segment(0, 0, 10, 0, 1000);
const second = segment(0, 11, 20, 1000, 2500);
const third = segment(1, 0, 8, 2500, 4000);

describe("segmentAt", () => {
  it("finds the segment whose text holds the location", () => {
    expect(
      segmentAt([first, second, third], {
        chapterIndex: 0,
        paragraphIndex: 0,
        offset: 12,
      }),
    ).toBe(second);
  });

  it("returns null for text no segment covers", () => {
    expect(
      segmentAt([first, second, third], {
        chapterIndex: 0,
        paragraphIndex: 0,
        offset: 10,
      }),
    ).toBeNull();
  });
});

describe("segmentSpokenAt", () => {
  it("finds the segment heard at the time", () => {
    expect(segmentSpokenAt([first, second, third], 1200)).toBe(second);
  });

  it("finds the next segment at the end of an earlier one", () => {
    expect(segmentSpokenAt([first, second, third], 1000)).toBe(second);
  });

  it("finds a segment in a list not sorted by time", () => {
    expect(segmentSpokenAt([third, second, first], 500)).toBe(first);
  });

  it("returns null after the last segment ends", () => {
    expect(segmentSpokenAt([first, second, third], 4000)).toBeNull();
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
