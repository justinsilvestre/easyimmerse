import type { PlayerCommand, PlayerRegistry } from "@easyimmerse/state";

export function createControlPlayer(registry: PlayerRegistry) {
  return (command: PlayerCommand): void => {
    registry.current()?.control(command);
  };
}
