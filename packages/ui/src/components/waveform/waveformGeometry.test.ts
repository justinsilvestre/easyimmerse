import { describe, expect, it } from "vitest";
import type { WaveformView } from "./waveformGeometry.ts";
import {
  canZoom,
  scaledSpan,
  timeAtX,
  xAtTime,
  zoomedSpan,
} from "./waveformGeometry.ts";

const view: WaveformView = { startMs: 10_000, spanMs: 60_000, widthPx: 600 };

describe("timeAtX", () => {
  it("maps a pixel to a time within the view", () => {
    expect(timeAtX(view, 300)).toBe(40_000);
  });
});

describe("xAtTime", () => {
  it("maps a time to a pixel within the view", () => {
    expect(xAtTime(view, 40_000)).toBe(300);
  });
});

describe("zoomedSpan", () => {
  it("halves the span when zooming in", () => {
    expect(zoomedSpan(60_000, "in", 600_000)).toBe(30_000);
  });

  it("doubles the span when zooming out", () => {
    expect(zoomedSpan(60_000, "out", 600_000)).toBe(120_000);
  });
});

describe("scaledSpan", () => {
  it("scales the span by the factor within the limits", () => {
    expect(scaledSpan(60_000, 1.5, 600_000)).toBe(90_000);
  });
});

describe("canZoom", () => {
  it("allows zooming in above the narrowest span", () => {
    expect(canZoom(4_000, "in", 600_000)).toBe(true);
  });

  it("refuses zooming in at the narrowest span", () => {
    expect(canZoom(2_000, "in", 600_000)).toBe(false);
  });

  it("refuses zooming out when the span shows the whole file", () => {
    expect(canZoom(45_000, "out", 45_000)).toBe(false);
  });

  it("refuses zooming out at five minutes", () => {
    expect(canZoom(300_000, "out", 3_600_000)).toBe(false);
  });
});
