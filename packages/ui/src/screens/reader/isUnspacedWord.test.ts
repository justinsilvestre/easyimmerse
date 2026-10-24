import { describe, expect, it } from "vitest";
import { isUnspacedWord } from "./isUnspacedWord.ts";

describe("isUnspacedWord", () => {
  it("counts a word that begins with digits before a kanji", () => {
    expect(isUnspacedWord("2026年")).toBe(true);
  });

  it("leaves out a word of a script written with spaces", () => {
    expect(isUnspacedWord("Hund")).toBe(false);
  });

  it("leaves out a Thai word, whose words the segmenter finds", () => {
    expect(isUnspacedWord("ข้าว")).toBe(false);
  });
});
