import { describe, expect, it } from "vitest";
import { drawBars } from "./drawBars.ts";

/** Records the rectangles filled and the opacity each was filled at. */
function recordingContext() {
  const fills: [number, number, number, number, number][] = [];
  const ctx = {
    globalAlpha: 1,
    fillRect(x: number, y: number, width: number, height: number) {
      fills.push([x, y, width, height, ctx.globalAlpha]);
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fills };
}

describe("drawBars", () => {
  it("draws a bar mirrored around the middle, nearly the full height at full loudness", () => {
    const { ctx, fills } = recordingContext();
    drawBars(ctx, [{ x: 4, width: 3, peak: 1 }], 100);
    expect(fills).toEqual([[4, 2, 3, 96, 1]]);
  });

  it("draws a silent bar as a one-pixel line", () => {
    const { ctx, fills } = recordingContext();
    drawBars(ctx, [{ x: 4, width: 3, peak: 0 }], 100);
    expect(fills).toEqual([[4, 49.5, 3, 1, 1]]);
  });

  it("draws a bar with no loaded peak as a faint line", () => {
    const { ctx, fills } = recordingContext();
    drawBars(ctx, [{ x: 4, width: 3, peak: null }], 100);
    expect(fills).toEqual([[4, 49.5, 3, 1, 0.4]]);
  });
});
