import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import type { MediaRoute } from "../../route/route.ts";
import type { MediaScreenState } from "../screenState.ts";
import { seekTo } from "./seekTo.ts";

/** A stored position this close to the start or the end of the file starts the file over instead. */
const resumeMarginMs = 5_000;

/**
 * Seeks the open file to where playback last was, once its stored position is known and the player has loaded it.
 * A file left within five seconds of its start or its end starts over. The position is used once per opening,
 * and only the first load of it counts.
 */
export function updateResume(
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
  app: AppState,
): readonly [MediaScreenState, readonly Effect[]] {
  switch (action.type) {
    case "playbackPositionLoaded":
      return action.mediaFileId === route.mediaFileId &&
        app.storedPlaces.playback[route.mediaFileId] === undefined
        ? resume(
            { ...screen, pendingResumeMs: action.ms },
            screen.player.durationSeconds,
          )
        : [screen, []];
    case "playerDurationChanged":
      return resume(screen, action.seconds);
    default:
      return [screen, []];
  }
}

/** Seeks to the pending position once the player knows the duration, and clears it either way. */
function resume(
  screen: MediaScreenState,
  durationSeconds: number,
): readonly [MediaScreenState, readonly Effect[]] {
  const ms = screen.pendingResumeMs;
  if (ms === null || durationSeconds === 0) return [screen, []];
  const cleared = { ...screen, pendingResumeMs: null };
  return isAwayFromEdges(ms, durationSeconds * 1000)
    ? seekTo(cleared, ms)
    : [cleared, []];
}

function isAwayFromEdges(ms: number, durationMs: number): boolean {
  return ms > resumeMarginMs && ms < durationMs - resumeMarginMs;
}
