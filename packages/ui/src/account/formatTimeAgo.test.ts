import { describe, expect, it } from "vitest";
import { formatTimeAgo } from "./formatTimeAgo.ts";

const now = new Date(2026, 9, 22, 15, 30).getTime();
const minuteMs = 60_000;

describe("formatTimeAgo", () => {
  it("names a moment less than a minute ago as just now", () => {
    expect(formatTimeAgo(now - 20_000, now)).toBe("just now");
  });

  it("counts the minutes within the hour", () => {
    expect(formatTimeAgo(now - 2 * minuteMs, now)).toBe("2 minutes ago");
  });

  it("counts the hours within the day", () => {
    expect(formatTimeAgo(now - 3 * 60 * minuteMs, now)).toBe("3 hours ago");
  });

  it("names the day of a moment a day or more ago", () => {
    expect(formatTimeAgo(now - 26 * 60 * minuteMs, now)).toBe("yesterday");
  });
});
