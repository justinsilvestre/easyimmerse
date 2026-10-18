import { createAppStore, createRecordingEffects } from "@easyimmerse/state";
import type { BatchLookupRequest, LookupQuery } from "@easyimmerse/types";
import type { UnknownAction } from "redux";
import type { ThunkDispatch } from "redux-thunk";
import { describe, expect, it, vi } from "vitest";
import { backendApi } from "./backendApi.ts";
import type { BackendClient, BackendRequest } from "./backendClient.ts";
import { createBackendStoreParts } from "./backendStoreParts.ts";
import {
  lookupRangeKey,
  prefetchLookupRangeEndpoint,
} from "./prefetchLookupRange.ts";

type BackendDispatch = ThunkDispatch<unknown, unknown, UnknownAction>;

const lookupAt = (context: string, offset: number): LookupQuery => ({
  text: context.slice(offset),
  language: "ja",
  context,
  offset,
});

const range = {
  language: "ja",
  lookups: [lookupAt("猫が", 0), lookupAt("猫が", 1)],
};

/** A store whose backend answers every batch with nothing found, and records the batches. */
function createBatchStore() {
  const batches: BackendRequest[] = [];
  const client: BackendClient = {
    send: async <T>(request: BackendRequest) => {
      batches.push(request);
      const { texts } = (
        request.body?.kind === "json" ? request.body.value : { texts: [] }
      ) as BatchLookupRequest;
      return {
        data: {
          texts: texts.map(() => ({ positions: [] })),
          results: [],
          kanji: [],
          stylesheets: [],
        } as T,
      };
    },
  };
  const store = createAppStore(
    createRecordingEffects(),
    createBackendStoreParts(client, null),
  );
  return {
    dispatch: store.dispatch as BackendDispatch,
    getState: store.getState,
    batches,
  };
}

describe("lookupRangeKey", () => {
  it("names a range by its language and its passages", () => {
    expect(lookupRangeKey(range)).toBe("ja\u0000猫が");
  });
});

describe("prefetchLookupRange", () => {
  it("looks up the range ahead once subscribed", async () => {
    const { dispatch, batches } = createBatchStore();
    dispatch(prefetchLookupRangeEndpoint.initiate(range));
    await vi.waitFor(() => expect(batches).toHaveLength(1));
  });

  it("looks up a new range ahead once the range changes", async () => {
    const { dispatch, batches } = createBatchStore();
    await dispatch(prefetchLookupRangeEndpoint.initiate(range));
    dispatch(
      prefetchLookupRangeEndpoint.initiate({
        language: "ja",
        lookups: [lookupAt("犬", 0)],
      }),
    );
    await vi.waitFor(() => expect(batches).toHaveLength(2));
  });

  it("looks up the range ahead again when the dictionaries change", async () => {
    const { dispatch, getState } = createBatchStore();
    await dispatch(prefetchLookupRangeEndpoint.initiate(range));
    const requestIdOf = () =>
      prefetchLookupRangeEndpoint.select(range)(getState() as never).requestId;
    const first = requestIdOf();
    dispatch(backendApi.util.invalidateTags(["Dictionaries"]));
    await vi.waitFor(() => expect(requestIdOf()).not.toBe(first));
  });
});
