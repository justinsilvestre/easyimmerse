import { describe, expect, it } from "vitest";
import { pickTopmostVisibleIndex } from "./pickTopmostVisibleIndex.ts";

describe("pickTopmostVisibleIndex", () => {
  it("returns the smallest visible paragraph index", () => {
    expect(pickTopmostVisibleIndex(new Set([7, 5, 6]))).toBe(5);
  });

  it("returns null when no paragraph is visible", () => {
    expect(pickTopmostVisibleIndex(new Set())).toBeNull();
  });
});
