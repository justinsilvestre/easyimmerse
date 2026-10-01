import type { TimeRange } from "@easyimmerse/types";
import type { AppState } from "../appState.ts";
import type { Effect } from "../effect.ts";
import type { UpdateResult } from "../updateHandlers.ts";
import { interiorSeekTime } from "./interiorSeekTime.ts";
import type { PlayerState } from "./playerState.ts";

export function withPlayer(
  state: AppState,
  changes: Partial<PlayerState>,
): AppState {
  return { ...state, player: { ...state.player, ...changes } };
}

/** Makes the player repeat the range, restarting it half a frame in, or stop repeating when given null. */
export function loopPlayer(
  state: AppState,
  range: TimeRange | null,
): UpdateResult {
  const loop = range && {
    range,
    restartMs: seekTimeInFrame(state, range.start_ms),
  };
  return [
    withPlayer(state, { loop: range }),
    [{ type: "setPlayerLoop", loop }],
  ];
}

/** Returns a time inside the frame shown at the moment, using the open media's frame duration when known. */
export function seekTimeInFrame(state: AppState, ms: number): number {
  return interiorSeekTime(ms, state.player.playback?.frameDurationMs);
}

/** Builds the effect that stops the player repeating, or nothing when it is not. */
export function stopLoopIfSet(player: PlayerState): Effect[] {
  return player.loop === null ? [] : [{ type: "setPlayerLoop", loop: null }];
}
