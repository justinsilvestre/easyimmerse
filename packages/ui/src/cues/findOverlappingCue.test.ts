import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { findOverlappingCue } from "./findOverlappingCue.ts";

const cues: Cue[] = [
  { index: 1, start_ms: 0, end_ms: 1200, text: "One" },
  { index: 2, start_ms: 1200, end_ms: 3000, text: "Two" },
  { index: 3, start_ms: 5000, end_ms: 6000, text: "Three" },
];

describe("findOverlappingCue", () => {
  it("returns the cue overlapping the range the most", () => {
    expect(
      findOverlappingCue(cues, { start_ms: 1000, end_ms: 2000 })?.index,
    ).toBe(2);
  });

  it("returns null when no cue overlaps the range", () => {
    expect(
      findOverlappingCue(cues, { start_ms: 3000, end_ms: 5000 }),
    ).toBeNull();
  });
});
