import { describe, expect, it } from "vitest";
import { pinchedSpan, startPinch } from "./waveformPinch.ts";

const fingersAt = (a: number, b: number) =>
  new Map([
    [1, a],
    [2, b],
  ]);

describe("pinchedSpan", () => {
  it("halves the span when the fingers spread to twice their distance", () => {
    const pinch = startPinch(fingersAt(100, 200), 60_000);
    expect(pinchedSpan(pinch, fingersAt(50, 250), 300_000)).toBe(30_000);
  });

  it("doubles the span when the fingers close to half their distance", () => {
    const pinch = startPinch(fingersAt(100, 200), 60_000);
    expect(pinchedSpan(pinch, fingersAt(125, 175), 300_000)).toBe(120_000);
  });

  it("treats fingers at the same place as one pixel apart", () => {
    const pinch = startPinch(fingersAt(100, 101), 60_000);
    expect(pinchedSpan(pinch, fingersAt(150, 150), 300_000)).toBe(60_000);
  });
});
