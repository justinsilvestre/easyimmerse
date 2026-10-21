import { describe, expect, it } from "vitest";
import { utcOffsetMinOf } from "./utcOffsetMinOf.ts";

const at = (timezoneOffset: number) => ({
  getTimezoneOffset: () => timezoneOffset,
});

describe("utcOffsetMinOf", () => {
  it("counts a time zone east of UTC as ahead", () => {
    expect(utcOffsetMinOf(at(-120))).toBe(120);
  });

  it("counts a time zone west of UTC as behind", () => {
    expect(utcOffsetMinOf(at(300))).toBe(-300);
  });

  it("counts UTC itself as zero", () => {
    expect(utcOffsetMinOf(at(0))).toBe(0);
  });
});
