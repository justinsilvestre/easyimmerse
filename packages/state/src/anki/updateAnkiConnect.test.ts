import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfterWithCache } from "../app/stateAfter.ts";
import { update } from "../app/update.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { exampleProject } from "../server/exampleProject.ts";
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
    expect(effectsOf(actions.ankiSendRequested())).toEqual([
      {
        type: "sendRequest",
        id: "project/p1/ankiSend/1",
        scope: "ankiSend:p1",
        request: {
          kind: "sendFlashcardsToAnki",
          projectId: "p1",
          flashcardIds: ["f3", "f1"],
        },
      },
    ]);
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
