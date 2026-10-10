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

/** Tells whether the platform's file picker is open for a subtitles file. */
export const selectPendingFilePick = (state: RootState) =>
  state.app.screen.dialog?.kind === "filePick";

/** Returns the subtitles file picked and not yet sent, on the screens that take one. */
export const selectPendingSubtitleFile = (state: RootState) => {
  const main = state.app.screen.main;
  return main.kind === "media" || main.kind === "offline"
    ? main.pendingSubtitleFile
    : null;
};

/** Returns the media file picked and not yet added to the open project. */
export const selectPendingMediaFile = (state: RootState) =>
  state.app.screen.main.kind === "project"
    ? state.app.screen.main.pendingMediaFile
    : null;

/** Returns the dictionary file picked in Settings and not yet sent. */
export const selectPendingDictionaryFile = (state: RootState) =>
  state.app.screen.settings?.dictionaryImport?.file ?? null;
