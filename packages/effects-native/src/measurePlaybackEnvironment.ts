import type {
  MediaTracks,
  PlaybackEnvironment,
  TrackInfo,
} from "@easyimmerse/types";
import { detectWebEngine } from "./detectWebEngine.ts";

/** The browser features that decide how a media file can play. */
export type BrowserMediaApis = {
  userAgent: string;
  /** A media element's `canPlayType`, which answers "probably", "maybe", or an empty string for no. */
  canPlayType: (mimeType: string) => string;
  /** The `isTypeSupported` check of Media Source Extensions, or null when the browser has neither `ManagedMediaSource` nor `MediaSource`. */
  isTypeSupported: ((mimeType: string) => boolean) | null;
};

type CodecCandidate = { codec: string; kind: "video" | "audio" };

/** The codec strings of the audio codecs that the server can transcode to. */
const audioTargetCodecs: CodecCandidate[] = [
  { codec: "mp4a.40.2", kind: "audio" },
  { codec: "fLaC", kind: "audio" },
];

/** Measures what the browser can play, for the server to plan a media file's playback. */
export function measurePlaybackEnvironment(
  tracks: MediaTracks,
  browser: BrowserMediaApis,
): PlaybackEnvironment {
  return {
    engine: detectWebEngine(browser.userAgent),
    direct_play: browser.canPlayType(tracks.direct_type) !== "",
    fmp4_codecs: listFmp4Codecs(tracks.container.tracks, browser),
  };
}

function listFmp4Codecs(
  tracks: TrackInfo[],
  { isTypeSupported }: BrowserMediaApis,
): string[] {
  if (isTypeSupported === null) return [];
  const candidates = [...listTrackCodecs(tracks), ...audioTargetCodecs];
  const accepted = candidates.filter((candidate) =>
    isTypeSupported(`${candidate.kind}/mp4; codecs="${candidate.codec}"`),
  );
  return [...new Set(accepted.map((candidate) => candidate.codec))];
}

function listTrackCodecs(tracks: TrackInfo[]): CodecCandidate[] {
  return tracks.flatMap(({ kind, codec_string }) =>
    codec_string !== null && (kind === "video" || kind === "audio")
      ? [{ codec: codec_string, kind }]
      : [],
  );
}
