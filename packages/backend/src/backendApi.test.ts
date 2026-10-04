import type {
  Flashcard,
  FlashcardDraft,
  PlaybackRequest,
  SubtitleTracksResponse,
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

const mediaArgs = { projectId: "p1", mediaFileId: "m1" };

const playbackRequest: PlaybackRequest = {
  environment: {
    engine: "webkit",
    can_play_type: "probably",
    mse_codec_strings: ["avc1.640033", "mp4a.40.2"],
  },
  selection: null,
  preferred_audio_target: null,
};

const srtRequest = {
  source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHi" },
  format: null,
} as const;

const savedFlashcard: Flashcard = {
  id: "f1",
  project_id: "p1",
  media_file_id: "m1",
  cue_index: null,
  content: {
    word: "Hund",
    word_pronunciation: "",
    l1_definition: "",
    l2_definition: "",
    text_context: "",
    text_context_translation: "",
    text_context_pronunciation: "",
    audio_context: { start_ms: 1000, end_ms: 2000 },
    screenshot: null,
    tags: [],
  },
  included_fields: ["word"],
  created_at_ms: 0,
  updated_at_ms: 0,
};

const movedClipDraft: FlashcardDraft = {
  media_file_id: "m1",
  cue_index: null,
  content: {
    ...savedFlashcard.content,
    audio_context: { start_ms: 500, end_ms: 2000 },
  },
  included_fields: ["word"],
};

const subtitleTracks: SubtitleTracksResponse = {
  tracks: [],
  selection: { target_track_id: "s1", translation_track_id: null },
};

/** Answers GET requests from the responses, and leaves every other request pending, or fails it when `failsWrites` is set. */
function createStubbedClient(
  responses: Record<string, unknown>,
  failsWrites = false,
): BackendClient {
  return {
    send: <T>(request: BackendRequest) => {
      if (request.method === "GET")
        return Promise.resolve({
          data: responses[`GET ${request.path}`] as T,
        });
      if (failsWrites)
        return Promise.resolve({
          error: { status: 500, message: "failed" },
        });
      return new Promise<never>(() => undefined);
    },
  };
}

async function storeWithFlashcards(failsWrites = false) {
  configureBackend(
    createStubbedClient(
      { "GET /projects/p1/flashcards": { flashcards: [savedFlashcard] } },
      failsWrites,
    ),
  );
  const store = createStore();
  await store.dispatch(backendApi.endpoints.listFlashcards.initiate("p1"));
  return store;
}

async function storeWithSubtitleTracks(failsWrites = false) {
  configureBackend(
    createStubbedClient(
      { "GET /projects/p1/media/m1/subtitles": subtitleTracks },
      failsWrites,
    ),
  );
  const store = createStore();
  await store.dispatch(
    backendApi.endpoints.listSubtitleTracks.initiate(mediaArgs),
  );
  return store;
}

const updateMovedClip = () =>
  backendApi.endpoints.updateFlashcard.initiate({
    projectId: "p1",
    flashcardId: "f1",
    draft: movedClipDraft,
  });

const chooseTranslation = () =>
  backendApi.endpoints.setSubtitleSelection.initiate({
    ...mediaArgs,
    selection: { target_track_id: "s1", translation_track_id: "s2" },
  });

const listedClip = (store: ReturnType<typeof createStore>) =>
  backendApi.endpoints.listFlashcards.select("p1")(store.getState()).data
    ?.flashcards[0]?.content.audio_context;

const listedSelection = (store: ReturnType<typeof createStore>) =>
  backendApi.endpoints.listSubtitleTracks.select(mediaArgs)(store.getState())
    .data?.selection;

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

  it("sends GET /projects/{id}/media for listMediaFiles", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.listMediaFiles.initiate("p1"),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/projects/p1/media" },
    ]);
  });

  it("posts the name and source for addMediaFile", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    const request = {
      name: "a.mp4",
      source: { kind: "path", path: "/a.mp4" },
    } as const;
    await createStore().dispatch(
      backendApi.endpoints.addMediaFile.initiate({ projectId: "p1", request }),
    );
    expect(client.requests[0]).toEqual({
      method: "POST",
      path: "/projects/p1/media",
      body: { kind: "json", value: request },
    });
  });

  it("sends DELETE /projects/{id}/media/{media_id} for removeMediaFile", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.removeMediaFile.initiate({
        projectId: "p1",
        mediaFileId: "m1",
      }),
    );
    expect(client.requests).toEqual([
      { method: "DELETE", path: "/projects/p1/media/m1" },
    ]);
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

  it("sends GET .../tracks for getMediaTracks", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.getMediaTracks.initiate(mediaArgs),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/projects/p1/media/m1/tracks" },
    ]);
  });

  it("posts the playback request for planPlayback", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.planPlayback.initiate({
        ...mediaArgs,
        request: playbackRequest,
      }),
    );
    expect(client.requests[0]).toEqual({
      method: "POST",
      path: "/projects/p1/media/m1/playback",
      body: { kind: "json", value: playbackRequest },
    });
  });

  it("puts the selection for saveTrackSelection", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.saveTrackSelection.initiate({
        ...mediaArgs,
        selection: { video: 0, audio: 2 },
      }),
    );
    expect(client.requests[0]).toEqual({
      method: "PUT",
      path: "/projects/p1/media/m1/track-selection",
      body: { kind: "json", value: { video: 0, audio: 2 } },
    });
  });

  it("puts the window bounds in the query string for getWaveformWindow", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.getWaveformWindow.initiate({
        ...mediaArgs,
        startMs: 30_000,
        endMs: 60_000,
      }),
    );
    expect(client.requests[0]).toEqual({
      method: "GET",
      path: "/projects/p1/media/m1/waveform",
      query: { start_ms: "30000", end_ms: "60000" },
    });
  });

  it("sends GET .../embedded-subtitles for listEmbeddedSubtitleTracks", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.listEmbeddedSubtitleTracks.initiate(mediaArgs),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/projects/p1/media/m1/embedded-subtitles" },
    ]);
  });

  it("sends GET .../subtitles for listSubtitleTracks", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.listSubtitleTracks.initiate(mediaArgs),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/projects/p1/media/m1/subtitles" },
    ]);
  });

  it("sends GET /conversion-cache for getConversionCacheStatus", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.getConversionCacheStatus.initiate(),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/conversion-cache" },
    ]);
  });

  it("sends POST /conversion-cache/clear for clearConversionCache", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.clearConversionCache.initiate(),
    );
    expect(client.requests).toEqual([
      { method: "POST", path: "/conversion-cache/clear" },
    ]);
  });

  describe("while a change is being saved", () => {
    it("shows an updated flashcard in the cached list at once", async () => {
      const store = await storeWithFlashcards();
      store.dispatch(updateMovedClip());
      expect(listedClip(store)).toEqual({ start_ms: 500, end_ms: 2000 });
    });

    it("restores the cached flashcard when the update fails", async () => {
      const store = await storeWithFlashcards(true);
      await store.dispatch(updateMovedClip());
      expect(listedClip(store)).toEqual({ start_ms: 1000, end_ms: 2000 });
    });

    it("shows a chosen subtitle selection in the cached list at once", async () => {
      const store = await storeWithSubtitleTracks();
      store.dispatch(chooseTranslation());
      expect(listedSelection(store)?.translation_track_id).toBe("s2");
    });

    it("restores the cached subtitle selection when saving it fails", async () => {
      const store = await storeWithSubtitleTracks(true);
      await store.dispatch(chooseTranslation());
      expect(listedSelection(store)?.translation_track_id).toBeNull();
    });
  });
});
