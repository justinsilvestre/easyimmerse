import { describe, expect, it } from "vitest";
import { formatClip } from "./formatClip.ts";

describe("formatClip", () => {
  it("shows the start and end in minutes, seconds, and tenths", () => {
    expect(formatClip({ start_ms: 500, end_ms: 1500 })).toBe("0:00.5 – 0:01.5");
  });

  it("rounds to the nearest tenth of a second", () => {
    expect(formatClip({ start_ms: 1249, end_ms: 1250 })).toBe(
      "0:01.2 – 0:01.3",
    );
  });

  it("carries whole minutes into the minute field", () => {
    expect(formatClip({ start_ms: 125_200, end_ms: 600_000 })).toBe(
      "2:05.2 – 10:00.0",
    );
  });

  it("carries a rounded-up second into the minute field", () => {
    expect(formatClip({ start_ms: 59_960, end_ms: 61_000 })).toBe(
      "1:00.0 – 1:01.0",
    );
  });
});
