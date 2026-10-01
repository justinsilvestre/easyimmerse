import type { TimeRange } from "@easyimmerse/types";

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
  /** Seeks forward by the delta, or backward when it is negative. */
  skipRequested: (deltaMs: number) =>
    ({ type: "skipRequested", deltaMs }) as const,
  playbackRateChanged: (rate: number) =>
    ({ type: "playbackRateChanged", rate }) as const,
  volumeChanged: (volume: number) =>
    ({ type: "volumeChanged", volume }) as const,
  loopRequested: (range: TimeRange | null) =>
    ({ type: "loopRequested", range }) as const,
  mediaUrlResolved: (mediaId: string, url: string) =>
    ({ type: "mediaUrlResolved", mediaId, url }) as const,
  mediaUrlFailed: (mediaId: string, message: string) =>
    ({ type: "mediaUrlFailed", mediaId, message }) as const,
};
