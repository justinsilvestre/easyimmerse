import type { Flashcard } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { stateAfterWithCache } from "../app/stateAfter.ts";
import { exampleProject } from "../server/exampleProject.ts";
import { serverCacheWith } from "../server/serverCacheWith.ts";
import { ankiCache, ankiFlashcard } from "./ankiTestSupport.ts";
import { selectAnkiFateOfDeletion } from "./selectAnkiFateOfDeletion.ts";

/** The fate of f1's note, in p1 using AnkiConnect or not and listing deletions or not. */
function fateOf(
  flashcard: Flashcard,
  { usesAnkiConnect = false, listsDeletions = true } = {},
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
    ankiCache(usesAnkiConnect, [flashcard]),
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
