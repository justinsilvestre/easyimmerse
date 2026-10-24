import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import {
  selectLibraryAddTarget,
  selectLibraryEdit,
} from "./libraryEditState.ts";

const editAfter = (...done: Parameters<typeof stateAfter>) =>
  selectLibraryEdit({ app: stateAfter(...done) });

const itemDeletion = { kind: "item", itemId: "i1" } as const;
const hund = { segmentIndex: 0, start: 4, end: 8 };

describe("the library edit choices", () => {
  it("wait for no deletion at first", () => {
    expect(editAfter().deletion).toBeNull();
  });

  it("keep a deletion asked for", () => {
    expect(
      editAfter(actions.libraryDeletionAsked(itemDeletion)).deletion,
    ).toEqual(itemDeletion);
  });

  it("drop a deletion taken back", () => {
    expect(
      editAfter(
        actions.libraryDeletionAsked(itemDeletion),
        actions.libraryDeletionAsked(null),
      ).deletion,
    ).toBeNull();
  });

  it("drop a flashcard's deletion once the flashcard closes", () => {
    expect(
      editAfter(
        actions.libraryDeletionAsked({ kind: "flashcard", flashcardId: "f1" }),
        actions.flashcardClosed(),
      ).deletion,
    ).toBeNull();
  });

  it("keep the selected word", () => {
    expect(editAfter(actions.libraryWordSelected(hund)).selectedWord).toEqual(
      hund,
    );
  });

  it("drop the selected word when the app moves elsewhere", () => {
    expect(
      editAfter(
        actions.libraryWordSelected(hund),
        actions.navigated({ type: "manageLibrary" }),
      ).selectedWord,
    ).toBeNull();
  });

  it("drop the selected word when the dictionary pop-up closes", () => {
    expect(
      editAfter(actions.libraryWordSelected(hund), actions.lookupClosed())
        .selectedWord,
    ).toBeNull();
  });
});

describe("selectLibraryAddTarget", () => {
  const rootAfter = (...done: Parameters<typeof stateAfter>) => ({
    app: stateAfter(...done),
  });

  it("returns the project chosen for the item", () => {
    expect(
      selectLibraryAddTarget(
        rootAfter(actions.libraryAddTargetChosen("i1", null)),
        "i1",
      ),
    ).toBeNull();
  });

  it("returns nothing for another item", () => {
    expect(
      selectLibraryAddTarget(
        rootAfter(actions.libraryAddTargetChosen("i1", "p1")),
        "i2",
      ),
    ).toBeUndefined();
  });
});
