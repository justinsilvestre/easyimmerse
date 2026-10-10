import type { AppAction } from "../app/appAction.ts";
import { updated } from "../app/updated.ts";
import { mainScreenMoveOf } from "../route/mainScreenMoveOf.ts";
import { settingsPageOf } from "../route/route.ts";
import { routeAfter } from "../route/updateRoute.ts";
import { dictionaryFileExtensions } from "./dictionaryFileExtensions.ts";
import { removeDictionary } from "./dictionaryRemoval/removeDictionary.ts";
import { mediaFileExtensions } from "./mediaFileExtensions.ts";
import type { PlaybackApp } from "./mediaScreen/playbackApp.ts";
import { updatePlaybackDialog } from "./mediaScreen/updatePlaybackDialog.ts";
import type { ScreenState } from "./screenState.ts";

type DialogState = ScreenState["dialog"];

const subtitleFileExtensions: readonly string[] = [".srt", ".vtt"];

/**
 * Updates the open dialog, and closes it with the screen or settings page it belongs to:
 * the media screen's dialogs when the main screen changes, and the question whether to remove a dictionary
 * once the dictionaries page is no longer on top. `app` is the state before the action.
 */
export function updateDialog(
  dialog: DialogState,
  action: AppAction,
  app: PlaybackApp,
) {
  const [next, effects] = dialogAfter(dialog, action, app);
  return isLeftBy(next, action, app)
    ? updated(null, ...effects)
    : updated(next, ...effects);
}

/**
 * Opens the platform's file picker for a pick request, and marks the subtitles pick as open until it ends.
 * Opens and closes the media screen's subtitle appearance dialog, and the question whether to remove a dictionary,
 * which removes the dictionary once confirmed. The media screen's playback dialogs follow `updatePlaybackDialog`.
 */
function dialogAfter(dialog: DialogState, action: AppAction, app: PlaybackApp) {
  switch (action.type) {
    case "subtitleFilePickRequested":
      return updated(
        { kind: "filePick", for: "subtitles" },
        { type: "pickFile", accept: subtitleFileExtensions },
      );
    case "subtitleFileChosen":
    case "subtitleFilePickCancelled":
      return updated(dialog?.kind === "filePick" ? null : dialog);
    case "mediaFilePickRequested":
      return updated(dialog, {
        type: "pickMediaFile",
        accept: mediaFileExtensions,
      });
    case "dictionaryFilePickRequested":
      return updated(dialog, {
        type: "pickDictionaryFile",
        accept: dictionaryFileExtensions,
      });
    case "subtitleAppearanceOpened":
      return updated({ kind: "subtitleAppearance" });
    case "subtitleAppearanceClosed":
      return updated(dialog?.kind === "subtitleAppearance" ? null : dialog);
    case "dictionaryRemovalRequested":
      return updated({
        kind: "removeDictionary",
        dictionaryId: action.dictionaryId,
      });
    case "dictionaryRemovalConfirmed":
      return dialog?.kind === "removeDictionary"
        ? updated(null, removeDictionary(dialog.dictionaryId))
        : updated(dialog);
    case "dictionaryRemovalCancelled":
      return updated(dialog?.kind === "removeDictionary" ? null : dialog);
    default:
      return updated(updatePlaybackDialog(dialog, action, app));
  }
}

/** Tells whether the action leaves the screen or settings page that the dialog belongs to. */
function isLeftBy(
  dialog: DialogState,
  action: AppAction,
  app: PlaybackApp,
): boolean {
  switch (dialog?.kind) {
    case "trackChoice":
    case "conversionNotice":
    case "subtitleAppearance":
      return mainScreenMoveOf(app, action) !== null;
    case "removeDictionary": {
      const route = routeAfter(app, action);
      return (
        route.screen !== "settings" || settingsPageOf(route) !== "dictionaries"
      );
    }
    default:
      return false;
  }
}
