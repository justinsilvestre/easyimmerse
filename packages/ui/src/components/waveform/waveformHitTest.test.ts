import { describe, expect, it } from "vitest";
import type { FlashcardSegment } from "./flashcardSegment.ts";
import type { WaveformView } from "./waveformGeometry.ts";
import { hitTest } from "./waveformHitTest.ts";

const view: WaveformView = { startMs: 0, spanMs: 60_000, widthPx: 600 };

const segment: FlashcardSegment = {
  id: "f1",
  startMs: 10_000,
  endMs: 20_000,
  screenshotMs: 15_000,
};

describe("hitTest", () => {
  it("finds nothing in empty space", () => {
    expect(hitTest(view, [segment], { x: 400, y: 30 })).toEqual({
      kind: "none",
    });
  });

  it("finds a segment's body", () => {
    expect(hitTest(view, [segment], { x: 130, y: 30 })).toEqual({
      kind: "segment",
      segmentId: "f1",
    });
  });

  it("finds the clip start handle within reach", () => {
    expect(hitTest(view, [segment], { x: 104, y: 30 })).toEqual({
      kind: "clipStart",
      segmentId: "f1",
    });
  });

  it("finds the clip end handle within reach", () => {
    expect(hitTest(view, [segment], { x: 197, y: 30 })).toEqual({
      kind: "clipEnd",
      segmentId: "f1",
    });
  });

  it("finds the screenshot marker near the top", () => {
    expect(hitTest(view, [segment], { x: 152, y: 5 })).toEqual({
      kind: "screenshot",
      segmentId: "f1",
    });
  });

  it("ignores the screenshot marker lower down", () => {
    expect(hitTest(view, [segment], { x: 152, y: 40 })).toEqual({
      kind: "segment",
      segmentId: "f1",
    });
  });

  it("prefers the nearer handle when two are in reach", () => {
    const narrow = { ...segment, startMs: 10_000, endMs: 10_800 };
    expect(hitTest(view, [narrow], { x: 107, y: 30 })).toEqual({
      kind: "clipEnd",
      segmentId: "f1",
    });
  });
});
