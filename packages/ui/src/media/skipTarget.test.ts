import { describe, expect, it } from "vitest";
import { exampleCues } from "./exampleCues.ts";
import { replayTarget, skipTarget } from "./skipTarget.ts";

describe("skipTarget", () => {
  it("skips forward to the next cue", () => {
    expect(skipTarget(exampleCues, 6_000, 24_000, "forward")).toBe(8_600);
  });

  it("skips back to the start of the current cue once well into it", () => {
    expect(skipTarget(exampleCues, 7_000, 24_000, "back")).toBe(5_400);
  });

  it("skips back to the previous cue from the start of a cue", () => {
    expect(skipTarget(exampleCues, 5_500, 24_000, "back")).toBe(2_800);
  });

  it("skips a few seconds without cues", () => {
    expect(skipTarget([], 6_000, 24_000, "forward")).toBe(11_000);
  });

  it("stops at the start of the file", () => {
    expect(skipTarget([], 2_000, 24_000, "back")).toBe(0);
  });
});

describe("replayTarget", () => {
  it("goes back to the start of the cue shown now", () => {
    expect(replayTarget(exampleCues, 7_000)).toBe(5_400);
  });

  it("goes back a few seconds between cues", () => {
    expect(replayTarget([], 12_000)).toBe(7_000);
  });

  it("stops at the start of the file", () => {
    expect(replayTarget([], 2_000)).toBe(0);
  });
});
