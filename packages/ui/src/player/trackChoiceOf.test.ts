import type { TrackInfo } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { describeTrackFormat, trackChoiceOf } from "./trackChoiceOf.ts";

const video: TrackInfo = {
  index: 0,
  container_track_id: null,
  kind: "video",
  codec: "h264",
  profile: "High",
  level: 40,
  codec_string: "avc1.640028",
  width: 1920,
  height: 1080,
  frame_rate: { num: 25, den: 1 },
  interlaced: false,
  sample_rate: null,
  channels: null,
  bit_rate: null,
  is_default: true,
  language: null,
  title: null,
  start_ms: null,
};

const audio: TrackInfo = {
  ...video,
  index: 1,
  kind: "audio",
  codec: "ac3",
  codec_string: "ac-3",
  width: null,
  height: null,
  channels: 6,
  language: "ja",
  title: "Commentary",
  is_default: false,
};

describe("describeTrackFormat", () => {
  it("names a video track by codec and picture size", () => {
    expect(describeTrackFormat(video)).toBe("H.264 1920×1080");
  });

  it("names an audio track by codec and channel layout", () => {
    expect(describeTrackFormat(audio)).toBe("AC-3 5.1");
  });

  it("spells an unknown codec in capitals", () => {
    expect(describeTrackFormat({ ...audio, codec: "wmav2", channels: 2 })).toBe(
      "WMAV2 stereo",
    );
  });

  it("counts unusual channel layouts", () => {
    expect(describeTrackFormat({ ...audio, channels: 4 })).toBe(
      "AC-3 4 channels",
    );
  });
});

describe("trackChoiceOf", () => {
  it("carries the stream index, language, title, and default flag", () => {
    expect(trackChoiceOf(audio)).toEqual({
      streamIndex: 1,
      language: "ja",
      title: "Commentary",
      format: "AC-3 5.1",
      isDefault: false,
    });
  });
});
