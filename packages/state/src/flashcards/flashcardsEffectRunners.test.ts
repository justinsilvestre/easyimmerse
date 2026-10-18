import type { LookupResult } from "@easyimmerse/types";
import { describe, expect, it, vi } from "vitest";
import { actions } from "../app/appAction.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import { cat, requestFlashcard } from "../screen/lookup/lookupTestSupport.ts";

const result: LookupResult = {
  matchedText: "cat",
  term: "Katze",
  reading: null,
  inflectionChains: [],
  definitions: [
    {
      dictionaryId: "d1",
      entry: { definitions: [{ kind: "text", text: " cat " }] },
    },
  ] as LookupResult["definitions"],
  frequencies: [],
  pronunciations: [],
};

describe("flashcardsEffectRunners", () => {
  it("saves a flashcard from a word with the fields the platform wrote from its lookup", async () => {
    const server = createFakeServerStoreParts();
    const store = createAppStore(createRecordingEffects(), server);
    store.dispatch(actions.openMediaFileRequested("p1", "m1"));
    store.dispatch(requestFlashcard(cat));
    const query = cat.word.query;
    if (query === null) throw new Error("The word has no query.");
    server.respond(
      { kind: "lookupText", query },
      { ok: true, data: { results: [result], kanji: [], stylesheets: [] } },
    );
    await vi.waitFor(() =>
      expect(
        server.sentRequests.find(({ kind }) => kind === "saveFlashcard"),
      ).toMatchObject({
        draft: { content: { word: "Katze", l1_definition: "cat" } },
      }),
    );
  });
});
