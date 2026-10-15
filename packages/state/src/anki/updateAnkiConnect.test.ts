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
  backend: ServerCacheSlice = ankiCache("anki_connect"),
) => update(openedAfter(backend), action, backend)[1];

const isSetupOpenAfter = (...actions: AppAction[]) => {
  const { main } = openedAfter(ankiCache(null), ...actions).screen;
  return main.kind === "project" && main.isAnkiConnectSetupOpen;
};

const check = {
  type: "sendRequest",
  id: "ankiConnection",
  request: { kind: "checkAnkiConnection" },
};

const destinationSet = (destination: "anki_connect" | null) => ({
  type: "sendRequest",
  id: "project/p1/flashcardDestination",
  request: { kind: "setFlashcardDestination", projectId: "p1", destination },
});

const destinationRead = (destination: "anki_connect" | "anki_package") =>
  actions.requestSettled(
    "project/p1/destinationRead",
    { kind: "getProject", projectId: "p1" },
    {
      ok: true,
      data: { ...exampleProject("p1"), flashcard_destination: destination },
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
const allSent = ankiCache("anki_connect", [
  ankiFlashcard("f1", "m1", 1, { ankiNoteId: 100 }),
]);

/** p1 with every flashcard in Anki, and the given count of notes left to delete as last fetched, or as being fetched again. */
const allSentWithPending = (
  count: number,
  status: "fulfilled" | "pending" = "fulfilled",
): ServerCacheSlice => {
  const deletion = { flashcard_id: "f9", word: "f9", requested_at_ms: 1 };
  const key = cacheKey("listAnkiPendingDeletions", "p1");
  const data = { deletions: Array.from({ length: count }, () => deletion) };
  return { queries: { ...allSent.queries, [key]: { status, data } } };
};

const checked = (connected: boolean) =>
  actions.requestSettled(
    "ankiConnection",
    { kind: "checkAnkiConnection" },
    {
      ok: true,
      data: connected ? { connected, version: 6 } : { connected },
    },
  );

const destinationChanged = actions.requestSettled(
  "project/p1/flashcardDestination",
  {
    kind: "setFlashcardDestination",
    projectId: "p1",
    destination: "anki_connect",
  },
  {
    ok: true,
    data: { ...exampleProject("p1"), flashcard_destination: "anki_connect" },
  },
);

/** p1 without a destination yet, as the cache holds it while AnkiConnect is being set up, with the last check as given. */
const settingUp = (check: "connected" | "pending"): ServerCacheSlice => {
  const backend = ankiCache(null);
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

  it("makes AnkiConnect the destination and checks the connection once chosen", () => {
    expect(effectsOf(actions.ankiConnectSetupRequested())).toEqual([
      destinationSet("anki_connect"),
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

  it("deletes the notes left to delete after the send when asked", () => {
    expect(
      deletionsRecorded(
        openedAfter(ankiCache("anki_connect"), actions.ankiSendRequested()),
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
    const backend = ankiCache("anki_connect");
    const sending = openedAfter(backend, actions.ankiSendRequested());
    const [next] = update(sending, actions.ankiSendRequested(), backend);
    expect(sendsRecorded(next)).toBe(1);
  });

  it("sends only the unsent cards that no send under way holds when asked", () => {
    const backend = ankiCache("anki_connect");
    const sending = openedAfter(backend, savedF1);
    const [next] = update(sending, actions.ankiSendRequested(), backend);
    expect(sendsHeld(next)).toEqual([["f1"], ["f3"]]);
  });

  it("adds no deletion when asked while one waits", () => {
    const backend = ankiCache("anki_connect");
    const waiting = openedAfter(backend, actions.ankiSendRequested());
    const [next] = update(waiting, actions.ankiSendRequested(), backend);
    expect(deletionsRecorded(next)).toBe(1);
  });

  it("deletes the notes left to delete when asked only once the send has settled", async () => {
    const server = createFakeServerStoreParts(null, ankiCache("anki_connect"));
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

  it("clears the destination when asked", () => {
    expect(effectsOf(actions.flashcardDestinationCleared())).toEqual([
      destinationSet(null),
    ]);
  });

  it("checks the connection once the overview reads that the project sends to Anki", () => {
    expect(effectsOf(destinationRead("anki_connect"))).toEqual([check]);
  });

  it("checks nothing for a project that exports packages", () => {
    expect(effectsOf(destinationRead("anki_package"))).toEqual([]);
  });
});

describe("ankiConnectEffects once Anki is found running", () => {
  it("sends every card Anki has no note for", () => {
    expect(effectsOf(checked(true))).toEqual([sendUnsent]);
  });

  it("deletes the notes left to delete after the send", () => {
    expect(
      deletionsRecorded(openedAfter(ankiCache("anki_connect"), checked(true))),
    ).toBe(1);
  });

  it("sends nothing when Anki does not answer", () => {
    expect(effectsOf(checked(false))).toEqual([]);
  });

  it("sends nothing for a project that exports packages", () => {
    expect(effectsOf(checked(true), ankiCache("anki_package"))).toEqual([]);
  });

  it("only deletes the notes left to delete when Anki has every card", () => {
    expect(effectsOf(checked(true), allSent)).toEqual([deleteNotes]);
  });

  it("deletes nothing when no note is left to delete", () => {
    expect(effectsOf(checked(true), allSentWithPending(0))).toEqual([]);
  });

  it("adds no send while a send of the project is under way", () => {
    const backend = ankiCache("anki_connect");
    const sending = openedAfter(backend, actions.ankiSendRequested());
    const [next] = update(sending, checked(true), backend);
    expect(sendsRecorded(next)).toBe(1);
  });

  it("adds no deletion while one waits", () => {
    const backend = ankiCache("anki_connect");
    const waiting = openedAfter(
      backend,
      actions.ankiSendRequested(),
      checked(true),
    );
    const [next] = update(waiting, checked(true), backend);
    expect(deletionsRecorded(next)).toBe(1);
  });

  it("deletes the notes left to delete only once the send has settled", async () => {
    const server = createFakeServerStoreParts(null, ankiCache("anki_connect"));
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
    expect(effectsOf(destinationChanged, settingUp("connected"))).toEqual([
      sendUnsent,
    ]);
  });

  it("deletes the notes left to delete once AnkiConnect is chosen after Anki was found running", () => {
    const backend = settingUp("connected");
    expect(deletionsRecorded(openedAfter(backend, destinationChanged))).toBe(1);
  });

  it("leaves the send to the check under way when AnkiConnect is chosen", () => {
    expect(effectsOf(destinationChanged, settingUp("pending"))).toEqual([]);
  });

  it("sends the cards once when Send is pressed before the check lands", async () => {
    const server = createFakeServerStoreParts(null, ankiCache("anki_connect"));
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
