import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfterWithCache } from "../app/stateAfter.ts";
import type {
  RequestOutcome,
  RequestSettled,
} from "../server/serverRequest.ts";
import type { AnkiSendOutcome } from "./ankiResponses.ts";
import { hasSyncFailed } from "./ankiSyncFailures.ts";
import { ankiCache, openOverview } from "./ankiTestSupport.ts";

const hasFailedAfter = (...settled: AppAction[]) =>
  hasSyncFailed(
    stateAfterWithCache(ankiCache(true), ...settled).operations.failedRequests,
    "p1",
  );

const down = { status: 500, message: "down" };

/** A send of p1's whole Anki updates queue, f3 and f1, or of the given flashcards. */
const sendSettled = (
  outcome: RequestOutcome<"sendFlashcardsToAnki">,
  flashcardIds = ["f3", "f1"],
) =>
  actions.requestSettled(
    "project/p1/ankiSend/1",
    { kind: "sendFlashcardsToAnki", projectId: "p1", flashcardIds },
    outcome,
  ) as RequestSettled;

const sent = (
  outcome: Partial<AnkiSendOutcome> = {},
  flashcardIds?: string[],
) =>
  sendSettled(
    {
      ok: true,
      data: {
        sentCount: 1,
        failedCount: 0,
        skippedMediaCount: 0,
        isRecorded: true,
        foundAnki: false,
        ...outcome,
      },
    },
    flashcardIds,
  );

const sendFailed = sendSettled({ ok: false, error: down });

const deletionSettled = (outcome: RequestOutcome<"deleteAnkiNotes">) =>
  actions.requestSettled(
    "project/p1/ankiDelete/1",
    { kind: "deleteAnkiNotes", projectId: "p1", justDeleted: null },
    outcome,
  );

const deleted = deletionSettled({
  ok: true,
  data: {
    deletedCount: 1,
    deletedFlashcardIds: ["f9"],
    remainingFlashcardIds: [],
    unrecordedCount: 0,
    foundAnki: false,
  },
});

const deletionFailed = deletionSettled({ ok: false, error: down });

const checked = actions.requestSettled(
  "ankiConnection",
  { kind: "checkAnkiConnection" },
  { ok: true, data: { connected: true, version: 6 } },
);

describe("hasSyncFailed", () => {
  it("tells of a send whose request failed", () => {
    expect(hasFailedAfter(sendFailed)).toBe(true);
  });

  it("tells of a send Anki refused some flashcards of", () => {
    expect(hasFailedAfter(sent({ sentCount: 0, failedCount: 1 }))).toBe(true);
  });

  it("tells of a send the server could not record", () => {
    expect(hasFailedAfter(sent({ isRecorded: false }))).toBe(true);
  });

  it("tells of a deletion whose request failed", () => {
    expect(hasFailedAfter(deletionFailed)).toBe(true);
  });

  it("tells of no failure after a send that sent every flashcard", () => {
    expect(hasFailedAfter(sent())).toBe(false);
  });

  it("tells of no failure after an aborted send", () => {
    const aborted = sendSettled({
      ok: false,
      error: { status: "ABORTED", message: "aborted" },
    });
    expect(hasFailedAfter(aborted)).toBe(false);
  });

  it("forgets a failed send once a later send of the whole queue succeeds", () => {
    expect(hasFailedAfter(sendFailed, sent())).toBe(false);
  });

  describe("when a failed send is followed by the send of a single saved flashcard", () => {
    const singleSent = sent({}, ["f1"]);

    it("keeps the failure, since the rest of the queue still waits", () => {
      expect(hasFailedAfter(sendFailed, singleSent)).toBe(true);
    });

    it("forgets the failure once a send of the whole queue succeeds", () => {
      expect(hasFailedAfter(sendFailed, singleSent, sent())).toBe(false);
    });
  });

  it("keeps a failed send after a deletion succeeds", () => {
    expect(hasFailedAfter(sendFailed, deleted)).toBe(true);
  });

  it("forgets a failed deletion once a later deletion succeeds", () => {
    expect(hasFailedAfter(deletionFailed, deleted)).toBe(false);
  });

  it("forgets every failure once a check of the connection settles", () => {
    expect(hasFailedAfter(sendFailed, deletionFailed, checked)).toBe(false);
  });

  it("forgets every failure once the user asks to sync again", () => {
    expect(
      hasFailedAfter(
        openOverview,
        sendFailed,
        deletionFailed,
        actions.ankiSendRequested(),
      ),
    ).toBe(false);
  });

  it("tells of no failure of another project", () => {
    const state = stateAfterWithCache(ankiCache(true), sendFailed);
    expect(hasSyncFailed(state.operations.failedRequests, "p2")).toBe(false);
  });
});
