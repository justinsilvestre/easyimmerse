import type { AppState } from "../appState.ts";
import { initialAppState } from "../appState.ts";
import type { PlayerState } from "../player/playerState.ts";

/** Builds the initial app state with the given player fields and top-level fields replaced. */
export function createAppState(
  player: Partial<PlayerState> = {},
  changes: Partial<AppState> = {},
): AppState {
  return {
    ...initialAppState,
    ...changes,
    player: { ...initialAppState.player, ...player },
  };
}
