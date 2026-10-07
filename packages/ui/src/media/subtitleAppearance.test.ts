import { describe, expect, it } from "vitest";
import {
  defaultSubtitleAppearance,
  parseSubtitleAppearance,
} from "./subtitleAppearance.ts";

describe("parseSubtitleAppearance", () => {
  it("reads a stored appearance", () => {
    const stored = {
      boxColor: "white",
      boxOpacity: 75,
      textShadow: "strong",
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

  it("returns the defaults for text that is not JSON", () => {
    expect(parseSubtitleAppearance("yellow")).toEqual(
      defaultSubtitleAppearance,
    );
  });

  it("replaces an unknown value with its default and keeps the others", () => {
    const stored = {
      ...defaultSubtitleAppearance,
      boxColor: "purple",
      textColor: "yellow",
    };
    expect(parseSubtitleAppearance(JSON.stringify(stored))).toEqual({
      ...defaultSubtitleAppearance,
      textColor: "yellow",
    });
  });

  it("replaces an opacity above 100 with the default", () => {
    const stored = { ...defaultSubtitleAppearance, boxOpacity: 140 };
    expect(parseSubtitleAppearance(JSON.stringify(stored)).boxOpacity).toBe(
      defaultSubtitleAppearance.boxOpacity,
    );
  });

  it("keeps an opacity of zero", () => {
    const stored = { ...defaultSubtitleAppearance, boxOpacity: 0 };
    expect(parseSubtitleAppearance(JSON.stringify(stored)).boxOpacity).toBe(0);
  });

  it("replaces a text size beyond the available sizes with the default", () => {
    const stored = { ...defaultSubtitleAppearance, textSizeStep: 12 };
    expect(parseSubtitleAppearance(JSON.stringify(stored)).textSizeStep).toBe(
      defaultSubtitleAppearance.textSizeStep,
    );
  });
});
