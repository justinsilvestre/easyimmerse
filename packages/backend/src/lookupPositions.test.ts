import { describe, expect, it } from "vitest";
import { lookupPositions, lookupStartsIn } from "./lookupPositions.ts";

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

  it("lists every character of Bopomofo", () => {
    expect(lookupPositions("ㄅㄆ")).toEqual([0, 1]);
  });

  it("lists every letter of Thai text but not its vowel signs and tone marks", () => {
    expect(lookupPositions("กินข้าว")).toEqual([0, 2, 3, 5, 6]);
  });

  it("lists a Thai vowel written before its consonant", () => {
    expect(lookupPositions("เขา")).toEqual([0, 1, 2]);
  });

  it("lists every letter of Lao text but not its vowel signs", () => {
    expect(lookupPositions("ສະບາຍດີ")).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("lists every letter of Khmer text but not its signs", () => {
    expect(lookupPositions("ខ្ញុំ")).toEqual([0, 2]);
  });

  it("lists every letter of Myanmar text but not its signs", () => {
    expect(lookupPositions("မြန်မာ")).toEqual([0, 2, 4]);
  });

  it("skips a combining mark at the start of the text", () => {
    expect(lookupPositions("\u0E34ก")).toEqual([1]);
  });

  it("treats a next-line character as whitespace", () => {
    expect(lookupPositions("cat\u0085dog")).toEqual([0, 4]);
  });

  it("does not treat a zero-width no-break space as whitespace", () => {
    expect(lookupPositions("cat\uFEFFdog")).toEqual([0]);
  });
});

describe("lookupStartsIn", () => {
  it("counts offsets in UTF-16 code units", () => {
    expect(lookupStartsIn("𠮟る")).toEqual([0, 2]);
  });

  it("starts a run that begins with digits once at the digits", () => {
    expect(lookupStartsIn("2026年")).toEqual([0, 4]);
  });
});
