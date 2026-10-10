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

/** The app with hund changed to the word and left, so that its save is in flight as flashcard/h/1. */
const savingHundAs = (word: string) =>
  appAfter(actions.flashcardOpened("h", hund), typeWord(word), startNew("f2"));

/** The app once hund's save as "Hündin" has landed. */
function hundSaved() {
  const app = savingHundAs("Hündin");
  const saved = exampleListedFlashcard("h", "Hündin", 2);
  return applied(app, settle(app, "flashcard/h/1", landed(saved)));
}

describe("latestFlashcard", () => {
  it("prefers the draft of the latest pending save", () => {
    expect(latestFlashcard(hund, savingHundAs("Hündin")).content.word).toBe(
      "Hündin",
    );
  });

  it("is the listed flashcard once no save of it is pending", () => {
    expect(latestFlashcard(hund, hundSaved()).content.word).toBe("Hund");
  });
});
