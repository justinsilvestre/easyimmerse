import type {
  CanPlayAnswer,
  PlaybackEngine,
  PlaybackEnvironment,
} from "@easyimmerse/types";

/** What the browser answers when asked about media support. Real values come from `readPlaybackProbes`. */
export type PlaybackProbes = {
  userAgent: string;
  /** A media element's `canPlayType`: "", "maybe", or "probably". */
  canPlayType: (mimeType: string) => string;
  /** `MediaSource.isTypeSupported` or `ManagedMediaSource.isTypeSupported`, or null when the page has neither. */
  isTypeSupported: ((mimeType: string) => boolean) | null;
};

/** The codec strings of the server's conversion targets: AAC-LC, FLAC, and H.264 High level 5.1. */
const conversionTargetCodecStrings: readonly string[] = [
  "mp4a.40.2",
  "fLaC",
  "avc1.640033",
];

/**
 * Describes the browser's media support to the playback planner: the engine, whether the file's own
 * MIME type plays in a media element, and which codec strings, among the file's and the conversion targets',
 * Media Source Extensions accept in fragmented MP4.
 */
export function measurePlaybackEnvironment(
  directMimeType: string | null,
  candidateCodecStrings: readonly string[],
  probes: PlaybackProbes,
): PlaybackEnvironment {
  return {
    engine: detectEngine(probes.userAgent),
    can_play_type:
      directMimeType === null
        ? "no"
        : toCanPlayAnswer(probes.canPlayType(directMimeType)),
    mse_codec_strings: acceptedCodecStrings(
      [...candidateCodecStrings, ...conversionTargetCodecStrings],
      probes.isTypeSupported,
    ),
  };
}

/**
 * Decides the engine from the user agent. Chromium's user agent also names AppleWebKit and Safari,
 * so it is checked before WebKit, and WebKit is the fallback because it is the strictest engine.
 */
export function detectEngine(userAgent: string): PlaybackEngine {
  if (/\bFirefox\//.test(userAgent)) return "gecko";
  if (/\b(Chrome|Chromium|Edg|HeadlessChrome)\//.test(userAgent))
    return "chromium";
  return "webkit";
}

function toCanPlayAnswer(answer: string): CanPlayAnswer {
  if (answer === "probably" || answer === "maybe") return answer;
  return "no";
}

function acceptedCodecStrings(
  candidates: readonly string[],
  isTypeSupported: PlaybackProbes["isTypeSupported"],
): string[] {
  if (isTypeSupported === null) return [];
  return [...new Set(candidates)].filter((codec) =>
    ["video/mp4", "audio/mp4"].some((container) =>
      isTypeSupported(`${container}; codecs="${codec}"`),
    ),
  );
}

/** Reads the probes from the page: the navigator, a detached video element, and the MediaSource API. */
export function readPlaybackProbes(): PlaybackProbes {
  const video = document.createElement("video");
  const mediaSource = findMediaSource();
  return {
    userAgent: navigator.userAgent,
    canPlayType: (mimeType) => video.canPlayType(mimeType),
    isTypeSupported:
      mediaSource === null
        ? null
        : (mimeType) => mediaSource.isTypeSupported(mimeType),
  };
}

type MediaSourceLike = { isTypeSupported: (mimeType: string) => boolean };

/** hls.js prefers ManagedMediaSource where it exists (iOS Safari), so its answers count there. */
function findMediaSource(): MediaSourceLike | null {
  const candidates = window as unknown as {
    ManagedMediaSource?: MediaSourceLike;
    MediaSource?: MediaSourceLike;
  };
  return candidates.ManagedMediaSource ?? candidates.MediaSource ?? null;
}
