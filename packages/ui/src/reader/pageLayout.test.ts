import { describe, expect, it } from "vitest";
import { pageAt, pageLayoutOf } from "./pageLayout.ts";

describe("pageLayoutOf", () => {
  it("shows one column on a narrow screen", () => {
    expect(pageLayoutOf(360, 576, 48).columns).toBe(1);
  });

  it("narrows a single column to the available width", () => {
    expect(pageLayoutOf(360, 576, 48).columnWidth).toBe(360);
  });

  it("shows two columns once both fit at nearly full width", () => {
    expect(pageLayoutOf(1100, 576, 48).columns).toBe(2);
  });

  it("steps one page width plus the gap from page to page", () => {
    expect(pageLayoutOf(1100, 576, 48).stride).toBe(2 * 526 + 48 + 48);
  });
});

describe("pageAt", () => {
  it("puts the start of the second page on page one", () => {
    expect(pageAt(400, 400)).toBe(1);
  });

  it("tolerates a rect that starts a fraction of a pixel early", () => {
    expect(pageAt(399.5, 400)).toBe(1);
  });
});
