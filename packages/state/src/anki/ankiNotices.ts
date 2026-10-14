import { actions } from "../app/appAction.ts";
import { dispatch } from "../app/dispatchEffect.ts";
import type { NoticeTone } from "../notices/noticesState.ts";
import { transientNotice } from "../notices/transientNotice.ts";
import type { RequestFailure } from "../server/serverRequest.ts";
import type { AnkiPackageExport, AnkiSendOutcome } from "./ankiResponses.ts";

/** The code of the failure of a send to Anki when Anki does not answer, which the project screen's panel shows in place of a notice. */
export const ankiUnreachableCode = "anki_unreachable";

/** Tells how many flashcards an export wrote, and how many media files it left out. */
export function exportedNotice({
  flashcardCount,
  skippedMediaCount,
}: AnkiPackageExport) {
  const exported = `Exported ${count(flashcardCount, "flashcard")} to Anki.`;
  return notice("success", exported, skippedMediaLine(skippedMediaCount));
}

/** Tells how many flashcards a send added or updated in Anki, how many Anki refused, and how many media files it left out. */
export function sentNotice({
  sentCount,
  failedCount,
  skippedMediaCount,
}: AnkiSendOutcome) {
  const sent =
    sentCount === 0 ? "" : `Sent ${count(sentCount, "flashcard")} to Anki.`;
  return notice(
    failedCount === 0 ? "success" : "danger",
    sent,
    failedLine(sentCount, failedCount),
    skippedMediaLine(skippedMediaCount),
  );
}

/** Tells why a send to Anki failed. */
export function sendFailedNotice(failure: RequestFailure) {
  return notice(
    "danger",
    `The flashcards could not be sent to Anki: ${failure.message}`,
  );
}

/** Tells why an export failed. */
export function exportFailedNotice(failure: RequestFailure) {
  return notice(
    "danger",
    `The Anki package could not be exported: ${failure.message}`,
  );
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
