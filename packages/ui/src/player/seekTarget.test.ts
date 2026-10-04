import { describe, expect, it } from "vitest";
import { seekTarget } from "./seekTarget.ts";

describe("seekTarget", () => {
  it("adds half a frame at the file's frame rate", () => {
    expect(seekTarget(10, { num: 25, den: 1 })).toBeCloseTo(10.02, 6);
  });

  it("handles a fractional frame rate", () => {
    expect(seekTarget(0, { num: 30000, den: 1001 })).toBeCloseTo(
      1001 / 60000,
      9,
    );
  });

  it("adds half of a sixtieth of a second when the frame rate is unknown", () => {
    expect(seekTarget(2, null)).toBeCloseTo(2 + 1 / 120, 9);
  });

  it("falls back for a degenerate frame rate", () => {
    expect(seekTarget(2, { num: 0, den: 1 })).toBeCloseTo(2 + 1 / 120, 9);
  });
});
