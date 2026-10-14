import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfterWithCache } from "../app/stateAfter.ts";
import { update } from "../app/update.ts";
import { exampleDraft } from "../flashcards/exampleFlashcards.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import type { AnkiSendOutcome } from "./ankiResponses.ts";
import { ankiCache, ankiFlashcard } from "./ankiTestSupport.ts";

const saveRequest: ServerRequest = {
  kind: "saveFlashcard",
  projectId: "p1",
  flashcardId: "f1",
  draft: exampleDraft("Katze"),
  isNew: false,
  purpose: { type: "undo", word: "Katze" },
};

const saveSettled = (ok: boolean) =>
  actions.requestSettled(
    "flashcard/f1/1",
    saveRequest,
    ok
      ? { ok: true, data: ankiFlashcard("f1", "m1", 1) }
      : { ok: false, error: { status: 500, message: "down" } },
  );

const sendRequest = {
  kind: "sendFlashcardsToAnki",
  projectId: "p1",
  flashcardIds: ["f1"],
} as const;

const sendToAnki = {
  type: "sendRequest",
  id: "project/p1/ankiSend/1",
  scope: "ankiSend:p1",
  request: sendRequest,
};

const effectsOf = (action: AppAction, destination = "anki_connect" as const) =>
  update(
    stateAfterWithCache(ankiCache(destination)),
    action,
    ankiCache(destination),
  )[1];

const sent = (outcome: Partial<AnkiSendOutcome>) =>
  actions.requestSettled("project/p1/ankiSend/1", sendRequest, {
    ok: true,
    data: { sentCount: 0, failedCount: 0, skippedMediaCount: 0, ...outcome },
  });

const noticesAfter = (...actions: AppAction[]) =>
  stateAfterWithCache(ankiCache("anki_connect"), ...actions).notices.shown.map(
    ({ message }) => message,
  );

describe("ankiCommands", () => {
  it("sends a saved card to Anki when the project sends there", () => {
    expect(effectsOf(saveSettled(true))).toContainEqual(sendToAnki);
  });

  it("sends nothing to Anki for a project that exports packages", () => {
    const effects = update(
      stateAfterWithCache(ankiCache("anki_package")),
      saveSettled(true),
      ankiCache("anki_package"),
    )[1];
    expect(effects).not.toContainEqual(sendToAnki);
  });

  it("sends nothing to Anki for a save that failed", () => {
    expect(effectsOf(saveSettled(false))).not.toContainEqual(sendToAnki);
  });

  it("sends a project's cards after its earlier send", () => {
    const sending = stateAfterWithCache(
      ankiCache("anki_connect"),
      saveSettled(true),
      saveSettled(true),
    );
    expect(
      sending.operations.requests.map(({ isWaiting }) => isWaiting),
    ).toEqual([false, true]);
  });

  it("tells how many cards were sent", () => {
    expect(noticesAfter(sent({ sentCount: 3 }))).toEqual([
      "Sent 3 flashcards to Anki.",
    ]);
  });

  it("tells how many cards Anki refused", () => {
    expect(noticesAfter(sent({ sentCount: 2, failedCount: 1 }))).toEqual([
      "Sent 2 flashcards to Anki. 1 could not be sent to Anki.",
    ]);
  });

  it("tells when Anki refused every card", () => {
    expect(noticesAfter(sent({ failedCount: 2 }))).toEqual([
      "2 flashcards could not be sent to Anki.",
    ]);
  });

  it("tells how many audio clips and screenshots were left out", () => {
    expect(noticesAfter(sent({ sentCount: 1, skippedMediaCount: 1 }))).toEqual([
      "Sent 1 flashcard to Anki. 1 audio clip or screenshot could not be included.",
    ]);
  });

  it("tells that Anki is not running", () => {
    const unreachable = actions.requestSettled(
      "project/p1/ankiSend/1",
      sendRequest,
      {
        ok: false,
        error: { status: "NETWORK", code: "anki_unreachable", message: "x" },
      },
    );
    expect(noticesAfter(unreachable)).toEqual([
      "Anki is not running, or AnkiConnect is not installed.",
    ]);
  });

  it("says nothing of an aborted send", () => {
    const aborted = actions.requestSettled(
      "project/p1/ankiSend/1",
      sendRequest,
      {
        ok: false,
        error: { status: "ABORTED", message: "aborted" },
      },
    );
    expect(noticesAfter(aborted)).toEqual([]);
  });
});
