import { describe, expect, it, vi } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { stateAfterWithCache } from "../app/stateAfter.ts";
import { update } from "../app/update.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { cacheKey } from "../server/cacheKey.ts";
import { exampleProject } from "../server/exampleProject.ts";
import { serverCacheWith } from "../server/serverCacheWith.ts";
import { ankiCache, ankiFlashcard, openOverview } from "./ankiTestSupport.ts";

const after = (backend: ServerCacheSlice, ...actions: AppAction[]) =>
  stateAfterWithCache(backend, openOverview, ...actions);

const effectsOf = (
  action: AppAction,
  backend: ServerCacheSlice = ankiCache("anki_connect"),
) => update(after(backend), action, backend)[1];

const isSetupOpenAfter = (...actions: AppAction[]) => {
  const { main } = after(ankiCache(null), ...actions).screen;
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

  it("sends nothing when Anki has every card", () => {
    const allSent = ankiCache("anki_connect", [
      ankiFlashcard("f1", "m1", 1, { ankiNoteId: 100 }),
    ]);
    expect(effectsOf(actions.ankiSendRequested(), allSent)).toEqual([]);
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

  it("sends nothing when Anki does not answer", () => {
    expect(effectsOf(checked(false))).toEqual([]);
  });

  it("sends nothing for a project that exports packages", () => {
    expect(effectsOf(checked(true), ankiCache("anki_package"))).toEqual([]);
  });

  it("sends nothing when Anki has every card", () => {
    const allSent = ankiCache("anki_connect", [
      ankiFlashcard("f1", "m1", 1, { ankiNoteId: 100 }),
    ]);
    expect(effectsOf(checked(true), allSent)).toEqual([]);
  });

  it("adds no send while a send of the project is under way", () => {
    const backend = ankiCache("anki_connect");
    const sending = after(backend, actions.ankiSendRequested());
    const [next] = update(sending, checked(true), backend);
    expect(sendsRecorded(next)).toBe(1);
  });

  it("sends the cards once AnkiConnect is chosen after Anki was found running", () => {
    expect(effectsOf(destinationChanged, settingUp("connected"))).toEqual([
      sendUnsent,
    ]);
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
