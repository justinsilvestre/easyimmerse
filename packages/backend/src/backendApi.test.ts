import type {
  FlashcardDraftRequest,
  ProjectSettings,
} from "@easyimmerse/types";
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

describe("backendApi project, media, and flashcard endpoints", () => {
  async function requestFor(
    dispatchInto: (store: ReturnType<typeof createStore>) => Promise<unknown>,
  ) {
    const client = createRecordingClient();
    configureBackend(client);
    await dispatchInto(createStore());
    return client.requests[0];
  }

  it("creates a project with its settings as the JSON body", async () => {
    const settings: ProjectSettings = {
      name: "Alpha",
      target_language: "de",
      translation_language: "en",
      flashcard_settings: {
        included_fields: ["word"],
        default_tags: [],
        tag_with_media_name: true,
        use_tts_when_no_audio: false,
      },
    };
    const request = await requestFor((store) =>
      store.dispatch(backendApi.endpoints.createProject.initiate(settings)),
    );
    expect(request).toEqual({
      method: "POST",
      path: "/projects",
      body: { kind: "json", value: settings },
    });
  });

  it("sends the media duration under the project and media ids", async () => {
    const request = await requestFor((store) =>
      store.dispatch(
        backendApi.endpoints.setMediaDuration.initiate({
          projectId: "p1",
          mediaId: "m1",
          duration_ms: 5000,
        }),
      ),
    );
    expect(request).toEqual({
      method: "PUT",
      path: "/projects/p1/media/m1/duration",
      body: { kind: "json", value: { duration_ms: 5000 } },
    });
  });

  it("deletes a flashcard with DELETE", async () => {
    const request = await requestFor((store) =>
      store.dispatch(
        backendApi.endpoints.deleteFlashcard.initiate({
          projectId: "p1",
          flashcardId: "f1",
        }),
      ),
    );
    expect(request).toEqual({
      method: "DELETE",
      path: "/projects/p1/flashcards/f1",
    });
  });

  it("carries the offline operation for draftFlashcard", async () => {
    const draftRequest: FlashcardDraftRequest = {
      word: "cats",
      lemma: null,
      reading: null,
      l1_definitions: [],
      l2_definitions: [],
      context: null,
      context_translation: null,
      media_id: null,
      media_name: null,
      clip: null,
      screenshot_ms: null,
      settings: {
        included_fields: ["word"],
        default_tags: [],
        tag_with_media_name: false,
        use_tts_when_no_audio: false,
      },
    };
    const request = await requestFor((store) =>
      store.dispatch(
        backendApi.endpoints.draftFlashcard.initiate(draftRequest),
      ),
    );
    expect(request?.offlineOperation).toEqual({
      kind: "draftFlashcard",
      request: draftRequest,
    });
  });

  it("looks a term up across dictionaries with a query parameter", async () => {
    const request = await requestFor((store) =>
      store.dispatch(backendApi.endpoints.lookupTermEverywhere.initiate("cat")),
    );
    expect(request).toEqual({
      method: "GET",
      path: "/dictionaries/lookup",
      query: { term: "cat" },
    });
  });
});
