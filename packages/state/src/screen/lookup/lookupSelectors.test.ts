import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import {
  selectFinishedLookupFlashcard,
  selectLookup,
} from "./lookupSelectors.ts";
import { cat, lookupSettled } from "./lookupTestSupport.ts";

const openM1 = actions.openMediaFileRequested("p1", "m1");
const saveCat = actions.lookupFlashcardRequested(cat, "save");

describe("selectLookup", () => {
  it("returns the open screen's lookup", () => {
    const state = {
      app: stateAfter(openM1, actions.lookupWordClicked(cat, "mouse")),
    };
    expect(selectLookup(state)?.popup?.chosen).toEqual(cat);
  });

  it("returns null outside the media screen", () => {
    expect(selectLookup({ app: stateAfter() })).toBeNull();
  });
});

describe("selectFinishedLookupFlashcard", () => {
  it("returns a flashcard whose lookup has answered", () => {
    const state = { app: stateAfter(openM1, saveCat, lookupSettled(1, cat)) };
    expect(selectFinishedLookupFlashcard(state)?.stage).toBe("ready");
  });

  it("returns a flashcard whose wait has run out", () => {
    const state = {
      app: stateAfter(openM1, saveCat, actions.lookupFlashcardWaitEnded(1)),
    };
    expect(selectFinishedLookupFlashcard(state)?.stage).toBe("late");
  });

  it("returns null while the flashcard waits", () => {
    expect(
      selectFinishedLookupFlashcard({ app: stateAfter(openM1, saveCat) }),
    ).toBeNull();
  });
});
