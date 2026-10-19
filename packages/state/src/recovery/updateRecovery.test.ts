import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { update } from "../app/update.ts";
import { selectFailedSaves } from "../flashcards/failedSave.ts";
import {
  appAfter,
  applied,
  failure,
  hund,
  settle,
  startNew,
  typeWord,
} from "../flashcards/flashcardsTestSupport.ts";
import { selectRecoverableSaves } from "./recoverableSaves.ts";

const openHund = actions.flashcardOpened("h", hund);

/** The saves a crash would have left: hund changed to "Hündin", its background save failed. */
function savesLeft() {
  const app = appAfter(openHund, typeWord("Hündin"), startNew("f2"));
  const failed = applied(app, settle(app, "flashcard/h/1", failure("NETWORK")));
  return selectRecoverableSaves(failed);
}

const effectTypesOf = (
  ...[state, action]: Parameters<typeof update>
): string[] => update(state, action)[1].map(({ type }) => type);

describe("the recovery feature", () => {
  it("loads the recoverable saves when the app starts", () => {
    expect(effectTypesOf(stateAfter(), actions.appStarted())).toContain(
      "loadRecoverableSaves",
    );
  });

  it("lists the loaded saves as failed saves", () => {
    const app = stateAfter(actions.recoverableSavesLoaded(savesLeft()));
    expect(
      selectFailedSaves(app).map(({ card }) => card.editor.content.word),
    ).toEqual(["Hündin"]);
  });

  it("tells the user when the saves could not be read", () => {
    const app = stateAfter(actions.recoverableSavesLoaded("unreadable"));
    expect(app.notices.shown.map(({ message }) => message)).toEqual([
      "Couldn't recover the flashcard changes that were not saved when the app last closed.",
    ]);
  });

  it("keeps nothing on the device before the stored saves are loaded", () => {
    const app = stateAfter(
      actions.openMediaFileRequested("p1", "m1"),
      openHund,
    );
    expect(effectTypesOf(app, typeWord("Hündin"))).not.toContain(
      "saveRecoverableSaves",
    );
  });

  it("keeps the open card's changes on the device once the stored saves are loaded", () => {
    const app = stateAfter(
      actions.recoverableSavesLoaded([]),
      actions.openMediaFileRequested("p1", "m1"),
      openHund,
    );
    expect(effectTypesOf(app, typeWord("Hündin"))).toContain(
      "saveRecoverableSaves",
    );
  });

  it("keeps nothing new on the device when the recoverable saves stay the same", () => {
    const app = stateAfter(
      actions.recoverableSavesLoaded([]),
      actions.openMediaFileRequested("p1", "m1"),
    );
    expect(effectTypesOf(app, openHund)).not.toContain("saveRecoverableSaves");
  });
});
