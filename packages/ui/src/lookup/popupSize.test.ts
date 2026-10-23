import { describe, expect, it } from "vitest";
import { popupHeight, popupWidth, popupWidthPx } from "./popupSize.ts";

describe("popupWidthPx", () => {
  it("measures the expanded width at the page's text size", () => {
    expect(popupWidthPx("expanded")).toBe(768);
  });
});

describe("popupWidth", () => {
  it("gives the compact pop-up room for a definition's lines", () => {
    expect(popupWidth("compact")).toBe("min(32rem, 100vw - 1rem)");
  });

  it("widens the expanded pop-up", () => {
    expect(popupWidth("expanded")).toBe("min(48rem, 100vw - 1rem)");
  });
});

describe("popupHeight", () => {
  it("lets the compact pop-up grow to 32rem within its band", () => {
    expect(popupHeight("compact")).toEqual({
      maxHeight: "min(32rem, 100%)",
    });
  });

  it("fills the band with the expanded pop-up", () => {
    expect(popupHeight("expanded")).toEqual({
      height: "100%",
      maxHeight: "100%",
    });
  });
});

describe("popupSize at a fixed size of a rem", () => {
  it("writes the width in pixels", () => {
    expect(popupWidth("compact", 16)).toBe("min(512px, 100vw - 16px)");
  });

  it("writes the compact height limit in pixels", () => {
    expect(popupHeight("compact", 16)).toEqual({
      maxHeight: "min(512px, 100%)",
    });
  });

  it("measures the width at that size of a rem", () => {
    expect(popupWidthPx("compact", 16)).toBe(512);
  });
});
