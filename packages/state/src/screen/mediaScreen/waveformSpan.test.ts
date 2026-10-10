import { describe, expect, it } from "vitest";
import { clampVisibleSpan, computeViewStart } from "./waveformSpan.ts";

describe("clampVisibleSpan", () => {
  it("keeps a span within the limits as it is", () => {
    expect(clampVisibleSpan(60_000, 600_000)).toBe(60_000);
  });

  it("raises a span to the narrowest allowed", () => {
    expect(clampVisibleSpan(500, 600_000)).toBe(2_000);
  });

  it("caps a span at five minutes", () => {
    expect(clampVisibleSpan(900_000, 3_600_000)).toBe(300_000);
  });

  it("caps a span at the media's length", () => {
    expect(clampVisibleSpan(120_000, 45_000)).toBe(45_000);
  });

  it("lets a short file fill the narrowest span", () => {
    expect(clampVisibleSpan(60_000, 1_000)).toBe(2_000);
  });
});

describe("computeViewStart", () => {
  it("centres the view on the current time", () => {
    expect(computeViewStart(100_000, 60_000, 600_000)).toBe(70_000);
  });

  it("starts at zero near the beginning", () => {
    expect(computeViewStart(10_000, 60_000, 600_000)).toBe(0);
  });

  it("ends at the duration near the end", () => {
    expect(computeViewStart(590_000, 60_000, 600_000)).toBe(540_000);
  });

  it("starts at zero when the span covers the media", () => {
    expect(computeViewStart(5_000, 60_000, 30_000)).toBe(0);
  });
});
