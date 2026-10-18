import { type AppAction, actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { exampleShortBook } from "./exampleDocuments.ts";
import { startOfBook } from "./readingProgress.ts";
import { selectReaderLocation } from "./selectReaderLocation.ts";

function stateAfter(...dispatched: AppAction[]) {
  const { store } = createTestAppStore();
  for (const action of dispatched) store.dispatch(action);
  return store.getState();
}

const opened = actions.openMediaFileRequested("p1", "b1");

describe("selectReaderLocation", () => {
  it("moves a stored place past the end of the book to its end", () => {
    const state = stateAfter(
      opened,
      actions.readingLocationLoaded("b1", {
        chapterIndex: 9,
        paragraphIndex: 0,
        offset: 0,
      }),
    );
    expect(selectReaderLocation(state, exampleShortBook, "b1")).toEqual({
      chapterIndex: 1,
      paragraphIndex: 1,
      offset: 35,
    });
  });

  it("returns the start of the book when no place is stored", () => {
    const state = stateAfter(opened, actions.readingLocationLoaded("b1", null));
    expect(selectReaderLocation(state, exampleShortBook, "b1")).toBe(
      startOfBook,
    );
  });

  it("returns the stored place itself when it lies within the book", () => {
    const stored = { chapterIndex: 1, paragraphIndex: 0, offset: 4 };
    const state = stateAfter(
      opened,
      actions.readingLocationLoaded("b1", stored),
    );
    expect(selectReaderLocation(state, exampleShortBook, "b1")).toBe(
      state.app.storedPlaces.reading.b1,
    );
  });
});
