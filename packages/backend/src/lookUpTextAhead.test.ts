import { createAppStore, createRecordingEffects } from "@easyimmerse/state";
import type { LookupResponse } from "@easyimmerse/types";
import { afterEach, describe, expect, it } from "vitest";
import type { BackendRequest } from "./backendClient.ts";
import { backendStoreParts } from "./backendStoreParts.ts";
import { configureBackend, resetBackend } from "./configureBackend.ts";
import { lookUpTextAhead } from "./lookUpTextAhead.ts";

const response: LookupResponse = { results: [], kanji: [], stylesheets: [] };

const query = { text: "猫が", language: "ja" };

function createConfiguredStore() {
  const requests: BackendRequest[] = [];
  configureBackend({
    send: async <T>(request: BackendRequest) => {
      requests.push(request);
      return { data: response as T };
    },
  });
  const store = createAppStore(createRecordingEffects(), backendStoreParts);
  return { store, requests };
}

afterEach(resetBackend);

describe("lookUpTextAhead", () => {
  it("resolves the lookup's response", async () => {
    const { store } = createConfiguredStore();
    await expect(lookUpTextAhead(store.dispatch, query)).resolves.toEqual(
      response,
    );
  });

  it("reuses the cached lookup for the same query", async () => {
    const { store, requests } = createConfiguredStore();
    await lookUpTextAhead(store.dispatch, query);
    await lookUpTextAhead(store.dispatch, query);
    expect(requests).toHaveLength(1);
  });
});
