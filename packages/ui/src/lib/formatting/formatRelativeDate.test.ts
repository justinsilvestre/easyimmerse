import { describe, expect, it } from "vitest";
import { formatRelativeDate } from "./formatRelativeDate.ts";

// Local-time dates keep the expectations the same in every time zone.
const localDate = (day: number, hour: number) =>
  new Date(2026, 9, day, hour).getTime();
const now = new Date(2026, 9, 3, 1).getTime();

describe("formatRelativeDate", () => {
  it("says today for the same calendar day", () => {
    expect(formatRelativeDate(localDate(3, 0), now)).toBe("today");
  });

  it("says yesterday for the previous calendar day, even a few hours ago", () => {
    expect(formatRelativeDate(localDate(2, 23), now)).toBe("yesterday");
  });

  it("counts calendar days within a month", () => {
    expect(formatRelativeDate(localDate(-27, 12), now)).toBe("30 days ago");
  });

  it("shows the date after a month", () => {
    expect(formatRelativeDate(new Date(2026, 7, 1, 12).getTime(), now)).toBe(
      "Aug 1, 2026",
    );
  });
});
