import { describe, expect, it } from "vitest";
import { defaultSubtitleAppearance } from "./subtitleAppearance.ts";
import { subtitleBoxStyles } from "./subtitleBoxStyles.ts";

const bothLanguages = { target: 2, translation: 1 };

describe("subtitleBoxStyles", () => {
  it("draws the box in the chosen color at the chosen opacity", () => {
    const styles = subtitleBoxStyles(
      { ...defaultSubtitleAppearance, boxColor: "white", boxOpacity: 25 },
      bothLanguages,
    );
    expect(styles.box.backgroundColor).toBe("rgb(255 255 255 / 0.25)");
  });

  it("draws no shadow when the shadow is off", () => {
    const styles = subtitleBoxStyles(
      { ...defaultSubtitleAppearance, textShadow: "none" },
      bothLanguages,
    );
    expect(styles.box.textShadow).toBe("none");
  });

  it("draws a light shadow behind black text", () => {
    const styles = subtitleBoxStyles(
      { ...defaultSubtitleAppearance, textColor: "black" },
      bothLanguages,
    );
    expect(styles.box.textShadow).toContain("rgb(255 255 255");
  });

  it("scales the text by the chosen size", () => {
    const styles = subtitleBoxStyles(
      { ...defaultSubtitleAppearance, textSizeStep: 5 },
      bothLanguages,
    );
    expect(styles.target.fontSize).toMatch(/\* 1\.5\)$/);
  });

  it("keeps a lower box when only one language shows", () => {
    const both = subtitleBoxStyles(defaultSubtitleAppearance, bothLanguages);
    const targetOnly = subtitleBoxStyles(defaultSubtitleAppearance, {
      target: 2,
      translation: 0,
    });
    expect(targetOnly.box.height).not.toBe(both.box.height);
  });
});
