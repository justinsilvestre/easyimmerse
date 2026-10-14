import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfterWithCache } from "../app/stateAfter.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { cacheKey } from "../server/cacheKey.ts";
import { serverCacheWith } from "../server/serverCacheWith.ts";
import {
  ankiCache,
  exampleAnkiFlashcards,
  openOverview,
} from "./ankiTestSupport.ts";
import { selectFlashcardSync } from "./selectFlashcardSync.ts";

const syncOf = (backend: ServerCacheSlice, ...actions: AppAction[]) =>
  selectFlashcardSync(
    { app: stateAfterWithCache(backend, ...actions), backend },
    "p1",
  );

const checked = (connected: boolean, backend = ankiCache("anki_connect")) =>
  serverCacheWith(
    "checkAnkiConnection",
    undefined,
    connected ? { connected, version: 6 } : { connected },
    backend,
  );

const checking: ServerCacheSlice = {
  queries: {
    ...ankiCache("anki_connect").queries,
    [cacheKey("checkAnkiConnection", undefined)]: { status: "pending" },
  },
};

const f3 = exampleAnkiFlashcards[2];

describe("selectFlashcardSync", () => {
  it("offers the destinations while the project has none", () => {
    expect(syncOf(ankiCache(null))).toEqual({ kind: "notStarted" });
  });

  it("counts the cards never exported", () => {
    expect(syncOf(ankiCache("anki_package"))).toMatchObject({
      kind: "ankiPackage",
      unexportedCount: 2,
    });
  });

  it("previews the first-made card never exported", () => {
    expect(syncOf(ankiCache("anki_package"))).toMatchObject({
      nextCard: f3?.content,
    });
  });

  it("counts the cards Anki has no note for", () => {
    expect(syncOf(checked(true))).toMatchObject({
      kind: "ankiConnect",
      unsentCount: 2,
    });
  });

  it("counts no notes to delete while none are listed", () => {
    expect(syncOf(checked(true))).toMatchObject({ pendingDeletionCount: 0 });
  });

  it("counts the notes still to be deleted from Anki", () => {
    const backend = serverCacheWith(
      "listAnkiPendingDeletions",
      "p1",
      {
        deletions: [{ flashcard_id: "f9", word: "Katze", requested_at_ms: 1 }],
      },
      checked(true),
    );
    expect(syncOf(backend)).toMatchObject({ pendingDeletionCount: 1 });
  });

  it("says Anki is connected once it answered the check", () => {
    expect(syncOf(checked(true))).toMatchObject({ connection: "connected" });
  });

  it("says Anki is unreachable once it did not answer the check", () => {
    expect(syncOf(checked(false))).toMatchObject({
      connection: "unreachable",
    });
  });

  it("says the connection is being checked while the check runs", () => {
    expect(syncOf(checking)).toMatchObject({ connection: "checking" });
  });

  it("says a send is under way while one is", () => {
    expect(
      syncOf(checked(true), openOverview, actions.ankiSendRequested()),
    ).toMatchObject({ isSending: true });
  });

  it("keeps its result while nothing it reads changes", () => {
    const backend = checked(true);
    const root = { app: stateAfterWithCache(backend), backend };
    expect(selectFlashcardSync(root, "p1")).toBe(
      selectFlashcardSync(root, "p1"),
    );
  });
});
