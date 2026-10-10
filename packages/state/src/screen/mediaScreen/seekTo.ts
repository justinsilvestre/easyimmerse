import { updated } from "../../app/updated.ts";
import type { MediaScreenState } from "../screenState.ts";
import type { PlayerState } from "./playerState.ts";

/** Moves the player to a time, which the controls show at once, records it as the last seek, and asks the platform's player to seek there. */
export function seekTo(screen: MediaScreenState, ms: number) {
  const seconds = ms / 1000;
  return updated(
    withPlayer(screen, {
      currentTimeSeconds: seconds,
      lastSeekSeconds: seconds,
    }),
    { type: "seekPlayer", seconds },
  );
}

/** Returns the screen with some of its player's fields replaced. */
export function withPlayer(
  screen: MediaScreenState,
  player: Partial<PlayerState>,
): MediaScreenState {
  return { ...screen, player: { ...screen.player, ...player } };
}
