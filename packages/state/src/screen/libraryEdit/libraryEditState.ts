import type { AppAction } from "../../app/appAction.ts";
import type { AppRoot } from "../../app/createAppStore.ts";
import { updated } from "../../app/updated.ts";
import {
  type LibraryFileReplacement,
  updateLibraryFileReplacement,
} from "./libraryFileReplacement.ts";

/** Something the user asked to delete on a library screen, waiting for confirmation. */
export type LibraryDeletion =
  | { kind: "item"; itemId: string }
  | { kind: "flashcard"; flashcardId: string };

/**
 * The text of a library item's segment that the library manager chose in the player or the reader, to give it an entry:
 * its segment, and where the text begins and ends there, in UTF-16 code units.
 * `end` is null for a click in a script written without spaces, where the entry chosen tells how far the word goes.
 */
export type LibraryWordPlace = {
  segmentIndex: number;
  start: number;
  end: number | null;
};

/** The choices the library screens keep: what waits for deletion, the text chosen to give an entry, the "Add to" project, and the file being replaced. */
export type LibraryEditState = {
  deletion: LibraryDeletion | null;
  selectedWord: LibraryWordPlace | null;
  /** The project chosen to add an item to, null for a new one; unset while the user has chosen none for the item. */
  addTarget: { itemId: string; projectId: string | null } | null;
  /** The file of an item being replaced by one picked on this device. */
  fileReplacement: LibraryFileReplacement | null;
};

/** The choices as the app starts. */
export const initialLibraryEdit: LibraryEditState = {
  deletion: null,
  selectedWord: null,
  addTarget: null,
  fileReplacement: null,
};

/**
 * Keeps the library screens' choices. Moving to another place drops the pending deletion, the chosen text and the "Add to" choice;
 * closing the dictionary pop-up drops the chosen text; confirming a flashcard's deletion drops it from waiting.
 */
export function updateLibraryEdit(state: LibraryEditState, action: AppAction) {
  const [fileReplacement, effects] = updateLibraryFileReplacement(
    state.fileReplacement,
    action,
  );
  const [choices] = updateChoices(state, action);
  if (fileReplacement === state.fileReplacement)
    return updated(choices, ...effects);
  return updated({ ...choices, fileReplacement }, ...effects);
}

function updateChoices(state: LibraryEditState, action: AppAction) {
  switch (action.type) {
    case "libraryDeletionAsked":
      return updated({ ...state, deletion: action.deletion });
    case "libraryWordSelected":
      return updated({ ...state, selectedWord: action.place });
    case "lookupClosed":
      return updated({ ...state, selectedWord: null });
    case "libraryAddTargetChosen":
      return updated({
        ...state,
        addTarget: { itemId: action.itemId, projectId: action.projectId },
      });
    case "locationChanged":
      return updated({
        ...state,
        deletion: null,
        selectedWord: null,
        addTarget: null,
      });
    case "flashcardDeleteConfirmed":
      return updated({ ...state, deletion: null });
    default:
      return updated(state);
  }
}

/** Returns the library screens' choices. */
export function selectLibraryEdit(root: AppRoot): LibraryEditState {
  return root.app.screen.libraryEdit;
}

/** Returns the text the library manager chose in the player or the reader to give an entry, or null. */
export function selectLibraryWordPlace(root: AppRoot): LibraryWordPlace | null {
  return root.app.screen.libraryEdit.selectedWord;
}

/** Returns the project chosen to add an item to, null for a new project, or undefined while none is chosen for this item. */
export function selectLibraryAddTarget(
  root: AppRoot,
  itemId: string,
): string | null | undefined {
  const target = root.app.screen.libraryEdit.addTarget;
  return target?.itemId === itemId ? target.projectId : undefined;
}

/** Returns how the file of an item is being replaced, or null when it is not. */
export function selectLibraryFileReplacement(
  root: AppRoot,
  itemId: string,
): LibraryFileReplacement | null {
  const replacement = root.app.screen.libraryEdit.fileReplacement;
  return replacement?.itemId === itemId ? replacement : null;
}
