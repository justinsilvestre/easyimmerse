import { describe, expect, it } from "vitest";
import { moveClipEndpoint } from "./editFlashcard.ts";

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
