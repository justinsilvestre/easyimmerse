import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";

/**
 * Saves the translation a book was paired with, or the removal of its pairing.
 * The request's id names the book alone, so that a later choice aborts an earlier one still in flight.
 */
export function translationDocumentRequests(action: AppAction): Effect[] {
  if (action.type !== "readerTranslationChosen") return [];
  const { projectId, mediaFileId, translationMediaFileId } = action;
  return [
    {
      type: "sendRequest",
      id: `media/${mediaFileId}/translationDocument`,
      request: {
        kind: "setTranslationDocument",
        projectId,
        mediaFileId,
        translationMediaFileId,
      },
    },
  ];
}
