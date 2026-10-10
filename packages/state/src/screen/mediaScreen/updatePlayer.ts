import type { AppAction } from "../../app/appAction.ts";
import { updated } from "../../app/updated.ts";
import type { MediaScreenState } from "../screenState.ts";
import { seekTo, withPlayer } from "./seekTo.ts";

/** Records what the player reports, and passes the user's requests on to the platform's player. */
export function updatePlayer(screen: MediaScreenState, action: AppAction) {
  switch (action.type) {
    case "seekRequested":
      return seekTo(screen, action.seconds * 1000);
    case "playerTimeChanged":
      return updated(
        withPlayer(screen, { currentTimeSeconds: action.seconds }),
      );
    case "playerSeeking":
      return updated(withPlayer(screen, { lastSeekSeconds: action.seconds }));
    case "playerDurationChanged":
      return updated(withPlayer(screen, { durationSeconds: action.seconds }));
    case "playerBufferedChanged":
      return updated(withPlayer(screen, { buffered: action.buffered }));
    case "playerPlayingChanged":
      return updated(withPlayer(screen, { isPlaying: action.isPlaying }));
    case "playerFailed":
      return updated(
        withPlayer(screen, {
          failure: { url: action.url, cause: action.cause },
        }),
      );
    case "playToggleRequested":
      return updated(screen, { type: "togglePlayer" });
    case "playRequested":
      return updated(screen, { type: "playPlayer" });
    case "pauseRequested":
      return updated(screen, { type: "pausePlayer" });
    default:
      return updated(screen);
  }
}
