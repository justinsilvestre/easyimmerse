import type { AppAction } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import type { RequestSettled } from "../server/serverRequest.ts";
import { flashcardNotices, show } from "./flashcardNotices.ts";
import {
  flashcardRequestLimitMs,
  flashcardRequestSlowMs,
  flashcardScope,
} from "./flashcardRequests.ts";

/** Where a library flashcard comes from: a segment of a library media file, and the start of its word there, or null for the whole segment. */
export type LibraryFlashcardPlace = {
  projectId: string;
  mediaFileId: string;
  segmentIndex: number;
  wordStart: number | null;
};

type LibraryFlashcardSettled = Extract<
  RequestSettled,
  { request: { kind: "createLibraryFlashcard" } }
>;

/**
 * Returns what making a library flashcard asks for: a fresh id for an asked-for card, then its request, which the server fills
 * from the item's text, and once it lands, the notice whose Undo deletes it. A library flashcard is always saved at once, since it cannot be edited.
 */
export function libraryFlashcardCommands(action: AppAction): Effect[] {
  switch (action.type) {
    case "libraryFlashcardRequested":
      return [{ type: "createLibraryFlashcard", place: action.place }];
    case "libraryFlashcardStarted":
      return [sendLibraryFlashcard(action.place, action.flashcardId)];
    case "requestSettled":
      return action.request.kind === "createLibraryFlashcard"
        ? [libraryFlashcardNotice(action as LibraryFlashcardSettled)]
        : [];
    default:
      return [];
  }
}

function sendLibraryFlashcard(
  { projectId, mediaFileId, segmentIndex, wordStart }: LibraryFlashcardPlace,
  flashcardId: string,
): Effect {
  return {
    type: "sendRequest",
    id: `libraryFlashcard/${flashcardId}`,
    request: {
      kind: "createLibraryFlashcard",
      projectId,
      mediaFileId,
      flashcard: {
        id: flashcardId,
        segment_index: segmentIndex,
        word_start: wordStart,
      },
    },
    scope: flashcardScope(flashcardId),
    timeLimitMs: flashcardRequestLimitMs,
    slowAfterMs: flashcardRequestSlowMs,
  };
}

function libraryFlashcardNotice({ request, outcome }: LibraryFlashcardSettled) {
  if (!outcome.ok) return show(flashcardNotices.libraryFlashcardFailed());
  const undo = {
    projectId: request.projectId,
    flashcardId: request.flashcard.id,
    word: outcome.data.content.word,
    before: null,
  };
  return show(flashcardNotices.savedWithUndo(undo));
}
