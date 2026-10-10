import type { Effect } from "../app/effect.ts";
import { type FailedSave, failedSaveIdOf } from "./failedSave.ts";
import {
  flashcardNoticeKeys,
  flashcardNotices,
  show,
  withdraw,
} from "./flashcardNotices.ts";
import type { FlashcardsState } from "./flashcardsState.ts";

/** The notice that goes with listing a failed save: a refused save's own notice, or else the withdrawal of an earlier one. */
export function noticeOfListing(failedSave: FailedSave): Effect {
  return failedSave.isRefused
    ? show(flashcardNotices.saveRefused(failedSave))
    : withdraw(flashcardNoticeKeys.saveRefused(failedSaveIdOf(failedSave)));
}

/** Lists a failed save, in place of any listed under the same flashcard id. */
export function withFailedSave(
  failedSaves: readonly FailedSave[],
  failedSave: FailedSave,
): readonly FailedSave[] {
  const id = failedSaveIdOf(failedSave);
  const others = failedSaves.filter((other) => failedSaveIdOf(other) !== id);
  return others.length === failedSaves.length
    ? [...failedSaves, failedSave]
    : failedSaves.map((other) =>
        failedSaveIdOf(other) === id ? failedSave : other,
      );
}

/** Takes the failed save of a flashcard off the list. */
export function withoutFailedSave(
  failedSaves: readonly FailedSave[],
  flashcardId: string,
): readonly FailedSave[] {
  const remaining = failedSaves.filter(
    (failedSave) => failedSaveIdOf(failedSave) !== flashcardId,
  );
  return remaining.length === failedSaves.length ? failedSaves : remaining;
}

/** The failed save of a flashcard, if it is listed. */
export function findFailedSave(
  state: FlashcardsState,
  flashcardId: string,
): FailedSave | undefined {
  return state.failedSaves.find(
    (failedSave) => failedSaveIdOf(failedSave) === flashcardId,
  );
}

/** Lists a failed save in the state, in place of any listed under the same flashcard id. */
export function changeFailedSave(
  state: FlashcardsState,
  failedSave: FailedSave,
): FlashcardsState {
  return {
    ...state,
    failedSaves: withFailedSave(state.failedSaves, failedSave),
  };
}
