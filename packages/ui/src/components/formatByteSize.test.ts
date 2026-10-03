import { describe, expect, it } from "vitest";
import { formatByteSize } from "./formatByteSize.ts";

describe("formatByteSize", () => {
  it("formats zero as bytes", () => {
    expect(formatByteSize(0)).toBe("0 B");
  });

  it("keeps counts under a thousand in bytes", () => {
    expect(formatByteSize(512)).toBe("512 B");
  });

  it("uses 1000-byte kilobytes with one decimal below ten", () => {
    expect(formatByteSize(1500)).toBe("1.5 kB");
  });

  it("drops a decimal that would be zero", () => {
    expect(formatByteSize(5_000_000_000)).toBe("5 GB");
  });

  it("drops the decimal from ten of a unit upwards", () => {
    expect(formatByteSize(24_300_000)).toBe("24 MB");
  });

  it("formats gigabytes", () => {
    expect(formatByteSize(1_230_000_000)).toBe("1.2 GB");
  });

  it("formats a round hundred gigabytes without a decimal", () => {
    expect(formatByteSize(100_000_000_000)).toBe("100 GB");
  });

  it("stops at terabytes", () => {
    expect(formatByteSize(2_500_000_000_000_000)).toBe("2500 TB");
  });

  it("treats a negative count as zero", () => {
    expect(formatByteSize(-5)).toBe("0 B");
  });
});
