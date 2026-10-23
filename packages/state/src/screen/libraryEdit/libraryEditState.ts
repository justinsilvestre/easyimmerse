import type { AppAction } from "../../app/appAction.ts";
import type { AppRoot } from "../../app/createAppStore.ts";
import { updated } from "../../app/updated.ts";

/** What a new library item is made from: a video or audio file with its subtitles, or a text file. */
export type LibraryUpload = "media" | "text";

/** Something the user asked to delete on a library screen, waiting for confirmation. */
export type LibraryDeletion =
  | { kind: "item"; itemId: string }
  | { kind: "flashcard"; flashcardId: string };

/** A word of a library item's text, by its segment and where it begins there. */
export type LibraryWordPlace = { segmentIndex: number; start: number };

/** The choices the library screens keep: what waits for deletion, the word being edited, the words filter, the "Add to" project, and the new item's kind of file. */
export type LibraryEditState = {
  deletion: LibraryDeletion | null;
  selectedWord: LibraryWordPlace | null;
  isOnlyUndefinedShown: boolean;
  /** The project chosen to add an item to, null for a new one; unset while the user has chosen none for the item. */
  addTarget: { itemId: string; projectId: string | null } | null;
  upload: LibraryUpload;
};

/** The choices as the app starts. */
export const initialLibraryEdit: LibraryEditState = {
  deletion: null,
  selectedWord: null,
  isOnlyUndefinedShown: false,
  addTarget: null,
  upload: "media",
};

/**
 * Keeps the library screens' choices. Moving to another place drops the pending deletion, the selected word and the "Add to" choice;
 * closing or deleting a flashcard drops a pending deletion of it.
 */
export function updateLibraryEdit(state: LibraryEditState, action: AppAction) {
  switch (action.type) {
    case "libraryDeletionAsked":
      return updated({ ...state, deletion: action.deletion });
    case "libraryWordSelected":
      return updated({ ...state, selectedWord: action.place });
    case "libraryUndefinedFilterSet":
      return updated({ ...state, isOnlyUndefinedShown: action.isOn });
    case "libraryAddTargetChosen":
      return updated({
        ...state,
        addTarget: { itemId: action.itemId, projectId: action.projectId },
      });
    case "libraryUploadChosen":
      return updated({ ...state, upload: action.upload });
    case "navigated":
      return updated({
        ...state,
        deletion: null,
        selectedWord: null,
        addTarget: null,
      });
    case "flashcardClosed":
    case "flashcardDeleteRequested":
      return updated({ ...state, deletion: null });
    default:
      return updated(state);
  }
}

/** Returns the library screens' choices. */
export function selectLibraryEdit(root: AppRoot): LibraryEditState {
  return root.app.screen.libraryEdit;
}

/** Returns the project chosen to add an item to, null for a new project, or undefined while none is chosen for this item. */
export function selectLibraryAddTarget(
  root: AppRoot,
  itemId: string,
): string | null | undefined {
  const target = root.app.screen.libraryEdit.addTarget;
  return target?.itemId === itemId ? target.projectId : undefined;
}
