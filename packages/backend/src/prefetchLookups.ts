import type { AppDispatch } from "@easyimmerse/state";
import type { LookupQuery } from "@easyimmerse/types";
import type { UnknownAction } from "redux";
import type { ThunkDispatch } from "redux-thunk";
import {
  backendApi,
  lookupCacheSeconds,
  selectRunningBatches,
} from "./backendApi.ts";
import { lookupResponseAt } from "./lookupResponseAt.ts";

/** The most texts one batch lookup may hold. */
const maxBatchTexts = 100;
/** The most characters one text of a batch lookup may hold. */
const maxBatchTextCharacters = 2000;
/** How old a cached lookup grows before a prefetch caches it afresh, so that it outlives the next prefetch. */
const refreshAfterMs = (lookupCacheSeconds * 1000) / 2;

type BackendState = Parameters<typeof selectRunningBatches>[0];
type BackendThunkDispatch = ThunkDispatch<BackendState, unknown, UnknownAction>;

/**
 * Looks up ahead, in batches, every lookup given, so that hovering or clicking those words later reads the answers from the cache.
 * Each lookup stands for one position that the user could look up, with the passage it lies in, such as a subtitle cue, as its `context`.
 * Passages whose lookups are cached or being fetched already are left out, and cached lookups are kept from expiring
 * as long as prefetches that include them run more often than every `lookupCacheSeconds / 2` seconds.
 * The promise resolves once every batch has answered or failed; a lookup whose batch failed is made on its own when it is needed.
 */
export async function prefetchLookups(
  dispatch: AppDispatch,
  lookups: readonly LookupQuery[],
): Promise<void> {
  // The app store's dispatch is typed for app actions only; thunks reach it through the middleware chain.
  const thunkDispatch = dispatch as unknown as BackendThunkDispatch;
  const state = thunkDispatch((_, getState) => getState());
  refreshAgingLookups(thunkDispatch, state, lookups);
  const missing = passagesToFetch(state, lookups);
  await Promise.all(
    chunksOf(missing, maxBatchTexts).map((batch) =>
      fetchBatch(thunkDispatch, batch, lookups),
    ),
  );
}

type Passage = { language: string; text: string };

/** The passages, in the order first given, that hold a lookup neither cached nor being fetched. */
function passagesToFetch(
  state: BackendState,
  lookups: readonly LookupQuery[],
): Passage[] {
  const running = selectRunningBatches(state);
  const isRunning = (lookup: LookupQuery) =>
    running.some(
      (batch) =>
        batch.language === lookup.language &&
        batch.texts.includes(lookup.context ?? ""),
    );
  const passages = new Map<string, Passage>();
  for (const lookup of lookups) {
    const { context, language } = lookup;
    if (context === undefined || !fitsBatch(context)) continue;
    const entry = backendApi.endpoints.lookupText.select(lookup)(state);
    const isFetchable = entry.isUninitialized || entry.isError;
    if (isFetchable && !isRunning(lookup))
      passages.set(passageKey(language, context), { language, text: context });
  }
  return [...passages.values()];
}

/** Caches afresh the cached lookups that have grown old enough to expire before the next prefetch. */
function refreshAgingLookups(
  dispatch: BackendThunkDispatch,
  state: BackendState,
  lookups: readonly LookupQuery[],
) {
  const aging = lookups.flatMap((lookup) => {
    const entry = backendApi.endpoints.lookupText.select(lookup)(state);
    const age = Date.now() - (entry.fulfilledTimeStamp ?? Date.now());
    return entry.isSuccess && age >= refreshAfterMs
      ? [
          {
            endpointName: "lookupText" as const,
            arg: lookup,
            value: entry.data,
          },
        ]
      : [];
  });
  if (aging.length > 0) dispatch(backendApi.util.upsertQueryEntries(aging));
}

/** Fetches one batch of passages of one language, then caches the lookup of every given position in them. */
async function fetchBatch(
  dispatch: BackendThunkDispatch,
  passages: readonly Passage[],
  lookups: readonly LookupQuery[],
) {
  const language = passages[0]?.language ?? "";
  const texts = passages.map((passage) => passage.text);
  const request = backendApi.endpoints.lookupTexts.initiate(
    { language, texts },
    { subscribe: false },
  );
  const answer = await dispatch(request)
    .unwrap()
    .catch(() => null);
  if (answer === null) return;
  const entries = lookups.flatMap((lookup) => {
    const index =
      lookup.language === language ? texts.indexOf(lookup.context ?? "") : -1;
    const value =
      index < 0 ? null : lookupResponseAt(answer, index, lookup.offset ?? 0);
    return value
      ? [{ endpointName: "lookupText" as const, arg: lookup, value }]
      : [];
  });
  dispatch(backendApi.util.upsertQueryEntries(entries));
}

/** Splits passages into batches of at most `size`, each of one language. */
function chunksOf(passages: readonly Passage[], size: number): Passage[][] {
  const byLanguage = Map.groupBy(passages, (passage) => passage.language);
  return [...byLanguage.values()].flatMap((group) =>
    Array.from({ length: Math.ceil(group.length / size) }, (_, index) =>
      group.slice(index * size, (index + 1) * size),
    ),
  );
}

function fitsBatch(text: string): boolean {
  return [...text].length <= maxBatchTextCharacters;
}

function passageKey(language: string, text: string): string {
  return `${language}\n${text}`;
}
