import { describe, expect, it } from "vitest";
import { sentenceAt, wordAt, wordsAroundCaret } from "./wordAt.ts";

describe("wordAt", () => {
  it("finds the word around the offset", () => {
    expect(wordAt("Der Käfer schlief.", 6, "de")).toEqual({
      text: "Käfer",
      start: 4,
      end: 9,
    });
  });

  it("returns null on punctuation", () => {
    expect(wordAt("Ja, gut.", 2, "de")).toBeNull();
  });

  it("splits text written without spaces", () => {
    expect(wordAt("猫が寝ている", 0, "ja")?.text).toBe("猫");
  });

  it("falls back to the default word boundaries for a malformed language tag", () => {
    expect(wordAt("Der Käfer schlief.", 6, "de_DE")?.text).toBe("Käfer");
  });
});

describe("wordsAroundCaret", () => {
  it("gives the words on both sides of a caret between two words, the later one first", () => {
    expect(
      wordsAroundCaret("猫が寝ている", 1, "ja").map((word) => word.text),
    ).toEqual(["が", "猫"]);
  });

  it("gives one word for a caret inside it", () => {
    expect(
      wordsAroundCaret("Der Käfer", 6, "de").map((word) => word.text),
    ).toEqual(["Käfer"]);
  });

  it("gives the word before a caret that is followed by punctuation", () => {
    expect(
      wordsAroundCaret("Ja, gut.", 2, "de").map((word) => word.text),
    ).toEqual(["Ja"]);
  });
});

describe("sentenceAt", () => {
  it("finds the sentence around the offset without its trailing space", () => {
    expect(sentenceAt("Es regnet. Er schläft.", 14, "de")?.text).toBe(
      "Er schläft.",
    );
  });
});
