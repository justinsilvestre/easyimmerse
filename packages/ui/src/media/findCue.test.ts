import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { findAdjacentCue, findTranslationOf } from "./findCue.ts";

const cues: Cue[] = [
  { index: 1, start_ms: 500, end_ms: 1500, text: "Eins" },
  { index: 2, start_ms: 1750, end_ms: 3000, text: "Zwei" },
];

describe("findAdjacentCue", () => {
  it("finds the next cue", () => {
    expect(findAdjacentCue(cues, cues[0] as Cue, "next")?.index).toBe(2);
  });

  it("finds the previous cue", () => {
    expect(findAdjacentCue(cues, cues[1] as Cue, "previous")?.index).toBe(1);
  });

  it("is null after the last cue", () => {
    expect(findAdjacentCue(cues, cues[1] as Cue, "next")).toBeNull();
  });
});

describe("findTranslationOf", () => {
  it("matches a translation cue with slightly different timings", () => {
    const translation: Cue = {
      index: 1,
      start_ms: 1900,
      end_ms: 3100,
      text: "Two",
    };
    expect(findTranslationOf(cues[1] as Cue, [translation])).toBe(translation);
  });
});
