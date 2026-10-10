import type { Cue } from "@easyimmerse/types";
import type { RootState } from "../app/createAppStore.ts";
import type { ItemSpan } from "./itemSpan.ts";
import type { MediaPanels } from "./mediaScreen/mediaPanels.ts";
import { initialMediaPanels } from "./mediaScreen/mediaPanels.ts";
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

/** Returns the open media screen's panels, or the panels a media screen starts with while none is open. */
export const selectMediaPanels = (state: RootState): MediaPanels =>
  state.app.screen.main.kind === "media"
    ? state.app.screen.main.panels
    : initialMediaPanels;

/** Returns the cues the subtitles panel shows or nearly shows, or null. */
export const selectCuePanelSpan = (state: RootState): ItemSpan | null =>
  state.app.screen.main.kind === "media"
    ? state.app.screen.main.cuePanelSpan
    : null;

/** Tells whether the media screen's subtitle appearance dialog is open. */
export const selectIsSubtitleAppearanceOpen = (state: RootState) =>
  state.app.screen.dialog?.kind === "subtitleAppearance";

/** Returns the dictionary that the removal question asks about, or null while it is not asked. */
export const selectDictionaryRemovalQuestion = (state: RootState) =>
  state.app.screen.dialog?.kind === "removeDictionary"
    ? state.app.screen.dialog.dictionaryId
    : null;

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
