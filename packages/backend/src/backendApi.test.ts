import type {
  AddAlignmentRequest,
  LibraryItem,
  LibraryItemDraft,
  LibraryItemStatus,
  LibraryText,
  LookupResponse,
  MediaFile,
  PlaybackMethodRequest,
  Project,
  SourceStepResponse,
  SubtitleTracksResponse,
  SyncConflict,
  SyncLink,
  SyncStatus,
} from "@easyimmerse/types";
import { configureStore, type Middleware } from "@reduxjs/toolkit";
import { describe, expect, it, vi } from "vitest";
import type { AnkiConnect } from "./ankiConnect.ts";
import { accountPath, backendApi } from "./backendApi.ts";
import type { BackendClient, BackendRequest } from "./backendClient.ts";
import { createFakeAnkiConnect } from "./fakeAnkiConnect.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import { utcOffsetMinOf } from "./utcOffsetMinOf.ts";

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

function createStore(
  client: BackendClient,
  ankiConnect: AnkiConnect = createFakeAnkiConnect(),
) {
  const extra: BackendThunkExtra = {
    client,
    browserFileRegistry: null,
    frameCapturer: null,
    failedPassages: { retryTimes: {} },
    serverFetch: null,
    ankiConnect,
  };
  return configureStore({
    reducer: { [backendApi.reducerPath]: backendApi.reducer },
    middleware: (getDefault) =>
      getDefault({ thunk: { extraArgument: extra } }).concat(
        backendApi.middleware,
      ),
  });
}

const mediaArgs = { projectId: "p1", mediaFileId: "m1" };

const audioAlignmentRequest: AddAlignmentRequest = {
  provider: null,
  content: { kind: "audio", audio_media_file_id: "a1", segments: [] },
};

const playbackRequest: PlaybackMethodRequest = {
  environment: {
    engine: "webkit",
    can_play_type: "probably",
    mse_codec_strings: ["avc1.640033", "mp4a.40.2"],
  },
  selection: null,
  preferred_audio_target: null,
  video_quality: null,
};

const srtRequest = {
  source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHi" },
  format: null,
} as const;

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
  translation_media_file_id: null,
  is_upload_chosen: false,
  has_stored_copy: false,
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

/** Lists two dictionaries, answers the removal of d1 with success or a failure, and leaves the list's refetch pending. */
async function storeAfterRemovingD1(fails = false) {
  let listCount = 0;
  const client: BackendClient = {
    send: <T>(request: BackendRequest) => {
      if (request.method === "DELETE")
        return Promise.resolve(
          fails
            ? { error: { status: 500, message: "failed" } }
            : { data: undefined as T },
        );
      listCount += 1;
      return listCount === 1
        ? Promise.resolve({
            data: { dictionaries: [{ id: "d1" }, { id: "d2" }] } as T,
          })
        : new Promise<never>(() => undefined);
    },
  };
  const store = createStore(client);
  await store.dispatch(backendApi.endpoints.listDictionaries.initiate());
  await store.dispatch(backendApi.endpoints.deleteDictionary.initiate("d1"));
  return store;
}

const listedDictionaryIds = (store: ReturnType<typeof createStore>) =>
  backendApi.endpoints.listDictionaries
    .select()(store.getState())
    .data?.dictionaries.map(({ id }) => id);

const chooseTranslation = () =>
  backendApi.endpoints.setSubtitleSelection.initiate({
    ...mediaArgs,
    selection: { target_track_id: "s1", translation_track_id: "s2" },
  });

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

  it("sends GET /projects/{id}/media/availability for getMediaAvailability", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.getMediaAvailability.initiate("p1"),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/projects/p1/media/availability" },
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

  it("sends GET /dictionaries/imports/{id} for getImportJob", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.getImportJob.initiate("job 1"),
    );
    expect(client.requests[0]?.path).toBe("/dictionaries/imports/job%201");
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

  it("sends GET .../tracks for getMediaTracks", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.getMediaTracks.initiate(mediaArgs),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/projects/p1/media/m1/tracks" },
    ]);
  });

  it("posts the playback request for choosePlaybackMethod", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.choosePlaybackMethod.initiate({
        ...mediaArgs,
        request: playbackRequest,
      }),
    );
    expect(client.requests[0]).toEqual({
      method: "POST",
      path: "/projects/p1/media/m1/playback-method",
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

  it("puts the client's UTC offset in the query string for getReviewSummary", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.getReviewSummary.initiate("p1"),
    );
    expect(client.requests[0]).toEqual({
      method: "GET",
      path: "/projects/p1/review",
      query: { utc_offset_min: String(utcOffsetMinOf(new Date())) },
    });
  });

  it("posts the rating, its duration and the client's UTC offset for answerReview", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.answerReview.initiate({
        projectId: "p1",
        flashcardId: "f1",
        rating: "good",
        durationMs: 3000,
      }),
    );
    expect(client.requests[0]?.body).toEqual({
      kind: "json",
      value: {
        flashcard_id: "f1",
        rating: "good",
        utc_offset_min: utcOffsetMinOf(new Date()),
        duration_ms: 3000,
      },
    });
  });

  it("sends DELETE .../review/answers/{answer_id} for undoReviewAnswer", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.undoReviewAnswer.initiate({
        projectId: "p1",
        answerId: "a1",
      }),
    );
    expect(client.requests[0]?.path).toBe("/projects/p1/review/answers/a1");
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

  it("sends GET .../alignments for listAlignments", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.listAlignments.initiate(mediaArgs),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/projects/p1/media/m1/alignments" },
    ]);
  });

  it("posts the request body for addAlignment", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.addAlignment.initiate({
        ...mediaArgs,
        body: audioAlignmentRequest,
      }),
    );
    expect(client.requests[0]).toEqual({
      method: "POST",
      path: "/projects/p1/media/m1/alignments",
      body: { kind: "json", value: audioAlignmentRequest },
    });
  });

  it("sends DELETE .../alignments/{alignment_id} for removeAlignment", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.removeAlignment.initiate({
        ...mediaArgs,
        alignmentId: "al1",
      }),
    );
    expect(client.requests).toEqual([
      { method: "DELETE", path: "/projects/p1/media/m1/alignments/al1" },
    ]);
  });

  it("puts the selection for setTranslationDocument", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.setTranslationDocument.initiate({
        ...mediaArgs,
        body: { translation_media_file_id: "t1" },
      }),
    );
    expect(client.requests[0]).toEqual({
      method: "PUT",
      path: "/projects/p1/media/m1/translation-document",
      body: { kind: "json", value: { translation_media_file_id: "t1" } },
    });
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

  it("sends GET /conversion/capabilities for getConversionCapabilities", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.getConversionCapabilities.initiate(),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/conversion/capabilities" },
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

  it("posts the flashcards, marking, and read time for recordAnkiExported", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.recordAnkiExported.initiate({
        projectId: "p1",
        flashcardIds: ["f1", "f2"],
        marksExported: true,
        readAtMs: 1234,
      }),
    );
    expect(client.requests).toEqual([
      {
        method: "POST",
        path: "/projects/p1/anki/exported",
        body: {
          kind: "json",
          value: {
            flashcard_ids: ["f1", "f2"],
            marks_exported: true,
            read_at_ms: 1234,
          },
        },
      },
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

  it("drops a removed dictionary from the list before it is fetched again", async () => {
    const store = await storeAfterRemovingD1();
    expect(listedDictionaryIds(store)).toEqual(["d2"]);
  });

  it("keeps a dictionary whose removal failed in the list", async () => {
    const store = await storeAfterRemovingD1(true);
    expect(listedDictionaryIds(store)).toEqual(["d1", "d2"]);
  });

  it("lists an added media file before the list is fetched again", async () => {
    const store = await storeAfterAddingBook();
    expect(
      backendApi.endpoints.listMediaFiles.select("p1")(store.getState()).data
        ?.media_files,
    ).toEqual([addedBook]);
  });

  describe("while a change is being saved", () => {
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

describe("checkAnkiConnection", () => {
  it("is kept as the last send to Anki found it", async () => {
    const store = createStore(createRecordingClient());
    await store.dispatch(
      backendApi.endpoints.sendFlashcardsToAnki.initiate({
        projectId: "p1",
        flashcardIds: ["f1"],
      }),
    );
    expect(
      backendApi.endpoints.checkAnkiConnection.select()(store.getState()).data,
    ).toEqual({ connected: false, isDenied: false });
  });
});

/** A server listing one pending deletion from Anki, of f1, and answering every other request with nothing. */
function createPendingDeletionClient(): BackendClient {
  const listed = {
    deletions: [
      {
        flashcard_id: "f1",
        word: "고양이",
        requested_at_ms: 1,
      },
    ],
  };
  return {
    send: async <T>(request: BackendRequest) =>
      ({ data: request.method === "GET" ? listed : undefined }) as {
        data: T;
      },
  };
}

/** Anki running, holding no note of any flashcard. */
const runningAnki = () =>
  createFakeAnkiConnect({ version: () => 6, findNotes: () => [] });

describe("deleteAnkiNotes", () => {
  it("keeps the connection to Anki as found once it answers", async () => {
    const store = createStore(createPendingDeletionClient(), runningAnki());
    await store.dispatch(backendApi.endpoints.deleteAnkiNotes.initiate("p1"));
    expect(
      backendApi.endpoints.checkAnkiConnection.select()(store.getState()).data,
    ).toEqual({ connected: true, version: 6 });
  });

  it("tells that it found Anki when no check had found Anki running", async () => {
    const store = createStore(createPendingDeletionClient(), runningAnki());
    const deleted = await store.dispatch(
      backendApi.endpoints.deleteAnkiNotes.initiate("p1"),
    );
    expect(deleted.data?.foundAnki).toBe(true);
  });

  it("does not tell that it found Anki once a check has found Anki running", async () => {
    const store = createStore(createPendingDeletionClient(), runningAnki());
    await store.dispatch(backendApi.endpoints.checkAnkiConnection.initiate());
    const deleted = await store.dispatch(
      backendApi.endpoints.deleteAnkiNotes.initiate("p1"),
    );
    expect(deleted.data?.foundAnki).toBe(false);
  });
});

describe("setAnkiConnect", () => {
  it("puts the project it answers into the cache at once", async () => {
    const project: Project = {
      id: "p1",
      settings: {
        name: "Korean",
        target_language: "ko",
        translation_language: "en",
        flashcard_fields: ["word"],
        default_tags: [],
        tags_media_name: false,
        fills_audio_with_tts: false,
        flashcard_front_fields: [],
        lists_anki_deletions: true,
      },
      created_at_ms: 0,
      last_opened_at_ms: 0,
      media_count: 0,
      flashcard_count: 0,
      unreviewed_count: 0,
      uses_anki_connect: true,
      is_backed_up: false,
    };
    const store = createStore({
      send: async <T>() => ({ data: project as T }),
    });
    await store.dispatch(
      backendApi.endpoints.setAnkiConnect.initiate({
        projectId: "p1",
        usesAnkiConnect: true,
      }),
    );
    expect(
      backendApi.endpoints.getProject.select("p1")(store.getState()).data
        ?.uses_anki_connect,
    ).toBe(true);
  });
});

describe("the account endpoints", () => {
  it("send GET /auth/server for getServerAuthInfo", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.getServerAuthInfo.initiate("self"),
    );
    expect(client.requests).toEqual([{ method: "GET", path: "/auth/server" }]);
  });

  it("send GET /auth/me for getCurrentPrincipal", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.getCurrentPrincipal.initiate("self"),
    );
    expect(client.requests).toEqual([{ method: "GET", path: "/auth/me" }]);
  });

  it("send POST /auth/logout for logOut", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(backendApi.endpoints.logOut.initiate());
    expect(client.requests).toEqual([{ method: "POST", path: "/auth/logout" }]);
  });

  it("send GET /users for listUsers", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.listUsers.initiate("self"),
    );
    expect(client.requests).toEqual([{ method: "GET", path: "/users" }]);
  });

  it("post the new account for createUser", async () => {
    const client = createRecordingClient();
    const request = {
      email: "someone@example.com",
      password: "correct horse",
      role: "privileged",
    } as const;
    await createStore(client).dispatch(
      backendApi.endpoints.createUser.initiate({ via: "self", request }),
    );
    expect(client.requests).toEqual([
      {
        method: "POST",
        path: "/users",
        body: { kind: "json", value: request },
      },
    ]);
  });

  it("put the role for setUserRole", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.setUserRole.initiate({
        via: "self",
        userId: "u1",
        body: { role: "administrator" },
      }),
    );
    expect(client.requests).toEqual([
      {
        method: "PUT",
        path: "/users/u1/role",
        body: { kind: "json", value: { role: "administrator" } },
      },
    ]);
  });

  it("fetch the current principal again once an account's role changes", async () => {
    const client = createRecordingClient();
    const store = createStore(client);
    await store.dispatch(
      backendApi.endpoints.getCurrentPrincipal.initiate("self"),
    );
    await store.dispatch(
      backendApi.endpoints.setUserRole.initiate({
        via: "self",
        userId: "u1",
        body: { role: "library_user" },
      }),
    );
    await vi.waitFor(() =>
      expect(
        client.requests.filter(({ path }) => path === "/auth/me"),
      ).toHaveLength(2),
    );
  });

  it("fetch the current principal again once an account is deleted", async () => {
    const client = createRecordingClient();
    const store = createStore(client);
    await store.dispatch(
      backendApi.endpoints.getCurrentPrincipal.initiate("self"),
    );
    await store.dispatch(
      backendApi.endpoints.deleteUser.initiate({ via: "self", userId: "u1" }),
    );
    await vi.waitFor(() =>
      expect(
        client.requests.filter(({ path }) => path === "/auth/me"),
      ).toHaveLength(2),
    );
  });

  it("send DELETE /users/{id} for deleteUser", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.deleteUser.initiate({ via: "self", userId: "u1" }),
    );
    expect(client.requests).toEqual([{ method: "DELETE", path: "/users/u1" }]);
  });

  it("send GET /auth/sessions for listSessions", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.listSessions.initiate("self"),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/auth/sessions" },
    ]);
  });

  it("send DELETE /auth/sessions/{id} for deleteSession", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.deleteSession.initiate({
        via: "self",
        sessionId: "s1",
      }),
    );
    expect(client.requests).toEqual([
      { method: "DELETE", path: "/auth/sessions/s1" },
    ]);
  });

  it("list the sessions again once one is deleted", async () => {
    const client = createRecordingClient();
    const store = createStore(client);
    await store.dispatch(backendApi.endpoints.listSessions.initiate("self"));
    await store.dispatch(
      backendApi.endpoints.deleteSession.initiate({
        via: "self",
        sessionId: "s1",
      }),
    );
    await vi.waitFor(() =>
      expect(
        client.requests.filter(({ path }) => path === "/auth/sessions"),
      ).toHaveLength(2),
    );
  });

  it("send POST /auth/confirmation-email for requestConfirmationEmail", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.requestConfirmationEmail.initiate("self"),
    );
    expect(client.requests).toEqual([
      { method: "POST", path: "/auth/confirmation-email" },
    ]);
  });

  it("send account requests through the built-in server to the remote it is linked to", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.setUserRole.initiate({
        via: "linkedRemote",
        userId: "u1",
        body: { role: "administrator" },
      }),
    );
    expect(client.requests.map(({ path }) => path)).toEqual([
      "/sync/remote/users/u1/role",
    ]);
  });
});

describe("accountPath", () => {
  it("leaves the path of a route on the connected server as it is", () => {
    expect(accountPath("self", "/auth/me")).toBe("/auth/me");
  });

  it("prefixes the path of a route on the linked remote with the built-in server's forwarding path", () => {
    expect(accountPath("linkedRemote", "/auth/me")).toBe(
      "/sync/remote/auth/me",
    );
  });
});

const conflict = (id: string): SyncConflict => ({
  id,
  description: "a flashcard",
  project_name: "Spanish practice",
  media_file_name: null,
  kept: "other_device",
  detected_at_ms: 0,
});

const syncLink: SyncLink = {
  kind: "account",
  server_url: "https://cloud.example.org",
  account_email: "someone@example.org",
  account_role: "library_user",
  linked_at_ms: 0,
  last_synced_at_ms: null,
  pushed_through_seq: 4,
  state: { kind: "idle" },
  transfer: null,
  refused_upload: null,
  conflicts: [],
  conflict_count: 0,
};

const syncStatus: SyncStatus = {
  link: syncLink,
  pulled_revision: 1,
  local_change_seq: 4,
};

/** A built-in server that answers each status request with the next of the statuses, and lists no projects. */
function createStatusClient(...statuses: SyncStatus[]) {
  const requests: BackendRequest[] = [];
  let answered = 0;
  const client: BackendClient = {
    send: async <T>(request: BackendRequest) => {
      requests.push(request);
      if (request.path !== "/sync/status")
        return { data: { projects: [] } as T };
      const status = statuses[Math.min(answered, statuses.length - 1)];
      answered += 1;
      return { data: status as T };
    },
  };
  return { client, requests };
}

/** A store over the client that records the type of every action dispatched to it. */
function createRecordingStore(client: BackendClient) {
  const dispatched: { type: string; conflictId?: string; payload?: unknown }[] =
    [];
  const recording: Middleware = () => (next) => (action) => {
    dispatched.push(action as { type: string });
    return next(action);
  };
  const extra: BackendThunkExtra = {
    client,
    browserFileRegistry: null,
    frameCapturer: null,
    failedPassages: { retryTimes: {} },
    serverFetch: null,
    ankiConnect: createFakeAnkiConnect(),
  };
  const store = configureStore({
    reducer: { [backendApi.reducerPath]: backendApi.reducer },
    middleware: (getDefault) =>
      getDefault({ thunk: { extraArgument: extra } }).concat(
        recording,
        backendApi.middleware,
      ),
  });
  return { store, dispatched };
}

/** Fetches the status once for each of the statuses, after the project list is fetched, and returns what the store saw. */
async function fetchStatuses(...statuses: SyncStatus[]) {
  const { client, requests } = createStatusClient(...statuses);
  const { store, dispatched } = createRecordingStore(client);
  await store.dispatch(backendApi.endpoints.listProjects.initiate());
  for (const _ of statuses)
    await store.dispatch(
      backendApi.endpoints.getSyncStatus.initiate(undefined, {
        forceRefetch: true,
      }),
    );
  const projectListings = () =>
    requests.filter(({ path }) => path === "/projects").length;
  return { dispatched, projectListings };
}

const typesOf = (dispatched: { type: string }[]) =>
  dispatched.map(({ type }) => type);

/** The tags that the dispatched invalidations named. */
const invalidatedTags = (dispatched: { type: string; payload?: unknown }[]) =>
  dispatched
    .filter(({ type }) => type.endsWith("invalidateTags"))
    .flatMap(({ payload }) => payload as string[]);

describe("getSyncStatus", () => {
  it("sends GET /sync/status", async () => {
    const { client, requests } = createStatusClient(syncStatus);
    await createStore(client).dispatch(
      backendApi.endpoints.getSyncStatus.initiate(),
    );
    expect(requests).toEqual([{ method: "GET", path: "/sync/status" }]);
  });

  it("reports nothing on the first answer", async () => {
    const { dispatched } = await fetchStatuses(syncStatus);
    expect(typesOf(dispatched)).not.toContain("syncPulledChanges");
  });

  it("reports changes pulled from the remote", async () => {
    const { dispatched } = await fetchStatuses(syncStatus, {
      ...syncStatus,
      pulled_revision: 2,
    });
    expect(typesOf(dispatched)).toContain("syncPulledChanges");
  });

  it("reports pulled changes when the revision starts over, as after the built-in server restarts", async () => {
    const { dispatched } = await fetchStatuses(syncStatus, {
      ...syncStatus,
      pulled_revision: 0,
    });
    expect(typesOf(dispatched)).toContain("syncPulledChanges");
  });

  it("lists the projects again once changes are pulled", async () => {
    const { projectListings } = await fetchStatuses(syncStatus, {
      ...syncStatus,
      pulled_revision: 2,
    });
    await vi.waitFor(() => expect(projectListings()).toBe(2));
  });

  it("lists the projects again once changes are pushed", async () => {
    const { projectListings } = await fetchStatuses(syncStatus, {
      ...syncStatus,
      link: { ...syncLink, pushed_through_seq: 5 },
    });
    await vi.waitFor(() => expect(projectListings()).toBe(2));
  });

  it("lists the projects again once a change is made on the device", async () => {
    const { projectListings } = await fetchStatuses(syncStatus, {
      ...syncStatus,
      local_change_seq: 5,
    });
    await vi.waitFor(() => expect(projectListings()).toBe(2));
  });

  it("leaves the projects alone while nothing changed", async () => {
    const { projectListings } = await fetchStatuses(syncStatus, syncStatus);
    expect(projectListings()).toBe(1);
  });

  it("checks the storage again once changes are pushed", async () => {
    const { dispatched } = await fetchStatuses(syncStatus, {
      ...syncStatus,
      link: { ...syncLink, pushed_through_seq: 5 },
    });
    expect(invalidatedTags(dispatched)).toContain("StorageStatus");
  });

  it("checks the storage again once an upload ends", async () => {
    const uploading = {
      ...syncStatus,
      link: {
        ...syncLink,
        transfer: {
          media_file_id: "m1",
          name: "film.mkv",
          sent_bytes: 1,
          total_bytes: 2,
        },
      },
    };
    const { dispatched } = await fetchStatuses(uploading, syncStatus);
    expect(invalidatedTags(dispatched)).toContain("StorageStatus");
  });

  it("reports a new latest conflict", async () => {
    const { dispatched } = await fetchStatuses(syncStatus, {
      ...syncStatus,
      link: { ...syncLink, conflicts: [conflict("c2"), conflict("c1")] },
    });
    expect(
      dispatched.filter(({ type }) => type === "syncConflictsReported"),
    ).toEqual([{ type: "syncConflictsReported", conflictId: "c2" }]);
  });

  it("makes the full list of conflicts stale when a new latest conflict arrives", async () => {
    const { dispatched } = await fetchStatuses(syncStatus, {
      ...syncStatus,
      link: { ...syncLink, conflicts: [conflict("c1")] },
    });
    expect(invalidatedTags(dispatched)).toContain("SyncConflicts");
  });

  it("does not report the same latest conflict again", async () => {
    const withConflict = {
      ...syncStatus,
      link: { ...syncLink, conflicts: [conflict("c1")] },
    };
    const { dispatched } = await fetchStatuses(withConflict, withConflict);
    expect(typesOf(dispatched)).not.toContain("syncConflictsReported");
  });
});

const storedCopy = {
  media_file_id: "m1",
  project_id: "p1",
  project_name: "Spanish practice",
  name: "film.mkv",
  size_bytes: 2,
  stored_at_ms: 0,
};

/** Answers the media list, counting how often it is asked for, and every other request with a stored copy. */
function createMediaListClient() {
  let listings = 0;
  const client: BackendClient = {
    send: async <T>(request: BackendRequest) => {
      if (request.path !== "/projects/p1/media")
        return { data: storedCopy as T };
      listings += 1;
      return { data: { media_files: [] } as T };
    },
  };
  return { client, listings: () => listings };
}

describe("the storage endpoints", () => {
  it("send GET /storage for getStorageStatus on the server itself", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.getStorageStatus.initiate("self"),
    );
    expect(client.requests).toEqual([{ method: "GET", path: "/storage" }]);
  });

  it("send GET /sync/remote/storage for getStorageStatus on the linked remote", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.getStorageStatus.initiate("linkedRemote"),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/sync/remote/storage" },
    ]);
  });

  it("put the choice for setUploadChoice", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.setUploadChoice.initiate({
        ...mediaArgs,
        isUploadChosen: true,
      }),
    );
    expect(client.requests).toEqual([
      {
        method: "PUT",
        path: "/projects/p1/media/m1/upload-choice",
        body: { kind: "json", value: { is_upload_chosen: true } },
      },
    ]);
  });

  it("send POST .../stored-copy/fetch for fetchStoredCopy", async () => {
    const client = createRecordingClient();
    await createStore(client).dispatch(
      backendApi.endpoints.fetchStoredCopy.initiate(mediaArgs),
    );
    expect(client.requests).toEqual([
      { method: "POST", path: "/projects/p1/media/m1/stored-copy/fetch" },
    ]);
  });

  it("list the project's media files again once the choice is recorded", async () => {
    const { client, listings } = createMediaListClient();
    const store = createStore(client);
    await store.dispatch(backendApi.endpoints.listMediaFiles.initiate("p1"));
    await store.dispatch(
      backendApi.endpoints.setUploadChoice.initiate({
        ...mediaArgs,
        isUploadChosen: false,
      }),
    );
    await vi.waitFor(() => expect(listings()).toBe(2));
  });

  it("list the project's media files again once a copy is fetched", async () => {
    const { client, listings } = createMediaListClient();
    const store = createStore(client);
    await store.dispatch(backendApi.endpoints.listMediaFiles.initiate("p1"));
    await store.dispatch(
      backendApi.endpoints.fetchStoredCopy.initiate(mediaArgs),
    );
    await vi.waitFor(() => expect(listings()).toBe(2));
  });
});

const parkItem = (status: LibraryItemStatus): LibraryItem => ({
  id: "i1",
  title: "Im Park",
  description: "",
  language: "de",
  translation_language: "en",
  kind: "video",
  difficulty: null,
  tags: [],
  file_name: "park.mp4",
  duration_ms: null,
  cover_at_ms: null,
  has_cover: false,
  segment_count: 1,
  status,
  created_at_ms: 0,
  updated_at_ms: 0,
});

const parkDraft = {
  title: "Im Park",
  description: "",
  language: "de",
  translation_language: "en",
  kind: "video",
  difficulty: null,
  tags: [],
  cover_at_ms: null,
} satisfies LibraryItemDraft;

const hundWord = {
  start: 4,
  end: 8,
  entry: {
    term: "Hund",
    reading: null,
    l1_definition: "dog",
    l2_definition: "",
  },
};

const parkText: LibraryText = {
  segments: [
    {
      index: 0,
      chapter_index: null,
      start_ms: 0,
      end_ms: 1000,
      screenshot_at_ms: null,
      text: "Der Hund.",
      translation: null,
      words: [],
    },
  ],
  chapter_titles: [],
};

/** The requests a library endpoint sends when the client answers every request with a draft item. */
async function libraryRequests(start: unknown) {
  const requests: BackendRequest[] = [];
  const client = {
    requests,
    send: async <T>(request: BackendRequest) => {
      requests.push(request);
      return { data: parkItem({ kind: "draft" }) as T };
    },
  };
  const { dispatch } = createStore(client);
  await (dispatch as (action: unknown) => unknown)(start);
  return client.requests;
}

/** How the server answers a fetch of item i1: with the item in a status, or with 404 once the item is deleted. */
type ItemAnswer = LibraryItemStatus | "gone";

/**
 * A store whose server answers the fetches of item i1 with each answer in turn and then with the last one,
 * a publish with the item processing, and any other request with item i1's listing or text. It counts the requests by method and path.
 */
function createLibraryPollingStore(answers: ItemAnswer[]) {
  const counts = new Map<string, number>();
  const client: BackendClient = {
    send: async <T>({ method, path }: BackendRequest) => {
      const key = `${method} ${path}`;
      const count = counts.get(key) ?? 0;
      counts.set(key, count + 1);
      if (path.endsWith("/publish"))
        return { data: parkItem({ kind: "processing" }) as T };
      if (path === "/library/items") return { data: { items: [] } as T };
      if (path.endsWith("/text")) return { data: parkText as T };
      const answer = answers[Math.min(count, answers.length - 1)];
      return answer === "gone" || answer === undefined
        ? { error: { status: 404, message: "No such item." } }
        : { data: parkItem(answer) as T };
    },
  };
  return { store: createStore(client), counts };
}

/** Counts the requests to a path within `ms` of fetching item i1 after the starting actions, with timers faked. */
async function libraryRequestCount(
  answers: ItemAnswer[],
  key: string,
  ms: number,
  ...starts: unknown[]
) {
  vi.useFakeTimers();
  const { store, counts } = createLibraryPollingStore(answers);
  const dispatch = store.dispatch as (action: unknown) => unknown;
  for (const start of starts) dispatch(start);
  dispatch(backendApi.endpoints.getLibraryItem.initiate("i1"));
  await vi.advanceTimersByTimeAsync(ms);
  vi.useRealTimers();
  return counts.get(key) ?? 0;
}

const itemFetchCount = (answers: ItemAnswer[], ms: number) =>
  libraryRequestCount(answers, "GET /library/items/i1", ms);

/** The cached text of item i1 once the words of its first segment are saved. */
async function textAfterSavingWords() {
  const client: BackendClient = {
    send: async <T>(request: BackendRequest) =>
      request.method === "GET"
        ? { data: parkText as T }
        : { data: { ...parkText.segments[0], words: [hundWord] } as T },
  };
  const store = createStore(client);
  await store.dispatch(backendApi.endpoints.getLibraryText.initiate("i1"));
  await store.dispatch(
    backendApi.endpoints.putLibraryWords.initiate({
      itemId: "i1",
      segmentIndex: 0,
      words: [hundWord],
    }),
  );
  return backendApi.endpoints.getLibraryText.select("i1")(store.getState())
    .data;
}

describe("the library endpoints", () => {
  it("send GET /library/items for listLibraryItems", async () => {
    expect(
      await libraryRequests(backendApi.endpoints.listLibraryItems.initiate()),
    ).toEqual([{ method: "GET", path: "/library/items" }]);
  });

  it("send GET /library/items/{item_id} for getLibraryItem", async () => {
    expect(
      await libraryRequests(backendApi.endpoints.getLibraryItem.initiate("i1")),
    ).toEqual([{ method: "GET", path: "/library/items/i1" }]);
  });

  it("send GET .../text for getLibraryText", async () => {
    expect(
      await libraryRequests(backendApi.endpoints.getLibraryText.initiate("i1")),
    ).toEqual([{ method: "GET", path: "/library/items/i1/text" }]);
  });

  it("post the project for addLibraryItem", async () => {
    expect(
      await libraryRequests(
        backendApi.endpoints.addLibraryItem.initiate({
          itemId: "i1",
          projectId: null,
        }),
      ),
    ).toEqual([
      {
        method: "POST",
        path: "/library/items/i1/add",
        body: { kind: "json", value: { project_id: null } },
      },
    ]);
  });

  it("post the segment and word for createLibraryFlashcard", async () => {
    const card = { id: "f1", segment_index: 0, word_start: 4 };
    expect(
      await libraryRequests(
        backendApi.endpoints.createLibraryFlashcard.initiate({
          ...mediaArgs,
          card,
        }),
      ),
    ).toEqual([
      {
        method: "POST",
        path: "/projects/p1/media/m1/library-flashcards",
        body: { kind: "json", value: card },
      },
    ]);
  });

  it("post the draft for createLibraryItem", async () => {
    expect(
      await libraryRequests(
        backendApi.endpoints.createLibraryItem.initiate(parkDraft),
      ),
    ).toEqual([
      {
        method: "POST",
        path: "/library/items",
        body: { kind: "json", value: parkDraft },
      },
    ]);
  });

  it("put the draft for updateLibraryItem", async () => {
    expect(
      await libraryRequests(
        backendApi.endpoints.updateLibraryItem.initiate({
          itemId: "i1",
          draft: parkDraft,
        }),
      ),
    ).toEqual([
      {
        method: "PUT",
        path: "/library/items/i1",
        body: { kind: "json", value: parkDraft },
      },
    ]);
  });

  it("send DELETE /library/items/{item_id} for deleteLibraryItem", async () => {
    expect(
      await libraryRequests(
        backendApi.endpoints.deleteLibraryItem.initiate("i1"),
      ),
    ).toEqual([{ method: "DELETE", path: "/library/items/i1" }]);
  });

  it("put the subtitle texts for putLibrarySubtitles", async () => {
    const subtitles = {
      target_text: "WEBVTT",
      translation_text: null,
      format: null,
    };
    expect(
      await libraryRequests(
        backendApi.endpoints.putLibrarySubtitles.initiate({
          itemId: "i1",
          subtitles,
        }),
      ),
    ).toEqual([
      {
        method: "PUT",
        path: "/library/items/i1/subtitles",
        body: { kind: "json", value: subtitles },
      },
    ]);
  });

  it("send POST .../proposed-words for proposeLibraryWords", async () => {
    expect(
      await libraryRequests(
        backendApi.endpoints.proposeLibraryWords.initiate("i1"),
      ),
    ).toEqual([{ method: "POST", path: "/library/items/i1/proposed-words" }]);
  });

  it("post the entry and the words' text for applyLibraryEntry", async () => {
    const apply = { word_text: "Hund", entry: hundWord.entry };
    expect(
      await libraryRequests(
        backendApi.endpoints.applyLibraryEntry.initiate({
          itemId: "i1",
          apply,
        }),
      ),
    ).toEqual([
      {
        method: "POST",
        path: "/library/items/i1/apply-entry",
        body: { kind: "json", value: apply },
      },
    ]);
  });

  it("put the words of a segment for putLibraryWords", async () => {
    expect(
      await libraryRequests(
        backendApi.endpoints.putLibraryWords.initiate({
          itemId: "i1",
          segmentIndex: 3,
          words: [hundWord],
        }),
      ),
    ).toEqual([
      {
        method: "PUT",
        path: "/library/items/i1/segments/3/words",
        body: { kind: "json", value: [hundWord] },
      },
    ]);
  });

  it("send POST .../publish for publishLibraryItem", async () => {
    expect(
      await libraryRequests(
        backendApi.endpoints.publishLibraryItem.initiate("i1"),
      ),
    ).toEqual([{ method: "POST", path: "/library/items/i1/publish" }]);
  });

  it("send POST .../unpublish for unpublishLibraryItem", async () => {
    expect(
      await libraryRequests(
        backendApi.endpoints.unpublishLibraryItem.initiate("i1"),
      ),
    ).toEqual([{ method: "POST", path: "/library/items/i1/unpublish" }]);
  });

  it("put the flag for setLibraryManager", async () => {
    expect(
      await libraryRequests(
        backendApi.endpoints.setLibraryManager.initiate({
          userId: "u1",
          managesLibrary: true,
        }),
      ),
    ).toEqual([
      {
        method: "PUT",
        path: "/users/u1/library-manager",
        body: { kind: "json", value: { manages_library: true } },
      },
    ]);
  });

  it("fetch an item being prepared again every two seconds until it is published", async () => {
    const processing = { kind: "processing" } as const;
    const published = { kind: "published" } as const;
    expect(
      await itemFetchCount([processing, processing, published], 7000),
    ).toBe(3);
  });

  it("fetch a published item only once", async () => {
    expect(await itemFetchCount([{ kind: "published" }], 7000)).toBe(1);
  });

  it("stop fetching an item being prepared once a fetch fails", async () => {
    expect(await itemFetchCount([{ kind: "processing" }, "gone"], 7000)).toBe(
      2,
    );
  });

  it("fetch the listing again once an item's preparation ends", async () => {
    expect(
      await libraryRequestCount(
        [{ kind: "processing" }, { kind: "published" }],
        "GET /library/items",
        3000,
        backendApi.endpoints.listLibraryItems.initiate(),
      ),
    ).toBe(2);
  });

  it("fetch the item's text again once its preparation ends", async () => {
    expect(
      await libraryRequestCount(
        [{ kind: "processing" }, { kind: "published" }],
        "GET /library/items/i1/text",
        3000,
        backendApi.endpoints.getLibraryText.initiate("i1"),
      ),
    ).toBe(2);
  });

  it("start fetching an item again once it is published", async () => {
    vi.useFakeTimers();
    const { store, counts } = createLibraryPollingStore([
      { kind: "draft" },
      { kind: "published" },
    ]);
    await store.dispatch(backendApi.endpoints.getLibraryItem.initiate("i1"));
    await store.dispatch(
      backendApi.endpoints.publishLibraryItem.initiate("i1"),
    );
    await vi.advanceTimersByTimeAsync(2100);
    vi.useRealTimers();
    expect(counts.get("GET /library/items/i1")).toBe(2);
  });

  it("put the saved segment into the item's cached text", async () => {
    expect((await textAfterSavingWords())?.segments[0]?.words).toEqual([
      hundWord,
    ]);
  });
});
