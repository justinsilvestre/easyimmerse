import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { type MediaRoute, mainScreenOf } from "../route/route.ts";

/** Returns the screen of the media file that the review's shown card was made from, when the action asks to edit that card there; null otherwise. */
export function editedFlashcardRoute(
  app: Pick<AppState, "route">,
  action: AppAction,
): MediaRoute | null {
  const main = mainScreenOf(app.route);
  if (
    action.type !== "reviewFlashcardEditRequested" ||
    main.screen !== "review"
  )
    return null;
  return {
    screen: "media",
    projectId: main.projectId,
    mediaFileId: action.mediaFileId,
  };
}
