import type {
  CanPlayAnswer,
  PlaybackEngine,
  PlaybackEnvironment,
} from "@easyimmerse/types";
import type { PlaybackProbes } from "../../platform/effects.ts";

/** The codec strings of the server's conversion targets: AAC-LC, FLAC, and H.264 High level 5.1. */
const conversionTargetCodecStrings: readonly string[] = [
  "mp4a.40.2",
  "fLaC",
  "avc1.640033",
];

/**
 * Describes the browser's media support to the server as it chooses a playback method: the engine, whether the file's own
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
