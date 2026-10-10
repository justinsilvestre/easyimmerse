import type {
  ContainerInfo,
  PlaybackPlan,
  TrackInfo,
} from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  containerCodecStrings,
  copiesChosenTracksOnly,
  needsTrackChoice,
  parseTrackSelection,
  selectedFrameRate,
} from "./playbackPlanRules.ts";

const baseTrack: TrackInfo = {
  index: 0,
  container_track_id: null,
  kind: "video",
  codec: "h264",
  profile: null,
  level: null,
  codec_string: "avc1.64001F",
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

const audioTrack: TrackInfo = {
  ...baseTrack,
  index: 1,
  kind: "audio",
  codec: "aac",
  codec_string: "mp4a.40.2",
  frame_rate: null,
};

function container(tracks: TrackInfo[]): ContainerInfo {
  return {
    format: "matroska",
    duration_ms: 60_000,
    start_ms: 0,
    bit_rate: null,
    tracks,
  };
}

describe("parseTrackSelection", () => {
  it("returns null for no stored selection", () => {
    expect(parseTrackSelection(null)).toBeNull();
  });

  it("parses a stored selection", () => {
    expect(parseTrackSelection('{"video":0,"audio":2}')).toEqual({
      video: 0,
      audio: 2,
    });
  });

  it("returns null for malformed JSON", () => {
    expect(parseTrackSelection("{oops")).toBeNull();
  });

  it("returns null when a field has the wrong type", () => {
    expect(parseTrackSelection('{"video":"0","audio":null}')).toBeNull();
  });
});

describe("needsTrackChoice", () => {
  it("is false with one track of each kind", () => {
    expect(needsTrackChoice(container([baseTrack, audioTrack]), null)).toBe(
      false,
    );
  });

  it("is true with two audio tracks and no saved choice", () => {
    const two = container([baseTrack, audioTrack, { ...audioTrack, index: 2 }]);
    expect(needsTrackChoice(two, null)).toBe(true);
  });

  it("is false with two audio tracks and a saved choice", () => {
    const two = container([baseTrack, audioTrack, { ...audioTrack, index: 2 }]);
    expect(needsTrackChoice(two, { video: 0, audio: 2 })).toBe(false);
  });
});

describe("copiesChosenTracksOnly", () => {
  it("is true when video and audio are copied", () => {
    const plan: PlaybackPlan = {
      kind: "convert",
      video: { action: "copy", index: 0 },
      audio: { action: "copy", index: 1 },
      reasons: ["container_unsupported"],
    };
    expect(copiesChosenTracksOnly(plan)).toBe(true);
  });

  it("is false when audio is transcoded", () => {
    const plan: PlaybackPlan = {
      kind: "convert",
      video: { action: "copy", index: 0 },
      audio: { action: "transcode", index: 1, target: "aac" },
      reasons: ["codec_unsupported"],
    };
    expect(copiesChosenTracksOnly(plan)).toBe(false);
  });

  it("is false for a direct plan", () => {
    expect(copiesChosenTracksOnly({ kind: "direct" })).toBe(false);
  });
});

describe("selectedFrameRate", () => {
  it("returns the default video track's rate without a selection", () => {
    expect(selectedFrameRate(container([baseTrack, audioTrack]), null)).toEqual(
      { num: 25, den: 1 },
    );
  });

  it("returns the selected video track's rate", () => {
    const second = { ...baseTrack, index: 3, frame_rate: { num: 24, den: 1 } };
    expect(
      selectedFrameRate(container([baseTrack, second]), {
        video: 3,
        audio: null,
      }),
    ).toEqual({ num: 24, den: 1 });
  });

  it("returns null for an audio-only file", () => {
    expect(selectedFrameRate(container([audioTrack]), null)).toBeNull();
  });
});

describe("containerCodecStrings", () => {
  it("lists the codec strings and skips tracks without one", () => {
    const vorbis = { ...audioTrack, index: 2, codec_string: null };
    expect(
      containerCodecStrings(container([baseTrack, audioTrack, vorbis])),
    ).toEqual(["avc1.64001F", "mp4a.40.2"]);
  });
});
