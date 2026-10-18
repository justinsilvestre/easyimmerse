import { describe, expect, it } from "vitest";
import {
  crossesSaveInterval,
  parsePlaybackPosition,
} from "./playbackPosition.ts";

describe("parsePlaybackPosition", () => {
  it("reads a stored position", () => {
    expect(parsePlaybackPosition("8000")).toBe(8000);
  });

  it("returns null when nothing is stored", () => {
    expect(parsePlaybackPosition(null)).toBeNull();
  });

  it("returns null for a malformed value", () => {
    expect(parsePlaybackPosition("soon")).toBeNull();
  });
});

describe("crossesSaveInterval", () => {
  it("is false within one stretch of playback", () => {
    expect(crossesSaveInterval(3, 7)).toBe(false);
  });

  it("is true once playback enters the next stretch", () => {
    expect(crossesSaveInterval(14, 15.2)).toBe(true);
  });

  it("is true for a seek back into an earlier stretch", () => {
    expect(crossesSaveInterval(40, 2)).toBe(true);
  });
});
