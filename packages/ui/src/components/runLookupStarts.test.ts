import { describe, expect, it } from "vitest";
import { runLookupEnd, runLookupStartAt } from "./runLookupStarts.ts";

describe("runLookupStartAt", () => {
  it("moves from a Thai vowel sign to the letter it belongs to", () => {
    expect(runLookupStartAt("กินข้าว", 1)).toBe(0);
  });

  it("moves from a digit to the first digit of its stretch", () => {
    expect(runLookupStartAt("2026年", 2)).toBe(0);
  });

  it("keeps an offset that is a lookup start", () => {
    expect(runLookupStartAt("2026年", 4)).toBe(4);
  });
});

describe("runLookupEnd", () => {
  it("ends after the marks on a letter", () => {
    expect(runLookupEnd("ข้าว", 0)).toBe(2);
  });

  it("ends at the end of the run after its last start", () => {
    expect(runLookupEnd("2026年", 4)).toBe(5);
  });
});
