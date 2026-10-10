import { createAppStore, createRecordingEffects } from "@easyimmerse/state";
import type { LookupResponse } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { BackendClient, BackendRequest } from "./backendClient.ts";
import { createBackendStoreParts } from "./backendStoreParts.ts";
import { lookUpTextAhead } from "./lookUpTextAhead.ts";

const response: LookupResponse = { results: [], kanji: [], stylesheets: [] };

const query = { text: "猫が", language: "ja" };

function createConfiguredStore() {
  const requests: BackendRequest[] = [];
  const client: BackendClient = {
    send: async <T>(request: BackendRequest) => {
      requests.push(request);
      return { data: response as T };
    },
  };
  const store = createAppStore(
    createRecordingEffects(),
    createBackendStoreParts(client, null),
  );
  return { store, requests };
}

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
