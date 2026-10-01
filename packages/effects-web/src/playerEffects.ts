import type { Effects, PlayerRegistry } from "@easyimmerse/state";

export type PlayerEffects = Pick<
  Effects,
  | "seekPlayer"
  | "playPlayer"
  | "pausePlayer"
  | "setPlayerLoop"
  | "setPlaybackRate"
  | "setVolume"
  | "captureFrame"
>;

/** Builds the player effects, which act on whichever player is registered and do nothing while none is. */
export function createPlayerEffects(registry: PlayerRegistry): PlayerEffects {
  return {
    seekPlayer: (ms) => registry.current()?.seek(ms),
    playPlayer: () => registry.current()?.play(),
    pausePlayer: () => registry.current()?.pause(),
    setPlayerLoop: (range) => registry.current()?.setLoop(range),
    setPlaybackRate: (rate) => registry.current()?.setPlaybackRate(rate),
    setVolume: (volume) => registry.current()?.setVolume(volume),
    captureFrame: async () => registry.current()?.captureFrame() ?? null,
  };
}
