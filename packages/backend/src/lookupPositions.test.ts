import { describe, expect, it } from "vitest";
import { lookupPositions } from "./lookupPositions.ts";

describe("lookupPositions", () => {
  it("lists the start of each word in spaced text", () => {
    expect(lookupPositions("Ich rufe dich an.")).toEqual([0, 4, 9, 14]);
  });

  it("lists every character of Japanese text", () => {
    expect(lookupPositions("猫が本を")).toEqual([0, 1, 2, 3]);
  });

  it("skips punctuation in Japanese text", () => {
    expect(lookupPositions("「猫」。")).toEqual([1]);
  });

  it("skips leading whitespace", () => {
    expect(lookupPositions("  word")).toEqual([2]);
  });

  it("lists a word that follows Japanese text without a space", () => {
    expect(lookupPositions("猫のcat food")).toEqual([0, 1, 2, 6]);
  });

  it("keeps a hyphenated word whole", () => {
    expect(lookupPositions("well-known")).toEqual([0]);
  });

  it("lists each character of a katakana word with a long vowel mark", () => {
    expect(lookupPositions("コーヒー")).toEqual([0, 1, 2, 3]);
  });

  it("counts a character outside the Basic Multilingual Plane as one", () => {
    expect(lookupPositions("𠮟る")).toEqual([0, 1]);
  });

  it("treats a next-line character as whitespace", () => {
    expect(lookupPositions("cat\u0085dog")).toEqual([0, 4]);
  });

  it("does not treat a zero-width no-break space as whitespace", () => {
    expect(lookupPositions("cat\uFEFFdog")).toEqual([0]);
  });
});
