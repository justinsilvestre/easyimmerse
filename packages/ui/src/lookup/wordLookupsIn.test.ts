import { describe, expect, it } from "vitest";
import { lookupTextAt } from "./lookupTextAt.ts";
import { wordLookupsIn } from "./wordLookupsIn.ts";

const textsOf = (passage: string) =>
  wordLookupsIn(passage).map((lookup) => lookup.text);

describe("wordLookupsIn", () => {
  it("looks up from the start of each word written with spaces", () => {
    expect(textsOf("Der Hund, satt.")).toEqual([
      "Der Hund, satt.",
      "Hund, satt.",
      "satt.",
    ]);
  });

  it("looks up from each character of a run written without spaces", () => {
    expect(textsOf("猫が、寝る")).toEqual([
      "猫が、寝る",
      "が、寝る",
      "寝る",
      "る",
    ]);
  });

  it("steps over characters outside the Basic Multilingual Plane whole", () => {
    expect(textsOf("𠮟る")).toEqual(["𠮟る", "る"]);
  });

  it("describes each lookup as a lookup at that place would", () => {
    expect(wordLookupsIn("a 𠮟る")[2]).toEqual(lookupTextAt("a 𠮟る", 4));
  });
});
