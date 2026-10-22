import { describe, expect, it } from "vitest";
import { formatSinceTime } from "./formatSinceTime.ts";

const now = new Date(2026, 9, 22, 15, 30).getTime();

describe("formatSinceTime", () => {
  it("names only the time of a moment earlier today", () => {
    expect(formatSinceTime(new Date(2026, 9, 22, 14, 5).getTime(), now)).toBe(
      "2:05 PM",
    );
  });

  it("names the date and time of a moment on an earlier day", () => {
    expect(formatSinceTime(new Date(2026, 9, 21, 9, 0).getTime(), now)).toBe(
      "Oct 21, 2026, 9:00 AM",
    );
  });
});
