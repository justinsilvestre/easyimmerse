import { describe, expect, it } from "vitest";
import { exampleCues } from "./exampleCues.ts";
import { flashcardWordRanges } from "./flashcardWordRanges.ts";

function card(cueIndex: number | null, word: string) {
  return { cue_index: cueIndex, content: { word } };
}

describe("flashcardWordRanges", () => {
  it("finds a card's word in its cue", () => {
    const ranges = flashcardWordRanges([card(3, "fressen")], exampleCues);
    expect(ranges.get(3)).toEqual([{ from: 14, to: 21 }]);
  });

  it("counts offsets in the cue's text without markup", () => {
    const ranges = flashcardWordRanges([card(7, "ruhig")], exampleCues);
    expect(ranges.get(7)).toEqual([{ from: 10, to: 15 }]);
  });

  it("takes the first occurrence of the word", () => {
    const ranges = flashcardWordRanges([card(2, "e")], exampleCues);
    expect(ranges.get(2)).toEqual([{ from: 1, to: 2 }]);
  });

  it("gathers the words of several cards made from one cue", () => {
    const ranges = flashcardWordRanges(
      [card(3, "Hund"), card(3, "Hunger")],
      exampleCues,
    );
    expect(ranges.get(3)).toEqual([
      { from: 4, to: 8 },
      { from: 30, to: 36 },
    ]);
  });

  it("skips a word that its cue does not hold", () => {
    const ranges = flashcardWordRanges([card(3, "Katze")], exampleCues);
    expect(ranges.has(3)).toBe(false);
  });

  it("skips a card without a word", () => {
    const ranges = flashcardWordRanges([card(3, "")], exampleCues);
    expect(ranges.has(3)).toBe(false);
  });

  it("skips a card made from no cue", () => {
    const ranges = flashcardWordRanges([card(null, "Hund")], exampleCues);
    expect(ranges.size).toBe(0);
  });
});
