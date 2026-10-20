import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import {
  appAfter,
  applied,
  failure,
  hund,
  settle,
  startNew,
  typeWord,
} from "../flashcards/flashcardsTestSupport.ts";
import { cat, requestFlashcard } from "../screen/lookup/lookupTestSupport.ts";
import {
  parseRecoverableWork,
  selectRecoverableWork,
} from "./recoverableWork.ts";

const openHund = actions.flashcardOpened("h", hund);

/** The flashcard id and word of each recoverable save. */
const savedWords = (app: AppState) =>
  selectRecoverableWork(app).saves.map(({ request }) =>
    request.kind === "saveFlashcard" && request.purpose.type === "save"
      ? `${request.flashcardId}:${request.purpose.card.editor.content.word}`
      : request.kind,
  );

/** The app with hund changed to "Hündin" and left, so that its save is in flight as flashcard/h/1. */
const savingHund = () => appAfter(openHund, typeWord("Hündin"), startNew("f2"));

function hundFailed() {
  const app = savingHund();
  return applied(app, settle(app, "flashcard/h/1", failure("NETWORK")));
}

describe("selectRecoverableWork", () => {
  describe("for saves", () => {
    it("holds nothing while no flashcard is open", () => {
      expect(savedWords(appAfter())).toEqual([]);
    });

    it("holds nothing for an open flashcard left unchanged", () => {
      expect(savedWords(appAfter(openHund))).toEqual([]);
    });

    it("holds the open flashcard with its changes", () => {
      expect(savedWords(appAfter(openHund, typeWord("Hündin")))).toEqual([
        "h:Hündin",
      ]);
    });

    it("holds a save under way", () => {
      expect(savedWords(savingHund())).toEqual(["h:Hündin"]);
    });

    it("holds a failed save", () => {
      expect(savedWords(hundFailed())).toEqual(["h:Hündin"]);
    });

    it("holds the open form's content in place of its flashcard's failed save", () => {
      const app = applied(hundFailed(), openHund, typeWord("Hündchen"));
      const hundWords = savedWords(app).filter((each) => each.startsWith("h:"));
      expect(hundWords).toEqual(["h:Hündchen"]);
    });

    it("holds a flashcard waiting for its word's lookup", () => {
      expect(savedWords(appAfter(requestFlashcard(cat)))).toContain(
        "f-cat:cat",
      );
    });
  });

  describe("for resends", () => {
    it("holds a deletion under way", () => {
      const app = appAfter(openHund, actions.flashcardDeleteRequested());
      expect(
        selectRecoverableWork(app).resends.map(({ kind }) => kind),
      ).toEqual(["deleteFlashcard"]);
    });

    it("holds no save of a card's content", () => {
      expect(selectRecoverableWork(savingHund()).resends).toEqual([]);
    });
  });
});

describe("parseRecoverableWork", () => {
  it("reads nothing stored as no work", () => {
    expect(parseRecoverableWork(null)).toEqual({ saves: [], resends: [] });
  });

  it("reads back the work it was given", () => {
    const work = selectRecoverableWork(hundFailed());
    expect(parseRecoverableWork(JSON.stringify(work))).toEqual(work);
  });

  it("calls text that is not JSON unreadable", () => {
    expect(parseRecoverableWork("{")).toBe("unreadable");
  });

  it("calls JSON that holds no saves unreadable", () => {
    expect(parseRecoverableWork('{"saves":[{"id":"x"}],"resends":[]}')).toBe(
      "unreadable",
    );
  });

  it("calls JSON that holds no resends unreadable", () => {
    expect(parseRecoverableWork('{"saves":[],"resends":[null]}')).toBe(
      "unreadable",
    );
  });
});
