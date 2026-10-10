import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import type { MainScreenState } from "../screenState.ts";

type ProjectScreenState = Extract<MainScreenState, { kind: "project" }>;

/** Keeps a picked media file on the project's overview until it has been added or has failed. Once added, the media screen replaces the overview. */
export function updateProjectScreen(
  screen: ProjectScreenState,
  action: AppAction,
): readonly [ProjectScreenState, readonly Effect[]] {
  switch (action.type) {
    case "mediaFileChosen":
      return [{ ...screen, pendingMediaFile: action.file }, []];
    case "mediaFileAddFailed":
      return [
        { ...screen, pendingMediaFile: null },
        [
          {
            type: "showNotification",
            message: "The media file could not be added",
          },
        ],
      ];
    default:
      return [screen, []];
  }
}
