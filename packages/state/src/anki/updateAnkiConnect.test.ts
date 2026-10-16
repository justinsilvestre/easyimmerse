import { describe, expect, it, vi } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { stateAfterWithCache } from "../app/stateAfter.ts";
import { update } from "../app/update.ts";
import { exampleDraft } from "../flashcards/exampleFlashcards.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { cacheKey } from "../server/cacheKey.ts";
import { exampleProject } from "../server/exampleProject.ts";
import { serverCacheWith } from "../server/serverCacheWith.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import { ankiCache, ankiFlashcard, openOverview } from "./ankiTestSupport.ts";

const openedAfter = (backend: ServerCacheSlice, ...actions: AppAction[]) =>
  stateAfterWithCache(backend, openOverview, ...actions);

const effectsOf = (
  action: AppAction,
  backend: ServerCacheSlice = ankiCache(true),
) => update(openedAfter(backend), action, backend)[1];

const isSetupOpenAfter = (...actions: AppAction[]) => {
  const { main } = openedAfter(ankiCache(false), ...actions).screen;
  return main.kind === "project" && main.isAnkiConnectSetupOpen;
};

const check = {
  type: "sendRequest",
  id: "ankiConnection",
  request: { kind: "checkAnkiConnection" },
};

const ankiConnectSet = (usesAnkiConnect: boolean) => ({
  type: "sendRequest",
  id: "project/p1/ankiConnect",
  request: { kind: "setAnkiConnect", projectId: "p1", usesAnkiConnect },
});

const projectRead = (usesAnkiConnect: boolean) =>
  actions.requestSettled(
    "project/p1/projectRead",
    { kind: "getProject", projectId: "p1" },
    {
      ok: true,
      data: { ...exampleProject("p1"), uses_anki_connect: usesAnkiConnect },
    },
  );

const sendUnsent = {
  type: "sendRequest",
  id: "project/p1/ankiSend/1",
  scope: "ankiSend:p1",
  request: {
    kind: "sendFlashcardsToAnki",
    projectId: "p1",
    flashcardIds: ["f3", "f1"],
  },
};

/** The deletion of the notes left to delete, sent at once since no send of the project is under way. */
const deleteNotes = {
  type: "sendRequest",
  id: "project/p1/ankiDelete/1",
  scope: "ankiSend:p1",
  request: { kind: "deleteAnkiNotes", projectId: "p1", justDeleted: null },
};

/** p1 with every flashcard in Anki. */
const allSent = ankiCache(true, [
  ankiFlashcard("f1", "m1", 1, { sentAtMs: 100 }),
]);

/** p1 with every flashcard in Anki, and the given count of notes left to delete as last fetched, or as being fetched again. */
const allSentWithPending = (
  count: number,
  status: "fulfilled" | "pending" = "fulfilled",
): ServerCacheSlice => {
  const deletion = {
    flashcard_id: "f9",
    word: "f9",
    requested_at_ms: 1,
    reached_by_package: false,
    reached_by_anki_connect: true,
  };
  const key = cacheKey("listAnkiPendingDeletions", "p1");
  const data = { deletions: Array.from({ length: count }, () => deletion) };
  return { queries: { ...allSent.queries, [key]: { status, data } } };
};

const checked = (connected: boolean, isDenied = false) =>
  actions.requestSettled(
    "ankiConnection",
    { kind: "checkAnkiConnection" },
    {
      ok: true,
      data: connected
        ? { connected, version: 6 }
        : isDenied
          ? { connected, isDenied, origin: null }
          : { connected, isDenied },
    },
  );

const ankiConnectTurnedOn = actions.requestSettled(
  "project/p1/ankiConnect",
  { kind: "setAnkiConnect", projectId: "p1", usesAnkiConnect: true },
  { ok: true, data: { ...exampleProject("p1"), uses_anki_connect: true } },
);

/** p1 not using AnkiConnect yet, as the cache holds it while AnkiConnect is being set up, with the last check as given. */
const settingUp = (check: "connected" | "pending"): ServerCacheSlice => {
  const backend = ankiCache(false);
  if (check === "connected")
    return serverCacheWith(
      "checkAnkiConnection",
      undefined,
      { connected: true, version: 6 },
      backend,
    );
  const key = cacheKey("checkAnkiConnection", undefined);
  return { queries: { ...backend.queries, [key]: { status: "pending" } } };
};

/** Counts the sends to Anki under way or waiting. */
const sendsRecorded = ({ operations }: AppState) =>
  operations.requests.filter(
    ({ request }) => request.kind === "sendFlashcardsToAnki",
  ).length;

/** The kinds of the requests to AnkiConnect the fake server received, in order. */
const ankiKindsSent = ({ sentRequests }: { sentRequests: ServerRequest[] }) =>
  sentRequests
    .map(({ kind }) => kind)
    .filter(
      (kind) => kind === "sendFlashcardsToAnki" || kind === "deleteAnkiNotes",
    );

/** Counts the deletions from Anki under way or waiting. */
const deletionsRecorded = ({ operations }: AppState) =>
  operations.requests.filter(
    ({ request }) => request.kind === "deleteAnkiNotes",
  ).length;

/** The flashcards of each send to Anki under way or waiting, in the order asked for. */
const sendsHeld = ({ operations }: AppState) =>
  operations.requests.flatMap(({ request }) =>
    request.kind === "sendFlashcardsToAnki" ? [request.flashcardIds] : [],
  );

/** The save of f1 from the media screen, after which f1 alone is sent to Anki. */
const savedF1 = actions.requestSettled(
  "flashcard/f1/1",
  {
    kind: "saveFlashcard",
    projectId: "p1",
    flashcardId: "f1",
    draft: exampleDraft("f1"),
    isNew: false,
    purpose: { type: "undo", word: "f1" },
  },
  { ok: true, data: ankiFlashcard("f1", "m1", 2) },
);

const isChecking = ({ operations }: AppState) =>
  operations.requests.some(
    ({ request }) => request.kind === "checkAnkiConnection",
  );

describe("updateAnkiConnectSetup", () => {
  it("opens the setup dialog", () => {
    expect(isSetupOpenAfter(actions.ankiConnectSetupOpened())).toBe(true);
  });

  it("closes the setup dialog", () => {
    expect(
      isSetupOpenAfter(
        actions.ankiConnectSetupOpened(),
        actions.ankiConnectSetupClosed(),
      ),
    ).toBe(false);
  });

  it("closes the setup dialog once the user chooses AnkiConnect", () => {
    expect(
      isSetupOpenAfter(
        actions.ankiConnectSetupOpened(),
        actions.ankiConnectSetupRequested(),
      ),
    ).toBe(false);
  });

  it("turns AnkiConnect on and checks the connection once chosen", () => {
    expect(effectsOf(actions.ankiConnectSetupRequested())).toEqual([
      ankiConnectSet(true),
      check,
    ]);
  });
});

describe("ankiConnectEffects", () => {
  it("checks the connection when asked", () => {
    expect(effectsOf(actions.ankiConnectionCheckRequested())).toEqual([check]);
  });

  it("sends every card Anki has no note for, oldest first", () => {
    expect(effectsOf(actions.ankiSendRequested())).toEqual([sendUnsent]);
  });

  it("sends a card edited since it was last sent", () => {
    const edited = ankiCache(true, [
      ankiFlashcard("f1", "m1", 1, { sentAtMs: 5, updatedAtMs: 6 }),
      ankiFlashcard("f2", "m1", 2, { sentAtMs: 5 }),
    ]);
    expect(effectsOf(actions.ankiSendRequested(), edited)).toEqual([
      {
        ...sendUnsent,
        request: { ...sendUnsent.request, flashcardIds: ["f1"] },
      },
    ]);
  });

  it("deletes the notes left to delete after the send when asked", () => {
    expect(
      deletionsRecorded(
        openedAfter(ankiCache(true), actions.ankiSendRequested()),
      ),
    ).toBe(1);
  });

  it("only deletes the notes left to delete when asked and Anki has every card", () => {
    expect(effectsOf(actions.ankiSendRequested(), allSent)).toEqual([
      deleteNotes,
    ]);
  });

  it("deletes nothing when asked and no note is left to delete", () => {
    expect(
      effectsOf(actions.ankiSendRequested(), allSentWithPending(0)),
    ).toEqual([]);
  });

  it("deletes the notes left to delete when asked and some are", () => {
    expect(
      effectsOf(actions.ankiSendRequested(), allSentWithPending(1)),
    ).toEqual([deleteNotes]);
  });

  it("deletes the notes left to delete when asked while their count is fetched again", () => {
    expect(
      effectsOf(actions.ankiSendRequested(), allSentWithPending(0, "pending")),
    ).toEqual([deleteNotes]);
  });

  it("adds no send when asked while a send of the project is under way", () => {
    const backend = ankiCache(true);
    const sending = openedAfter(backend, actions.ankiSendRequested());
    const [next] = update(sending, actions.ankiSendRequested(), backend);
    expect(sendsRecorded(next)).toBe(1);
  });

  it("sends only the unsent cards that no send under way holds when asked", () => {
    const backend = ankiCache(true);
    const sending = openedAfter(backend, savedF1);
    const [next] = update(sending, actions.ankiSendRequested(), backend);
    expect(sendsHeld(next)).toEqual([["f1"], ["f3"]]);
  });

  it("adds no deletion when asked while one waits", () => {
    const backend = ankiCache(true);
    const waiting = openedAfter(backend, actions.ankiSendRequested());
    const [next] = update(waiting, actions.ankiSendRequested(), backend);
    expect(deletionsRecorded(next)).toBe(1);
  });

  it("deletes the notes left to delete when asked only once the send has settled", async () => {
    const server = createFakeServerStoreParts(null, ankiCache(true));
    const store = createAppStore(createRecordingEffects(), server);
    store.dispatch(openOverview);
    store.dispatch(actions.ankiSendRequested());
    server.respond(
      {
        kind: "sendFlashcardsToAnki",
        projectId: "p1",
        flashcardIds: ["f3", "f1"],
      },
      {
        ok: true,
        data: {
          sentCount: 2,
          failedCount: 0,
          skippedMediaCount: 0,
          isRecorded: true,
          foundAnki: false,
        },
      },
    );
    await vi.waitUntil(() => ankiKindsSent(server).length === 2);
    expect(ankiKindsSent(server)).toEqual([
      "sendFlashcardsToAnki",
      "deleteAnkiNotes",
    ]);
  });

  it("clears the listed deletions once they are marked done", () => {
    expect(
      effectsOf(actions.ankiDeletionsMarkedDone(), allSentWithPending(2)),
    ).toEqual([
      {
        type: "sendRequest",
        id: "project/p1/ankiDeletionsCleared",
        request: {
          kind: "clearAnkiPendingDeletions",
          projectId: "p1",
          flashcardIds: ["f9", "f9"],
        },
      },
    ]);
  });

  it("clears nothing when no deletion is listed", () => {
    expect(effectsOf(actions.ankiDeletionsMarkedDone(), allSent)).toEqual([]);
  });

  it("turns AnkiConnect off when asked", () => {
    expect(effectsOf(actions.ankiConnectTurnedOff())).toEqual([
      ankiConnectSet(false),
    ]);
  });

  it("checks the connection once the overview reads that the project uses AnkiConnect", () => {
    expect(effectsOf(projectRead(true))).toEqual([check]);
  });

  it("checks nothing for a project that does not use AnkiConnect", () => {
    expect(effectsOf(projectRead(false))).toEqual([]);
  });
});

describe("ankiConnectEffects once Anki is found running", () => {
  it("sends every card Anki has no note for", () => {
    expect(effectsOf(checked(true))).toEqual([sendUnsent]);
  });

  it("deletes the notes left to delete after the send", () => {
    expect(deletionsRecorded(openedAfter(ankiCache(true), checked(true)))).toBe(
      1,
    );
  });

  it("sends nothing when Anki does not answer", () => {
    expect(effectsOf(checked(false))).toEqual([]);
  });

  it("syncs nothing once the check finds that Anki refused easyImmerse", () => {
    expect(effectsOf(checked(false, true))).toEqual([]);
  });

  it("sends nothing for a project that exports packages", () => {
    expect(effectsOf(checked(true), ankiCache(false))).toEqual([]);
  });

  it("only deletes the notes left to delete when Anki has every card", () => {
    expect(effectsOf(checked(true), allSent)).toEqual([deleteNotes]);
  });

  it("deletes nothing when no note is left to delete", () => {
    expect(effectsOf(checked(true), allSentWithPending(0))).toEqual([]);
  });

  it("adds no send while a send of the project is under way", () => {
    const backend = ankiCache(true);
    const sending = openedAfter(backend, actions.ankiSendRequested());
    const [next] = update(sending, checked(true), backend);
    expect(sendsRecorded(next)).toBe(1);
  });

  it("adds no deletion while one waits", () => {
    const backend = ankiCache(true);
    const waiting = openedAfter(
      backend,
      actions.ankiSendRequested(),
      checked(true),
    );
    const [next] = update(waiting, checked(true), backend);
    expect(deletionsRecorded(next)).toBe(1);
  });

  it("deletes the notes left to delete only once the send has settled", async () => {
    const server = createFakeServerStoreParts(null, ankiCache(true));
    const store = createAppStore(createRecordingEffects(), server);
    store.dispatch(openOverview);
    store.dispatch(checked(true));
    server.respond(
      {
        kind: "sendFlashcardsToAnki",
        projectId: "p1",
        flashcardIds: ["f3", "f1"],
      },
      {
        ok: true,
        data: {
          sentCount: 2,
          failedCount: 0,
          skippedMediaCount: 0,
          isRecorded: true,
          foundAnki: false,
        },
      },
    );
    await vi.waitUntil(() => ankiKindsSent(server).length === 2);
    expect(ankiKindsSent(server)).toEqual([
      "sendFlashcardsToAnki",
      "deleteAnkiNotes",
    ]);
  });

  it("sends the cards once AnkiConnect is chosen after Anki was found running", () => {
    expect(effectsOf(ankiConnectTurnedOn, settingUp("connected"))).toEqual([
      sendUnsent,
    ]);
  });

  it("deletes the notes left to delete once AnkiConnect is chosen after Anki was found running", () => {
    const backend = settingUp("connected");
    expect(deletionsRecorded(openedAfter(backend, ankiConnectTurnedOn))).toBe(
      1,
    );
  });

  it("leaves the send to the check under way when AnkiConnect is chosen", () => {
    expect(effectsOf(ankiConnectTurnedOn, settingUp("pending"))).toEqual([]);
  });

  it("sends the cards once when Send is pressed before the check lands", async () => {
    const server = createFakeServerStoreParts(null, ankiCache(true));
    const store = createAppStore(createRecordingEffects(), server);
    store.dispatch(openOverview);
    store.dispatch(actions.ankiConnectionCheckRequested());
    store.dispatch(actions.ankiSendRequested());
    server.respond(
      { kind: "checkAnkiConnection" },
      { ok: true, data: { connected: true, version: 6 } },
    );
    await vi.waitUntil(() => !isChecking(store.getState().app));
    expect(sendsRecorded(store.getState().app)).toBe(1);
  });
});
