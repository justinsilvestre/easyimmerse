import type {
  PlaybackEnvironment,
  PlaybackResponse,
  TrackInfo,
  TracksResponse,
} from "@easyimmerse/types";

const videoTrack: TrackInfo = {
  index: 0,
  container_track_id: 1,
  kind: "video",
  codec: "h264",
  profile: "Main",
  level: 12,
  codec_string: "avc1.4D000C",
  width: 320,
  height: 180,
  frame_rate: { num: 24, den: 1 },
  interlaced: false,
  sample_rate: null,
  channels: null,
  bit_rate: null,
  is_default: true,
  language: null,
  title: null,
  start_ms: 0,
};

const audioTrack: TrackInfo = {
  ...videoTrack,
  index: 1,
  kind: "audio",
  codec: "aac",
  codec_string: "mp4a.40.2",
  frame_rate: null,
};

/** Tracks for tests: one video and one audio track, which need no choice. */
export const exampleTracksOneEach: TracksResponse = {
  container: {
    format: "matroska",
    duration_ms: 10_000,
    start_ms: 0,
    bit_rate: null,
    tracks: [videoTrack, audioTrack],
  },
  default_selection: { video: 0, audio: 1 },
  direct_mime_type: 'video/x-matroska; codecs="avc1.4D000C, mp4a.40.2"',
};

/** Tracks for tests: one video and two audio tracks, which ask for a choice before the first play. */
export const exampleTracksTwoAudio: TracksResponse = {
  ...exampleTracksOneEach,
  container: {
    ...exampleTracksOneEach.container,
    tracks: [
      videoTrack,
      audioTrack,
      { ...audioTrack, index: 2, is_default: false },
    ],
  },
};

/** A browser environment for tests. */
export const exampleEnvironment: PlaybackEnvironment = {
  engine: "webkit",
  can_play_type: "no",
  mse_codec_strings: ["avc1.4D000C", "mp4a.40.2"],
};

/** A plan for tests that converts by copying every chosen track. */
export const exampleCopyPlayback: PlaybackResponse = {
  plan: {
    kind: "convert",
    video: { action: "copy", index: 0 },
    audio: { action: "copy", index: 1 },
    reasons: ["container_unsupported"],
  },
  playlist_path: "/conversions/copy0001/index.m3u8",
};

/** A plan for tests that re-encodes the audio track. */
export const exampleTranscodePlayback: PlaybackResponse = {
  plan: {
    kind: "convert",
    video: { action: "copy", index: 0 },
    audio: { action: "transcode", index: 1, target: "aac" },
    reasons: ["container_unsupported"],
  },
  playlist_path: "/conversions/transcode01/index.m3u8",
};
