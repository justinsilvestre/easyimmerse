import type { BackendThunkDispatch } from "./fetchLookupBatch.ts";
import { type Passage, passageKey } from "./lookupBatches.ts";

/** How long after a failed batch its passages are left out of batches. */
const retryAfterMs = 5 * 60_000;

/** When each passage whose batch failed may be sent again, by `passageKey`, in milliseconds since the epoch. */
export type RetryTimes = Readonly<Record<string, number>>;

/** The failed passages of one store, which its prefetches read and replace. */
export type FailedPassages = { retryTimes: RetryTimes };

/** Returns the retry times with the passages of a batch that failed at `now`, and without the failures that may already be retried. */
export function withFailure(
  retryTimes: RetryTimes,
  passages: readonly Passage[],
  now: number,
): RetryTimes {
  const pending = Object.entries(retryTimes).filter(
    ([, retryAt]) => now < retryAt,
  );
  const failed = passages.map((passage) => [
    passageKey(passage),
    now + retryAfterMs,
  ]);
  return Object.fromEntries([...pending, ...failed]);
}

/** Tells whether a batch holding the passage failed less than five minutes before `now`. */
export function hasFailedLately(
  retryTimes: RetryTimes,
  passage: Passage,
  now: number,
): boolean {
  const retryAt = retryTimes[passageKey(passage)];
  return retryAt !== undefined && now < retryAt;
}

/** Records in the store's failed passages that a batch of these passages failed at `now`. */
export function rememberFailure(
  dispatch: BackendThunkDispatch,
  passages: readonly Passage[],
  now: number,
): void {
  dispatch((_, __, { failedPassages }) => {
    failedPassages.retryTimes = withFailure(
      failedPassages.retryTimes,
      passages,
      now,
    );
  });
}
