import { describe, expect, it } from "vitest";
import { formatDuration } from "./formatDuration.ts";

describe("formatDuration", () => {
  it("formats zero as 0:00", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("pads seconds to two digits", () => {
    expect(formatDuration(65_000)).toBe("1:05");
  });

  it("drops the fraction of a second", () => {
    expect(formatDuration(59_999)).toBe("0:59");
  });

  it("formats durations under an hour as minutes and seconds", () => {
    expect(formatDuration(3_161_000)).toBe("52:41");
  });

  it("adds hours and pads minutes to two digits from one hour on", () => {
    expect(formatDuration(3_725_000)).toBe("1:02:05");
  });
});
