import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { flashcardNotices } from "./flashcardNotices.ts";
import {
  appAfter,
  applied,
  failure,
  hund,
  settle,
  startNew,
  typeWord,
} from "./flashcardsTestSupport.ts";
import { selectStatusLineSaves } from "./selectStatusLineSaves.ts";

/** The app with hund changed to "Hündin" and its background save failed with the status given. */
function hundFailed(status: number) {
  const app = appAfter(
    actions.flashcardOpened("h", hund),
    typeWord("Hündin"),
    startNew("f2"),
  );
  return applied(app, settle(app, "flashcard/1", failure(status)));
}

describe("selectStatusLineSaves", () => {
  it("lists a failed save", () => {
    expect(
      selectStatusLineSaves({ app: hundFailed(500) }).map(
        ({ flashcardId }) => flashcardId,
      ),
    ).toEqual(["h"]);
  });

  it("leaves out a refused save while its own notice shows", () => {
    const app = hundFailed(422);
    const failedSave = app.flashcards.failedSaves[0];
    if (!failedSave) throw new Error("Nothing is listed.");
    const shown = applied(
      app,
      actions.noticeRequested(flashcardNotices.saveRefused(failedSave)),
    );
    expect(selectStatusLineSaves({ app: shown })).toEqual([]);
  });

  it("marks a failed save whose Retry is under way", () => {
    const app = applied(hundFailed(500), actions.failedSaveRetried("h"));
    expect(selectStatusLineSaves({ app })[0]?.isRetrying).toBe(true);
  });
});
