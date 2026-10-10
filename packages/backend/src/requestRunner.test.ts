import type { AppStore, ServerRequest } from "@easyimmerse/state";
import { createAppStore, createRecordingEffects } from "@easyimmerse/state";
import type { Flashcard, MediaFile } from "@easyimmerse/types";
import type { Dispatch, UnknownAction } from "redux";
import type { ThunkDispatch } from "redux-thunk";
import { describe, expect, it, vi } from "vitest";
import { backendApi } from "./backendApi.ts";
import type {
  BackendClient,
  BackendRequest,
  BackendResult,
} from "./backendClient.ts";
import { createBackendStoreParts } from "./backendStoreParts.ts";
import { runRequest } from "./requestRunner.ts";

const mediaFile: MediaFile = {
  id: "m1",
  name: "episode.mkv",
  source: { kind: "path", path: "/videos/episode.mkv" },
} as MediaFile;

const listing: ServerRequest = { kind: "listMediaFiles", projectId: "p1" };

const adding: ServerRequest = {
  kind: "addMediaFile",
  projectId: "p1",
  request: { name: "episode.mkv", source: mediaFile.source },
};

/** A client that answers every request with the given result. */
function answering(result: BackendResult<unknown>): BackendClient {
  return { send: async <T>() => result as BackendResult<T> };
}

/** A client that lists the project's media files as empty and adds any media file as `mediaFile`. */
const mediaClient: BackendClient = {
  send: async <T>(request: BackendRequest) =>
    ({
      data: request.method === "GET" ? { media_files: [] } : mediaFile,
    }) as BackendResult<T>,
};

/** Wraps a client so that it records the method of every request it sends. */
function recording(client: BackendClient) {
  const methods: string[] = [];
  const send: BackendClient["send"] = (request, signal) => {
    methods.push(request.method);
    return client.send(request, signal);
  };
  return { methods, send };
}

const waveformWindow: ServerRequest = {
  kind: "getWaveformWindow",
  projectId: "p1",
  mediaFileId: "m1",
  startMs: 0,
  endMs: 30_000,
};

/** A flashcard of project p1 as the server returns it, saved at `updatedAtMs`. */
function savedFlashcard(updatedAtMs: number) {
  return {
    id: "f1",
    project_id: "p1",
    media_file_id: "m1",
    cue_index: null,
    word_start: null,
    content: {
      word: `cat ${updatedAtMs}`,
      word_pronunciation: "",
      l1_definition: "",
      l2_definition: "",
      text_context: "",
      text_context_translation: "",
      text_context_pronunciation: "",
      audio_context: null,
      screenshot: null,
      tags: [],
    },
    included_fields: [],
    created_at_ms: 0,
    updated_at_ms: updatedAtMs,
  } satisfies Flashcard;
}

/** A client that lists `listed` as the project's flashcards and answers every save with `saved`. */
function flashcardClient(
  listed: readonly Flashcard[],
  saved: Flashcard,
): BackendClient {
  return {
    send: async <T>(request: BackendRequest) =>
      ({
        data: request.method === "GET" ? { flashcards: listed } : saved,
      }) as BackendResult<T>,
  };
}

/** The flashcards of p1 in the cached list once a save of f1 settles, after the list was fetched from `client`. */
async function listedOnceSaved(client: BackendClient, isNew: boolean) {
  const store = createStore(client);
  const thunkDispatch = store.dispatch as unknown as BackendDispatch;
  await thunkDispatch(backendApi.endpoints.listFlashcards.initiate("p1"));
  const { content, included_fields } = savedFlashcard(0);
  await settle(store, {
    kind: "saveFlashcard",
    projectId: "p1",
    flashcardId: "f1",
    draft: {
      media_file_id: "m1",
      cue_index: null,
      word_start: null,
      content,
      included_fields,
    },
    isNew,
    purpose: { type: "undo", word: "cat" },
  });
  const selectList = backendApi.endpoints.listFlashcards.select("p1");
  const state = store.getState() as unknown as Parameters<typeof selectList>[0];
  return selectList(state).data?.flashcards;
}

const neverAnswering: BackendClient = { send: () => new Promise(() => {}) };

type BackendDispatch = ThunkDispatch<unknown, unknown, UnknownAction>;

function createStore(client: BackendClient): AppStore {
  return createAppStore(
    createRecordingEffects(),
    createBackendStoreParts(client, null),
  );
}

/** Runs a request through the store's backend parts and waits for its outcome. */
function settle(store: AppStore, request: ServerRequest) {
  return runRequest(request, store.dispatch as Dispatch).settled;
}

describe("runRequest", () => {
  it("settles with the endpoint's data", async () => {
    const store = createStore(answering({ data: { media_files: [] } }));
    expect(await settle(store, listing)).toEqual({
      ok: true,
      data: { media_files: [] },
    });
  });

  it("settles with the client's error as a failure", async () => {
    const error = { status: 500, message: "Internal error" };
    const store = createStore(answering({ error }));
    expect(await settle(store, listing)).toEqual({ ok: false, error });
  });

  it("settles as aborted once aborted", async () => {
    const store = createStore(neverAnswering);
    const running = runRequest(listing, store.dispatch as Dispatch);
    running.abort();
    const outcome = await running.settled;
    expect(outcome.ok ? null : outcome.error.status).toBe("ABORTED");
  });

  it("leaves no mutation entry once a mutation settles", async () => {
    const store = createStore(answering({ data: mediaFile }));
    await settle(store, adding);
    const backend = store.getState().backend as { mutations: object };
    expect(backend.mutations).toEqual({});
  });

  it("refetches a subscribed media list once a media file is added", async () => {
    const client = recording(mediaClient);
    const store = createStore(client);
    const thunkDispatch = store.dispatch as unknown as BackendDispatch;
    await thunkDispatch(backendApi.endpoints.listMediaFiles.initiate("p1"));
    await settle(store, adding);
    await vi.waitFor(() => {
      expect(client.methods).toEqual(["GET", "POST", "GET"]);
    });
  });

  it("answers a waveform window asked for again from the cache", async () => {
    const client = recording(answering({ data: { start_ms: 0, peaks: [1] } }));
    const store = createStore(client);
    await settle(store, waveformWindow);
    await settle(store, waveformWindow);
    expect(client.methods).toEqual(["GET"]);
  });

  it("leaves a word's lookup in the cache for the pop-up to read", async () => {
    const answer = { results: [], kanji: [], stylesheets: [] };
    const client = recording(answering({ data: answer }));
    const store = createStore(client);
    const query = { text: "Katze", language: "de" };
    await settle(store, { kind: "lookupText", query });
    await (store.dispatch as BackendDispatch)(
      backendApi.endpoints.lookupText.initiate(query, { subscribe: false }),
    );
    expect(client.methods).toEqual(["GET"]);
  });

  it("sends a source step without the form it was taken on", async () => {
    const bodies: unknown[] = [];
    const store = createStore({
      send: async <T>(request: BackendRequest) => {
        bodies.push(request.body);
        return { data: { kind: "form", form: null } } as BackendResult<T>;
      },
    });
    const request = { action: "apply", input: [] };
    await settle(store, {
      kind: "submitSourceStep",
      projectId: "p1",
      mediaFileId: "m1",
      request,
      form: null,
    });
    expect(bodies).toEqual([{ kind: "json", value: request }]);
  });

  describe("as a flashcard save settles", () => {
    it("lists a new flashcard in the cached list", async () => {
      const saved = savedFlashcard(2);
      const listed = await listedOnceSaved(flashcardClient([], saved), true);
      expect(listed).toEqual([saved]);
    });

    it("puts a saved flashcard in place of its older version", async () => {
      const saved = savedFlashcard(2);
      const client = flashcardClient([savedFlashcard(1)], saved);
      expect(await listedOnceSaved(client, false)).toEqual([saved]);
    });

    it("keeps a listed version newer than the one the save returned", async () => {
      const newer = savedFlashcard(3);
      const client = flashcardClient([newer], savedFlashcard(2));
      expect(await listedOnceSaved(client, false)).toEqual([newer]);
    });
  });
});
