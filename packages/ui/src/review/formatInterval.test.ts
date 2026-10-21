import { describe, expect, it } from "vitest";
import { formatInterval } from "./formatInterval.ts";

const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

describe("formatInterval", () => {
  it("writes minutes in short", () => {
    expect(formatInterval(10 * minuteMs)).toBe("10 min");
  });

  it("writes at least one minute", () => {
    expect(formatInterval(20 * 1000)).toBe("1 min");
  });

  it("writes one hour in the singular", () => {
    expect(formatInterval(hourMs)).toBe("1 hour");
  });

  it("writes hours", () => {
    expect(formatInterval(5 * hourMs)).toBe("5 hours");
  });

  it("rounds nearly a day up to one day", () => {
    expect(formatInterval(23.7 * hourMs)).toBe("1 day");
  });

  it("writes days", () => {
    expect(formatInterval(4 * dayMs)).toBe("4 days");
  });

  it("writes days up to two weeks", () => {
    expect(formatInterval(10 * dayMs)).toBe("10 days");
  });

  it("writes weeks from two weeks", () => {
    expect(formatInterval(15 * dayMs)).toBe("2 weeks");
  });

  it("writes one month in the singular", () => {
    expect(formatInterval(31 * dayMs)).toBe("1 month");
  });

  it("writes months", () => {
    expect(formatInterval(92 * dayMs)).toBe("3 months");
  });

  it("writes one year without a decimal", () => {
    expect(formatInterval(365 * dayMs)).toBe("1 year");
  });

  it("writes years to one decimal", () => {
    expect(formatInterval(440 * dayMs)).toBe("1.2 years");
  });
});
