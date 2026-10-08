import { describe, expect, it } from "vitest";
import { defaultSubtitleAppearance } from "./subtitleAppearance.ts";
import {
  subtitleBackdropStyles,
  subtitleBoxStyles,
} from "./subtitleBoxStyles.ts";

const bothLanguages = { target: 2, translation: 1 };

const shadowOf = (textShadow: typeof defaultSubtitleAppearance.textShadow) =>
  subtitleBoxStyles({ ...defaultSubtitleAppearance, textShadow }, bothLanguages)
    .box.textShadow as string;

describe("subtitleBoxStyles", () => {
  it("draws no shadow when the shadow is off", () => {
    expect(shadowOf("none")).toBe("none");
  });

  it("draws a light shadow behind black text", () => {
    const styles = subtitleBoxStyles(
      { ...defaultSubtitleAppearance, textColor: "black" },
      bothLanguages,
    );
    expect(styles.box.textShadow).toContain("rgb(255 255 255");
  });

  it("layers more shadows for a heavy shadow than for the default", () => {
    const layers = (shadow: string) => shadow.split("),").length;
    expect(layers(shadowOf("heavy"))).toBeGreaterThan(
      layers(shadowOf(defaultSubtitleAppearance.textShadow)),
    );
  });

  it("scales the text by the chosen size", () => {
    const styles = subtitleBoxStyles(
      { ...defaultSubtitleAppearance, textSizeStep: 4 },
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

describe("subtitleBackdropStyles", () => {
  it("draws the backdrop in black at the chosen opacity", () => {
    const styles = subtitleBackdropStyles({
      ...defaultSubtitleAppearance,
      backgroundOpacity: 60,
    });
    expect(styles.backdrop.backgroundColor).toBe("rgb(0 0 0 / 0.6)");
  });

  it("fades the feathered edge in from transparent to the backdrop's color", () => {
    const styles = subtitleBackdropStyles(defaultSubtitleAppearance);
    expect(styles.feather.backgroundImage).toBe(
      "linear-gradient(to bottom, rgb(0 0 0 / 0), rgb(0 0 0 / 0.25))",
    );
  });
});
