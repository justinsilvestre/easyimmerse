import { describe, expect, it } from "vitest";
import { placeAtAnchor } from "./placeAtAnchor.ts";

const viewport = { width: 1000, height: 800 };
const lowWord = { top: 700, bottom: 720, left: 400, right: 450 };
const highWord = { top: 100, bottom: 120, left: 400, right: 450 };

describe("placeAtAnchor", () => {
  describe("while compact", () => {
    it("stands above a word with more room above it", () => {
      expect(placeAtAnchor(lowWord, 300, viewport, "compact").side).toBe(
        "above",
      );
    });

    it("flips below a word with more room below it", () => {
      expect(placeAtAnchor(highWord, 300, viewport, "compact").side).toBe(
        "below",
      );
    });

    it("ends a gap above a word it stands above, so as not to cover it", () => {
      expect(placeAtAnchor(lowWord, 300, viewport, "compact").bottom).toBe(108);
    });

    it("lets a pop-up above a word reach up to the viewport's top margin", () => {
      expect(placeAtAnchor(lowWord, 300, viewport, "compact").top).toBe(8);
    });

    it("starts a gap below a word it stands below, so as not to cover it", () => {
      expect(placeAtAnchor(highWord, 300, viewport, "compact").top).toBe(128);
    });

    it("lets a pop-up below a word reach down to the viewport's bottom margin", () => {
      expect(placeAtAnchor(highWord, 300, viewport, "compact").bottom).toBe(8);
    });
  });

  describe("while expanded", () => {
    it("reaches up to the viewport's top margin, over a word below it", () => {
      expect(placeAtAnchor(highWord, 300, viewport, "expanded").top).toBe(8);
    });

    it("reaches down to the viewport's bottom margin, over a word above it", () => {
      expect(placeAtAnchor(lowWord, 300, viewport, "expanded").bottom).toBe(8);
    });

    it("keeps the side of the word it would stand on while compact", () => {
      expect(placeAtAnchor(lowWord, 300, viewport, "expanded").side).toBe(
        "above",
      );
    });
  });

  describe("across the viewport", () => {
    it("centres the pop-up on the word", () => {
      expect(placeAtAnchor(highWord, 300, viewport, "compact").left).toBe(275);
    });

    it("shifts the pop-up right to keep clear of the viewport's left edge", () => {
      const word = { ...highWord, left: 10, right: 30 };
      expect(placeAtAnchor(word, 300, viewport, "compact").left).toBe(8);
    });

    it("shifts the pop-up left to keep clear of the viewport's right edge", () => {
      const word = { ...highWord, left: 970, right: 990 };
      expect(placeAtAnchor(word, 300, viewport, "compact").left).toBe(692);
    });

    it("keeps its width where the viewport has room for it", () => {
      expect(placeAtAnchor(highWord, 300, viewport, "compact").width).toBe(300);
    });

    it("narrows the pop-up to the viewport less its margins", () => {
      const narrow = { width: 360, height: 800 };
      expect(placeAtAnchor(highWord, 512, narrow, "compact").width).toBe(344);
    });
  });
});
