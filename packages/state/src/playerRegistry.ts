import type { TimeRange } from "@easyimmerse/types";

/** Controls a mounted player. Times are in milliseconds. */
export type PlayerHandle = {
  seek(ms: number): void;
  play(): void;
  pause(): void;
  /** Makes the player repeat the range, or stop repeating when given null. */
  setLoop(range: TimeRange | null): void;
  setPlaybackRate(rate: number): void;
  /** Sets the volume, from 0 to 1. */
  setVolume(volume: number): void;
  /** Returns a PNG data URL of the current video frame, or null when there is no frame. */
  captureFrame(): string | null;
};

export type PlayerRegistry = {
  /** Makes the handle the current player and returns a function that unregisters it. */
  register(handle: PlayerHandle): () => void;
  current(): PlayerHandle | null;
};

/** Holds the handle of whichever player component is mounted, so that effects can reach it. */
export function createPlayerRegistry(): PlayerRegistry {
  let registered: PlayerHandle | null = null;
  return {
    register: (handle) => {
      registered = handle;
      return () => {
        if (registered === handle) registered = null;
      };
    },
    current: () => registered,
  };
}
