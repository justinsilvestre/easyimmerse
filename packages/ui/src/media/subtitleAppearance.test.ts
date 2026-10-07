import { describe, expect, it } from "vitest";
import {
  defaultSubtitleAppearance,
  parseSubtitleAppearance,
  subtitleTextScales,
} from "./subtitleAppearance.ts";

describe("parseSubtitleAppearance", () => {
  it("reads a stored appearance", () => {
    const stored = {
      backgroundOpacity: 75,
      textShadow: "heavy",
      textSizeStep: 4,
      textColor: "black",
    };
    expect(parseSubtitleAppearance(JSON.stringify(stored))).toEqual(stored);
  });

  it("returns the defaults when nothing is stored", () => {
    expect(parseSubtitleAppearance(undefined)).toEqual(
      defaultSubtitleAppearance,
    );
  });

  it("returns the defaults for a value that is not an object", () => {
    expect(parseSubtitleAppearance("yellow")).toEqual(
      defaultSubtitleAppearance,
    );
  });

  it("replaces an unknown choice with its default", () => {
    const stored = { ...defaultSubtitleAppearance, textShadow: "glowing" };
    expect(parseSubtitleAppearance(JSON.stringify(stored))).toEqual(
      defaultSubtitleAppearance,
    );
  });

  it("replaces an opacity above 100% with the default", () => {
    const stored = { ...defaultSubtitleAppearance, backgroundOpacity: 140 };
    expect(
      parseSubtitleAppearance(JSON.stringify(stored)).backgroundOpacity,
    ).toBe(defaultSubtitleAppearance.backgroundOpacity);
  });

  it("keeps an opacity of zero", () => {
    const stored = { ...defaultSubtitleAppearance, backgroundOpacity: 0 };
    expect(
      parseSubtitleAppearance(JSON.stringify(stored)).backgroundOpacity,
    ).toBe(0);
  });

  it("replaces a text size beyond the scale with the default", () => {
    const stored = { ...defaultSubtitleAppearance, textSizeStep: 12 };
    expect(parseSubtitleAppearance(JSON.stringify(stored)).textSizeStep).toBe(
      defaultSubtitleAppearance.textSizeStep,
    );
  });
});

describe("defaultSubtitleAppearance", () => {
  it("chooses the text size in the middle of the scale", () => {
    expect(defaultSubtitleAppearance.textSizeStep).toBe(
      (subtitleTextScales.length - 1) / 2,
    );
  });

  it("chooses the text size of 100%", () => {
    expect(subtitleTextScales[defaultSubtitleAppearance.textSizeStep]).toBe(1);
  });
});
