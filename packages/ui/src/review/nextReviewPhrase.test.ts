import { describe, expect, it } from "vitest";
import { nextReviewPhrase } from "./nextReviewPhrase.ts";

const at = (day: number, hour: number) =>
  new Date(2026, 9, day, hour, 0).getTime();

describe("nextReviewPhrase", () => {
  it("says tomorrow for a review on the next day", () => {
    expect(nextReviewPhrase(at(20, 9), at(19, 15))).toBe("tomorrow");
  });

  it("counts the days to a later review", () => {
    expect(nextReviewPhrase(at(22, 9), at(19, 15))).toBe("in 3 days");
  });

  it("gives the time of a review later today", () => {
    expect(nextReviewPhrase(at(19, 18), at(19, 15))).toMatch(/^at /);
  });

  it("counts the hours after midnight as the day before, until 4 a.m.", () => {
    expect(nextReviewPhrase(at(20, 3), at(19, 23))).toMatch(/^at /);
  });

  it("starts the next day at 4 a.m.", () => {
    expect(nextReviewPhrase(at(20, 5), at(19, 23))).toBe("tomorrow");
  });
});
