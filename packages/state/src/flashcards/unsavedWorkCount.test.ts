import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { cat, requestFlashcard } from "../screen/lookup/lookupTestSupport.ts";
import {
  appAfter,
  applied,
  createNew,
  failure,
  settle,
  startNew,
  typeWord,
} from "./flashcardsTestSupport.ts";
import { selectUnsavedWorkCount } from "./unsavedWorkCount.ts";

const countAfter = (app: ReturnType<typeof appAfter>) =>
  selectUnsavedWorkCount({ app });

describe("selectUnsavedWorkCount", () => {
  it("counts nothing while the open card is unchanged", () => {
    expect(countAfter(appAfter(startNew("f1", "Katze")))).toBe(0);
  });

  it("counts a changed form", () => {
    expect(
      countAfter(appAfter(startNew("f1", "Katze"), typeWord("Kater"))),
    ).toBe(1);
  });

  it("counts a form whose save failed", () => {
    const app = appAfter(
      startNew("f1", "Katze"),
      actions.flashcardSaveRequested(),
    );
    const failed = applied(app, settle(app, "flashcard/f1/1", failure(500)));
    expect(countAfter(failed)).toBe(1);
  });

  it("counts each pending flashcard request", () => {
    expect(countAfter(appAfter(createNew("f1"), createNew("f2")))).toBe(2);
  });

  it("counts each card waiting for its lookup", () => {
    const app = appAfter(
      requestFlashcard(cat),
      actions.lookupFlashcardWaitEnded("f-cat"),
    );
    expect(countAfter(app)).toBe(1);
  });

  it("counts each failed save", () => {
    const app = appAfter(createNew("f1"));
    expect(
      countAfter(
        applied(app, settle(app, "flashcard/f1/background/1", failure(500))),
      ),
    ).toBe(1);
  });

  it("counts a flashcard from a word that waits for its lookup", () => {
    expect(countAfter(appAfter(requestFlashcard(cat)))).toBe(1);
  });
});
