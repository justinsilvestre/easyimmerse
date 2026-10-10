import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { cat, requestFlashcard } from "../screen/lookup/lookupTestSupport.ts";
import { exampleListedFlashcard } from "./exampleFlashcards.ts";
import {
  selectLatestFlashcard,
  selectMediaFlashcards,
  selectUnsavedWorkCount,
} from "./flashcardsSelectors.ts";
import {
  appAfter,
  applied,
  createNew,
  failure,
  hund,
  landed,
  settle,
  startNew,
  typeWord,
} from "./flashcardsTestSupport.ts";

const katze = exampleListedFlashcard("k", "Katze");
const listed = [hund, katze];
const openHund = actions.flashcardOpened("h", hund);

/** The app with hund changed to the word and left, so that its save is in flight as flashcard/h/1. */
const savingHundAs = (word: string) =>
  appAfter(openHund, typeWord(word), startNew("f2"));

/** The app once hund's save as "Hündin" has landed. */
function hundSaved() {
  const app = savingHundAs("Hündin");
  const saved = exampleListedFlashcard("h", "Hündin", 2);
  return applied(app, settle(app, "flashcard/h/1", landed(saved)));
}

const drawnWords = (app: AppState) =>
  selectMediaFlashcards({ app }, listed, "m1").drawn.map(
    ({ id, content }) => `${id}:${content.word}`,
  );

/** The app with hund changed to "Hündin" and its background save failed with the status given. */
function hundFailed(status: number) {
  const app = appAfter(openHund, typeWord("Hündin"), startNew("f2"));
  return applied(app, settle(app, "flashcard/h/1", failure(status)));
}

describe("selectMediaFlashcards", () => {
  it("draws the listed flashcards while none is open", () => {
    expect(drawnWords(appAfter())).toEqual(["h:Hund", "k:Katze"]);
  });

  it("draws the open flashcard with its unsaved content", () => {
    expect(drawnWords(appAfter(openHund, typeWord("Hündin")))).toEqual([
      "h:Hündin",
      "k:Katze",
    ]);
  });

  it("draws a new flashcard after the listed ones", () => {
    expect(drawnWords(appAfter(startNew("f1", "Maus")))).toEqual([
      "h:Hund",
      "k:Katze",
      "new:Maus",
    ]);
  });

  it("draws a listed flashcard whose save failed with its edits", () => {
    expect(drawnWords(hundFailed(500))).toContain("h:Hündin");
  });

  it("draws a failed save that was never saved after the listed ones", () => {
    const app = appAfter(startNew("f1", "Maus"), startNew("f2", "Igel"));
    const failed = applied(app, settle(app, "flashcard/f1/1", failure(500)));
    expect(drawnWords(failed)).toEqual([
      "h:Hund",
      "k:Katze",
      "f1:Maus",
      "new:Igel",
    ]);
  });

  it("gives each listed flashcard the content last sent for it", () => {
    const app = appAfter(openHund, typeWord("Hündin"), startNew("f2"));
    const { flashcards } = selectMediaFlashcards({ app }, listed, "m1");
    expect(flashcards[0]?.content.word).toBe("Hündin");
  });

  it("keeps returning the same flashcards when a request of something else is sent", () => {
    const app = appAfter();
    const first = selectMediaFlashcards({ app }, listed, "m1");
    const hovered = applied(app, actions.lookupWordHovered(cat));
    expect(selectMediaFlashcards({ app: hovered }, listed, "m1")).toBe(first);
  });

  it("keeps returning the same flashcards as the player's time moves, while a card is open and a save has failed", () => {
    const app = hundFailed(500);
    const first = selectMediaFlashcards({ app }, listed, "m1");
    const ticked = applied(app, actions.playerTimeChanged(1.5));
    expect(selectMediaFlashcards({ app: ticked }, listed, "m1")).toBe(first);
  });

  it("keeps returning the same listed flashcards while the open card is edited", () => {
    const app = appAfter(openHund);
    const { flashcards } = selectMediaFlashcards({ app }, listed, "m1");
    const typed = applied(app, typeWord("Hündin"));
    expect(selectMediaFlashcards({ app: typed }, listed, "m1").flashcards).toBe(
      flashcards,
    );
  });

  it("leaves out the flashcards of other media files", () => {
    const other = { ...katze, media_file_id: "m2" };
    const { flashcards } = selectMediaFlashcards(
      { app: appAfter() },
      [hund, other],
      "m1",
    );
    expect(flashcards.map(({ id }) => id)).toEqual(["h"]);
  });
});

describe("selectLatestFlashcard", () => {
  it("prefers the draft of the latest pending save", () => {
    expect(
      selectLatestFlashcard(savingHundAs("Hündin"), hund).content.word,
    ).toBe("Hündin");
  });

  it("is the listed flashcard once no save of it is pending", () => {
    expect(selectLatestFlashcard(hundSaved(), hund).content.word).toBe("Hund");
  });
});

describe("selectUnsavedWorkCount", () => {
  it("counts nothing while the open card is unchanged", () => {
    expect(selectUnsavedWorkCount(appAfter(startNew("f1", "Katze")))).toBe(0);
  });

  it("counts a changed form", () => {
    expect(
      selectUnsavedWorkCount(
        appAfter(startNew("f1", "Katze"), typeWord("Kater")),
      ),
    ).toBe(1);
  });

  it("counts a form whose save failed", () => {
    const app = appAfter(
      startNew("f1", "Katze"),
      actions.flashcardSaveRequested(),
    );
    const failed = applied(app, settle(app, "flashcard/f1/1", failure(500)));
    expect(selectUnsavedWorkCount(failed)).toBe(1);
  });

  it("counts each pending flashcard request", () => {
    expect(
      selectUnsavedWorkCount(appAfter(createNew("f1"), createNew("f2"))),
    ).toBe(2);
  });

  it("counts each card waiting for its lookup", () => {
    const app = appAfter(
      requestFlashcard(cat),
      actions.lookupFlashcardWaitEnded("f-cat"),
    );
    expect(selectUnsavedWorkCount(app)).toBe(1);
  });

  it("counts each failed save", () => {
    const app = appAfter(createNew("f1"));
    expect(
      selectUnsavedWorkCount(
        applied(app, settle(app, "flashcard/f1/background/1", failure(500))),
      ),
    ).toBe(1);
  });

  it("counts a flashcard from a word that waits for its lookup", () => {
    expect(selectUnsavedWorkCount(appAfter(requestFlashcard(cat)))).toBe(1);
  });

  it("counts the work once for each action that changes the state", () => {
    const app = appAfter(startNew("f1", "Katze"));
    selectUnsavedWorkCount.resetRecomputations();
    applied(app, typeWord("Kater"));
    expect(selectUnsavedWorkCount.recomputations()).toBe(1);
  });
});
