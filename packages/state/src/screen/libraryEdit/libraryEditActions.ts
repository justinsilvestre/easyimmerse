import type {
  LibraryDeletion,
  LibraryUpload,
  LibraryWordPlace,
} from "./libraryEditState.ts";

/** The action creators of the library screens' own choices. */
export const libraryEditActions = {
  /** The user asked to delete a library item or a library flashcard, which waits for confirmation; null takes the request back. */
  libraryDeletionAsked: (deletion: LibraryDeletion | null) =>
    ({ type: "libraryDeletionAsked", deletion }) as const,
  /** The library manager selected a word of an item's text to edit its entry, or null to close the entry. */
  libraryWordSelected: (place: LibraryWordPlace | null) =>
    ({ type: "libraryWordSelected", place }) as const,
  /** The library manager turned on or off showing only the lines that have words without a definition. */
  libraryUndefinedFilterSet: (isOn: boolean) =>
    ({ type: "libraryUndefinedFilterSet", isOn }) as const,
  /** The user chose the project to add a library item to, or null for a new project. */
  libraryAddTargetChosen: (itemId: string, projectId: string | null) =>
    ({ type: "libraryAddTargetChosen", itemId, projectId }) as const,
  /** The library manager chose what the new item is made from. */
  libraryUploadChosen: (upload: LibraryUpload) =>
    ({ type: "libraryUploadChosen", upload }) as const,
};

/** An action of the library screens' own choices. */
export type LibraryEditAction = ReturnType<
  (typeof libraryEditActions)[keyof typeof libraryEditActions]
>;
