import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { findCueAt, findTranslationOf } from "./findCue.ts";

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
