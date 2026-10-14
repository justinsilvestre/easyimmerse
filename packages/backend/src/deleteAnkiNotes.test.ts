import { describe, expect, it } from "vitest";
import { AnkiConnectError } from "./ankiConnectError.ts";
import { deleteAnkiNotes } from "./deleteAnkiNotes.ts";
import { createFakeAnkiConnect } from "./fakeAnkiConnect.ts";

describe("deleteAnkiNotes", () => {
  it("asks Anki to delete the notes", async () => {
    const anki = createFakeAnkiConnect({ deleteNotes: () => null });
    await deleteAnkiNotes([100, 101], anki);
    expect(anki.requests.at(-1)).toEqual({
      action: "deleteNotes",
      version: 6,
      params: { notes: [100, 101] },
    });
  });

  it("succeeds once Anki has deleted them", async () => {
    const anki = createFakeAnkiConnect({ deleteNotes: () => null });
    expect(await deleteAnkiNotes([100], anki)).toEqual({ data: undefined });
  });

  it("fails as Anki not running when it does not answer", async () => {
    expect(await deleteAnkiNotes([100], createFakeAnkiConnect())).toMatchObject(
      { error: { code: "anki_unreachable" } },
    );
  });

  it("fails with Anki's answer when Anki refuses", async () => {
    const anki = createFakeAnkiConnect({
      deleteNotes: () => {
        throw new AnkiConnectError({
          kind: "failed",
          message: "collection is not available",
        });
      },
    });
    expect(await deleteAnkiNotes([100], anki)).toMatchObject({
      error: { status: 502, message: "collection is not available" },
    });
  });
});
