import type { BackendRequest } from "@easyimmerse/backend";
import type {
  ConversionCacheStatus,
  PlaybackMethodResponse,
  TrackInfo,
  TracksResponse,
  WaveformResponse,
} from "@easyimmerse/types";
import type { FakeRoute } from "./createFakeBackendClient.ts";

const track: TrackInfo = {
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
  ...track,
  kind: "audio",
  codec: "aac",
  profile: "LC",
  level: null,
  codec_string: "mp4a.40.2",
  width: null,
  height: null,
  frame_rate: null,
  sample_rate: 48000,
  channels: 2,
  bit_rate: 48000,
};

/** The tracks of `fixtures/conversion-h264-aac.mkv`: one video and two audio tracks, Japanese by default. */
const fixtureTracksWithTwoAudio: TracksResponse = {
  container: {
    format: "matroska",
    duration_ms: 10_021,
    start_ms: 0,
    bit_rate: 180_000,
    tracks: [
      track,
      { ...audioTrack, index: 1, language: "jpn", title: "Japanese" },
      {
        ...audioTrack,
        index: 2,
        language: "eng",
        title: "English",
        is_default: false,
      },
      {
        ...audioTrack,
        index: 3,
        kind: "subtitle",
        codec: "subrip",
        codec_string: null,
        language: "eng",
        is_default: false,
      },
    ],
  },
  default_selection: { video: 0, audio: 1 },
  direct_mime_type: 'video/x-matroska; codecs="avc1.4D000C, mp4a.40.2"',
};

/** The tracks of `fixtures/conversion-h264-aac.mp4`, which every engine plays directly. */
export const fixtureTracksDirect: TracksResponse = {
  container: {
    format: "mp4",
    duration_ms: 10_000,
    start_ms: 0,
    bit_rate: 180_000,
    tracks: [track, { ...audioTrack, index: 1 }],
  },
  default_selection: { video: 0, audio: 1 },
  direct_mime_type: 'video/mp4; codecs="avc1.4D000C, mp4a.40.2"',
};

const fixtureDirectPlayback: PlaybackMethodResponse = {
  method: { kind: "direct" },
  playlist_path: null,
};

export const fixtureCopyPlayback: PlaybackMethodResponse = {
  method: {
    kind: "convert",
    video: { action: "copy", index: 0 },
    audio: { action: "copy", index: 1 },
    reasons: ["container_unsupported"],
  },
  playlist_path: "/conversions/copy0001/index.m3u8",
};

const fixtureTranscodePlayback: PlaybackMethodResponse = {
  method: {
    kind: "convert",
    video: { action: "copy", index: 0 },
    audio: { action: "transcode", index: 2, target: "aac" },
    reasons: ["non_default_tracks"],
  },
  playlist_path: "/conversions/transcode01/index.m3u8",
};

const fixtureUnsupportedPlayback: PlaybackMethodResponse = {
  method: { kind: "unsupported", reason: "picture_too_tall" },
  playlist_path: null,
};

export const fixtureConversionCacheStatus: ConversionCacheStatus = {
  usage_bytes: 1_230_000_000,
  limit_bytes: 5_000_000_000,
  budget_bytes: 5_000_000_000,
  free_bytes: 40_000_000_000,
  space_low: false,
  chosen_budget_bytes: null,
};

/** A quiet window with one loud click per second, as the conversion fixtures' audio has. */
function fixtureWaveformWindow(startMs: number): WaveformResponse {
  const peaks = Array.from({ length: 3000 }, (_, index) =>
    index % 100 === 0 ? 255 : 40 + ((index * 7) % 50),
  );
  return { start_ms: startMs, peaks };
}

const waveformWindowFor = (request: BackendRequest) =>
  fixtureWaveformWindow(Number(request.query?.start_ms ?? 0));

const trackRoutes = {
  tracks: /^\/projects\/[^/]+\/media\/[^/]+\/tracks$/,
  playback: /^\/projects\/[^/]+\/media\/[^/]+\/playback-method$/,
  trackSelection: /^\/projects\/[^/]+\/media\/[^/]+\/track-selection$/,
  waveform: /^\/projects\/[^/]+\/media\/[^/]+\/waveform$/,
};

/** Routes for a file that plays directly. */
export const directPlaybackRoutes: readonly FakeRoute[] = [
  ["GET", trackRoutes.tracks, fixtureTracksDirect],
  ["POST", trackRoutes.playback, fixtureDirectPlayback],
  ["PUT", trackRoutes.trackSelection, undefined],
  ["GET", trackRoutes.waveform, waveformWindowFor],
];

/** Routes for a two-audio file whose chosen tracks are copied into HLS. */
export const copyPlaybackRoutes: readonly FakeRoute[] = [
  ["GET", trackRoutes.tracks, fixtureTracksWithTwoAudio],
  ["POST", trackRoutes.playback, fixtureCopyPlayback],
  ["PUT", trackRoutes.trackSelection, undefined],
  ["GET", trackRoutes.waveform, waveformWindowFor],
];

/** Routes for a two-audio file whose audio must be re-encoded. */
export const transcodePlaybackRoutes: readonly FakeRoute[] = [
  ["GET", trackRoutes.tracks, fixtureTracksWithTwoAudio],
  ["POST", trackRoutes.playback, fixtureTranscodePlayback],
  ["PUT", trackRoutes.trackSelection, undefined],
];

export const unsupportedPlaybackRoutes: readonly FakeRoute[] = [
  ["GET", trackRoutes.tracks, fixtureTracksDirect],
  ["POST", trackRoutes.playback, fixtureUnsupportedPlayback],
];

export const fakeServer = { serverUrl: "http://127.0.0.1:1", token: "t0k3n" };
