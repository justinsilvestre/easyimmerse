import { describe, expect, it } from "vitest";
import {
  defaultReaderPreferences,
  parseReaderPreferences,
} from "./readerPreferences.ts";

describe("parseReaderPreferences", () => {
  it("reads stored preferences", () => {
    const stored = {
      ...defaultReaderPreferences,
      theme: "sepia",
      fontSizeStep: 5,
      layout: "scroll",
    };
    expect(parseReaderPreferences(JSON.stringify(stored))).toEqual(stored);
  });

  it("returns the defaults when nothing is stored", () => {
    expect(parseReaderPreferences(undefined)).toEqual(defaultReaderPreferences);
  });

  it("returns the defaults for text that is not JSON", () => {
    expect(parseReaderPreferences("sepia")).toEqual(defaultReaderPreferences);
  });

  it("replaces an unknown value with its default and keeps the others", () => {
    const stored = { ...defaultReaderPreferences, theme: "neon", font: "sans" };
    expect(parseReaderPreferences(JSON.stringify(stored))).toEqual({
      ...defaultReaderPreferences,
      font: "sans",
    });
  });

  it("replaces a font size beyond the available sizes with the default", () => {
    const stored = { ...defaultReaderPreferences, fontSizeStep: 40 };
    expect(parseReaderPreferences(JSON.stringify(stored)).fontSizeStep).toBe(
      defaultReaderPreferences.fontSizeStep,
    );
  });
});
