import { describe, expect, it } from "vitest";
import { popupPlacement } from "./popupPlacement.ts";

const viewport = { width: 1000, height: 800 };

describe("popupPlacement", () => {
  it("opens below a word in the upper part of the window", () => {
    expect(
      popupPlacement(
        { top: 100, bottom: 120, left: 400, width: 50 },
        300,
        viewport,
      ).top,
    ).toBe(128);
  });

  it("opens above a word in the lower part of the window", () => {
    expect(
      popupPlacement(
        { top: 600, bottom: 620, left: 400, width: 50 },
        300,
        viewport,
      ).bottom,
    ).toBe(208);
  });

  it("centers on the word", () => {
    expect(
      popupPlacement(
        { top: 100, bottom: 120, left: 400, width: 50 },
        300,
        viewport,
      ).left,
    ).toBe(275);
  });

  it("keeps clear of the window's right edge", () => {
    expect(
      popupPlacement(
        { top: 100, bottom: 120, left: 980, width: 10 },
        300,
        viewport,
      ).left,
    ).toBe(692);
  });
});
