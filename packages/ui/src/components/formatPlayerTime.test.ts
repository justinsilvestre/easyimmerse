import { describe, expect, it } from "vitest";
import { formatPlayerTime } from "./formatPlayerTime.ts";

describe("formatPlayerTime", () => {
  it("formats zero as 0:00.0", () => {
    expect(formatPlayerTime(0)).toBe("0:00.0");
  });

  it("rounds to a tenth of a second", () => {
    expect(formatPlayerTime(1.75)).toBe("0:01.8");
  });

  it("carries whole minutes into the minute field", () => {
    expect(formatPlayerTime(125.2)).toBe("2:05.2");
  });

  it("carries a rounded-up second into the minute field", () => {
    expect(formatPlayerTime(59.96)).toBe("1:00.0");
  });
});
