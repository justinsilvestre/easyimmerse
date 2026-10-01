import { configureStore } from "@reduxjs/toolkit";
import { afterEach, describe, expect, it } from "vitest";
import { backendApi } from "./backendApi.ts";
import type { BackendClient, BackendRequest } from "./backendClient.ts";
import { configureBackend, resetBackend } from "./configureBackend.ts";

function createRecordingClient(): BackendClient & {
  requests: BackendRequest[];
} {
  const requests: BackendRequest[] = [];
  return {
    requests,
    send: async <T>(request: BackendRequest) => {
      requests.push(request);
      return { data: { projects: [] } as T };
    },
  };
}

function createStore() {
  return configureStore({
    reducer: { [backendApi.reducerPath]: backendApi.reducer },
    middleware: (getDefault) => getDefault().concat(backendApi.middleware),
  });
}

const srtRequest = {
  source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHi" },
  format: null,
} as const;

afterEach(resetBackend);

describe("backendApi", () => {
  it("throws a clear error when no client is configured", async () => {
    const store = createStore();
    const result = await store.dispatch(
      backendApi.endpoints.listProjects.initiate(),
    );
    expect(result.error).toMatchObject({
      message: expect.stringContaining("No backend client is configured"),
    });
  });

  it("sends GET /projects for listProjects", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(backendApi.endpoints.listProjects.initiate());
    expect(client.requests).toEqual([{ method: "GET", path: "/projects" }]);
  });

  it("returns the client's data for listProjects", async () => {
    configureBackend(createRecordingClient());
    const result = await createStore().dispatch(
      backendApi.endpoints.listProjects.initiate(),
    );
    expect(result.data).toEqual({ projects: [] });
  });

  it("carries the offline operation for parseTimedText", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.parseTimedText.initiate(srtRequest),
    );
    expect(client.requests[0]?.offlineOperation).toEqual({
      kind: "parseTimedText",
      request: srtRequest,
    });
  });

  it("sends a raw zip body for importDictionary", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    const bytes = new Uint8Array([80, 75]);
    await createStore().dispatch(
      backendApi.endpoints.importDictionary.initiate({ bytes }),
    );
    expect(client.requests[0]?.body).toEqual({
      kind: "bytes",
      value: bytes,
      contentType: "application/zip",
    });
  });

  it("puts the format in the query string for parseDocument", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.parseDocument.initiate({
        bytes: new Uint8Array(),
        format: "epub",
        contentType: "application/epub+zip",
      }),
    );
    expect(client.requests[0]?.query).toEqual({ format: "epub" });
  });
});
