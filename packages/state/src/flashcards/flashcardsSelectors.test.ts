import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { cat } from "../screen/lookup/lookupTestSupport.ts";
import { exampleListedFlashcard } from "./exampleFlashcards.ts";
import { selectMediaFlashcards } from "./flashcardsSelectors.ts";
import {
  appAfter,
  applied,
  failure,
  hund,
  settle,
  startNew,
  typeWord,
} from "./flashcardsTestSupport.ts";

const katze = exampleListedFlashcard("k", "Katze");
const listed = [hund, katze];
const openHund = actions.flashcardOpened("h", hund);

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
