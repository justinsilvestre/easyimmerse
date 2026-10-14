import { describe, expect, it, vi } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { stateAfterWithCache } from "../app/stateAfter.ts";
import { update } from "../app/update.ts";
import { exampleDraft } from "../flashcards/exampleFlashcards.ts";
import type { DeletePurpose } from "../flashcards/flashcardRequests.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import type {
  RequestFailure,
  RequestOutcome,
  ServerRequest,
} from "../server/serverRequest.ts";
import type { AnkiSendOutcome } from "./ankiResponses.ts";
import { ankiCache, ankiFlashcard, openOverview } from "./ankiTestSupport.ts";

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

/** The deletion of f2, whose word is "f2", or of another flashcard of p1. */
const deletionSettled = (
  purpose: DeletePurpose,
  { ok = true, flashcardId = "f2" } = {},
) =>
  actions.requestSettled(
    `flashcard/${flashcardId}/1`,
    { kind: "deleteFlashcard", projectId: "p1", flashcardId, purpose },
    ok
      ? { ok: true, data: undefined }
      : { ok: false, error: { status: 500, message: "down" } },
  );

const noteDeletion = (word: string | null = "f2") => ({
  type: "sendRequest",
  id: "project/p1/ankiDelete/1",
  scope: "ankiSend:p1",
  request: { kind: "deleteAnkiNotes", projectId: "p1", word },
});

const notesDeletionSettled = (
  outcome: RequestOutcome<"deleteAnkiNotes">,
  word: string | null = "f2",
) =>
  actions.requestSettled(
    "project/p1/ankiDelete/1",
    { kind: "deleteAnkiNotes", projectId: "p1", word },
    outcome,
  );

const notesDeleted = (
  deletedCount: number,
  remainingCount: number,
  word: string | null = "f2",
  unrecordedCount = 0,
) =>
  notesDeletionSettled(
    { ok: true, data: { deletedCount, remainingCount, unrecordedCount } },
    word,
  );

const notesDeletionFailed = (
  error: RequestFailure,
  word: string | null = "f2",
) => notesDeletionSettled({ ok: false, error }, word);

const sendAllRequest = {
  kind: "sendFlashcardsToAnki",
  projectId: "p1",
  flashcardIds: ["f3", "f1"],
} as const;

/** A store whose fake server has a send of p1 under way when the deletion of f2 lands. */
function deletingDuringSend() {
  const server = createFakeServerStoreParts(null, ankiCache("anki_connect"));
  const store = createAppStore(createRecordingEffects(), server);
  store.dispatch(openOverview);
  store.dispatch(actions.ankiSendRequested());
  store.dispatch(deletionSettled({ type: "delete" }));
  return server;
}

const ankiKindsSent = ({ sentRequests }: { sentRequests: ServerRequest[] }) =>
  sentRequests
    .map(({ kind }) => kind)
    .filter(
      (kind) => kind === "sendFlashcardsToAnki" || kind === "deleteAnkiNotes",
    );

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

  it("tells why Anki refused a send", () => {
    const refused = actions.requestSettled(
      "project/p1/ankiSend/1",
      sendRequest,
      {
        ok: false,
        error: { status: 502, code: "anki_failed", message: "deck is full" },
      },
    );
    expect(noticesAfter(refused)).toEqual([
      "The flashcards could not be sent to Anki: deck is full",
    ]);
  });

  it("says nothing when Anki is not running, which the project screen shows", () => {
    const unreachable = actions.requestSettled(
      "project/p1/ankiSend/1",
      sendRequest,
      {
        ok: false,
        error: { status: "NETWORK", code: "anki_unreachable", message: "x" },
      },
    );
    expect(noticesAfter(unreachable)).toEqual([]);
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

describe("ankiCommands when a flashcard is deleted", () => {
  it("deletes the project's deleted notes from Anki, naming the flashcard", () => {
    expect(effectsOf(deletionSettled({ type: "delete" }))).toContainEqual(
      noteDeletion(),
    );
  });

  it("deletes its note when an Undo deletes a new card", () => {
    expect(
      effectsOf(deletionSettled({ type: "undo", word: "f2" })),
    ).toContainEqual(noteDeletion());
  });

  it("deletes its note when a discard in doubt deletes a card", () => {
    expect(
      effectsOf(deletionSettled({ type: "rollback", word: "f2" })),
    ).toContainEqual(noteDeletion());
  });

  it("looks for the note of a card no send has recorded, since a send in flight may create it", () => {
    expect(
      effectsOf(deletionSettled({ type: "delete" }, { flashcardId: "f1" })),
    ).toContainEqual(noteDeletion("f1"));
  });

  it("names an uncached card by the word its Undo names", () => {
    expect(
      effectsOf(
        deletionSettled({ type: "undo", word: "Katze" }, { flashcardId: "f9" }),
      ),
    ).toContainEqual(noteDeletion("Katze"));
  });

  it("deletes nothing for a project that exports packages", () => {
    const effects = update(
      stateAfterWithCache(ankiCache("anki_package")),
      deletionSettled({ type: "delete" }),
      ankiCache("anki_package"),
    )[1];
    expect(effects).not.toContainEqual(noteDeletion());
  });

  it("deletes nothing when the deletion failed", () => {
    expect(
      effectsOf(deletionSettled({ type: "delete" }, { ok: false })),
    ).not.toContainEqual(noteDeletion());
  });

  it("waits for the project's send under way before deleting the note", () => {
    const server = deletingDuringSend();
    expect(ankiKindsSent(server)).toEqual(["sendFlashcardsToAnki"]);
  });

  it("deletes the note once the project's send has settled", async () => {
    const server = deletingDuringSend();
    server.respond(sendAllRequest, {
      ok: true,
      data: { sentCount: 2, failedCount: 0, skippedMediaCount: 0 },
    });
    await vi.waitUntil(() => ankiKindsSent(server).length === 2);
    expect(ankiKindsSent(server)).toEqual([
      "sendFlashcardsToAnki",
      "deleteAnkiNotes",
    ]);
  });

  it("tells why Anki could not delete the note", () => {
    const refused = notesDeletionFailed({
      status: 502,
      code: "anki_failed",
      message: "collection is not available",
    });
    expect(noticesAfter(refused)).toEqual([
      "The note for “f2” could not be deleted from Anki: collection is not available",
    ]);
  });

  it("tells that the note will be deleted once Anki is connected when Anki is not running", () => {
    expect(noticesAfter(notesDeleted(0, 1))).toEqual([
      "Anki is not running. The note for “f2” will be deleted from Anki the next time it is connected.",
    ]);
  });

  it("names a card without a word as the flashcard", () => {
    expect(noticesAfter(notesDeleted(0, 1, ""))).toEqual([
      "Anki is not running. The note for the flashcard will be deleted from Anki the next time it is connected.",
    ]);
  });

  it("says nothing once Anki has deleted the note", () => {
    expect(noticesAfter(notesDeleted(1, 0))).toEqual([]);
  });

  it("tells that the server could not record the note's deletion, without blaming Anki", () => {
    expect(noticesAfter(notesDeleted(1, 0, "f2", 1))).toEqual([
      "The deletion of 1 note from Anki could not be recorded on the server. It will be tried again the next time Anki is connected.",
    ]);
  });

  it("says nothing of an aborted deletion", () => {
    const aborted = notesDeletionFailed({
      status: "ABORTED",
      message: "aborted",
    });
    expect(noticesAfter(aborted)).toEqual([]);
  });
});

describe("ankiCommands when notes left in Anki are deleted later", () => {
  it("tells how many notes were deleted", () => {
    expect(noticesAfter(notesDeleted(2, 0, null))).toEqual([
      "Deleted 2 notes from Anki.",
    ]);
  });

  it("tells how many deletions the server could not record", () => {
    expect(noticesAfter(notesDeleted(2, 0, null, 2))).toEqual([
      "Deleted 2 notes from Anki.",
      "The deletion of 2 notes from Anki could not be recorded on the server. It will be tried again the next time Anki is connected.",
    ]);
  });

  it("says nothing when no note was deleted", () => {
    expect(noticesAfter(notesDeleted(0, 0, null))).toEqual([]);
  });

  it("says nothing when Anki stopped answering, which the project screen shows", () => {
    expect(noticesAfter(notesDeleted(0, 2, null))).toEqual([]);
  });

  it("tells why Anki could not delete the notes", () => {
    const refused = notesDeletionFailed(
      { status: 502, code: "anki_failed", message: "deck is busy" },
      null,
    );
    expect(noticesAfter(refused)).toEqual([
      "The notes could not be deleted from Anki: deck is busy",
    ]);
  });
});
