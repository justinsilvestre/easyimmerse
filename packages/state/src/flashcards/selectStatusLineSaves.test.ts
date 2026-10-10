import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { transientNotice } from "../notices/transientNotice.ts";
import { cat } from "../screen/lookup/lookupTestSupport.ts";
import { selectFailedSaves } from "./failedSaveSelectors.ts";
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
  return applied(app, settle(app, "flashcard/h/1", failure(status)));
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
    const [failedSave] = selectFailedSaves(app);
    if (!failedSave) throw new Error("Nothing is listed.");
    const shown = applied(
      app,
      actions.noticeRequested(flashcardNotices.saveRefused(failedSave)),
    );
    expect(selectStatusLineSaves({ app: shown })).toEqual([]);
  });

  it("keeps returning the same saves when a request of something else is sent", () => {
    const app = hundFailed(500);
    const first = selectStatusLineSaves({ app });
    const hovered = applied(app, actions.lookupWordHovered(cat));
    expect(selectStatusLineSaves({ app: hovered })).toBe(first);
  });

  it("keeps returning the same saves as the player's time moves", () => {
    const app = hundFailed(500);
    const first = selectStatusLineSaves({ app });
    const ticked = applied(app, actions.playerTimeChanged(1.5));
    expect(selectStatusLineSaves({ app: ticked })).toBe(first);
  });

  it("keeps returning the same saves when a notice of something else shows", () => {
    const app = hundFailed(500);
    const first = selectStatusLineSaves({ app });
    const noticed = applied(
      app,
      actions.noticeRequested({ ...transientNotice("info", "Kept"), key: "k" }),
    );
    expect(selectStatusLineSaves({ app: noticed })).toBe(first);
  });

  it("marks a failed save whose Retry is under way", () => {
    const app = applied(hundFailed(500), actions.failedSaveRetried("h"));
    expect(selectStatusLineSaves({ app })[0]?.isRetrying).toBe(true);
  });
});
