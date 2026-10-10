import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { exampleListedFlashcard } from "./exampleFlashcards.ts";
import {
  appAfter,
  applied,
  hund,
  landed,
  settle,
  startNew,
  typeWord,
} from "./flashcardsTestSupport.ts";
import { latestFlashcard } from "./latestFlashcard.ts";

/** The app with hund changed to the word and left, so that its save is in flight as flashcard/1. */
const savingHundAs = (word: string) =>
  appAfter(actions.flashcardOpened(hund), typeWord(word), startNew("f2"));

/** The app once hund's save as "Hündin" has returned the flashcard updated at `updatedAtMs`. */
function hundConfirmed(updatedAtMs: number) {
  const app = savingHundAs("Hündin");
  const saved = exampleListedFlashcard("h", "Hündin", updatedAtMs);
  return applied(app, settle(app, "flashcard/1", landed(saved)));
}

describe("latestFlashcard", () => {
  it("prefers the draft of the latest pending save", () => {
    expect(latestFlashcard(hund, savingHundAs("Hündin")).content.word).toBe(
      "Hündin",
    );
  });

  it("prefers the confirmed flashcard over an older listed one", () => {
    expect(latestFlashcard(hund, hundConfirmed(2)).content.word).toBe("Hündin");
  });

  it("prefers the listed flashcard once it is as new", () => {
    const listed = exampleListedFlashcard("h", "Hund", 2);
    expect(latestFlashcard(listed, hundConfirmed(2)).content.word).toBe("Hund");
  });
});
