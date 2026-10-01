import type { TimeRange } from "@easyimmerse/types";
import type { MediaPlayback } from "./mediaPlayback.ts";

/** Actions about the media player. Times are in milliseconds. */
export const playerActions = {
  playerTimeChanged: (ms: number) =>
    ({ type: "playerTimeChanged", ms }) as const,
  playerDurationKnown: (ms: number) =>
    ({ type: "playerDurationKnown", ms }) as const,
  /** Reports what the media element is doing, as opposed to what the user asked for. */
  playerPlayingChanged: (playing: boolean) =>
    ({ type: "playerPlayingChanged", playing }) as const,
  playRequested: () => ({ type: "playRequested" }) as const,
  pauseRequested: () => ({ type: "pauseRequested" }) as const,
  togglePlayRequested: () => ({ type: "togglePlayRequested" }) as const,
  seekRequested: (ms: number) => ({ type: "seekRequested", ms }) as const,
  /** Seeks to a meaningful moment, such as a cue start, landing inside the frame shown at that moment. */
  momentSeekRequested: (ms: number) =>
    ({ type: "momentSeekRequested", ms }) as const,
  /** Seeks forward by the delta, or backward when it is negative. */
  skipRequested: (deltaMs: number) =>
    ({ type: "skipRequested", deltaMs }) as const,
  playbackRateChanged: (rate: number) =>
    ({ type: "playbackRateChanged", rate }) as const,
  volumeChanged: (volume: number) =>
    ({ type: "volumeChanged", volume }) as const,
  loopRequested: (range: TimeRange | null) =>
    ({ type: "loopRequested", range }) as const,
  mediaPlaybackResolved: (mediaId: string, playback: MediaPlayback) =>
    ({ type: "mediaPlaybackResolved", mediaId, playback }) as const,
  mediaPlaybackFailed: (mediaId: string, message: string) =>
    ({ type: "mediaPlaybackFailed", mediaId, message }) as const,
  /** Reports that the player could not play the HLS stream it was given. */
  playerStreamFailed: (message: string) =>
    ({ type: "playerStreamFailed", message }) as const,
  /** Starts a playback held for the conversion notice. The user may ask not to see the notice again. */
  conversionNoticeConfirmed: (dontShowAgain: boolean) =>
    ({ type: "conversionNoticeConfirmed", dontShowAgain }) as const,
};
