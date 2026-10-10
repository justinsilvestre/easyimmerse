import type { LookupQuery } from "@easyimmerse/types";
import { agingLookupEntries } from "./agingLookups.ts";
import { backendApi, selectRunningBatches } from "./backendApi.ts";
import { hasFailedLately } from "./failedPassages.ts";
import {
  type BackendThunkDispatch,
  fetchLookupBatch,
} from "./fetchLookupBatch.ts";
import {
  batchesOf,
  lookupsInBatchReach,
  type Passage,
  passageKey,
} from "./lookupBatches.ts";

/** How often a caller should prefetch the passages it keeps in range, so that their cached lookups never expire. */
export const prefetchRepeatMs = 60_000;

type BackendState = Parameters<typeof selectRunningBatches>[0];

/**
 * Looks up ahead, in batches, every lookup given, so that hovering or clicking those words later reads the answers from the cache.
 * Each lookup stands for one position that the user could look up, with the passage it lies in, such as a subtitle cue, as its `context`.
 * Lookups that a batch would not answer are left to be made on their own when needed,
 * and passages that are cached, being fetched, or whose batch failed lately are left out.
 * Cached lookups are kept from expiring as long as prefetches that include them run at least every `prefetchRepeatMs`.
 * `now` is the time of the prefetch, in milliseconds since the epoch.
 * The promise resolves once every batch has answered or failed.
 */
export async function prefetchLookups(
  thunkDispatch: BackendThunkDispatch,
  lookups: readonly LookupQuery[],
  now: number,
): Promise<void> {
  const [state, { failedPassages }] = thunkDispatch(
    (_, getState, extra) => [getState(), extra] as const,
  );
  const reachable = lookupsInBatchReach(lookups);
  refreshAgingLookups(thunkDispatch, state, reachable, now);
  const missing = passagesToFetch(state, reachable).filter(
    (passage) => !hasFailedLately(failedPassages.retryTimes, passage, now),
  );
  await Promise.all(
    batchesOf(missing).map((batch) =>
      fetchLookupBatch(thunkDispatch, batch, reachable, now),
    ),
  );
}

/** The passages, in the order first given, that hold a lookup neither cached nor being fetched. */
function passagesToFetch(
  state: BackendState,
  lookups: readonly LookupQuery[],
): Passage[] {
  const running = new Set(
    selectRunningBatches(state).flatMap(({ language, texts }) =>
      texts.map((text) => passageKey({ language, text })),
    ),
  );
  const passages = new Map<string, Passage>();
  for (const lookup of lookups) {
    const passage = { language: lookup.language, text: lookup.context ?? "" };
    const key = passageKey(passage);
    if (isFetchable(state, lookup) && !running.has(key))
      passages.set(key, passage);
  }
  return [...passages.values()];
}

function isFetchable(state: BackendState, lookup: LookupQuery): boolean {
  const entry = backendApi.endpoints.lookupText.select(lookup)(state);
  return entry.isUninitialized || entry.isError;
}

/** Caches afresh the cached lookups that have grown old enough to expire before the next prefetch. */
function refreshAgingLookups(
  dispatch: BackendThunkDispatch,
  state: BackendState,
  lookups: readonly LookupQuery[],
  now: number,
) {
  const aging = agingLookupEntries(state, lookups, now);
  if (aging.length > 0) dispatch(backendApi.util.upsertQueryEntries(aging));
}
