import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { findAdjacentCueStart } from "./findAdjacentCueStart.ts";

const cues: Cue[] = [
  { index: 1, start_ms: 1000, end_ms: 2000, text: "One" },
  { index: 2, start_ms: 3000, end_ms: 5000, text: "Two" },
  { index: 3, start_ms: 6000, end_ms: 7000, text: "Three" },
];

describe("findAdjacentCueStart", () => {
  describe("going to the next cue", () => {
    it("returns the start of the first cue starting after the time", () => {
      expect(findAdjacentCueStart(cues, 3500, "next")).toBe(6000);
    });

    it("skips the cue starting exactly at the time", () => {
      expect(findAdjacentCueStart(cues, 3000, "next")).toBe(6000);
    });

    it("returns null after the last cue has started", () => {
      expect(findAdjacentCueStart(cues, 6500, "next")).toBeNull();
    });
  });

  describe("going to the previous cue", () => {
    it("returns the start of the current cue well after it began", () => {
      expect(findAdjacentCueStart(cues, 4000, "previous")).toBe(3000);
    });

    it("returns the start of the cue before when the current one just began", () => {
      expect(findAdjacentCueStart(cues, 3200, "previous")).toBe(1000);
    });

    it("returns the start of the last cue between cues", () => {
      expect(findAdjacentCueStart(cues, 5800, "previous")).toBe(3000);
    });

    it("returns null before the first cue has properly begun", () => {
      expect(findAdjacentCueStart(cues, 1200, "previous")).toBeNull();
    });
  });
});
