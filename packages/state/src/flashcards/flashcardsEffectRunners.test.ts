import type { LookupResult } from "@easyimmerse/types";
import { describe, expect, it, vi } from "vitest";
import { actions } from "../app/appAction.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import { cat, requestFlashcard } from "../screen/lookup/lookupTestSupport.ts";
import {
  fressen,
  withExampleCues,
} from "../screen/mediaScreen/cueFlashcardTestSupport.ts";

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

const flashcardIdPattern = /^[0-9a-f]{32}$/;

/** A store on the media screen of m1, with the example cues cached and the lookup cursor on "fressen" when `onWord` says. */
function storeOnMediaScreen(onWord: boolean) {
  const server = createFakeServerStoreParts(null, withExampleCues);
  const store = createAppStore(createRecordingEffects(), server);
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  if (onWord) store.dispatch(actions.lookupCursorMoved(fressen, "mouse"));
  return { server, store };
}

const sentSave = (server: ReturnType<typeof createFakeServerStoreParts>) =>
  server.sentRequests.find(({ kind }) => kind === "saveFlashcard");

describe("flashcardsEffectRunners", () => {
  it("saves a flashcard for the lookup cursor's word under a fresh id on the C key, once its lookup answers", async () => {
    const { server, store } = storeOnMediaScreen(true);
    store.dispatch(actions.lookupCursorFlashcardRequested("save"));
    const query = fressen.word.query;
    if (query === null) throw new Error("The word has no query.");
    server.respond(
      { kind: "lookupText", query },
      { ok: true, data: { results: [], kanji: [], stylesheets: [] } },
    );
    await vi.waitFor(() =>
      expect(sentSave(server)).toMatchObject({
        flashcardId: expect.stringMatching(flashcardIdPattern),
        draft: { cue_index: 3, content: { word: "fressen" } },
      }),
    );
  });

  it("saves a flashcard for no word under a fresh id on the C key with no cursor", () => {
    const { server, store } = storeOnMediaScreen(false);
    store.dispatch(actions.lookupCursorFlashcardRequested("save"));
    expect(sentSave(server)).toMatchObject({
      flashcardId: expect.stringMatching(flashcardIdPattern),
      draft: { content: { word: "" } },
    });
  });

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
