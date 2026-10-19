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
import type { FailedRequest } from "../operations/failedRequests.ts";
import {
  parseRecoverableSaves,
  selectRecoverableSaves,
} from "./recoverableSaves.ts";

const openHund = actions.flashcardOpened("h", hund);

/** The flashcard id and word of each recoverable save. */
const savedWords = (app: AppState) =>
  selectRecoverableSaves(app).map(({ request }) =>
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

describe("selectRecoverableSaves", () => {
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
});

describe("parseRecoverableSaves", () => {
  it("reads nothing stored as no saves", () => {
    expect(parseRecoverableSaves(null)).toEqual([]);
  });

  it("reads back the saves it was given", () => {
    const saves: readonly FailedRequest[] = selectRecoverableSaves(
      hundFailed(),
    );
    expect(parseRecoverableSaves(JSON.stringify(saves))).toEqual(saves);
  });

  it("calls text that is not JSON unreadable", () => {
    expect(parseRecoverableSaves("{")).toBe("unreadable");
  });

  it("calls JSON that holds no saves unreadable", () => {
    expect(parseRecoverableSaves('[{"id":"x"}]')).toBe("unreadable");
  });
});
