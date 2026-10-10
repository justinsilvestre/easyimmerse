import type { Effect } from "../../app/effect.ts";
import type { MediaScreenState } from "../screenState.ts";
import type { PlayerState } from "./playerState.ts";

/** Moves the player to a time, which the controls show at once, and asks the platform's player to seek there. */
export function seekTo(
  screen: MediaScreenState,
  ms: number,
): readonly [MediaScreenState, readonly Effect[]] {
  const seconds = ms / 1000;
  return [
    withPlayer(screen, { currentTimeSeconds: seconds }),
    [{ type: "seekPlayer", seconds }],
  ];
}

/** Returns the screen with some of its player's fields replaced. */
export function withPlayer(
  screen: MediaScreenState,
  player: Partial<PlayerState>,
): MediaScreenState {
  return { ...screen, player: { ...screen.player, ...player } };
}
