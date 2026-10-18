import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { findCueAt, findCueShownAt } from "./findCue.ts";

const cues: Cue[] = [
  { index: 1, start_ms: 500, end_ms: 1500, text: "Eins" },
  { index: 2, start_ms: 1750, end_ms: 3000, text: "Zwei" },
];

describe("findCueAt", () => {
  it("finds the cue spanning the time", () => {
    expect(findCueAt(cues, 2000)?.index).toBe(2);
  });

  it("is null between cues", () => {
    expect(findCueAt(cues, 1600)).toBeNull();
  });
});

describe("findCueShownAt", () => {
  it("finds the cue spanning the time", () => {
    expect(findCueShownAt(cues, 2000)?.index).toBe(2);
  });

  it("keeps the last cue shown between cues", () => {
    expect(findCueShownAt(cues, 1600)?.index).toBe(1);
  });

  it("keeps the last cue shown after it ends", () => {
    expect(findCueShownAt(cues, 9000)?.index).toBe(2);
  });

  it("is null before the first cue", () => {
    expect(findCueShownAt(cues, 100)).toBeNull();
  });
});
