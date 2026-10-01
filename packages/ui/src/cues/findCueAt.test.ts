import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { findCueAt } from "./findCueAt.ts";

const cues: Cue[] = [
  { index: 1, start_ms: 500, end_ms: 1500, text: "One" },
  { index: 2, start_ms: 2000, end_ms: 3000, text: "Two" },
];

describe("findCueAt", () => {
  it("returns null before the first cue starts", () => {
    expect(findCueAt(cues, 499)).toBeNull();
  });

  it("returns the cue that includes the time", () => {
    expect(findCueAt(cues, 2500)?.index).toBe(2);
  });

  it("returns the cue starting exactly at the time", () => {
    expect(findCueAt(cues, 2000)?.index).toBe(2);
  });

  it("returns the most recent cue between two cues", () => {
    expect(findCueAt(cues, 1700)?.index).toBe(1);
  });

  it("returns the last cue after every cue has ended", () => {
    expect(findCueAt(cues, 9000)?.index).toBe(2);
  });

  it("returns null for no cues", () => {
    expect(findCueAt([], 1000)).toBeNull();
  });
});
