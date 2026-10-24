import { describe, expect, it } from "vitest";
import { matchedSpanEnd } from "./readerWordHighlight.ts";
import { zeroWidthSpace } from "./unwrapHardLineBreaks.ts";

describe("matchedSpanEnd", () => {
  it("ends the given number of characters after the start", () => {
    expect(matchedSpanEnd("銀河鉄道の夜", 1, 3)).toBe(4);
  });

  it("passes over the zero-width spaces that join wrapped lines", () => {
    expect(matchedSpanEnd(`銀河${zeroWidthSpace}鉄道`, 0, 4)).toBe(5);
  });

  it("stops at the end of the paragraph", () => {
    expect(matchedSpanEnd("銀河", 1, 5)).toBe(2);
  });
});
