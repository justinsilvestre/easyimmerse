import { describe, expect, it } from "vitest";
import { splitAtWords } from "./splitAtWords.ts";

describe("splitAtWords", () => {
  it("keeps the text between the words as parts that are not words", () => {
    expect(
      splitAtWords("Der Hund schläft.", [{ start: 4, end: 8 }]).map(
        ({ text, isWord }) => [text, isWord],
      ),
    ).toEqual([
      ["Der ", false],
      ["Hund", true],
      [" schläft.", false],
    ]);
  });

  it("makes no word of text without words", () => {
    expect(splitAtWords("Er träumt.", []).some(({ isWord }) => isWord)).toBe(
      false,
    );
  });
});
