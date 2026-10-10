import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import type { MediaScreenState } from "../screenState.ts";
import { seekTo, withPlayer } from "./seekTo.ts";

/** Records what the player reports, and passes the user's requests on to the platform's player. */
export function updatePlayer(
  screen: MediaScreenState,
  action: AppAction,
): readonly [MediaScreenState, readonly Effect[]] {
  switch (action.type) {
    case "seekRequested":
      return seekTo(screen, action.seconds * 1000);
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
      return [screen, []];
  }
}
