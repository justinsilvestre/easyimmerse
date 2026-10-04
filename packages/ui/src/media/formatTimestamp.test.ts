import { describe, expect, it } from "vitest";
import { formatTimestamp } from "./formatTimestamp.ts";

describe("formatTimestamp", () => {
  it("shows minutes and padded seconds", () => {
    expect(formatTimestamp(61_750)).toBe("1:01");
  });

  it("adds hours from one hour on", () => {
    expect(formatTimestamp(3_725_000)).toBe("1:02:05");
  });

  it("treats a negative position as the start", () => {
    expect(formatTimestamp(-5)).toBe("0:00");
  });
});
