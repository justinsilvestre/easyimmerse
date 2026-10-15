import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfterWithCache } from "../app/stateAfter.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { cacheKey } from "../server/cacheKey.ts";
import { serverCacheWith } from "../server/serverCacheWith.ts";
import {
  ankiCache,
  ankiFlashcard,
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
    connected
      ? { connected, version: 6 }
      : { connected, isDenied: false as const },
    backend,
  );

const denied = serverCacheWith(
  "checkAnkiConnection",
  undefined,
  { connected: false, isDenied: true, origin: "tauri://localhost" },
  ankiCache("anki_connect"),
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
      newCount: 2,
    });
  });

  it("counts the cards edited since they were last exported", () => {
    const backend = ankiCache("anki_package", [
      ankiFlashcard("f1", "m1", 1, { exportedAtMs: 10, updatedAtMs: 11 }),
      ankiFlashcard("f2", "m1", 2, { exportedAtMs: 10, updatedAtMs: 10 }),
    ]);
    expect(syncOf(backend)).toMatchObject({ changedCount: 1 });
  });

  it("previews the first-made card edited since it was exported", () => {
    const edited = ankiFlashcard("f1", "m1", 1, {
      exportedAtMs: 10,
      updatedAtMs: 11,
    });
    const backend = ankiCache("anki_package", [
      edited,
      ankiFlashcard("f2", "m1", 2),
    ]);
    expect(syncOf(backend)).toMatchObject({ nextCard: edited.content });
  });

  it("previews the first-made card never exported", () => {
    expect(syncOf(ankiCache("anki_package"))).toMatchObject({
      nextCard: f3?.content,
    });
  });

  it("counts every card of a project exporting packages", () => {
    expect(syncOf(ankiCache("anki_package"))).toMatchObject({
      flashcardCount: 3,
    });
  });

  it("counts every card of a project sending to Anki", () => {
    expect(syncOf(checked(true))).toMatchObject({ flashcardCount: 3 });
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

  it("says Anki refused easyImmerse once it denied the check", () => {
    expect(syncOf(denied)).toMatchObject({ connection: "denied" });
  });

  it("names the origin Anki refused", () => {
    expect(syncOf(denied)).toMatchObject({ deniedOrigin: "tauri://localhost" });
  });

  it("names no refused origin while Anki is connected", () => {
    expect(syncOf(checked(true))).toMatchObject({ deniedOrigin: null });
  });

  it("says the connection is being checked while the check runs", () => {
    expect(syncOf(checking)).toMatchObject({ connection: "checking" });
  });

  it("says the project is syncing with Anki while a send is under way", () => {
    expect(
      syncOf(checked(true), openOverview, actions.ankiSendRequested()),
    ).toMatchObject({ isSyncing: true });
  });

  it("says the project is syncing with Anki while a deletion from Anki is under way", () => {
    const allSent = ankiCache("anki_connect", [
      ankiFlashcard("f1", "m1", 1, { ankiNoteId: 100 }),
    ]);
    expect(
      syncOf(checked(true, allSent), openOverview, actions.ankiSendRequested()),
    ).toMatchObject({ isSyncing: true });
  });

  it("keeps its result while nothing it reads changes", () => {
    const backend = checked(true);
    const root = { app: stateAfterWithCache(backend), backend };
    expect(selectFlashcardSync(root, "p1")).toBe(
      selectFlashcardSync(root, "p1"),
    );
  });
});
