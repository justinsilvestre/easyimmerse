import { describe, expect, it } from "vitest";
import { formatDate } from "./formatDate.ts";

describe("formatDate", () => {
  it("formats a timestamp as a medium-length date in the given locale", () => {
    expect(formatDate("2026-09-28T12:00:00Z", "en-US")).toBe("Sep 28, 2026");
  });

  it("follows the conventions of other locales", () => {
    expect(formatDate("2026-09-28T12:00:00Z", "de-DE")).toBe("28.09.2026");
  });
});
