import type {
  Flashcard,
  FlashcardDraft,
  LookupResponse,
  MediaFile,
  PlaybackRequest,
  SourceStepResponse,
  SubtitleTracksResponse,
} from "@easyimmerse/types";
import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";
import { backendApi } from "./backendApi.ts";
import type { BackendClient, BackendRequest } from "./backendClient.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";

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

/** Records every request and fails each source step, as a plugin whose fetch fails would. */
function createFailingSourceStepClient(): BackendClient & {
  requests: BackendRequest[];
} {
  const requests: BackendRequest[] = [];
  return {
    requests,
    send: async <T>(request: BackendRequest) => {
      requests.push(request);
      if (request.path.endsWith("/source-step"))
        return { error: { status: 502, message: "the fetch failed" } };
      return {
        data: {
          tracks: [],
          selection: { target_track_id: null, translation_track_id: null },
        } as T,
      };
    },
  };
}

const fetchedTrack = {
  id: "s2",
  media_file_id: "m1",
  name: "English",
  format: "srt",
  sample: "Hi",
  created_at_ms: 0,
} as const;

const appliedStep: SourceStepResponse = {
  kind: "applied",
  removed: [],
  tracks: [fetchedTrack],
  selection: { target_track_id: null, translation_track_id: "s2" },
  skipped: [],
};

/** Records every request and answers each source step with `appliedStep`. */
function createApplyingSourceStepClient(): BackendClient & {
  requests: BackendRequest[];
} {
  const requests: BackendRequest[] = [];
  return {
    requests,
    send: async <T>(request: BackendRequest) => {
      requests.push(request);
      if (request.path.endsWith("/source-step"))
        return { data: appliedStep as T };
      return {
        data: {
          tracks: [],
          selection: { target_track_id: null, translation_track_id: null },
        } as T,
      };
    },
  };
}

async function storeAfterApplyingSourceStep(
  client: BackendClient = createApplyingSourceStepClient(),
) {
  const store = createStore(client);
  await store.dispatch(
    backendApi.endpoints.listSubtitleTracks.initiate(mediaArgs),
  );
  await store.dispatch(
    backendApi.endpoints.submitSourceStep.initiate({
      ...mediaArgs,
      request: { action: "apply", input: [] },
    }),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  return store;
}

function createStore(client: BackendClient) {
  const extra: BackendThunkExtra = { client };
  return configureStore({
    reducer: { [backendApi.reducerPath]: backendApi.reducer },
    middleware: (getDefault) =>
      getDefault({ thunk: { extraArgument: extra } }).concat(
        backendApi.middleware,
      ),
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
  word_start: null,
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
  word_start: null,
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
  const client = createStubbedClient(
    { "GET /projects/p1/flashcards": { flashcards: [savedFlashcard] } },
    failsWrites,
  );
  const store = createStore(client);
  await store.dispatch(backendApi.endpoints.listFlashcards.initiate("p1"));
  return store;
}

async function storeWithSubtitleTracks(failsWrites = false) {
  const client = createStubbedClient(
    { "GET /projects/p1/media/m1/subtitles": subtitleTracks },
    failsWrites,
  );
  const store = createStore(client);
  await store.dispatch(
    backendApi.endpoints.listSubtitleTracks.initiate(mediaArgs),
  );
  return store;
}

const addedBook: MediaFile = {
  id: "b1",
  project_id: "p1",
  name: "book.epub",
  source: { kind: "path", path: "/book.epub" },
  created_at_ms: 0,
  track_selection_json: null,
  origin: null,
};

/** Lists no media files at first, adds a book, and leaves the list's refetch pending. */
async function storeAfterAddingBook() {
  let listCount = 0;
  const client: BackendClient = {
    send: <T>(request: BackendRequest) => {
      if (request.method === "POST")
        return Promise.resolve({ data: addedBook as T });
      listCount += 1;
      return listCount === 1
        ? Promise.resolve({ data: { media_files: [] } as T })
        : new Promise<never>(() => undefined);
    },
  };
  const store = createStore(client);
  await store.dispatch(backendApi.endpoints.listMediaFiles.initiate("p1"));
  await store.dispatch(
    backendApi.endpoints.addMediaFile.initiate({
      projectId: "p1",
      request: { name: addedBook.name, source: addedBook.source },
    }),
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

describe("backendApi", () => {
  it("sends GET /projects for listProjects", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.listProjects.initiate(),
    );
    expect(client.requests).toEqual([{ method: "GET", path: "/projects" }]);
  });

  it("returns the client's data for listProjects", async () => {
    const result = await createStore(createRecordingClient()).dispatch(
      backendApi.endpoints.listProjects.initiate(),
    );
    expect(result.data).toEqual({ projects: [] });
  });

  it("carries the offline operation for parseTimedText", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.parseTimedText.initiate(srtRequest),
    );
    expect(client.requests[0]?.offlineOperation).toEqual({
      kind: "parseTimedText",
      request: srtRequest,
    });
  });

  it("sends GET /projects/{id}/media for listMediaFiles", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.listMediaFiles.initiate("p1"),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/projects/p1/media" },
    ]);
  });

  it("posts the name and source for addMediaFile", async () => {
    const client = createRecordingClient();
    const request = {
      name: "a.mp4",
      source: { kind: "path", path: "/a.mp4" },
    } as const;
    await createStore(client).dispatch(
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
    await createStore(client).dispatch(
      backendApi.endpoints.removeMediaFile.initiate({
        projectId: "p1",
        mediaFileId: "m1",
      }),
    );
    expect(client.requests).toEqual([
      { method: "DELETE", path: "/projects/p1/media/m1" },
    ]);
  });

  it("sends the file as a raw body for importDictionary", async () => {
    const client = createRecordingClient();
    const bytes = new Uint8Array([80, 75]);
    await createStore(client).dispatch(
      backendApi.endpoints.importDictionary.initiate({
        fileName: "jmdict.zip",
        bytes,
      }),
    );
    expect(client.requests[0]?.body).toEqual({
      kind: "bytes",
      value: bytes,
      contentType: "application/octet-stream",
    });
  });

  it("puts the file name in the query string for importDictionary", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.importDictionary.initiate({
        fileName: "oxford.mdx",
        bytes: new Uint8Array(),
      }),
    );
    expect(client.requests[0]?.query).toEqual({ fileName: "oxford.mdx" });
  });

  it("carries the file name in the offline operation for importDictionary", async () => {
    const client = createRecordingClient();
    const bytes = new Uint8Array();
    await createStore(client).dispatch(
      backendApi.endpoints.importDictionary.initiate({
        fileName: "words.csv",
        bytes,
      }),
    );
    expect(client.requests[0]?.offlineOperation).toEqual({
      kind: "importDictionary",
      fileName: "words.csv",
      bytes,
      tableLayout: null,
    });
  });

  it("puts a chosen table layout in the query string for importDictionary", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.importDictionary.initiate({
        fileName: "words.csv",
        bytes: new Uint8Array(),
        tableLayout: { columns: ["term", "ignored"], hasHeader: true },
      }),
    );
    expect(client.requests[0]?.query).toEqual({
      fileName: "words.csv",
      columns: "term,ignored",
      hasHeader: "true",
    });
  });

  it("sends GET /dictionaries/imports/{id} for getImportJob", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.getImportJob.initiate("job 1"),
    );
    expect(client.requests[0]?.path).toBe("/dictionaries/imports/job%201");
  });

  it("sends POST /dictionaries/preview for previewDictionaryTable", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.previewDictionaryTable.initiate({
        fileName: "words.csv",
        bytes: new Uint8Array(),
      }),
    );
    expect(client.requests[0]?.path).toBe("/dictionaries/preview");
  });

  it("sends DELETE /dictionaries/{id} for deleteDictionary", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.deleteDictionary.initiate("d1"),
    );
    expect(client.requests).toEqual([
      { method: "DELETE", path: "/dictionaries/d1" },
    ]);
  });

  it("puts the text and language in the query string for lookupText", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.lookupText.initiate({
        text: "猫が",
        language: "ja",
      }),
    );
    expect(client.requests).toEqual([
      {
        method: "GET",
        path: "/dictionaries/lookup",
        query: { text: "猫が", language: "ja" },
      },
    ]);
  });

  it("puts the context and offset in the query string for lookupText", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.lookupText.initiate({
        text: "rufe dich an.",
        language: "de",
        context: "Ich rufe dich an.",
        offset: 4,
      }),
    );
    expect(client.requests[0]?.query).toEqual({
      text: "rufe dich an.",
      language: "de",
      context: "Ich rufe dich an.",
      offset: "4",
    });
  });

  it("returns the dictionaries' stylesheets with the lookup results", async () => {
    const response: LookupResponse = {
      results: [],
      kanji: [],
      stylesheets: [{ dictionaryId: "d1", css: "b { color: red }" }],
    };
    const client = {
      send: async <T>() => ({ data: response as T }),
    };
    const result = await createStore(client).dispatch(
      backendApi.endpoints.lookupText.initiate({ text: "猫", language: "ja" }),
    );
    expect(result.data?.stylesheets).toEqual(response.stylesheets);
  });

  it("puts the format in the query string for parseDocument", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
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
    await createStore(client).dispatch(
      backendApi.endpoints.getMediaTracks.initiate(mediaArgs),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/projects/p1/media/m1/tracks" },
    ]);
  });

  it("posts the playback request for planPlayback", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
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
    await createStore(client).dispatch(
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
    await createStore(client).dispatch(
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
    await createStore(client).dispatch(
      backendApi.endpoints.listEmbeddedSubtitleTracks.initiate(mediaArgs),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/projects/p1/media/m1/embedded-subtitles" },
    ]);
  });

  it("sends GET .../subtitles for listSubtitleTracks", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.listSubtitleTracks.initiate(mediaArgs),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/projects/p1/media/m1/subtitles" },
    ]);
  });

  it("sends GET /conversion-cache for getConversionCacheStatus", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.getConversionCacheStatus.initiate(),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/conversion-cache" },
    ]);
  });

  it("sends POST /conversion-cache/clear for clearConversionCache", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.clearConversionCache.initiate(),
    );
    expect(client.requests).toEqual([
      { method: "POST", path: "/conversion-cache/clear" },
    ]);
  });

  it("fetches the subtitle tracks again after a source step fails", async () => {
    const client = createFailingSourceStepClient();
    const store = createStore(client);
    store.dispatch(backendApi.endpoints.listSubtitleTracks.initiate(mediaArgs));
    await store.dispatch(
      backendApi.endpoints.submitSourceStep.initiate({
        ...mediaArgs,
        request: { action: "apply", input: [] },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      client.requests.filter(
        (request) => request.path === "/projects/p1/media/m1/subtitles",
      ),
    ).toHaveLength(2);
  });

  it("puts the tracks of an applied source step into the cached track list", async () => {
    const store = await storeAfterApplyingSourceStep();
    expect(
      backendApi.endpoints.listSubtitleTracks.select(mediaArgs)(
        store.getState(),
      ).data,
    ).toEqual({ tracks: appliedStep.tracks, selection: appliedStep.selection });
  });

  it("does not fetch the subtitle tracks again after a source step is applied", async () => {
    const client = createApplyingSourceStepClient();
    await storeAfterApplyingSourceStep(client);
    expect(
      client.requests.filter(
        (request) => request.path === "/projects/p1/media/m1/subtitles",
      ),
    ).toHaveLength(1);
  });

  it("lists an added media file before the list is fetched again", async () => {
    const store = await storeAfterAddingBook();
    expect(
      backendApi.endpoints.listMediaFiles.select("p1")(store.getState()).data
        ?.media_files,
    ).toEqual([addedBook]);
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
