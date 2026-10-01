import { describe, expect, it } from "vitest";
import { primaryLanguageSubtag } from "./primaryLanguageSubtag.ts";

describe("primaryLanguageSubtag", () => {
  it("returns the language before the region in lower case", () => {
    expect(primaryLanguageSubtag("PT-br")).toBe("pt");
  });
});
