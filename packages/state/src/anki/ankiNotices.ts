import { actions } from "../app/appAction.ts";
import { dispatch } from "../app/dispatchEffect.ts";
import type { NoticeTone } from "../notices/noticesState.ts";
import { transientNotice } from "../notices/transientNotice.ts";
import type { RequestFailure } from "../server/serverRequest.ts";
import type { AnkiPackageExport, AnkiSendOutcome } from "./ankiResponses.ts";

/** The code of the failure of a send to Anki when Anki does not answer, which the project screen's panel shows in place of a notice. */
export const ankiUnreachableCode = "anki_unreachable";

/** Tells how many flashcards an export wrote into the package, and how many media files it left out. */
export function exportedNotice({
  flashcardCount,
  skippedMediaCount,
}: AnkiPackageExport) {
  return notice(
    "success",
    `Exported ${count(flashcardCount, "flashcard")} to an Anki package.`,
    skippedMediaLine(skippedMediaCount),
  );
}

/**
 * Tells how many flashcards a send added or updated in Anki, whether the server recorded them,
 * how many Anki refused, and how many media files it left out.
 */
export function sentNotice({
  sentCount,
  failedCount,
  skippedMediaCount,
  isRecorded,
}: AnkiSendOutcome) {
  const sent =
    sentCount === 0 ? "" : `Sent ${count(sentCount, "flashcard")} to Anki.`;
  const unrecorded = sentCount > 0 && !isRecorded;
  return notice(
    failedCount === 0 && !unrecorded ? "success" : "danger",
    sent,
    unrecorded ? unrecordedLine(sentCount) : "",
    failedLine(sentCount, failedCount),
    skippedMediaLine(skippedMediaCount),
  );
}

/** Tells why a send of the given number of flashcards to Anki failed. */
export function sendFailedNotice(
  flashcardCount: number,
  failure: RequestFailure,
) {
  return notice(
    "danger",
    `${count(flashcardCount, "flashcard")} could not be sent to Anki: ${failure.message}`,
  );
}

/**
 * Tells why the notes of deleted flashcards could not be deleted from Anki.
 * It names no flashcard, since the flashcard just deleted may never have reached Anki.
 */
export function deleteFailedNotice(failure: RequestFailure) {
  return notice(
    "danger",
    `The notes of deleted flashcards could not be deleted from Anki: ${failure.message}`,
  );
}

/**
 * Tells that the note of a deleted flashcard, named by its word, will be deleted once Anki can be reached again.
 * A flashcard not known to have reached Anki, such as one only held by packages that kept it in the queue, may have no note, so any note is meant.
 */
export function deletionPendingNotice(word: string, reachedAnki: boolean) {
  const note = reachedAnki ? "The note" : "Any note";
  return notice(
    "info",
    `Anki could not be reached. ${note} for ${flashcardName(word)} will be deleted from Anki once easyImmerse reaches it again.`,
  );
}

/** Tells that the server could not record that the notes of deleted flashcards were deleted from Anki, and that they stay pending. */
export function deletionUnrecordedNotice(unrecordedCount: number) {
  return notice(
    "danger",
    `The server could not record ${count(unrecordedCount, "deletion")} from Anki.`,
    `${unrecordedCount === 1 ? "It" : "They"} will be tried again when the project next syncs with Anki.`,
  );
}

/** Tells that the note of a deleted flashcard, named by its word, was deleted from Anki. */
export function deletedNoteNotice(word: string) {
  return notice(
    "success",
    `Deleted the note for ${flashcardName(word)} from Anki.`,
  );
}

/** Tells how many notes of deleted flashcards were deleted from Anki. */
export function deletedNotice(deletedCount: number) {
  return notice("success", `Deleted ${count(deletedCount, "note")} from Anki.`);
}

function flashcardName(word: string) {
  return word === "" ? "the flashcard" : `“${word}”`;
}

/** Tells why an export failed. */
export function exportFailedNotice(failure: RequestFailure) {
  return notice(
    "danger",
    `The Anki package could not be exported: ${failure.message}`,
  );
}

function unrecordedLine(sentCount: number): string {
  const flashcards =
    sentCount === 1
      ? "the flashcard still counts"
      : "the flashcards still count";
  return `The server could not record the send, so ${flashcards} as waiting to be sent.`;
}

function failedLine(sentCount: number, failedCount: number): string {
  if (failedCount === 0) return "";
  const subject =
    sentCount === 0 ? count(failedCount, "flashcard") : failedCount;
  return `${subject} could not be sent to Anki.`;
}

function skippedMediaLine(skippedCount: number): string {
  if (skippedCount === 0) return "";
  const media = count(
    skippedCount,
    "audio clip or screenshot",
    "audio clips or screenshots",
  );
  return `${media} could not be included.`;
}

function count(amount: number, singular: string, plural = `${singular}s`) {
  return `${amount} ${amount === 1 ? singular : plural}`;
}

function notice(tone: NoticeTone, ...lines: string[]) {
  const message = lines.filter((line) => line !== "").join(" ");
  return dispatch(actions.noticeRequested(transientNotice(tone, message)));
}
