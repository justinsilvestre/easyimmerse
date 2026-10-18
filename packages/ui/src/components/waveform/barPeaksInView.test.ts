import { describe, expect, it } from "vitest";
import { barPeaksInView } from "./barPeaksInView.ts";

/** One loaded window, the file's first thirty seconds, whose peaks rise by one every 10 ms peak. */
const windows = new Map([
  [0, Array.from({ length: 3000 }, (_, index) => index % 256)],
]);

/** 600 px over a minute: 0.1 px per 10 ms peak, so forty peaks to each 4 px bar. */
const view = { startMs: 0, spanMs: 60_000, widthPx: 600 };

describe("barPeaksInView", () => {
  it("takes the loudest peak of each bar, scaled to 0–1", () => {
    expect(barPeaksInView(windows, view).peaks[0]).toBe(39 / 255);
  });

  it("leaves a bar with no loaded window empty", () => {
    expect(barPeaksInView(windows, view).peaks[75]).toBeNull();
  });

  it("covers the view with whole bars", () => {
    expect(barPeaksInView(windows, view).peaks).toHaveLength(150);
  });

  it("starts the bars at the same times as the view moves", () => {
    const moved = { ...view, startMs: 6_250 };
    expect(barPeaksInView(windows, moved).peaks[0]).toBe(
      barPeaksInView(windows, view).peaks[15],
    );
  });

  it("places the view's left edge partway into its first bar", () => {
    const moved = { ...view, startMs: 6_150 };
    expect(barPeaksInView(windows, moved).from).toBeCloseTo(0.375);
  });

  it("places the view's right edge partway into its last bar", () => {
    const moved = { ...view, startMs: 6_150 };
    expect(barPeaksInView(windows, moved).to).toBeCloseTo(150.375);
  });
});
