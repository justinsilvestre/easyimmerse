import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { Effect } from "../app/effect.ts";
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
): readonly [DialogState, readonly Effect[]] {
  switch (action.type) {
    case "subtitleFilePickRequested":
      return [
        { kind: "filePick", for: "subtitles" },
        [{ type: "pickFile", accept: subtitleFileExtensions }],
      ];
    case "subtitleFileChosen":
    case "subtitleFilePickCancelled":
      return [dialog?.kind === "filePick" ? null : dialog, []];
    case "mediaFilePickRequested":
      return [dialog, [{ type: "pickMediaFile", accept: mediaFileExtensions }]];
    case "dictionaryFilePickRequested":
      return [
        dialog,
        [{ type: "pickDictionaryFile", accept: dictionaryFileExtensions }],
      ];
    case "subtitleAppearanceOpened":
      return [{ kind: "subtitleAppearance" }, []];
    case "subtitleAppearanceClosed":
      return [dialog?.kind === "subtitleAppearance" ? null : dialog, []];
    case "dictionaryRemovalRequested":
      return [
        { kind: "removeDictionary", dictionaryId: action.dictionaryId },
        [],
      ];
    case "dictionaryRemovalConfirmed":
    case "dictionaryRemovalCancelled":
      return [dialog?.kind === "removeDictionary" ? null : dialog, []];
    default:
      return [updatePlaybackDialog(dialog, action, app), []];
  }
}
