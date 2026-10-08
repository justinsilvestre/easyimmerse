import { type Passage, passageKey } from "./lookupBatches.ts";

/** How long after a failed batch its passages are left out of batches. */
const retryAfterMs = 5 * 60_000;

/** When each passage whose batch failed may be sent again, by store. */
const retryTimesByStore = new WeakMap<object, Map<string, number>>();

/**
 * Remembers that a batch of passages failed in the store that `store` stands for, such as its dispatch function,
 * and forgets the failures that may already be retried.
 */
export function rememberFailure(store: object, passages: readonly Passage[]) {
  const retryTimes = retryTimesByStore.get(store) ?? new Map();
  retryTimesByStore.set(store, retryTimes);
  for (const [key, retryAt] of retryTimes)
    if (retryAt <= Date.now()) retryTimes.delete(key);
  for (const passage of passages)
    retryTimes.set(passageKey(passage), Date.now() + retryAfterMs);
}

/** Tells whether a batch holding the passage failed in the store lately. */
export function hasFailedLately(store: object, passage: Passage): boolean {
  const retryAt = retryTimesByStore.get(store)?.get(passageKey(passage));
  return retryAt !== undefined && Date.now() < retryAt;
}
