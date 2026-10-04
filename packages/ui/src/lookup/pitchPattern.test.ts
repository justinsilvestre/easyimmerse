import { describe, expect, it } from "vitest";
import { pitchPattern, splitIntoMorae } from "./pitchPattern.ts";

describe("splitIntoMorae", () => {
  it("attaches small kana to the mora before them", () => {
    expect(splitIntoMorae("きょう")).toEqual(["きょ", "う"]);
  });

  it("counts the small tsu and the long vowel mark as morae", () => {
    expect(splitIntoMorae("ちょっとコーヒー")).toEqual([
      "ちょ",
      "っ",
      "と",
      "コ",
      "ー",
      "ヒ",
      "ー",
    ]);
  });

  it("attaches small katakana as well", () => {
    expect(splitIntoMorae("ファイル")).toEqual(["ファ", "イ", "ル"]);
  });
});

describe("pitchPattern", () => {
  describe("for a downstep position", () => {
    it("rises after the first mora and stays high when there is no downstep", () => {
      expect(pitchPattern(0, 3)).toEqual(["L", "H", "H", "H"]);
    });

    it("drops after the first mora when the downstep is on it", () => {
      expect(pitchPattern(1, 3)).toEqual(["H", "L", "L", "L"]);
    });

    it("drops after the mora the downstep is on", () => {
      expect(pitchPattern(2, 3)).toEqual(["L", "H", "L", "L"]);
    });

    it("drops onto the following particle when the downstep is on the last mora", () => {
      expect(pitchPattern(3, 3)).toEqual(["L", "H", "H", "L"]);
    });
  });

  describe("for a written pattern", () => {
    it("reads one level per letter", () => {
      expect(pitchPattern("LHHL", 3)).toEqual(["L", "H", "H", "L"]);
    });

    it("reads any letter other than H as low", () => {
      expect(pitchPattern("hx", 1)).toEqual(["H", "L"]);
    });
  });
});
