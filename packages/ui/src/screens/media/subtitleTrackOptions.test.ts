import type { SubtitleFile, TrackInfo } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  buildSubtitleTrackOptions,
  loneTrackIn,
  primaryLanguageOf,
  streamIndexOf,
} from "./subtitleTrackOptions.ts";

const embeddedTrack: TrackInfo = {
  index: 2,
  container_track_id: 3,
  kind: "subtitle",
  codec: "subrip",
  profile: null,
  level: null,
  codec_string: null,
  width: null,
  height: null,
  frame_rate: null,
  interlaced: false,
  sample_rate: null,
  channels: null,
  bit_rate: null,
  is_default: false,
  language: "ger",
  title: null,
  start_ms: null,
};

const subtitleFile: SubtitleFile = {
  id: "s1",
  media_file_id: "m1",
  name: "episode.en.srt",
  language: "en",
  cues: [{ index: 1, start_ms: 0, end_ms: 1000, text: "<i>Hello</i>" }],
};

describe("primaryLanguageOf", () => {
  it("reduces a three-letter code to the two-letter one", () => {
    expect(primaryLanguageOf("ger")).toBe("de");
  });

  it("treats an undetermined language as unknown", () => {
    expect(primaryLanguageOf("und")).toBeNull();
  });
});

describe("buildSubtitleTrackOptions", () => {
  it("names an embedded track after its language", () => {
    expect(buildSubtitleTrackOptions([embeddedTrack], [])[0]?.label).toBe(
      "German (embedded)",
    );
  });

  it("samples a subtitles file's first cue without markup", () => {
    expect(buildSubtitleTrackOptions([], [subtitleFile])[0]?.sample).toBe(
      "Hello",
    );
  });

  it("gives an embedded track the id the server expects", () => {
    expect(buildSubtitleTrackOptions([embeddedTrack], [])[0]?.id).toBe(
      "embedded:2",
    );
  });
});

describe("streamIndexOf", () => {
  it("reads the stream index of an embedded track id", () => {
    expect(streamIndexOf("embedded:4")).toBe(4);
  });

  it("returns null for a file track id", () => {
    expect(streamIndexOf("file:abc")).toBeNull();
  });
});

describe("loneTrackIn", () => {
  it("finds the only track in the language", () => {
    const options = buildSubtitleTrackOptions([embeddedTrack], [subtitleFile]);
    expect(loneTrackIn(options, "de")?.id).toBe("embedded:2");
  });

  it("finds nothing when two tracks share the language", () => {
    const options = buildSubtitleTrackOptions(
      [embeddedTrack, { ...embeddedTrack, index: 3 }],
      [],
    );
    expect(loneTrackIn(options, "de")).toBeNull();
  });
});
