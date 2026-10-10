import type { AppAction } from "../../app/appAction.ts";
import type { MainScreenState } from "../screenState.ts";

type ProjectScreenState = Extract<MainScreenState, { kind: "project" }>;

/** Keeps a picked media file on the project's overview until it has been added or has failed. Once added, the media screen replaces the overview. */
export function updateProjectScreen(
  screen: ProjectScreenState,
  action: AppAction,
): ProjectScreenState {
  switch (action.type) {
    case "mediaFileChosen":
      return { ...screen, pendingMediaFile: action.file };
    case "mediaFileAddFailed":
      return { ...screen, pendingMediaFile: null };
    default:
      return screen;
  }
}
