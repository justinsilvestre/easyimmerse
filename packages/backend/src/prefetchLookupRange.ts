import type { AppDispatch } from "@easyimmerse/state";
import type { LookupQuery } from "@easyimmerse/types";
import { backendApi } from "./backendApi.ts";
import { prefetchLookups } from "./prefetchLookups.ts";

/** The lookups of the passages near the user, such as the subtitle cues about to be shown, in one language. */
export type LookupRange = { language: string; lookups: readonly LookupQuery[] };

/** Names a range by its language and its passages, which decide its lookups, rather than by every lookup. */
export function lookupRangeKey({ language, lookups }: LookupRange): string {
  const passages = new Set(
    lookups.map((lookup) => lookup.context ?? lookup.text),
  );
  return [language, ...passages].join("\u0000");
}

const withPrefetch = backendApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Keeps the lookups of a range cached, through `prefetchLookups`: they are looked up when a component subscribes to a range,
     * again at the subscription's polling interval, and again when the dictionaries change. A range no one subscribes to is dropped at once.
     */
    prefetchLookupRange: build.query<null, LookupRange>({
      queryFn: async ({ lookups }, api) => {
        // The thunk's dispatch reaches the same store, whose app dispatch `prefetchLookups` takes.
        await prefetchLookups(api.dispatch as unknown as AppDispatch, lookups);
        return { data: null };
      },
      serializeQueryArgs: ({ queryArgs }) => lookupRangeKey(queryArgs),
      providesTags: ["Dictionaries"],
      keepUnusedDataFor: 0,
    }),
  }),
});

export const prefetchLookupRangeEndpoint =
  withPrefetch.endpoints.prefetchLookupRange;
export const { usePrefetchLookupRangeQuery } = withPrefetch;
