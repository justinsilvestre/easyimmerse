import { createAppStore, createRecordingEffects } from "@easyimmerse/state";
import type {
  BatchLookupRequest,
  BatchLookupResponse,
  LookupQuery,
  LookupResponse,
  LookupResult,
} from "@easyimmerse/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BackendError, BackendRequest } from "./backendClient.ts";
import { backendStoreParts } from "./backendStoreParts.ts";
import { configureBackend, resetBackend } from "./configureBackend.ts";
import { lookUpTextAhead } from "./lookUpTextAhead.ts";
import { prefetchLookups } from "./prefetchLookups.ts";

const language = "ja";

function resultFor(term: string): LookupResult {
  return {
    matchedText: term,
    term,
    reading: null,
    inflectionChains: [],
    definitions: [],
    frequencies: [],
    pronunciations: [],
  };
}

/** Answers each text of a batch with one result at its first character, which matches the whole text. */
function answerBatch({ texts }: BatchLookupRequest): BatchLookupResponse {
  return {
    texts: texts.map((_, index) => ({
      positions: [{ offset: 0, results: [index], kanji: [] }],
    })),
    results: texts.map(resultFor),
    kanji: [],
    stylesheets: [],
  };
}

const emptyResponse: LookupResponse = {
  results: [],
  kanji: [],
  stylesheets: [],
};

/**
 * A store whose backend answers batches with `answerBatch` once `release` is called, and single lookups at once with nothing.
 * `failBatch` gives the error that a batch fails with instead, if any.
 */
function createConfiguredStore(
  failBatch: (request: BatchLookupRequest) => BackendError | null = () => null,
) {
  const requests: BackendRequest[] = [];
  const { promise: released, resolve: release } = Promise.withResolvers<void>();
  configureBackend({
    send: async <T>(request: BackendRequest) => {
      requests.push(request);
      if (request.body?.kind !== "json") return { data: emptyResponse as T };
      await released;
      const batch = request.body.value as BatchLookupRequest;
      const error = failBatch(batch);
      return error ? { error } : { data: answerBatch(batch) as T };
    },
  });
  const store = createAppStore(createRecordingEffects(), backendStoreParts);
  return { store, requests, release };
}

/** Fails with 400 every batch that holds the text. */
const rejectingText =
  (text: string) =>
  (batch: BatchLookupRequest): BackendError | null =>
    batch.texts.includes(text)
      ? { status: 400, message: "The text is not valid" }
      : null;

/** Waits for the store to drop finished batches, which it keeps for no time once they answer. */
const forgetFinishedBatches = () =>
  new Promise((resolve) => setTimeout(resolve, 10));

function lookupAt(context: string, offset: number): LookupQuery {
  return { text: context.slice(offset), language, context, offset };
}

function batchesOf(requests: readonly BackendRequest[]): BatchLookupRequest[] {
  return requests.flatMap((request) =>
    request.body?.kind === "json"
      ? [request.body.value as BatchLookupRequest]
      : [],
  );
}

afterEach(() => {
  resetBackend();
  vi.useRealTimers();
});

describe("prefetchLookups", () => {
  it("sends each passage once in one batch", async () => {
    const { store, requests, release } = createConfiguredStore();
    release();
    await prefetchLookups(store.dispatch, [
      lookupAt("猫が", 0),
      lookupAt("猫が", 1),
      lookupAt("犬", 0),
    ]);
    expect(batchesOf(requests)).toEqual([{ language, texts: ["猫が", "犬"] }]);
  });

  it("fills the cache, so that a later lookup sends no request", async () => {
    const { store, requests, release } = createConfiguredStore();
    release();
    await prefetchLookups(store.dispatch, [lookupAt("猫が", 0)]);
    await lookUpTextAhead(store.dispatch, lookupAt("猫が", 0));
    expect(requests).toHaveLength(1);
  });

  it("caches a position the batch found nothing at as an empty response", async () => {
    const { store, release } = createConfiguredStore();
    release();
    await prefetchLookups(store.dispatch, [lookupAt("猫が", 1)]);
    await expect(
      lookUpTextAhead(store.dispatch, lookupAt("猫が", 1)),
    ).resolves.toEqual(emptyResponse);
  });

  it("leaves a position the batch did not look up to a lookup of its own", async () => {
    const { store, requests, release } = createConfiguredStore();
    release();
    await prefetchLookups(store.dispatch, [
      lookupAt("Hund", 0),
      lookupAt("Hund", 2),
    ]);
    await lookUpTextAhead(store.dispatch, lookupAt("Hund", 2));
    expect(requests).toHaveLength(2);
  });

  it("does not fetch a passage again for a position the batch did not look up", async () => {
    const { store, requests, release } = createConfiguredStore();
    release();
    const lookups = [lookupAt("Hund", 0), lookupAt("Hund", 2)];
    await prefetchLookups(store.dispatch, lookups);
    await forgetFinishedBatches();
    await prefetchLookups(store.dispatch, lookups);
    expect(requests).toHaveLength(1);
  });

  it("does not make a lookup at a position a running batch cannot look up wait for it", async () => {
    const { store, requests } = createConfiguredStore();
    void prefetchLookups(store.dispatch, [lookupAt("Hund", 0)]);
    await lookUpTextAhead(store.dispatch, lookupAt("Hund", 2));
    expect(requests).toHaveLength(2);
  });

  it("does not fetch passages again soon after their batch failed", async () => {
    const { store, requests, release } = createConfiguredStore(() => ({
      status: 404,
      message: "Not found",
    }));
    release();
    const lookups = [lookupAt("猫", 0), lookupAt("犬", 0)];
    await prefetchLookups(store.dispatch, lookups);
    await forgetFinishedBatches();
    await prefetchLookups(store.dispatch, lookups);
    expect(requests).toHaveLength(1);
  });

  it("fetches passages again once a while has passed since their batch failed", async () => {
    vi.useFakeTimers();
    const { store, requests, release } = createConfiguredStore(() => ({
      status: 404,
      message: "Not found",
    }));
    release();
    const lookups = [lookupAt("猫", 0)];
    await prefetchLookups(store.dispatch, lookups);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    await prefetchLookups(store.dispatch, lookups);
    expect(requests).toHaveLength(2);
  });

  it("splits a batch the server rejects to cache the passages it accepts", async () => {
    const { store, requests, release } = createConfiguredStore(
      rejectingText("悪"),
    );
    release();
    await prefetchLookups(
      store.dispatch,
      ["猫", "悪", "犬", "鳥"].map((text) => lookupAt(text, 0)),
    );
    const before = requests.length;
    await lookUpTextAhead(store.dispatch, lookupAt("鳥", 0));
    expect(requests.length).toBe(before);
  });

  it("does not fetch again soon a passage the server rejects on its own", async () => {
    const { store, requests, release } = createConfiguredStore(
      rejectingText("悪"),
    );
    release();
    const lookups = ["猫", "悪"].map((text) => lookupAt(text, 0));
    await prefetchLookups(store.dispatch, lookups);
    await forgetFinishedBatches();
    const before = requests.length;
    await prefetchLookups(store.dispatch, lookups);
    expect(requests.length).toBe(before);
  });

  it("leaves out passages whose lookups are all cached", async () => {
    const { store, requests, release } = createConfiguredStore();
    release();
    await prefetchLookups(store.dispatch, [lookupAt("猫が", 0)]);
    await prefetchLookups(store.dispatch, [
      lookupAt("猫が", 0),
      lookupAt("犬", 0),
    ]);
    expect(batchesOf(requests)[1]).toEqual({ language, texts: ["犬"] });
  });

  it("leaves out passages that a batch being fetched holds", async () => {
    const { store, requests, release } = createConfiguredStore();
    const first = prefetchLookups(store.dispatch, [lookupAt("猫が", 0)]);
    const second = prefetchLookups(store.dispatch, [lookupAt("猫が", 0)]);
    release();
    await Promise.all([first, second]);
    expect(requests).toHaveLength(1);
  });

  it("makes a lookup of a passage being fetched wait for its batch", async () => {
    const { store, requests, release } = createConfiguredStore();
    const prefetched = prefetchLookups(store.dispatch, [lookupAt("猫が", 0)]);
    const hovered = lookUpTextAhead(store.dispatch, lookupAt("猫が", 0));
    release();
    await Promise.all([prefetched, hovered]);
    expect(requests).toHaveLength(1);
  });

  it("answers a lookup that waited for a batch from that batch", async () => {
    const { store, release } = createConfiguredStore();
    const prefetched = prefetchLookups(store.dispatch, [lookupAt("猫が", 0)]);
    const hovered = lookUpTextAhead(store.dispatch, lookupAt("猫が", 0));
    release();
    await prefetched;
    await expect(hovered).resolves.toEqual({
      ...emptyResponse,
      results: [resultFor("猫が")],
    });
  });

  it("splits more than a batch's limit of passages into several batches", async () => {
    const { store, requests, release } = createConfiguredStore();
    release();
    const passages = Array.from({ length: 101 }, (_, index) => `猫${index}`);
    await prefetchLookups(
      store.dispatch,
      passages.map((passage) => lookupAt(passage, 0)),
    );
    expect(batchesOf(requests).map((batch) => batch.texts.length)).toEqual([
      100, 1,
    ]);
  });

  it("leaves out passages longer than a batch allows", async () => {
    const { store, requests, release } = createConfiguredStore();
    release();
    await prefetchLookups(store.dispatch, [lookupAt("猫".repeat(2001), 0)]);
    expect(requests).toHaveLength(0);
  });

  it("keeps passages that stay in range cached past the cache's lifetime", async () => {
    vi.useFakeTimers();
    const { store, requests, release } = createConfiguredStore();
    release();
    const lookups = [lookupAt("猫が", 0)];
    await prefetchLookups(store.dispatch, lookups);
    for (let minute = 0; minute < 10; minute++) {
      await vi.advanceTimersByTimeAsync(60_000);
      await prefetchLookups(store.dispatch, lookups);
    }
    expect(requests).toHaveLength(1);
  });
});
