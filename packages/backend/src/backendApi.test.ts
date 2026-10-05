import type { LookupResponse, PlaybackRequest } from "@easyimmerse/types";
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

  it("sends the file as a raw body for importDictionary", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    const bytes = new Uint8Array([80, 75]);
    await createStore().dispatch(
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
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.importDictionary.initiate({
        fileName: "oxford.mdx",
        bytes: new Uint8Array(),
      }),
    );
    expect(client.requests[0]?.query).toEqual({ fileName: "oxford.mdx" });
  });

  it("carries the file name in the offline operation for importDictionary", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    const bytes = new Uint8Array();
    await createStore().dispatch(
      backendApi.endpoints.importDictionary.initiate({
        fileName: "words.csv",
        bytes,
      }),
    );
    expect(client.requests[0]?.offlineOperation).toEqual({
      kind: "parseDictionary",
      fileName: "words.csv",
      bytes,
    });
  });

  it("sends DELETE /dictionaries/{id} for deleteDictionary", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.deleteDictionary.initiate("d1"),
    );
    expect(client.requests).toEqual([
      { method: "DELETE", path: "/dictionaries/d1" },
    ]);
  });

  it("puts the text and language in the query string for lookupText", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
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

  it("returns the dictionaries' stylesheets with the lookup results", async () => {
    const response: LookupResponse = {
      results: [],
      kanji: [],
      stylesheets: [{ dictionaryId: "d1", css: "b { color: red }" }],
    };
    configureBackend({
      send: async <T>() => ({ data: response as T }),
    });
    const result = await createStore().dispatch(
      backendApi.endpoints.lookupText.initiate({ text: "猫", language: "ja" }),
    );
    expect(result.data?.stylesheets).toEqual(response.stylesheets);
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

  it("sends DELETE .../track-selection for clearTrackSelection", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.clearTrackSelection.initiate(mediaArgs),
    );
    expect(client.requests).toEqual([
      { method: "DELETE", path: "/projects/p1/media/m1/track-selection" },
    ]);
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

  it("sends GET .../subtitle-tracks for listSubtitleTracks", async () => {
    const client = createRecordingClient();
    configureBackend(client);
    await createStore().dispatch(
      backendApi.endpoints.listSubtitleTracks.initiate(mediaArgs),
    );
    expect(client.requests).toEqual([
      { method: "GET", path: "/projects/p1/media/m1/subtitle-tracks" },
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
});
