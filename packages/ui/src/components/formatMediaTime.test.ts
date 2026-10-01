import { describe, expect, it } from "vitest";
import { formatMediaTime } from "./formatMediaTime.ts";

describe("formatMediaTime", () => {
  it("formats zero as 0:00", () => {
    expect(formatMediaTime(0)).toBe("0:00");
  });

  it("drops the fraction of a second", () => {
    expect(formatMediaTime(1999)).toBe("0:01");
  });

  it("carries whole minutes into the minute field", () => {
    expect(formatMediaTime(125_200)).toBe("2:05");
  });

  it("adds an hour field from one hour on", () => {
    expect(formatMediaTime(3_723_000)).toBe("1:02:03");
  });

  it("treats a negative time as zero", () => {
    expect(formatMediaTime(-500)).toBe("0:00");
  });
});
