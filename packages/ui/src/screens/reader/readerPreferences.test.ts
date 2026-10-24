import { readerFontSizeStepCount } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { fontSizesRem } from "./readerPreferences.ts";

describe("fontSizesRem", () => {
  it("gives a size to each of the reader's size steps", () => {
    expect(fontSizesRem.length).toBe(readerFontSizeStepCount);
  });
});
