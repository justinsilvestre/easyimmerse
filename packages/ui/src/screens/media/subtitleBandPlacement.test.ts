import { describe, expect, it } from "vitest";
import { subtitleBandPlacement } from "./subtitleBandPlacement.ts";

const widescreen = 16 / 9;

/** The subtitle band, which holds two lines of the target language and one of the translation. */
const bandHeight = 100;

/** The player controls, which sit at the bottom of the stage under the band. */
const controlsHeight = 70;

describe("subtitleBandPlacement", () => {
  it("places the band below a picture that leaves room for it, as on a phone held upright", () => {
    const stage = { width: 375, height: 500 };
    expect(
      subtitleBandPlacement(stage, widescreen, bandHeight, controlsHeight),
    ).toBe("below");
  });

  it("places the band below a picture as wide as the stage when the band fills the rest exactly", () => {
    const stage = { width: 640, height: 360 + bandHeight + controlsHeight };
    expect(
      subtitleBandPlacement(stage, widescreen, bandHeight, controlsHeight),
    ).toBe("below");
  });

  it("places the band over a picture whose stage has room for the band but not for the controls as well", () => {
    const stage = { width: 640, height: 360 + bandHeight };
    expect(
      subtitleBandPlacement(stage, widescreen, bandHeight, controlsHeight),
    ).toBe("overlay");
  });

  it("forgives a fraction of a pixel of rounding", () => {
    const stage = {
      width: 640,
      height: 360 + bandHeight + controlsHeight - 0.5,
    };
    expect(
      subtitleBandPlacement(stage, widescreen, bandHeight, controlsHeight),
    ).toBe("below");
  });

  it("places the band over a picture that would shrink to make room for it, as in a short, wide window", () => {
    const stage = { width: 450, height: 400 };
    expect(
      subtitleBandPlacement(stage, widescreen, bandHeight, controlsHeight),
    ).toBe("overlay");
  });

  it("places the band over a picture that already fills the stage's height", () => {
    const stage = { width: 1600, height: 600 };
    expect(
      subtitleBandPlacement(stage, widescreen, bandHeight, controlsHeight),
    ).toBe("overlay");
  });

  it("places the band below when the picture's proportions are unknown, as for an audio file", () => {
    const stage = { width: 450, height: 400 };
    expect(subtitleBandPlacement(stage, null, bandHeight, controlsHeight)).toBe(
      "below",
    );
  });
});
