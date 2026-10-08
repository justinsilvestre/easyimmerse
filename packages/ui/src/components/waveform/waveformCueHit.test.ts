import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { cueAt } from "./waveformCueHit.ts";
import type { WaveformView } from "./waveformGeometry.ts";

const view: WaveformView = { startMs: 0, spanMs: 60_000, widthPx: 600 };

const cue: Cue = { index: 1, start_ms: 10_000, end_ms: 20_000, text: "Hi" };

describe("cueAt", () => {
  it("finds the cue under a point in the cue band", () => {
    expect(cueAt(view, [cue], { x: 150, y: 70 }, 72)).toBe(cue);
  });

  it("finds nothing above the cue band", () => {
    expect(cueAt(view, [cue], { x: 150, y: 30 }, 72)).toBeNull();
  });

  it("finds nothing in the band where no cue is drawn", () => {
    expect(cueAt(view, [cue], { x: 300, y: 70 }, 72)).toBeNull();
  });
});
