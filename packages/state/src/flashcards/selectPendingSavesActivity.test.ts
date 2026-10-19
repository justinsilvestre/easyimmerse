import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { exampleListedFlashcard } from "./exampleFlashcards.ts";
import {
  appAfter,
  applied,
  createNew,
  hund,
  landed,
  settle,
  startNew,
  typeWord,
} from "./flashcardsTestSupport.ts";
import { selectPendingSavesActivity } from "./selectPendingSavesActivity.ts";

/** The app with new flashcards saved at once under the ids given, their requests not yet answered. */
const savingCards = (...ids: string[]) =>
  appAfter(...ids.map((id) => createNew(id)));

/** The app with its first recorded save gone slow. */
function firstGoneSlow(app: AppState) {
  const first = app.operations.requests.find(
    ({ request }) => request.kind === "saveFlashcard",
  );
  if (!first) throw new Error("No save is recorded.");
  return applied(app, actions.requestWentSlow(first.id));
}

describe("selectPendingSavesActivity", () => {
  it("gives nothing while no save has gone slow", () => {
    expect(selectPendingSavesActivity({ app: savingCards("f1") })).toBeNull();
  });

  it("counts the flashcards being saved once a save has gone slow", () => {
    const app = firstGoneSlow(savingCards("f1", "f2"));
    expect(selectPendingSavesActivity({ app })?.label).toBe(
      "Saving 2 flashcards…",
    );
  });

  it("names one flashcard in the singular", () => {
    const app = firstGoneSlow(savingCards("f1"));
    expect(selectPendingSavesActivity({ app })?.label).toBe(
      "Saving 1 flashcard…",
    );
  });

  it("leads nowhere", () => {
    const app = firstGoneSlow(savingCards("f1"));
    expect(selectPendingSavesActivity({ app })?.opens).toBeNull();
  });

  it("goes on telling of a save queued behind a slow one once the slow one lands", () => {
    // Two saves of h, the second waiting for the first, and a save of f2, all asked for at once.
    const asked = appAfter(
      actions.flashcardOpened("h", hund),
      typeWord("Hündin"),
      startNew("f2"),
      actions.flashcardOpened("h", hund),
      typeWord("Hunde"),
      startNew("f3"),
    );
    const slow = applied(
      asked,
      actions.requestWentSlow("flashcard/h/1"),
      actions.requestWentSlow("flashcard/h/2"),
    );
    const firstLanded = applied(
      slow,
      settle(slow, "flashcard/h/1", landed(hund)),
    );
    const app = applied(
      firstLanded,
      settle(
        firstLanded,
        "flashcard/f2/1",
        landed(exampleListedFlashcard("f2", "f2")),
      ),
    );
    expect(selectPendingSavesActivity({ app })?.label).toBe(
      "Saving 1 flashcard…",
    );
  });
});
