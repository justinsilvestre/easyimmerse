import { describe, expect, it } from "vitest";
import { popupLeft, popupWidth } from "./popupSize.ts";

describe("popupWidth", () => {
  it("widens the expanded pop-up", () => {
    expect(popupWidth("expanded")).toBe("min(40rem, 100vw - 1rem)");
  });
});

describe("popupLeft", () => {
  it("centres the pop-up on the point within the viewport", () => {
    expect(popupLeft("compact", 120)).toBe(
      "clamp(0.5rem, 120px - min(13rem, 50vw - 0.5rem), 100vw - min(26rem, 100vw - 1rem) - 0.5rem)",
    );
  });

  it("keeps the expanded pop-up's edges inside the viewport", () => {
    expect(popupLeft("expanded", 120)).toBe(
      "clamp(0.5rem, 120px - min(20rem, 50vw - 0.5rem), 100vw - min(40rem, 100vw - 1rem) - 0.5rem)",
    );
  });
});
