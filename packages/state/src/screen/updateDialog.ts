import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { updated } from "../app/updated.ts";
import { dictionaryFileExtensions } from "./dictionaryFileExtensions.ts";
import { mediaFileExtensions } from "./mediaFileExtensions.ts";
import { updatePlaybackDialog } from "./mediaScreen/updatePlaybackDialog.ts";
import type { ScreenState } from "./screenState.ts";

type DialogState = ScreenState["dialog"];

const subtitleFileExtensions: readonly string[] = [".srt", ".vtt"];

/**
 * Opens the platform's file picker for a pick request, and marks the subtitles pick as open until it ends.
 * Opens and closes the media screen's subtitle appearance dialog, and the question whether to remove a dictionary.
 * The media screen's playback dialogs follow `updatePlaybackDialog`. `app` is the state before the action.
 */
export function updateDialog(
  dialog: DialogState,
  action: AppAction,
  app: AppState,
) {
  switch (action.type) {
    case "subtitleFilePickRequested":
      return updated({ kind: "filePick", for: "subtitles" } as const, {
        type: "pickFile",
        accept: subtitleFileExtensions,
      });
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
      return updated({ kind: "subtitleAppearance" } as const);
    case "subtitleAppearanceClosed":
      return updated(dialog?.kind === "subtitleAppearance" ? null : dialog);
    case "dictionaryRemovalRequested":
      return updated({
        kind: "removeDictionary",
        dictionaryId: action.dictionaryId,
      } as const);
    case "dictionaryRemovalConfirmed":
    case "dictionaryRemovalCancelled":
      return updated(dialog?.kind === "removeDictionary" ? null : dialog);
    default:
      return updated(updatePlaybackDialog(dialog, action, app));
  }
}
