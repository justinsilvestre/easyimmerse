import { describe, expect, it } from "vitest";
import { formatCopyTime } from "./formatCopyTime.ts";

const now = new Date(2026, 9, 22, 15, 0).getTime();

describe("formatCopyTime", () => {
  it("names the time of a copy made today", () => {
    expect(formatCopyTime(new Date(2026, 9, 22, 14, 5).getTime(), now)).toBe(
      "today at 2:05 PM",
    );
  });

  it("names the day of a copy made yesterday", () => {
    expect(formatCopyTime(new Date(2026, 9, 21, 9, 0).getTime(), now)).toBe(
      "yesterday",
    );
  });
});
