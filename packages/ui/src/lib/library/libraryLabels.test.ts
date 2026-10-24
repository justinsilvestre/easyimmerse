import { describe, expect, it } from "vitest";
import { formatLibraryDuration } from "./libraryLabels.ts";

describe("formatLibraryDuration", () => {
  it("writes minutes and seconds", () => {
    expect(formatLibraryDuration(95_000)).toBe("1:35");
  });

  it("writes hours from an hour on", () => {
    expect(formatLibraryDuration(3_725_000)).toBe("1:02:05");
  });
});
