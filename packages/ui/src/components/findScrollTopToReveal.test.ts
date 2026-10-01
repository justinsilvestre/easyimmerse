import { describe, expect, it } from "vitest";
import { findScrollTopToReveal } from "./findScrollTopToReveal.ts";

const list = { scrollTop: 100, clientHeight: 300 };

describe("findScrollTopToReveal", () => {
  it("returns null for an item already fully visible", () => {
    expect(
      findScrollTopToReveal({ offsetTop: 150, offsetHeight: 50 }, list),
    ).toBeNull();
  });

  it("aligns an item above the visible part with the top", () => {
    expect(
      findScrollTopToReveal({ offsetTop: 40, offsetHeight: 50 }, list),
    ).toBe(40);
  });

  it("aligns an item below the visible part with the bottom", () => {
    expect(
      findScrollTopToReveal({ offsetTop: 380, offsetHeight: 50 }, list),
    ).toBe(130);
  });

  it("aligns an item partly cut off at the bottom with the bottom", () => {
    expect(
      findScrollTopToReveal({ offsetTop: 370, offsetHeight: 50 }, list),
    ).toBe(120);
  });
});
