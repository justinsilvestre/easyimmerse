export type PlayerHandle = { seek(seconds: number): void };

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
