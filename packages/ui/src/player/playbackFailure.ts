import type { UnsupportedReason } from "@easyimmerse/types";

/** The sentence every playback error starts with; the cause follows it. */
export const playbackFailureHeading = "The media could not be played.";

const unsupportedReasonSentences: Record<UnsupportedReason, string> = {
  no_tracks: "The file contains no video or audio.",
  track_not_found: "The chosen track is not in the file.",
  video_codec_unsupported:
    "This video's picture format can neither be played nor converted here.",
  audio_codec_unsupported:
    "This file's sound format can neither be played nor converted here.",
  conversion_unavailable:
    "This file needs to be converted, and conversion is unavailable here.",
  picture_too_tall: "This video's picture is too tall to convert.",
};

/** A plain sentence for a plan the server could not make. */
export function describeUnsupportedReason(reason: UnsupportedReason): string {
  return unsupportedReasonSentences[reason];
}

/** A failed request to the tracks or playback route, as RTK Query reports it. */
export type RequestError = { code?: string; message?: string } | undefined;

const errorCodeSentences: Record<string, string> = {
  conversion_unavailable:
    "The server cannot read media files because ffmpeg is not installed there.",
  local_paths_not_allowed:
    "This server does not allow playing files from its own disk.",
  not_resolvable: "The server does not hold this file.",
  not_found: "The file was not found on the server's disk.",
  bad_request: "The server could not read this file as a media file.",
};

/** A plain sentence for a tracks or playback request that failed. */
export function describeRequestError(error: NonNullable<RequestError>): string {
  if (error.code !== undefined && error.code in errorCodeSentences)
    return errorCodeSentences[error.code] as string;
  return error.message ?? "The server did not answer.";
}

/** Codes a media element's `error.code` can take, named as the platform names them. */
const mediaErrorNames: Record<number, string> = {
  1: "MEDIA_ERR_ABORTED",
  2: "MEDIA_ERR_NETWORK",
  3: "MEDIA_ERR_DECODE",
  4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
};

/**
 * Logs a media element's error for diagnosis and returns the sentence to show.
 * The code itself never reaches the user.
 */
export function describeMediaElementError(
  error: { code: number; message?: string } | null,
  log: (...parts: unknown[]) => void = console.error,
): string {
  const name =
    error === null
      ? "unknown"
      : (mediaErrorNames[error.code] ?? String(error.code));
  log("Media element error", name, error?.message ?? "");
  if (error?.code === 2) return "The connection to the server was lost.";
  if (error?.code === 3) return "The file could not be decoded.";
  return "This file's format is not supported here.";
}
