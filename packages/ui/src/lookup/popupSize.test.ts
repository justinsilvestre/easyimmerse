import { describe, expect, it } from "vitest";
import { popupHeight, popupLeft, popupWidth } from "./popupSize.ts";

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

describe("popupLeft", () => {
  it("centres the pop-up on the point within the viewport", () => {
    expect(popupLeft("compact", 120)).toBe(
      "clamp(0.5rem, 120px - min(16rem, 50vw - 0.5rem), 100vw - min(32rem, 100vw - 1rem) - 0.5rem)",
    );
  });

  it("keeps the expanded pop-up's edges inside the viewport", () => {
    expect(popupLeft("expanded", 120)).toBe(
      "clamp(0.5rem, 120px - min(24rem, 50vw - 0.5rem), 100vw - min(48rem, 100vw - 1rem) - 0.5rem)",
    );
  });
});
