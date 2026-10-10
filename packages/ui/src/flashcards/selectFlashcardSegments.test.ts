import { actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { savedFlashcard } from "../testSupport/renderMediaScreen.tsx";
import { selectFlashcardSegments } from "./selectFlashcardSegments.ts";

const listed = [savedFlashcard];

/** A store on the media screen with the saved flashcard open in the editor. */
function storeWithCardOpen() {
  const { store } = createTestAppStore();
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  store.dispatch(actions.flashcardOpened(savedFlashcard.id, savedFlashcard));
  return store;
}

const editWord = (value: string) =>
  actions.flashcardEdited({ type: "textChanged", key: "word", value });

describe("selectFlashcardSegments", () => {
  it("keeps its answer while the open card's text is edited", () => {
    const store = storeWithCardOpen();
    const before = selectFlashcardSegments(store.getState(), listed, "m1");
    store.dispatch(editWord("Katze"));
    expect(selectFlashcardSegments(store.getState(), listed, "m1")).toBe(
      before,
    );
  });

  it("moves the open card's segment with its screenshot time", () => {
    const store = storeWithCardOpen();
    store.dispatch(
      actions.flashcardEdited({ type: "screenshotMsChanged", ms: 2_600 }),
    );
    expect(
      selectFlashcardSegments(store.getState(), listed, "m1")[0]?.screenshotMs,
    ).toBe(2_600);
  });
});
