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

const checked = (connected: boolean, backend = ankiCache(true)) =>
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
  ankiCache(true),
);

const checking: ServerCacheSlice = {
  queries: {
    ...ankiCache(true).queries,
    [cacheKey("checkAnkiConnection", undefined)]: { status: "pending" },
  },
};

const f3 = exampleAnkiFlashcards[2];

const katze = {
  flashcard_id: "f9",
  word: "Katze",
  requested_at_ms: 1,
};

/** p1, using AnkiConnect or not, with the deletion of "Katze" from Anki listed. */
const withDeletions = (usesAnkiConnect: boolean) =>
  serverCacheWith(
    "listAnkiPendingDeletions",
    "p1",
    { deletions: [katze] },
    ankiCache(usesAnkiConnect),
  );

describe("selectFlashcardSync", () => {
  it("tells that the queue was never flushed before any card reached Anki", () => {
    expect(
      syncOf(ankiCache(false, [ankiFlashcard("f1", "m1", 1)])),
    ).toMatchObject({ queue: { hasBeenFlushed: false } });
  });

  it("tells that the queue was flushed once a card was sent through AnkiConnect", () => {
    const backend = ankiCache(false, [
      ankiFlashcard("f1", "m1", 1, { sentAtMs: 5 }),
    ]);
    expect(syncOf(backend)).toMatchObject({ queue: { hasBeenFlushed: true } });
  });

  it("counts the cards never delivered to Anki as new", () => {
    expect(syncOf(ankiCache(false))).toMatchObject({
      queue: { newCount: 2 },
    });
  });

  it("counts no card sent through AnkiConnect as new", () => {
    const backend = ankiCache(false, [
      ankiFlashcard("f1", "m1", 1, { sentAtMs: 5 }),
      ankiFlashcard("f2", "m1", 2),
    ]);
    expect(syncOf(backend)).toMatchObject({ queue: { newCount: 1 } });
  });

  it("counts the cards edited since they were last exported as changed", () => {
    const backend = ankiCache(false, [
      ankiFlashcard("f1", "m1", 1, { exportedAtMs: 10, updatedAtMs: 11 }),
      ankiFlashcard("f2", "m1", 2, { exportedAtMs: 10, updatedAtMs: 9 }),
    ]);
    expect(syncOf(backend)).toMatchObject({ queue: { changedCount: 1 } });
  });

  it("counts the cards edited since AnkiConnect last sent them as changed", () => {
    const backend = checked(
      true,
      ankiCache(true, [
        ankiFlashcard("f1", "m1", 1, { sentAtMs: 5, updatedAtMs: 6 }),
        ankiFlashcard("f2", "m1", 2, { sentAtMs: 5 }),
      ]),
    );
    expect(syncOf(backend)).toMatchObject({ queue: { changedCount: 1 } });
  });

  it("counts no card exported since AnkiConnect last sent it as changed", () => {
    const backend = checked(
      true,
      ankiCache(true, [
        ankiFlashcard("f1", "m1", 1, {
          sentAtMs: 5,
          updatedAtMs: 6,
          exportedAtMs: 7,
        }),
      ]),
    );
    expect(syncOf(backend)).toMatchObject({ queue: { changedCount: 0 } });
  });

  it("previews the first-made card never delivered", () => {
    expect(syncOf(ankiCache(false))).toMatchObject({ nextCard: f3?.content });
  });

  it("previews the first-made card edited since it was exported", () => {
    const edited = ankiFlashcard("f1", "m1", 1, {
      exportedAtMs: 10,
      updatedAtMs: 11,
    });
    const backend = ankiCache(false, [edited, ankiFlashcard("f2", "m1", 2)]);
    expect(syncOf(backend)).toMatchObject({ nextCard: edited.content });
  });

  it("previews no card sent through AnkiConnect since its last edit while AnkiConnect is off", () => {
    const backend = ankiCache(false, [
      ankiFlashcard("f1", "m1", 1, { sentAtMs: 5 }),
      ankiFlashcard("f2", "m1", 2),
    ]);
    expect(syncOf(backend).nextCard?.word).toBe("f2");
  });

  it("lists the deletions while AnkiConnect is off", () => {
    expect(syncOf(withDeletions(false)).package.deletions).toEqual([katze]);
  });

  it("lists no deletion while AnkiConnect is on, which deletes the notes itself", () => {
    expect(syncOf(withDeletions(true)).package.deletions).toEqual([]);
  });

  it("builds the Anki search that finds the notes of the listed deletions", () => {
    expect(syncOf(withDeletions(false)).package.ankiSearch).toBe(
      '"easyImmerse id:f9"',
    );
  });

  it("shows no AnkiConnect status while AnkiConnect is off", () => {
    expect(syncOf(ankiCache(false))).toMatchObject({ ankiConnect: null });
  });

  it("counts every card of the project", () => {
    expect(syncOf(ankiCache(false))).toMatchObject({ flashcardCount: 3 });
  });

  it("previews the first-made card edited since it was sent while AnkiConnect is on", () => {
    const backend = checked(
      true,
      ankiCache(true, [
        ankiFlashcard("f1", "m1", 1, { sentAtMs: 5 }),
        ankiFlashcard("f2", "m1", 2, { sentAtMs: 5, updatedAtMs: 6 }),
      ]),
    );
    expect(syncOf(backend).nextCard?.word).toBe("f2");
  });

  it("previews the first-made card Anki has no note for while AnkiConnect is on", () => {
    const backend = checked(
      true,
      ankiCache(true, [
        ankiFlashcard("f1", "m1", 1, { sentAtMs: 100 }),
        ankiFlashcard("f2", "m1", 2),
      ]),
    );
    expect(syncOf(backend).nextCard?.word).toBe("f2");
  });

  it("counts no notes to delete while none are listed", () => {
    expect(syncOf(checked(true))).toMatchObject({
      ankiConnect: { pendingDeletionCount: 0 },
    });
  });

  it("counts the notes still to be deleted from Anki", () => {
    const backend = serverCacheWith(
      "listAnkiPendingDeletions",
      "p1",
      {
        deletions: [
          {
            flashcard_id: "f9",
            word: "Katze",
            requested_at_ms: 1,
          },
        ],
      },
      checked(true),
    );
    expect(syncOf(backend)).toMatchObject({
      ankiConnect: { pendingDeletionCount: 1 },
    });
  });

  it("says Anki is connected once it answered the check", () => {
    expect(syncOf(checked(true))).toMatchObject({
      ankiConnect: { connection: "connected" },
    });
  });

  it("says Anki is unreachable once it did not answer the check", () => {
    expect(syncOf(checked(false))).toMatchObject({
      ankiConnect: { connection: "unreachable" },
    });
  });

  it("says Anki refused easyImmerse once it denied the check", () => {
    expect(syncOf(denied)).toMatchObject({
      ankiConnect: { connection: "denied" },
    });
  });

  it("names the origin Anki refused", () => {
    expect(syncOf(denied)).toMatchObject({
      ankiConnect: { deniedOrigin: "tauri://localhost" },
    });
  });

  it("names no refused origin while Anki is connected", () => {
    expect(syncOf(checked(true))).toMatchObject({
      ankiConnect: { deniedOrigin: null },
    });
  });

  it("says the connection is being checked while the check runs", () => {
    expect(syncOf(checking)).toMatchObject({
      ankiConnect: { connection: "checking" },
    });
  });

  it("says the project is syncing with Anki while a send is under way", () => {
    expect(
      syncOf(checked(true), openOverview, actions.ankiSendRequested()),
    ).toMatchObject({ ankiConnect: { isSyncing: true } });
  });

  it("says the project is syncing with Anki while a deletion from Anki is under way", () => {
    const allSent = ankiCache(true, [
      ankiFlashcard("f1", "m1", 1, { sentAtMs: 100 }),
    ]);
    expect(
      syncOf(checked(true, allSent), openOverview, actions.ankiSendRequested()),
    ).toMatchObject({ ankiConnect: { isSyncing: true } });
  });

  it("keeps its result while nothing it reads changes", () => {
    const backend = checked(true);
    const root = { app: stateAfterWithCache(backend), backend };
    expect(selectFlashcardSync(root, "p1")).toBe(
      selectFlashcardSync(root, "p1"),
    );
  });
});
