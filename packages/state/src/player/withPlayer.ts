import type { TimeRange } from "@easyimmerse/types";
import type { AppState } from "../appState.ts";
import type { Effect } from "../effect.ts";
import type { UpdateResult } from "../updateHandlers.ts";
import type { PlayerState } from "./playerState.ts";

export function withPlayer(
  state: AppState,
  changes: Partial<PlayerState>,
): AppState {
  return { ...state, player: { ...state.player, ...changes } };
}

/** Makes the player repeat the range, or stop repeating when given null. */
export function loopPlayer(
  state: AppState,
  range: TimeRange | null,
): UpdateResult {
  return [
    withPlayer(state, { loop: range }),
    [{ type: "setPlayerLoop", range }],
  ];
}

/** Builds the effect that stops the player repeating, or nothing when it is not. */
export function stopLoopIfSet(player: PlayerState): Effect[] {
  return player.loop === null ? [] : [{ type: "setPlayerLoop", range: null }];
}
