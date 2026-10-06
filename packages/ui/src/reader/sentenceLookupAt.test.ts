import { describe, expect, it } from "vitest";
import { sentenceLookupAt } from "./sentenceLookupAt.ts";
import { zeroWidthSpace } from "./unwrapHardLineBreaks.ts";

describe("sentenceLookupAt", () => {
  it("sends the text from the word to the end of its sentence", () => {
    const paragraph = "It rained. The cat slept. Then it woke.";
    expect(sentenceLookupAt(paragraph, 15, "en").lookup.text).toBe(
      "cat slept.",
    );
  });

  it("gives the word's offset within its sentence", () => {
    const paragraph = "It rained. The cat slept. Then it woke.";
    expect(sentenceLookupAt(paragraph, 15, "en").lookup.offset).toBe(4);
  });

  it("leaves out the zero-width spaces that join wrapped lines", () => {
    const paragraph = `銀河${zeroWidthSpace}鉄道の夜。`;
    expect(sentenceLookupAt(paragraph, 0, "ja").lookup.text).toBe(
      "銀河鉄道の夜。",
    );
  });

  it("counts the offset without the zero-width spaces before the word", () => {
    const paragraph = `銀河${zeroWidthSpace}鉄道の夜。`;
    expect(sentenceLookupAt(paragraph, 3, "ja").lookup.offset).toBe(2);
  });
});
