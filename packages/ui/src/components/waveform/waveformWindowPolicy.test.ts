import { describe, expect, it } from "vitest";
import type { WaveformWindowView } from "./waveformWindowPolicy.ts";
import {
  planWindowRequests,
  wantedWindows,
  windowStartOf,
} from "./waveformWindowPolicy.ts";

const view: WaveformWindowView = {
  viewStartMs: 45_000,
  viewEndMs: 135_000,
  focusMs: 100_000,
  durationMs: 600_000,
};

const none = new Set<number>();

describe("windowStartOf", () => {
  it("aligns a time down to a 30 s window", () => {
    expect(windowStartOf(44_999)).toBe(30_000);
  });
});

describe("wantedWindows", () => {
  it("puts the window holding the focus first", () => {
    expect(wantedWindows(view)[0]).toBe(90_000);
  });

  it("continues with the visible span in order", () => {
    expect(wantedWindows(view).slice(1, 4)).toEqual([30_000, 60_000, 120_000]);
  });

  it("ends with one window before and one after the span", () => {
    expect(wantedWindows(view).slice(4)).toEqual([0, 150_000]);
  });

  it("never names a window before the start", () => {
    expect(
      wantedWindows({ ...view, viewStartMs: 0, viewEndMs: 60_000 }),
    ).not.toContain(-30_000);
  });

  it("never names a window past the duration", () => {
    expect(
      wantedWindows({ ...view, viewEndMs: 600_000, durationMs: 600_000 }),
    ).not.toContain(600_000);
  });

  it("clamps a focus outside the span into it", () => {
    expect(wantedWindows({ ...view, focusMs: 500_000 })[0]).toBe(120_000);
  });

  it("names nothing for an empty duration", () => {
    expect(wantedWindows({ ...view, durationMs: 0 })).toEqual([]);
  });
});

describe("planWindowRequests", () => {
  it("requests the three most urgent windows when none are held", () => {
    expect(planWindowRequests(view, none, none)).toEqual([
      90_000, 30_000, 60_000,
    ]);
  });

  it("skips windows already loaded", () => {
    expect(planWindowRequests(view, new Set([90_000]), none)).toEqual([
      30_000, 60_000, 120_000,
    ]);
  });

  it("skips windows already in flight", () => {
    expect(planWindowRequests(view, none, new Set([90_000]))).toEqual([
      30_000, 60_000,
    ]);
  });

  it("requests nothing while three are in flight", () => {
    expect(
      planWindowRequests(view, none, new Set([0, 150_000, 180_000])),
    ).toEqual([]);
  });
});
