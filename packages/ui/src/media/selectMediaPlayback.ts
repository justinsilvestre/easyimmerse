import {
  selectMediaDurationMs,
  selectPlayer,
  selectPlayerControls,
} from "@easyimmerse/state";
import { createSelector } from "reselect";
import type { PlayerControlsState } from "./PlayerControlsState.ts";

/** Returns the player's state as the media screen's controls show it. */
export const selectMediaPlayback = createSelector(
  [selectPlayer, selectPlayerControls, selectMediaDurationMs],
  (player, controls, durationMs): PlayerControlsState => ({
    isPlaying: player.isPlaying,
    currentMs: player.currentTimeSeconds * 1000,
    durationMs,
    buffered: player.buffered,
    volume: controls.volume,
    isMuted: controls.isMuted,
    speed: controls.speed,
  }),
);
