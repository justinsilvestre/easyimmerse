import { describe, expect, it } from "vitest";
import { interiorSeekTime } from "./interiorSeekTime.ts";

describe("interiorSeekTime", () => {
  it("adds half the frame duration to the time", () => {
    expect(interiorSeekTime(1000, 40)).toBe(1020);
  });

  it("adds half of a sixtieth of a second when the frame duration is unknown", () => {
    expect(interiorSeekTime(1000, undefined)).toBeCloseTo(1000 + 1000 / 120);
  });
});
