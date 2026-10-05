import type { Effects, PlayerRegistry } from "@easyimmerse/state";

type PlayerEffects = Pick<
  Effects,
  | "seekPlayer"
  | "togglePlayer"
  | "playPlayer"
  | "pausePlayer"
  | "setPlayerVolume"
  | "setPlayerSpeed"
>;

/** Builds the effects that reach whichever player component is mounted. Without one they do nothing. */
export function createPlayerEffects(registry: PlayerRegistry): PlayerEffects {
  return {
    seekPlayer: (seconds) => registry.current()?.seek(seconds),
    togglePlayer: () => registry.current()?.togglePlay(),
    playPlayer: () => registry.current()?.play(),
    pausePlayer: () => registry.current()?.pause(),
    setPlayerVolume: (volume) => registry.current()?.setVolume(volume),
    setPlayerSpeed: (speed) => registry.current()?.setSpeed(speed),
  };
}
