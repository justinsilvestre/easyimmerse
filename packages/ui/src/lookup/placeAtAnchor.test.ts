import { describe, expect, it } from "vitest";
import { placeAtAnchor } from "./placeAtAnchor.ts";

const viewportHeight = 800;

describe("placeAtAnchor", () => {
  it("places the pop-up above a word low on the screen", () => {
    expect(
      placeAtAnchor(
        { top: 700, bottom: 720, left: 100, right: 140 },
        viewportHeight,
      ),
    ).toEqual({ side: "above", top: 8, bottom: 108, centerX: 120 });
  });

  it("places the pop-up below a word high on the screen", () => {
    expect(
      placeAtAnchor(
        { top: 100, bottom: 120, left: 100, right: 140 },
        viewportHeight,
      ),
    ).toEqual({ side: "below", top: 128, bottom: 8, centerX: 120 });
  });
});
