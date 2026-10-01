import type { TrackInfo } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  createTestMediaTracks,
  createTestTrack,
} from "./createTestMediaTracks.ts";
import { findFrameDurationMs } from "./findFrameDurationMs.ts";

function createVideoTrack(
  frameRate: { numerator: number; denominator: number } | null,
): TrackInfo {
  return {
    ...createTestTrack(0, "video", "avc1.64001F"),
    video: {
      width: null,
      height: null,
      frame_rate: frameRate,
      pixel_format: null,
    },
  };
}

describe("findFrameDurationMs", () => {
  it("divides a second by the selected video track's frame rate", () => {
    const tracks = createTestMediaTracks([
      createVideoTrack({ numerator: 24000, denominator: 1001 }),
    ]);
    expect(findFrameDurationMs(tracks)).toBeCloseTo(41.708, 3);
  });

  it("is undefined when the frame rate is unknown", () => {
    const tracks = createTestMediaTracks([createVideoTrack(null)]);
    expect(findFrameDurationMs(tracks)).toBeUndefined();
  });

  it("is undefined when no video track is selected", () => {
    const tracks = createTestMediaTracks([
      createTestTrack(0, "audio", "mp4a.40.2"),
    ]);
    expect(findFrameDurationMs(tracks)).toBeUndefined();
  });
});
