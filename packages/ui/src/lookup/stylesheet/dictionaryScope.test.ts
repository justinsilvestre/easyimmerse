import { describe, expect, it } from "vitest";
import { dictionaryClassName } from "./dictionaryScope.ts";

describe("dictionaryClassName", () => {
  it("prefixes each class name", () => {
    expect(dictionaryClassName(" hw  pos\tnoun ")).toBe(
      "dict-hw dict-pos dict-noun",
    );
  });

  it("returns undefined for an empty class attribute", () => {
    expect(dictionaryClassName("  ")).toBeUndefined();
  });

  it("returns undefined without a class attribute", () => {
    expect(dictionaryClassName(null)).toBeUndefined();
  });
});
