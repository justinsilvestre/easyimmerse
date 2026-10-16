import type { Flashcard } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { stateAfterWithCache } from "../app/stateAfter.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { exampleProject } from "../server/exampleProject.ts";
import { serverCacheWith } from "../server/serverCacheWith.ts";
import { ankiCache, ankiFlashcard } from "./ankiTestSupport.ts";
import { selectAnkiFateOfDeletion } from "./selectAnkiFateOfDeletion.ts";

/** A server cache whose last check of the connection to Anki found it running or not, or that holds no check when null. */
function checkedCache(
  isConnected: boolean | null,
  backend: ServerCacheSlice,
): ServerCacheSlice {
  if (isConnected === null) return backend;
  return serverCacheWith(
    "checkAnkiConnection",
    undefined,
    isConnected
      ? { connected: true, version: 6 }
      : { connected: false, isDenied: false as const },
    backend,
  );
}

/** The fate of f1's note, in p1 using AnkiConnect or not and listing deletions or not, with Anki found running or not. */
function fateOf(
  flashcard: Flashcard,
  {
    usesAnkiConnect = false,
    listsDeletions = true,
    isConnected = true as boolean | null,
  } = {},
) {
  const project = exampleProject("p1");
  const backend = serverCacheWith(
    "getProject",
    "p1",
    {
      ...project,
      uses_anki_connect: usesAnkiConnect,
      settings: { ...project.settings, lists_anki_deletions: listsDeletions },
    },
    checkedCache(isConnected, ankiCache(usesAnkiConnect, [flashcard])),
  );
  return selectAnkiFateOfDeletion(
    { app: stateAfterWithCache(backend), backend },
    "p1",
    "f1",
  );
}

const exported = ankiFlashcard("f1", "m1", 1, { exportedAtMs: 5 });

describe("selectAnkiFateOfDeletion", () => {
  it("finds no note of a flashcard that never reached Anki", () => {
    expect(fateOf(ankiFlashcard("f1", "m1", 1))?.note).toBe("none");
  });

  it("has AnkiConnect delete the note while it is on", () => {
    expect(fateOf(exported, { usesAnkiConnect: true })?.note).toBe(
      "deletedByAnkiConnect",
    );
  });

  it("has AnkiConnect delete the note of a flashcard only sent", () => {
    const sent = ankiFlashcard("f1", "m1", 1, { sentAtMs: 5 });
    expect(fateOf(sent, { usesAnkiConnect: true })?.note).toBe(
      "deletedByAnkiConnect",
    );
  });

  it("has AnkiConnect delete the note later while the last check found Anki unreachable", () => {
    expect(
      fateOf(exported, { usesAnkiConnect: true, isConnected: false })?.note,
    ).toBe("deletedByAnkiConnectLater");
  });

  it("has AnkiConnect delete the note later while Anki has not been checked", () => {
    expect(
      fateOf(exported, { usesAnkiConnect: true, isConnected: null })?.note,
    ).toBe("deletedByAnkiConnectLater");
  });

  it("leaves the note in Anki, listed, while the project lists deletions", () => {
    expect(fateOf(exported)?.note).toBe("staysListed");
  });

  it("leaves the note in Anki, unlisted, while the project does not list deletions", () => {
    expect(fateOf(exported, { listsDeletions: false })?.note).toBe("stays");
  });

  it("tells that a package held the flashcard", () => {
    expect(fateOf(exported)?.wasPackaged).toBe(true);
  });

  it("tells that no package held a flashcard never exported", () => {
    expect(fateOf(ankiFlashcard("f1", "m1", 1))?.wasPackaged).toBe(false);
  });

  it("is null while the flashcard is not cached", () => {
    const backend = ankiCache(false, []);
    expect(
      selectAnkiFateOfDeletion(
        { app: stateAfterWithCache(backend), backend },
        "p1",
        "f1",
      ),
    ).toBeNull();
  });
});
