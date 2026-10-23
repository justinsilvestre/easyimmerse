import type { BackendResult } from "@easyimmerse/backend";
import type { LookupQuery, LookupResponse } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { exampleResults } from "../lookup/exampleLookup.ts";
import { createPageLookup, type PageLookupView } from "./createPageLookup.ts";
import type { PageWord } from "./pageWordAtPoint.ts";

const response: LookupResponse = {
  results: [...exampleResults],
  kanji: [],
  stylesheets: [],
};

const viewport = { width: 800, height: 600 };

function rectAt(left: number, top = 10) {
  return { top, bottom: top + 10, left, right: left + 40 };
}

/** A word drawn at `left`, which `moveTo` moves elsewhere, as a scroll of the page would. */
function wordOf(term: string, left = 0) {
  let rect = rectAt(left);
  const word: PageWord = {
    term,
    query: { text: term, language: "de", context: `Der ${term}`, offset: 4 },
    rect,
    measure: () => rect,
  };
  return Object.assign(word, {
    moveTo: (moved: ReturnType<typeof rectAt>) => {
      rect = moved;
    },
  });
}

/** Builds a page lookup whose words lie at the x coordinates the map gives, and records every view it shows. */
function createRecordedLookup(
  words: Record<number, PageWord>,
  lookUp: (
    query: LookupQuery,
  ) => Promise<BackendResult<LookupResponse>> = async () => ({
    data: response,
  }),
) {
  const views: (PageLookupView | null)[] = [];
  const lookup = createPageLookup({
    wordAt: async ({ x }) => words[x] ?? null,
    lookUp,
    show: (view) => views.push(view),
  });
  return { lookup, views };
}

describe("createPageLookup", () => {
  it("shows the word as being looked up at first", async () => {
    const { lookup, views } = createRecordedLookup({ 1: wordOf("Hund") });
    await lookup.pointAt({ x: 1, y: 0 });
    expect(views[0]?.outcome).toEqual({ kind: "pending" });
  });

  it("shows the server's answer once it comes", async () => {
    const { lookup, views } = createRecordedLookup({ 1: wordOf("Hund") });
    await lookup.pointAt({ x: 1, y: 0 });
    expect(views.at(-1)?.outcome).toEqual({ kind: "answered", response });
  });

  it("shows a failure when the lookup fails", async () => {
    const { lookup, views } = createRecordedLookup(
      { 1: wordOf("Hund") },
      async () => ({ error: { status: "NETWORK", message: "down" } }),
    );
    await lookup.pointAt({ x: 1, y: 0 });
    expect(views.at(-1)?.outcome).toEqual({ kind: "failed" });
  });

  it("stands at the word", async () => {
    const { lookup, views } = createRecordedLookup({ 1: wordOf("Hund", 50) });
    await lookup.pointAt({ x: 1, y: 0 });
    expect(views.at(-1)?.anchor).toEqual(rectAt(50));
  });

  it("shows nothing for a point on no word", async () => {
    const { lookup, views } = createRecordedLookup({});
    await lookup.pointAt({ x: 1, y: 0 });
    expect(views).toEqual([]);
  });

  it("does not look up the word it shows again", async () => {
    const queries: LookupQuery[] = [];
    const { lookup } = createRecordedLookup(
      { 1: wordOf("Hund"), 2: wordOf("Hund") },
      async (query) => {
        queries.push(query);
        return { data: response };
      },
    );
    await lookup.pointAt({ x: 1, y: 0 });
    await lookup.pointAt({ x: 2, y: 0 });
    expect(queries).toHaveLength(1);
  });

  it("moves to another word", async () => {
    const { lookup, views } = createRecordedLookup({
      1: wordOf("Hund"),
      2: wordOf("Katze", 80),
    });
    await lookup.pointAt({ x: 1, y: 0 });
    await lookup.pointAt({ x: 2, y: 0 });
    expect(views.at(-1)?.term).toBe("Katze");
  });

  it("ignores the answer for a word it has moved away from", async () => {
    let answerFirst = () => {};
    const { lookup, views } = createRecordedLookup(
      { 1: wordOf("Hund"), 2: wordOf("Katze") },
      (query) =>
        query.text === "Hund"
          ? new Promise((resolve) => {
              answerFirst = () => resolve({ data: response });
            })
          : Promise.resolve({ data: response }),
    );
    const first = lookup.pointAt({ x: 1, y: 0 });
    await lookup.pointAt({ x: 2, y: 0 });
    answerFirst();
    await first;
    expect(views.at(-1)?.term).toBe("Katze");
  });

  it("keeps its size when it moves to another word", async () => {
    const { lookup, views } = createRecordedLookup({
      1: wordOf("Hund"),
      2: wordOf("Katze"),
    });
    await lookup.pointAt({ x: 1, y: 0 });
    lookup.toggleSize();
    await lookup.pointAt({ x: 2, y: 0 });
    expect(views.at(-1)?.size).toBe("expanded");
  });

  it("looks up a searched term in the language of the word it shows", async () => {
    const queries: LookupQuery[] = [];
    const { lookup } = createRecordedLookup(
      { 1: wordOf("Hund") },
      async (query) => {
        queries.push(query);
        return { data: response };
      },
    );
    await lookup.pointAt({ x: 1, y: 0 });
    await lookup.search(" Katze ");
    expect(queries.at(-1)).toEqual({ text: "Katze", language: "de" });
  });

  it("closes", async () => {
    const { lookup, views } = createRecordedLookup({ 1: wordOf("Hund") });
    await lookup.pointAt({ x: 1, y: 0 });
    lookup.close();
    expect(views.at(-1)).toBeNull();
  });

  it("opens again on the word it showed before it closed", async () => {
    const { lookup, views } = createRecordedLookup({ 1: wordOf("Hund") });
    await lookup.pointAt({ x: 1, y: 0 });
    lookup.close();
    await lookup.pointAt({ x: 1, y: 0 });
    expect(views.at(-1)?.term).toBe("Hund");
  });

  describe("once the page scrolls", () => {
    it("follows the word", async () => {
      const word = wordOf("Hund");
      const { lookup, views } = createRecordedLookup({ 1: word });
      await lookup.pointAt({ x: 1, y: 0 });
      word.moveTo(rectAt(0, 200));
      lookup.reanchor(viewport);
      expect(views.at(-1)?.anchor).toEqual(rectAt(0, 200));
    });

    it("closes when the word has left the window", async () => {
      const word = wordOf("Hund");
      const { lookup, views } = createRecordedLookup({ 1: word });
      await lookup.pointAt({ x: 1, y: 0 });
      word.moveTo(rectAt(0, -30));
      lookup.reanchor(viewport);
      expect(views.at(-1)).toBeNull();
    });

    it("closes when the word is no longer on the page", async () => {
      const word = wordOf("Hund");
      const { lookup, views } = createRecordedLookup({ 1: word });
      await lookup.pointAt({ x: 1, y: 0 });
      word.moveTo({ top: 0, bottom: 0, left: 0, right: 0 });
      lookup.reanchor(viewport);
      expect(views.at(-1)).toBeNull();
    });

    it("shows nothing while closed", () => {
      const { lookup, views } = createRecordedLookup({});
      lookup.reanchor(viewport);
      expect(views).toEqual([]);
    });
  });
});
