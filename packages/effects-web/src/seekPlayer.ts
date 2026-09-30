import type { PlayerRegistry } from "@easyimmerse/state";

export function createSeekPlayer(registry: PlayerRegistry) {
  return (seconds: number): void => {
    registry.current()?.seek(seconds);
  };
}
