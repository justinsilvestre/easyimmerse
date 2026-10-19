import { describe, expect, it } from "vitest";
import { isTableFile } from "./isTableFile.ts";

describe("isTableFile", () => {
  it("counts a Tabfile as a table", () => {
    expect(isTableFile("Wörter.TAB")).toBe(true);
  });

  it("leaves out an archive", () => {
    expect(isTableFile("jmdict.zip")).toBe(false);
  });
});
