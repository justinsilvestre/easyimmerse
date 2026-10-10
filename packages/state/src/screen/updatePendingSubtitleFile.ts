import type { AppAction } from "../app/appAction.ts";
import type { PickedFile } from "../platform/effects.ts";

/** Keeps a picked subtitles file on a screen that takes one, until it has been added or has failed. */
export function updatePendingSubtitleFile<
  S extends { pendingSubtitleFile: PickedFile | null },
>(screen: S, action: AppAction): S {
  switch (action.type) {
    case "subtitleFileChosen":
      return { ...screen, pendingSubtitleFile: action.file };
    case "subtitleFileAdded":
    case "subtitleFileAddFailed":
      return { ...screen, pendingSubtitleFile: null };
    default:
      return screen;
  }
}
