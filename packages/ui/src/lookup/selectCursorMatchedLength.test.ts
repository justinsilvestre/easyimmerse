import { lookUpTextAhead } from "@easyimmerse/backend";
import { actions, type ChosenWord } from "@easyimmerse/state";
import type { LookupResponse, LookupResult } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { selectCursorMatchedLength } from "./selectCursorMatchedLength.ts";

const cue = { index: 1, start_ms: 0, end_ms: 1000, text: "The cat sleeps." };

const cat: ChosenWord = {
  word: {
    term: "cat",
    query: {
      text: "cat sleeps.",
      language: "de",
      context: cue.text,
      offset: 4,
    },
  },
  source: { kind: "cue", cue },
  occurrence: { passage: "1", start: 4 },
  anchor: { elementId: "cat" },
};

const answerMatching = (matchedText: string): LookupResponse => ({
  results: [
    {
      matchedText,
      term: matchedText,
      reading: null,
      inflectionChains: [],
      definitions: [],
      frequencies: [],
      pronunciations: [],
    } satisfies LookupResult,
  ],
  kanji: [],
  stylesheets: [],
});

/** A store on the media screen whose lookups answer that "cat sleeps" matched, with the cursor placed on "cat". */
function storeWithCursorOnCat() {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /dictionaries/lookup": answerMatching("cat sleeps"),
  });
  const { store } = createTestAppStore(client);
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  store.dispatch(actions.lookupCursorMoved(cat, "mouse"));
  return store;
}

describe("selectCursorMatchedLength", () => {
  it("is undefined while nothing about the cursor's word is known", () => {
    const store = storeWithCursorOnCat();
    expect(selectCursorMatchedLength(store.getState())).toBeUndefined();
  });

  it("takes the length from the cache before the cursor's own lookup answers", async () => {
    const store = storeWithCursorOnCat();
    if (cat.word.query) await lookUpTextAhead(store.dispatch, cat.word.query);
    expect(selectCursorMatchedLength(store.getState())).toBe(10);
  });

  it("takes the cursor's own length once its hover lookup has answered", () => {
    const store = storeWithCursorOnCat();
    store.dispatch(actions.lookupWordHovered(cat));
    store.dispatch(
      actions.requestSettled(
        "lookup/hover/1",
        {
          kind: "lookupText",
          query: cat.word.query ?? { text: "", language: "de" },
        },
        { ok: true, data: answerMatching("cat") },
      ),
    );
    expect(selectCursorMatchedLength(store.getState())).toBe(3);
  });

  it("is undefined without a cursor", () => {
    const { store } = createTestAppStore();
    expect(selectCursorMatchedLength(store.getState())).toBeUndefined();
  });
});
