import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import type { MediaScreenState } from "../screenState.ts";
import { updatePendingSubtitleFile } from "../updatePendingSubtitleFile.ts";
import type { PlayerState } from "./playerState.ts";

/** Updates the media screen: its player, and the subtitles file picked for it. */
export function updateMediaScreen(
  screen: MediaScreenState,
  action: AppAction,
): readonly [MediaScreenState, readonly Effect[]] {
  switch (action.type) {
    case "seekRequested":
      return [
        withPlayer(screen, { currentTimeSeconds: action.seconds }),
        [{ type: "seekPlayer", seconds: action.seconds }],
      ];
    case "playerTimeChanged":
      return [withPlayer(screen, { currentTimeSeconds: action.seconds }), []];
    case "playerDurationChanged":
      return [withPlayer(screen, { durationSeconds: action.seconds }), []];
    case "playerBufferedChanged":
      return [withPlayer(screen, { buffered: action.buffered }), []];
    case "playerPlayingChanged":
      return [withPlayer(screen, { isPlaying: action.isPlaying }), []];
    case "playToggleRequested":
      return [screen, [{ type: "togglePlayer" }]];
    case "playRequested":
      return [screen, [{ type: "playPlayer" }]];
    case "pauseRequested":
      return [screen, [{ type: "pausePlayer" }]];
    default:
      return updatePendingSubtitleFile(screen, action);
  }
}

function withPlayer(
  screen: MediaScreenState,
  player: Partial<PlayerState>,
): MediaScreenState {
  return { ...screen, player: { ...screen.player, ...player } };
}
