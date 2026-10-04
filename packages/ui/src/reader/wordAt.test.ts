import { describe, expect, it } from "vitest";
import { sentenceAt, wordAt } from "./wordAt.ts";

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
});

describe("sentenceAt", () => {
  it("finds the sentence around the offset without its trailing space", () => {
    expect(sentenceAt("Es regnet. Er schläft.", 14, "de")?.text).toBe(
      "Er schläft.",
    );
  });
});
