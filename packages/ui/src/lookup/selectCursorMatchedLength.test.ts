import { lookUpTextAhead } from "@easyimmerse/backend";
import { actions, type ChosenWord } from "@easyimmerse/state";
import type {
  LookupQuery,
  LookupResponse,
  LookupResult,
} from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { selectCursorMatchedLength } from "./selectCursorMatchedLength.ts";

const cue = { index: 1, start_ms: 0, end_ms: 1000, text: "The cat sleeps." };

const catQuery: LookupQuery = {
  text: "cat sleeps.",
  language: "de",
  context: cue.text,
  offset: 4,
};

const cat: ChosenWord = {
  word: { term: "cat", query: catQuery },
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

/** A store on the media screen whose lookups answer that "cat sleeps" matched, with the cursor placed on the word given. */
function storeWithCursorOn(word: ChosenWord = cat) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /dictionaries/lookup": answerMatching("cat sleeps"),
  });
  const { store } = createTestAppStore(client);
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  store.dispatch(actions.lookupCursorMoved(word, "mouse"));
  return store;
}

describe("selectCursorMatchedLength", () => {
  it("is undefined while nothing about the cursor's word is known", () => {
    const store = storeWithCursorOn();
    expect(selectCursorMatchedLength(store.getState())).toBeUndefined();
  });

  it("takes the length from the cache before the cursor's own lookup answers", async () => {
    const store = storeWithCursorOn();
    await lookUpTextAhead(store.dispatch, catQuery);
    expect(selectCursorMatchedLength(store.getState())).toBe(10);
  });

  it("takes the cursor's own length once its hover lookup has answered", () => {
    const store = storeWithCursorOn();
    store.dispatch(actions.lookupWordHovered(cat));
    store.dispatch(
      actions.requestSettled(
        "lookup/hover/1",
        { kind: "lookupText", query: catQuery },
        { ok: true, data: answerMatching("cat") },
      ),
    );
    expect(selectCursorMatchedLength(store.getState())).toBe(3);
  });

  it("is null when the cursor's word has nothing to look up", () => {
    const store = storeWithCursorOn({
      ...cat,
      word: { term: "cat", query: null },
    });
    expect(selectCursorMatchedLength(store.getState())).toBeNull();
  });

  it("is undefined without a cursor", () => {
    const { store } = createTestAppStore();
    expect(selectCursorMatchedLength(store.getState())).toBeUndefined();
  });
});
