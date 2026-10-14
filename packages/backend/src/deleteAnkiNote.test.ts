import { describe, expect, it } from "vitest";
import { AnkiConnectError } from "./ankiConnectError.ts";
import { deleteAnkiNote } from "./deleteAnkiNote.ts";
import { type AnkiAnswers, createFakeAnkiConnect } from "./fakeAnkiConnect.ts";

/** Anki holding the given notes for every flashcard it is asked about. */
const holding = (noteIds: number[]): AnkiAnswers => ({
  findNotes: () => noteIds,
  deleteNotes: () => null,
});

describe("deleteAnkiNote", () => {
  it("looks for the note by the flashcard's id", async () => {
    const anki = createFakeAnkiConnect(holding([]));
    await deleteAnkiNote("f1", anki);
    expect(anki.requests[0]).toEqual({
      action: "findNotes",
      version: 6,
      params: { query: '"easyImmerse id:f1"' },
    });
  });

  it("deletes the note Anki holds for the flashcard", async () => {
    const anki = createFakeAnkiConnect(holding([100]));
    await deleteAnkiNote("f1", anki);
    expect(anki.requests.at(-1)).toEqual({
      action: "deleteNotes",
      version: 6,
      params: { notes: [100] },
    });
  });

  it("succeeds once Anki has deleted the note", async () => {
    const anki = createFakeAnkiConnect(holding([100]));
    expect(await deleteAnkiNote("f1", anki)).toEqual({ data: undefined });
  });

  it("deletes nothing when Anki holds no note for the flashcard", async () => {
    const anki = createFakeAnkiConnect(holding([]));
    await deleteAnkiNote("f1", anki);
    expect(anki.requests.map(({ action }) => action)).toEqual(["findNotes"]);
  });

  it("succeeds when Anki holds no note for the flashcard", async () => {
    const anki = createFakeAnkiConnect(holding([]));
    expect(await deleteAnkiNote("f1", anki)).toEqual({ data: undefined });
  });

  it("fails as Anki not running when it does not answer", async () => {
    expect(await deleteAnkiNote("f1", createFakeAnkiConnect())).toMatchObject({
      error: { code: "anki_unreachable" },
    });
  });

  it("fails with Anki's answer when Anki refuses", async () => {
    const anki = createFakeAnkiConnect({
      ...holding([100]),
      deleteNotes: () => {
        throw new AnkiConnectError({
          kind: "failed",
          message: "collection is not available",
        });
      },
    });
    expect(await deleteAnkiNote("f1", anki)).toMatchObject({
      error: { status: 502, message: "collection is not available" },
    });
  });
});
