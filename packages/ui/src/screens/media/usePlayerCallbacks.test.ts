import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { skipTarget } from "./usePlayerCallbacks.ts";

const cues: Cue[] = [
  { index: 1, start_ms: 1000, end_ms: 2000, text: "a" },
  { index: 2, start_ms: 3000, end_ms: 4000, text: "b" },
];

describe("skipTarget", () => {
  it("lands on the next cue's start going forward", () => {
    expect(skipTarget(cues, 1500, 10_000, "forward")).toBe(3000);
  });

  it("returns to the last cue's start going back more than a second after it", () => {
    expect(skipTarget(cues, 4500, 10_000, "back")).toBe(3000);
  });

  it("returns to the previous cue's start going back just after a cue began", () => {
    expect(skipTarget(cues, 3200, 10_000, "back")).toBe(1000);
  });

  it("moves five seconds without cues", () => {
    expect(skipTarget([], 1000, 10_000, "forward")).toBe(6000);
  });
});
