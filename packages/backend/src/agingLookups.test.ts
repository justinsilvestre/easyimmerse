import { createAppStore, createRecordingEffects } from "@easyimmerse/state";
import type {
  BatchLookupRequest,
  BatchLookupResponse,
  LookupQuery,
} from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { agingLookupEntries, refreshAfterMs } from "./agingLookups.ts";
import { backendApi } from "./backendApi.ts";
import type { BackendClient, BackendRequest } from "./backendClient.ts";
import { createBackendStoreParts } from "./backendStoreParts.ts";
import type { BackendThunkDispatch } from "./fetchLookupBatch.ts";
import { prefetchLookups } from "./prefetchLookups.ts";

const lookup: LookupQuery = {
  text: "猫",
  language: "ja",
  context: "猫",
  offset: 0,
};

/** A backend that answers every batch with nothing found in any of its texts. */
const emptyBatchClient: BackendClient = {
  send: async <T>(request: BackendRequest) => {
    const { texts } = (
      request.body?.kind === "json" ? request.body.value : { texts: [] }
    ) as BatchLookupRequest;
    const answer: BatchLookupResponse = {
      texts: texts.map(() => ({ positions: [] })),
      results: [],
      kanji: [],
      stylesheets: [],
    };
    return { data: answer as T };
  },
};

/** The backend state after one prefetch of `lookup`, and the time its cached answer was fulfilled. */
async function prefetchedOnce() {
  const store = createAppStore(
    createRecordingEffects(),
    createBackendStoreParts(emptyBatchClient, null),
  );
  const dispatch = store.dispatch as unknown as BackendThunkDispatch;
  await prefetchLookups(dispatch, [lookup], Date.UTC(2026, 9, 10));
  const state = dispatch((_, getState) => getState());
  const entry = backendApi.endpoints.lookupText.select(lookup)(state);
  return { state, fulfilledAt: entry.fulfilledTimeStamp ?? 0 };
}

describe("agingLookupEntries", () => {
  it("returns nothing for a cached lookup younger than the refresh age", async () => {
    const { state, fulfilledAt } = await prefetchedOnce();
    const now = fulfilledAt + refreshAfterMs - 1;
    expect(agingLookupEntries(state, [lookup], now)).toEqual([]);
  });

  it("returns the entry of a cached lookup that has reached the refresh age", async () => {
    const { state, fulfilledAt } = await prefetchedOnce();
    const now = fulfilledAt + refreshAfterMs;
    expect(
      agingLookupEntries(state, [lookup], now).map((entry) => entry.arg),
    ).toEqual([lookup]);
  });
});
