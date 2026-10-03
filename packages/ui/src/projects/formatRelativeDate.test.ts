import { describe, expect, it } from "vitest";
import { formatRelativeDate } from "./formatRelativeDate.ts";

const now = Date.parse("2026-10-03T12:00:00Z");

describe("formatRelativeDate", () => {
  it("says today for the same day", () => {
    expect(formatRelativeDate("2026-10-03T08:00:00Z", now)).toBe("today");
  });

  it("says yesterday for the day before", () => {
    expect(formatRelativeDate("2026-10-02T08:00:00Z", now)).toBe("yesterday");
  });

  it("counts days within a month", () => {
    expect(formatRelativeDate("2026-09-30T08:00:00Z", now)).toBe("3 days ago");
  });

  it("shows the date after a month", () => {
    expect(formatRelativeDate("2026-08-01T08:00:00Z", now)).toBe("Aug 1, 2026");
  });
});
