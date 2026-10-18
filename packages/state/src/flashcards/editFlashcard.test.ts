import { describe, expect, it } from "vitest";
import { moveClipEndpoint, toggleField } from "./editFlashcard.ts";

const clip = { start_ms: 1000, end_ms: 2000 };

describe("moveClipEndpoint", () => {
  it("moves the start to the rounded time", () => {
    expect(moveClipEndpoint(clip, "start", 499.6)).toEqual({
      start_ms: 500,
      end_ms: 2000,
    });
  });

  it("stops the start at the end", () => {
    expect(moveClipEndpoint(clip, "start", 2500).start_ms).toBe(2000);
  });

  it("stops the end at the start", () => {
    expect(moveClipEndpoint(clip, "end", 500).end_ms).toBe(1000);
  });
});

describe("toggleField", () => {
  it("adds a field that is not selected", () => {
    expect(toggleField(["word"], "tags")).toEqual(["word", "tags"]);
  });

  it("removes a field that is selected", () => {
    expect(toggleField(["word", "tags"], "tags")).toEqual(["word"]);
  });
});
