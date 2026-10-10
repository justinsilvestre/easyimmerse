import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { updated } from "../../app/updated.ts";
import { selectShownMediaFile } from "./mediaScreenSelectors.ts";
import type { PlayingState } from "./playingState.ts";
import { seekTo } from "./seekTo.ts";

/** A stored position this close to the start or the end of the file starts the file over instead. */
const resumeMarginMs = 5_000;

type PositionLoaded = Extract<AppAction, { type: "playbackPositionLoaded" }>;

/**
 * Takes the open file's stored position, the first time it loads during this opening, and seeks to it once the player knows the duration.
 * The position is used once per opening.
 */
export function positionLoaded(
  playing: PlayingState,
  action: PositionLoaded,
  app: Pick<AppState, "route" | "screen" | "storedPlaces">,
) {
  const { mediaFileId } = selectShownMediaFile(app);
  return action.mediaFileId === mediaFileId &&
    app.storedPlaces.playback[mediaFileId] === undefined
    ? resume(
        { ...playing, pendingResumeMs: action.ms },
        playing.player.durationSeconds,
      )
    : updated(playing);
}

/**
 * Seeks to the pending position once the player knows the duration, and clears it either way.
 * A file left within five seconds of its start or its end starts over.
 */
export function resume(playing: PlayingState, durationSeconds: number) {
  const ms = playing.pendingResumeMs;
  if (ms === null || durationSeconds === 0) return updated(playing);
  const cleared = { ...playing, pendingResumeMs: null };
  return isAwayFromEdges(ms, durationSeconds * 1000)
    ? seekTo(cleared, ms)
    : updated(cleared);
}

function isAwayFromEdges(ms: number, durationMs: number): boolean {
  return ms > resumeMarginMs && ms < durationMs - resumeMarginMs;
}
