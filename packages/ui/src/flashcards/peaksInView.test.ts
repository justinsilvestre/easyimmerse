import { describe, expect, it } from "vitest";
import { peaksInView } from "./peaksInView.ts";

/** One window from zero whose peaks rise by one per hundredth of a second. */
const rising = new Map([
  [0, Uint8Array.from({ length: 3000 }, (_, i) => i % 256)],
]);

describe("peaksInView", () => {
  it("reads one bar per peak for a short view", () => {
    expect(
      peaksInView(rising, { startMs: 100, endMs: 130 }).peaks.map((peak) =>
        Math.round(peak * 255),
      ),
    ).toEqual([10, 11, 12]);
  });

  it("keeps the loudest peak of those merged into a bar", () => {
    expect(
      peaksInView(rising, { startMs: 0, endMs: 40 }, 2).peaks.map((peak) =>
        Math.round(peak * 255),
      ),
    ).toEqual([1, 3]);
  });

  it("reads peaks that are not loaded as silence", () => {
    expect(
      peaksInView(rising, { startMs: 40_000, endMs: 40_020 }).peaks,
    ).toEqual([0, 0]);
  });

  it("reports the times the bars cover", () => {
    const { startMs, endMs } = peaksInView(rising, {
      startMs: 105,
      endMs: 131,
    });
    expect([startMs, endMs]).toEqual([100, 140]);
  });
});
