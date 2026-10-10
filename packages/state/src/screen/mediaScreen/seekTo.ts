import { updated } from "../../app/updated.ts";
import type { PlayerState } from "./playerState.ts";
import type { PlayingState } from "./playingState.ts";

/** Moves the player to a time, which the controls show at once, records it as the last seek, and asks the platform's player to seek there. */
export function seekTo(playing: PlayingState, ms: number) {
  const seconds = ms / 1000;
  return updated(
    withPlayer(playing, {
      currentTimeSeconds: seconds,
      lastSeekSeconds: seconds,
    }),
    { type: "seekPlayer", seconds },
  );
}

/** Returns the player's fields with some of them replaced. */
export function withPlayer(
  playing: PlayingState,
  player: Partial<PlayerState>,
): PlayingState {
  return { ...playing, player: { ...playing.player, ...player } };
}
