import { describe, expect, it } from "vitest";
import { splitIntoWords, stripMarkup } from "./ClickableText.tsx";

describe("splitIntoWords", () => {
  it("keeps the punctuation and spaces between words", () => {
    expect(
      splitIntoWords("Der Hund, er hat Hunger.").map((part) => part.text),
    ).toEqual(["Der", " ", "Hund", ", ", "er", " ", "hat", " ", "Hunger", "."]);
  });

  it("marks only the words", () => {
    expect(splitIntoWords("Hund.").map((part) => part.isWord)).toEqual([
      true,
      false,
    ]);
  });

  it("keeps an apostrophe inside a word", () => {
    expect(splitIntoWords("l'homme")[0]?.text).toBe("l'homme");
  });
});

describe("stripMarkup", () => {
  it("removes subtitle tags", () => {
    expect(stripMarkup("<i>Everything</i> is quiet.")).toBe(
      "Everything is quiet.",
    );
  });
});
