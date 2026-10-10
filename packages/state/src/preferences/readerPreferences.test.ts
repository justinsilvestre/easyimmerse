import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import {
  defaultReaderPreferences,
  selectReaderPreferences,
} from "./readerPreferences.ts";

const storing = (readerPreferences: string) =>
  stateAfter(actions.preferencesLoaded({ readerPreferences }));

describe("selectReaderPreferences", () => {
  it("reads stored preferences", () => {
    const stored = {
      ...defaultReaderPreferences,
      theme: "sepia",
      fontSizeStep: 5,
      layout: "scroll",
    };
    expect(selectReaderPreferences(storing(JSON.stringify(stored)))).toEqual(
      stored,
    );
  });

  it("returns the defaults when nothing is stored", () => {
    expect(selectReaderPreferences(stateAfter())).toEqual(
      defaultReaderPreferences,
    );
  });

  it("returns the defaults for text that is not JSON", () => {
    expect(selectReaderPreferences(storing("sepia"))).toEqual(
      defaultReaderPreferences,
    );
  });

  it("replaces an unknown value with its default and keeps the others", () => {
    const stored = { ...defaultReaderPreferences, theme: "neon", font: "sans" };
    expect(selectReaderPreferences(storing(JSON.stringify(stored)))).toEqual({
      ...defaultReaderPreferences,
      font: "sans",
    });
  });

  it("replaces a font size beyond the available sizes with the default", () => {
    const stored = { ...defaultReaderPreferences, fontSizeStep: 40 };
    expect(
      selectReaderPreferences(storing(JSON.stringify(stored))).fontSizeStep,
    ).toBe(defaultReaderPreferences.fontSizeStep);
  });

  it("keeps its result while the stored value stays the same", () => {
    const app = storing(JSON.stringify({ layout: "scroll" }));
    expect(selectReaderPreferences(app)).toBe(
      selectReaderPreferences({ ...app }),
    );
  });
});
