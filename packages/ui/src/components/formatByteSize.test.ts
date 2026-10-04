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

  describe("near a thousand of a unit", () => {
    it("keeps a value that rounds below a thousand in its unit", () => {
      expect(formatByteSize(999_499)).toBe("999 kB");
    });

    it("moves a value that rounds to a thousand into the next unit", () => {
      expect(formatByteSize(999_500)).toBe("1 MB");
    });

    it("moves 999 949 bytes into megabytes", () => {
      expect(formatByteSize(999_949)).toBe("1 MB");
    });

    it("moves 999 950 bytes into megabytes", () => {
      expect(formatByteSize(999_950)).toBe("1 MB");
    });

    it("keeps megabytes that round below a thousand", () => {
      expect(formatByteSize(999_499_999)).toBe("999 MB");
    });

    it("moves megabytes that round to a thousand into gigabytes", () => {
      expect(formatByteSize(999_500_000)).toBe("1 GB");
    });
  });

  it("stops at terabytes", () => {
    expect(formatByteSize(2_500_000_000_000_000)).toBe("2500 TB");
  });

  it("treats a negative count as zero", () => {
    expect(formatByteSize(-5)).toBe("0 B");
  });
});
