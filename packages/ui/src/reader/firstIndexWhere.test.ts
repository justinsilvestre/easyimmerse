import { describe, expect, it } from "vitest";
import { firstIndexWhere } from "./firstIndexWhere.ts";

describe("firstIndexWhere", () => {
  it("finds the first index that satisfies the predicate", () => {
    expect(firstIndexWhere(10, (index) => index >= 7)).toBe(7);
  });

  it("returns the last index when none satisfies it", () => {
    expect(firstIndexWhere(10, () => false)).toBe(9);
  });
});
