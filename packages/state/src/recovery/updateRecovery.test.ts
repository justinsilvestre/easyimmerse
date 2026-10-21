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
import { selectRecoverableWork } from "./recoverableWork.ts";

const openHund = actions.flashcardOpened("h", hund);
const noWork = { saves: [], resends: [] };

/** The work a crash would have left: hund changed to "Hündin", its background save failed. */
function failedSaveLeft() {
  const app = appAfter(openHund, typeWord("Hündin"), startNew("f2"));
  const failed = applied(app, settle(app, "flashcard/h/1", failure("NETWORK")));
  return selectRecoverableWork(failed);
}

/** The work a crash would have left: hund's deletion under way. */
const deletionLeft = () =>
  selectRecoverableWork(appAfter(openHund, actions.flashcardDeleteRequested()));

const effectTypesOf = (
  ...[state, action]: Parameters<typeof update>
): string[] => update(state, action)[1].map(({ type }) => type);

describe("the recovery feature", () => {
  it("loads the recoverable work when the app starts", () => {
    expect(effectTypesOf(stateAfter(), actions.appStarted())).toContain(
      "loadRecoverableWork",
    );
  });

  it("lists the loaded saves as failed saves", () => {
    const app = stateAfter(actions.recoverableWorkLoaded(failedSaveLeft()));
    expect(
      selectFailedSaves(app).map(({ card }) => card.editor.content.word),
    ).toEqual(["Hündin"]);
  });

  it("sends a loaded deletion again", () => {
    const app = stateAfter(actions.recoverableWorkLoaded(deletionLeft()));
    expect(app.operations.requests.map(({ request }) => request.kind)).toEqual([
      "deleteFlashcard",
    ]);
  });

  it("tells the user when the work could not be read", () => {
    const app = stateAfter(actions.recoverableWorkLoaded("unreadable"));
    expect(app.notices.shown.map(({ message }) => message)).toEqual([
      "Couldn't recover the flashcard changes that were not saved when the app last closed.",
    ]);
  });

  it("keeps nothing on the device before the stored work is loaded", () => {
    const app = stateAfter(
      actions.openMediaFileRequested("p1", "m1"),
      openHund,
    );
    expect(effectTypesOf(app, typeWord("Hündin"))).not.toContain(
      "saveRecoverableWork",
    );
  });

  it("keeps the open card's changes on the device once the stored work is loaded", () => {
    const app = stateAfter(
      actions.recoverableWorkLoaded(noWork),
      actions.openMediaFileRequested("p1", "m1"),
      openHund,
    );
    expect(effectTypesOf(app, typeWord("Hündin"))).toContain(
      "saveRecoverableWork",
    );
  });

  it("keeps nothing new on the device when the recoverable work stays the same", () => {
    const app = stateAfter(
      actions.recoverableWorkLoaded(noWork),
      actions.openMediaFileRequested("p1", "m1"),
    );
    expect(effectTypesOf(app, openHund)).not.toContain("saveRecoverableWork");
  });
});
