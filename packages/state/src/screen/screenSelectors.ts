import type { Cue } from "@easyimmerse/types";
import type { RootState } from "../app/createAppStore.ts";
import { initialPlayerState } from "./mediaScreen/playerState.ts";

/** Returns the open media file's player, or an idle player when no media screen is open. */
export const selectPlayer = (state: RootState) =>
  state.app.screen.main.kind === "media"
    ? state.app.screen.main.player
    : initialPlayerState;

/** Returns where the player is, in seconds. */
export const selectCurrentTime = (state: RootState) =>
  selectPlayer(state).currentTimeSeconds;

/** Returns the loaded file's duration in seconds, or zero until the player has loaded it. */
export const selectPlayerDuration = (state: RootState) =>
  selectPlayer(state).durationSeconds;

/** Returns why the player failed on a source, or null when it has not failed on that source. */
export const selectPlayerFailure = (
  state: RootState,
  url: string,
): string | null => {
  const { failure } = selectPlayer(state);
  return failure !== null && failure.url === url ? failure.cause : null;
};

/** Tells whether the platform's file picker is open for a subtitles file. */
export const selectPendingFilePick = (state: RootState) =>
  state.app.screen.dialog?.kind === "filePick";

const noCues: readonly Cue[] = [];

/** Returns the cues of the subtitles file last parsed on the offline screen. */
export const selectOfflineCues = (state: RootState) =>
  state.app.screen.main.kind === "offline"
    ? state.app.screen.main.cues
    : noCues;

/** Tells whether the subtitles file last picked on the offline screen could not be parsed. */
export const selectOfflineParseFailed = (state: RootState) =>
  state.app.screen.main.kind === "offline" && state.app.screen.main.hasFailed;
