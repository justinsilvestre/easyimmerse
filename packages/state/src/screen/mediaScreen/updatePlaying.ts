import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { updated } from "../../app/updated.ts";
import type { MediaRoute } from "../../route/route.ts";
import { endLoopOutside, loopAtEnd } from "./clipLoop.ts";
import { pauseAtClipEnd, playClip } from "./clipPlayback.ts";
import { followFormClip } from "./formClip.ts";
import type { PlayingState } from "./playingState.ts";
import { positionLoaded, resume } from "./resume.ts";
import { seekTo, withPlayer } from "./seekTo.ts";

/**
 * Records what the player reports, passes the user's requests on to the platform's player,
 * keeps the clip loop, the clip Play and the resume seek in step with the player, and plays the clip of the flashcard open in the form.
 * `app` is the state before the action.
 */
export function updatePlaying(
  playing: PlayingState,
  action: AppAction,
  app: AppState,
  route: MediaRoute,
) {
  switch (action.type) {
    case "seekRequested": {
      const [sought, effects] = seekTo(playing, action.seconds * 1000);
      return updated(endLoopOutside(sought, action.seconds), ...effects);
    }
    case "playerSeeking":
      return updated(
        endLoopOutside(
          withPlayer(playing, { lastSeekSeconds: action.seconds }),
          action.seconds,
        ),
      );
    case "playerTimeChanged": {
      // The clip Play reads the time the loop left, which is where the loop sought when it went back to the clip's start.
      const recorded = withPlayer(playing, {
        currentTimeSeconds: action.seconds,
      });
      const [looped, loopEffects] = loopAtEnd(recorded, action.seconds);
      const [paused, pauseEffects] = pauseAtClipEnd(looped);
      return updated(paused, ...loopEffects, ...pauseEffects);
    }
    case "playerPlayingChanged": {
      const recorded = withPlayer(playing, { isPlaying: action.isPlaying });
      // Pausing ends the loop and the clip Play.
      return updated(
        action.isPlaying
          ? recorded
          : { ...recorded, loop: null, clipPlayback: null },
      );
    }
    case "playerDurationChanged":
      return resume(
        withPlayer(playing, { durationSeconds: action.seconds }),
        action.seconds,
      );
    case "playerBufferedChanged":
      return updated(withPlayer(playing, { buffered: action.buffered }));
    case "playerFailed":
      return updated(
        withPlayer(playing, {
          failure: { url: action.url, cause: action.cause },
        }),
      );
    case "playToggleRequested":
      return updated(playing, { type: "togglePlayer" });
    case "playRequested":
      return updated(playing, { type: "playPlayer" });
    case "pauseRequested":
      return updated(playing, { type: "pausePlayer" });
    case "clipPlayRequested":
      return playClip(playing, action.clip);
    case "playbackPositionLoaded":
      return positionLoaded(playing, action, route, app);
    default:
      return followFormClip(playing, action, app);
  }
}
