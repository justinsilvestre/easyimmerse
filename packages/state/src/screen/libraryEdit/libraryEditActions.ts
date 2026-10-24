import type { NewLibraryItemSettings } from "../libraryManage/libraryCreation.ts";
import type { LibraryDeletion, LibraryWordPlace } from "./libraryEditState.ts";

/** The action creators of the library screens' own choices. */
export const libraryEditActions = {
  /** The user asked to delete a library item or a flashcard made from the library, which waits for confirmation; null takes the request back. */
  libraryDeletionAsked: (deletion: LibraryDeletion | null) =>
    ({ type: "libraryDeletionAsked", deletion }) as const,
  /** The library manager clicked a word or selected text of an item in the player or the reader, to give it an entry. */
  libraryWordSelected: (place: LibraryWordPlace | null) =>
    ({ type: "libraryWordSelected", place }) as const,
  /** The user chose the project to add a library item to, or null for a new project. */
  libraryAddTargetChosen: (itemId: string, projectId: string | null) =>
    ({ type: "libraryAddTargetChosen", itemId, projectId }) as const,
  /** The library manager asked to pick the media file or text of a new library item, which is made with these settings. */
  libraryMediaPickRequested: (settings: NewLibraryItemSettings) =>
    ({ type: "libraryMediaPickRequested", settings }) as const,
  /** The library manager asked to pick a device file to replace the file of a library item. */
  libraryFileReplacePickRequested: (itemId: string) =>
    ({ type: "libraryFileReplacePickRequested", itemId }) as const,
};

/** An action of the library screens' own choices. */
export type LibraryEditAction = ReturnType<
  (typeof libraryEditActions)[keyof typeof libraryEditActions]
>;
