import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import { dictionaryFileExtensions } from "./dictionaryFileExtensions.ts";
import { mediaFileExtensions } from "./mediaFileExtensions.ts";
import type { ScreenState } from "./screenState.ts";

type DialogState = ScreenState["dialog"];

const subtitleFileExtensions: readonly string[] = [".srt", ".vtt"];

/** Opens the platform's file picker for a pick request, and marks the subtitles pick as open until it ends. */
export function updateDialog(
  dialog: DialogState,
  action: AppAction,
): readonly [DialogState, readonly Effect[]] {
  switch (action.type) {
    case "filePickRequested":
      return [
        { kind: "filePick", for: "subtitles" },
        [{ type: "pickFile", accept: subtitleFileExtensions }],
      ];
    case "fileChosen":
    case "filePickCancelled":
      return [null, []];
    case "mediaFilePickRequested":
      return [dialog, [{ type: "pickMediaFile", accept: mediaFileExtensions }]];
    case "dictionaryFilePickRequested":
      return [
        dialog,
        [{ type: "pickDictionaryFile", accept: dictionaryFileExtensions }],
      ];
    default:
      return [dialog, []];
  }
}
