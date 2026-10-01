import type { PlaybackResponse } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { mediaPlaybackFromResponse } from "./mediaPlaybackFromResponse.ts";

const server = { serverUrl: "http://127.0.0.1:8787", token: "secret" };
const directUrl =
  "http://127.0.0.1:8787/projects/p1/media/m1/stream?token=secret";

const convertResponse: PlaybackResponse = {
  plan: {
    kind: "convert",
    video: { track_id: 0, action: { kind: "copy" }, reasons: [] },
    audio: null,
  },
  playlist_path: "/conversions/k1/index.m3u8",
};

describe("mediaPlaybackFromResponse", () => {
  it("plays the original file for a direct plan", () => {
    const response: PlaybackResponse = {
      plan: { kind: "direct" },
      playlist_path: null,
    };
    expect(mediaPlaybackFromResponse(response, server, directUrl)).toEqual({
      kind: "direct",
      url: directUrl,
    });
  });

  it("streams the server's playlist with the bearer token for a conversion plan", () => {
    expect(
      mediaPlaybackFromResponse(convertResponse, server, directUrl),
    ).toEqual({
      kind: "hls",
      url: "http://127.0.0.1:8787/conversions/k1/index.m3u8",
      token: "secret",
    });
  });

  it("throws when a conversion plan comes without a playlist", () => {
    const response = { ...convertResponse, playlist_path: null };
    expect(() =>
      mediaPlaybackFromResponse(response, server, directUrl),
    ).toThrow("playlist");
  });

  it("throws a readable reason for an unsupported plan", () => {
    const response: PlaybackResponse = {
      plan: { kind: "unsupported", reason: "video_codec_unsupported" },
      playlist_path: null,
    };
    expect(() =>
      mediaPlaybackFromResponse(response, server, directUrl),
    ).toThrow("video codec");
  });

  it("explains when the server cannot convert", () => {
    const response: PlaybackResponse = {
      plan: { kind: "unsupported", reason: "conversion_unavailable" },
      playlist_path: null,
    };
    expect(() =>
      mediaPlaybackFromResponse(response, server, directUrl),
    ).toThrow("conversion is not available");
  });
});
