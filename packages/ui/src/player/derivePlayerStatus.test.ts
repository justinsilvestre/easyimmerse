import { describe, expect, it } from "vitest";
import {
  fakeServer,
  fixtureCopyPlayback,
  fixtureTracksDirect,
} from "../testSupport/mediaFixtureResponses.ts";
import type { PlaybackInputs } from "./derivePlaybackState.ts";
import { derivePlaybackState } from "./derivePlaybackState.ts";

const inputs: PlaybackInputs = {
  server: fakeServer,
  projectId: "p1",
  mediaFileId: "m1",
  tracks: fixtureTracksDirect,
  tracksError: undefined,
  playback: fixtureCopyPlayback,
  playbackError: undefined,
  selection: null,
  noticeSettled: false,
};

describe("derivePlaybackState", () => {
  it("builds the HLS source with the bearer header for a converting plan", () => {
    expect(derivePlaybackState(inputs)).toMatchObject({
      status: "ready",
      source: {
        kind: "hls",
        url: "http://127.0.0.1:1/conversions/copy0001/index.m3u8",
        authorization: "Bearer t0k3n",
      },
    });
  });

  it("takes the frame rate from the video track", () => {
    expect(derivePlaybackState(inputs)).toMatchObject({
      frameRate: { num: 24, den: 1 },
    });
  });

  it("fails when a converting plan names no playlist", () => {
    const state = derivePlaybackState({
      ...inputs,
      playback: { ...fixtureCopyPlayback, playlist_path: null },
    });
    expect(state).toMatchObject({ status: "error" });
  });

  it("reports a tracks error before waiting for the plan", () => {
    const state = derivePlaybackState({
      ...inputs,
      tracks: undefined,
      tracksError: { message: "Forbidden" },
      playback: undefined,
    });
    expect(state).toEqual({ status: "error", cause: "Forbidden" });
  });

  it("falls back to a plain sentence when an error has no message", () => {
    const state = derivePlaybackState({ ...inputs, playbackError: {} });
    expect(state).toEqual({
      status: "error",
      cause: "The server did not answer.",
    });
  });
});
