import { actions } from "../app/appAction.ts";
import { dispatch } from "../app/dispatchEffect.ts";
import type { NoticeContent } from "../notices/noticesState.ts";
import { transientNotice } from "../notices/transientNotice.ts";
import { type FailedSave, failedSaveIdOf } from "./failedSave.ts";
import { flashcardActions } from "./flashcardActions.ts";
import { type FlashcardCard, flashcardIdOf } from "./flashcardCard.ts";
import type { SaveUndo } from "./flashcardSaves.ts";

/** The keys of the flashcard notices, by which the flashcards feature replaces or withdraws them. */
export const flashcardNoticeKeys = {
  saveUndo: (flashcardId: string) => `saveUndo:${flashcardId}`,
  saveRefused: (flashcardId: string) => `saveRefused:${flashcardId}`,
  formDiscarded: (flashcardId: string) => `formDiscarded:${flashcardId}`,
  failedSaveDiscarded: (flashcardId: string) =>
    `failedSaveDiscarded:${flashcardId}`,
};

/** The prefix of the keys of the notices whose Undo needs the form, which go when the screen does. */
export const formDiscardedKeyPrefix = "formDiscarded:";

const discardedMessage = (word: string) =>
  `Discarded your changes to the flashcard for “${word}”.`;

/** The notices the flashcards feature shows. */
export const flashcardNotices = {
  /** A card was saved; Undo takes the save back. A card may have no word yet, as one made from a subtitle alone. */
  savedWithUndo: (undo: SaveUndo): NoticeContent => ({
    key: flashcardNoticeKeys.saveUndo(undo.flashcardId),
    tone: "success",
    message: undo.word
      ? `Saved the flashcard for “${undo.word}”.`
      : "Saved a flashcard without a word.",
    buttons: [
      { label: "Undo", action: flashcardActions.saveUndoRequested(undo) },
    ],
    isTransient: true,
  }),
  /**
   * The server refused a card's save, so that sending it again cannot succeed. Dismissing the notice only hides it.
   * A card without a media file has no form to open in, so it has no Open.
   */
  saveRefused: (
    failedSave: Pick<FailedSave, "card" | "projectId" | "mediaFileId">,
  ): NoticeContent => {
    const flashcardId = flashcardIdOf(failedSave.card);
    const { projectId, mediaFileId } = failedSave;
    const open =
      mediaFileId === null
        ? []
        : [
            {
              label: "Open",
              action: flashcardActions.failedSaveOpened(
                flashcardId,
                projectId,
                mediaFileId,
              ),
            },
          ];
    return {
      key: flashcardNoticeKeys.saveRefused(flashcardId),
      tone: "danger",
      message: `The server refused the flashcard for “${wordOf(failedSave.card)}”.`,
      buttons: [
        ...open,
        {
          label: "Discard",
          action: flashcardActions.failedSaveDiscarded(flashcardId),
        },
      ],
      isTransient: false,
    };
  },
  /** A changed card was closed without saving; Undo reopens it with its edits. */
  formDiscarded: (card: FlashcardCard): NoticeContent => ({
    key: flashcardNoticeKeys.formDiscarded(flashcardIdOf(card)),
    tone: "info",
    message: discardedMessage(wordOf(card)),
    buttons: [
      { label: "Undo", action: flashcardActions.formDiscardUndone(card) },
    ],
    isTransient: true,
  }),
  /** A failed save was discarded from the status line; Undo lists it again. */
  failedSaveDiscarded: (failedSave: FailedSave): NoticeContent => ({
    key: flashcardNoticeKeys.failedSaveDiscarded(failedSaveIdOf(failedSave)),
    tone: "info",
    message: discardedMessage(wordOf(failedSave.card)),
    buttons: [
      {
        label: "Undo",
        action: flashcardActions.failedSaveDiscardUndone(failedSave.kept),
      },
    ],
    isTransient: true,
  }),
  /** A failed save the user chose to open did not reach its form, and stays listed. */
  openFailed: (word: string): NoticeContent => ({
    tone: "danger",
    message: `Couldn't open the flashcard for “${word}”. It is still listed among the flashcards not saved.`,
    buttons: [],
    isTransient: false,
  }),
  undoFailed: (word: string): NoticeContent => ({
    tone: "danger",
    message: `Couldn't undo the save of the flashcard for “${word}”.`,
    buttons: [],
    isTransient: false,
  }),
  deleteFailed: (): NoticeContent =>
    transientNotice("danger", "The flashcard could not be deleted"),
};

/** The word of a card, which its notices name. */
export function wordOf(card: FlashcardCard): string {
  return card.editor.content.word;
}

/** Shows a notice. */
export const show = (content: NoticeContent) =>
  dispatch(actions.noticeRequested(content));

/** Withdraws the shown notice of a key, if there is one. */
export const withdraw = (key: string) => dispatch(actions.noticeWithdrawn(key));
