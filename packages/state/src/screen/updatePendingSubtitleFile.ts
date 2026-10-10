import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import type { PickedFile } from "../platform/effects.ts";

/** Keeps a picked subtitles file on a screen that takes one, until it has been added or has failed. */
export function updatePendingSubtitleFile<
  S extends { pendingSubtitleFile: PickedFile | null },
>(screen: S, action: AppAction): readonly [S, readonly Effect[]] {
  switch (action.type) {
    case "fileChosen":
      return [{ ...screen, pendingSubtitleFile: action.file }, []];
    case "subtitleFileAdded":
      return [{ ...screen, pendingSubtitleFile: null }, []];
    case "subtitleFileAddFailed":
      return [
        { ...screen, pendingSubtitleFile: null },
        [
          {
            type: "showNotification",
            message: "The subtitles file could not be added",
          },
        ],
      ];
    default:
      return [screen, []];
  }
}
