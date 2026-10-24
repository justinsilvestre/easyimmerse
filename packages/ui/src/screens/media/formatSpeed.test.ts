import { describe, expect, it } from "vitest";
import { formatSpeed } from "./formatSpeed.ts";

describe("formatSpeed", () => {
  it("shows a whole speed without decimals", () => {
    expect(formatSpeed(1)).toBe("1×");
  });

  it("shows a fractional speed without trailing zeros", () => {
    expect(formatSpeed(1.5)).toBe("1.5×");
  });

  it("shows two decimals where the speed needs them", () => {
    expect(formatSpeed(0.75)).toBe("0.75×");
  });

  it("rounds a speed to two decimals", () => {
    expect(formatSpeed(1.3333)).toBe("1.33×");
  });
});
