import { describe, expect, it } from "vitest";
import { layOutBars, peaksPerBar } from "./layOutBars.ts";

const peaks = [0.1, 0.5, 0.2, 0.8, null, null, 0.3, null];

describe("peaksPerBar", () => {
  it("gives each peak its own bar when the peaks lie far enough apart", () => {
    expect(peaksPerBar(10)).toBe(1);
  });

  it("puts as few peaks in a bar as keep the bars far enough apart", () => {
    expect(peaksPerBar(1.5)).toBe(3);
  });

  it("gives each peak its own bar when the peaks lie just far enough apart", () => {
    expect(peaksPerBar(4 * (1 - 1e-12))).toBe(1);
  });
});

describe("layOutBars", () => {
  const frame = { from: 0, to: 8, widthPx: 80, pixelRatio: 1 };

  it("draws one bar per peak when the peaks lie far enough apart", () => {
    expect(layOutBars(peaks, frame).map((bar) => bar.peak)).toEqual(peaks);
  });

  it("spaces the bars evenly from the left edge", () => {
    expect(layOutBars(peaks, frame).map((bar) => bar.x)).toEqual([
      0, 10, 20, 30, 40, 50, 60, 70,
    ]);
  });

  it("leaves a gap of three tenths of the spacing between bars", () => {
    expect(layOutBars(peaks, frame)[0]?.width).toBe(7);
  });

  it("draws the loudest peak of each group when the peaks lie close together", () => {
    const narrow = { ...frame, widthPx: 24 };
    expect(layOutBars(peaks, narrow).map((bar) => bar.peak)).toEqual([
      0.5,
      0.8,
      null,
      0.3,
    ]);
  });

  it("starts the groups at the first peak, wherever the view starts", () => {
    const shifted = { ...frame, from: 1, to: 9, widthPx: 24 };
    expect(layOutBars(peaks, shifted)[0]?.peak).toBe(0.5);
  });

  it("leaves out the bars wholly before the view", () => {
    const later = { from: 2, to: 8, widthPx: 60, pixelRatio: 1 };
    expect(layOutBars(peaks, later)).toHaveLength(6);
  });

  it("places a bar cut by the left edge partly before it", () => {
    const later = { from: 1.5, to: 8, widthPx: 65, pixelRatio: 1 };
    expect(layOutBars(peaks, later)[0]?.x).toBe(-5);
  });

  it("aligns the bars' edges to the device's pixels", () => {
    const sharp = { from: 0, to: 8, widthPx: 49.6, pixelRatio: 2 };
    expect(layOutBars(peaks, sharp)[1]).toEqual({
      x: 6,
      width: 4.5,
      peak: 0.5,
    });
  });
});
