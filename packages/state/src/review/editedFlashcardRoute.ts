import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { MediaRoute } from "../route/route.ts";

/** Returns the screen of the media file that the review's shown card was made from, when the action asks to edit that card there; null otherwise. */
export function editedFlashcardRoute(
  app: Pick<AppState, "screen">,
  action: AppAction,
): MediaRoute | null {
  const { main } = app.screen;
  if (action.type !== "reviewFlashcardEditRequested" || main.kind !== "review")
    return null;
  const flashcard = main.shown?.flashcard;
  if (flashcard?.media_file_id == null) return null;
  return {
    screen: "media",
    projectId: flashcard.project_id,
    mediaFileId: flashcard.media_file_id,
  };
}
