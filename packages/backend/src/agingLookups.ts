import type { LookupQuery } from "@easyimmerse/types";
import {
  backendApi,
  lookupCacheSeconds,
  type selectRunningBatches,
} from "./backendApi.ts";

/** How old a cached lookup grows before a prefetch caches it afresh, so that it outlives the next prefetch. */
export const refreshAfterMs = (lookupCacheSeconds * 1000) / 2;

type BackendState = Parameters<typeof selectRunningBatches>[0];

/** Returns, as cache entries to write again, the cached lookups that at `now` have grown old enough to expire before the next prefetch. */
export function agingLookupEntries(
  state: BackendState,
  lookups: readonly LookupQuery[],
  now: number,
) {
  return lookups.flatMap((lookup) => {
    const entry = backendApi.endpoints.lookupText.select(lookup)(state);
    const fulfilledAt = entry.fulfilledTimeStamp ?? now;
    const isAging = entry.isSuccess && now - fulfilledAt >= refreshAfterMs;
    return isAging
      ? [
          {
            endpointName: "lookupText" as const,
            arg: lookup,
            value: entry.data,
          },
        ]
      : [];
  });
}
