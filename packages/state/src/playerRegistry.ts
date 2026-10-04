/** A change to how the player plays that does not move its position. */
export type PlayerCommand =
  | { kind: "play" }
  | { kind: "pause" }
  | { kind: "setVolume"; volume: number }
  | { kind: "setRate"; rate: number };

export type PlayerHandle = {
  seek(seconds: number): void;
  control(command: PlayerCommand): void;
  /** Seeks to the time and captures the frame shown there as an image data URL, or null when there is no picture. */
  captureFrameAt(seconds: number): Promise<string | null>;
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
