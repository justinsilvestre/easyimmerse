import type {
  BackendClient,
  BackendRequest,
  BackendResult,
} from "@easyimmerse/backend";
import type {
  MediaFile,
  MediaTracks,
  PlaybackResponse,
} from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { createResolveMediaPlayback } from "./createResolveMediaPlayback.ts";
import {
  createTestMediaTracks,
  createTestTrack,
} from "./createTestMediaTracks.ts";
import type { BrowserMediaApis } from "./measurePlaybackEnvironment.ts";

const server = { serverUrl: "http://127.0.0.1:8787", token: "secret" };

const pathMedia: MediaFile = {
  id: "m1",
  name: "episode.mkv",
  kind: "video",
  source: { kind: "path", path: "/episode.mkv" },
  duration_ms: null,
  subtitle_tracks: [],
  added_at: "2026-01-01T00:00:00Z",
};

const frierenTracks: MediaTracks = createTestMediaTracks([
  {
    ...createTestTrack(0, "video", "avc1.64001F"),
    video: {
      width: 1920,
      height: 1080,
      frame_rate: { numerator: 25, denominator: 1 },
      pixel_format: null,
    },
  },
  createTestTrack(1, "audio", "mp4a.6B"),
]);

const directResponse: PlaybackResponse = {
  plan: { kind: "direct" },
  playlist_path: null,
};

const convertResponse: PlaybackResponse = {
  plan: {
    kind: "convert",
    video: { track_id: 0, action: { kind: "copy" }, reasons: [] },
    audio: {
      track_id: 1,
      action: { kind: "transcode", target: "aac" },
      reasons: ["codec_unsupported"],
    },
  },
  playlist_path: "/conversions/k1/index.m3u8",
};

const webkitBrowser: BrowserMediaApis = {
  userAgent: "AppleWebKit/605.1.15 (KHTML, like Gecko)",
  canPlayType: () => "",
  isTypeSupported: (mimeType) => mimeType.includes("avc1"),
};

/** Answers the tracks request and the playback request with the given results, and records every request. */
function createFakeClient(
  tracksResult: BackendResult<MediaTracks>,
  playbackResult: BackendResult<PlaybackResponse>,
): BackendClient & { requests: BackendRequest[] } {
  const requests: BackendRequest[] = [];
  return {
    requests,
    send: async <T>(request: BackendRequest) => {
      requests.push(request);
      const isTracks = request.path.endsWith("/tracks");
      return (isTracks ? tracksResult : playbackResult) as BackendResult<T>;
    },
  };
}

function resolveWith(client: BackendClient, media: MediaFile = pathMedia) {
  const resolve = createResolveMediaPlayback(
    server,
    client,
    () => webkitBrowser,
  );
  return resolve("p1", media);
}

describe("createResolveMediaPlayback", () => {
  it("resolves the server's stream URL with the frame duration when the server plans direct playback", async () => {
    const client = createFakeClient(
      { data: frierenTracks },
      { data: directResponse },
    );
    expect(await resolveWith(client)).toEqual({
      kind: "direct",
      url: "http://127.0.0.1:8787/projects/p1/media/m1/stream?token=secret",
      frameDurationMs: 40,
    });
  });

  it("resolves an HLS playback of the playlist when the server plans a conversion", async () => {
    const client = createFakeClient(
      { data: frierenTracks },
      { data: convertResponse },
    );
    expect(await resolveWith(client)).toEqual({
      kind: "hls",
      url: "http://127.0.0.1:8787/conversions/k1/index.m3u8",
      token: "secret",
      frameDurationMs: 40,
    });
  });

  it("posts the environment measured in the browser", async () => {
    const client = createFakeClient(
      { data: frierenTracks },
      { data: directResponse },
    );
    await resolveWith(client);
    expect(client.requests[1]?.body).toEqual({
      kind: "json",
      value: {
        environment: {
          engine: "webkit",
          direct_play: false,
          fmp4_codecs: ["avc1.64001F", "avc1.640033"],
        },
      },
    });
  });

  it("rejects with the server's message when the tracks cannot be read", async () => {
    const client = createFakeClient(
      { error: { status: 404, message: "media not found" } },
      { data: directResponse },
    );
    await expect(resolveWith(client)).rejects.toThrow("media not found");
  });

  it("rejects with a readable reason when the server cannot play the file", async () => {
    const unsupported: PlaybackResponse = {
      plan: { kind: "unsupported", reason: "audio_codec_unsupported" },
      playlist_path: null,
    };
    const client = createFakeClient(
      { data: frierenTracks },
      { data: unsupported },
    );
    await expect(resolveWith(client)).rejects.toThrow("audio codec");
  });

  it("rejects for media stored in a browser", async () => {
    const client = createFakeClient(
      { data: frierenTracks },
      { data: directResponse },
    );
    const browserMedia: MediaFile = {
      ...pathMedia,
      source: { kind: "browser_file", key: "k1" },
    };
    await expect(resolveWith(client, browserMedia)).rejects.toThrow(
      "episode.mkv",
    );
  });
});
