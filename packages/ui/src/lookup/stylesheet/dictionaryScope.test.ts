import { describe, expect, it } from "vitest";
import { dictionaryClassName, dictionaryElementId } from "./dictionaryScope.ts";

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

describe("dictionaryElementId", () => {
  it("prefixes an id with the dictionary's id", () => {
    expect(dictionaryElementId("d1", "sense2")).toBe("dict-d1-sense2");
  });

  it("returns undefined for an empty id", () => {
    expect(dictionaryElementId("d1", "")).toBeUndefined();
  });

  it("returns undefined for an id that holds whitespace", () => {
    expect(dictionaryElementId("d1", "a b")).toBeUndefined();
  });
});
