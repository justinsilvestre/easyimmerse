import { describe, expect, it } from "vitest";
import {
  fakeServer,
  fixtureCopyPlayback,
  fixtureTracksDirect,
} from "../testSupport/mediaFixtureResponses.ts";
import type { PlayerStatusInputs } from "./derivePlayerStatus.ts";
import { derivePlayerStatus } from "./derivePlayerStatus.ts";

const inputs: PlayerStatusInputs = {
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

describe("derivePlayerStatus", () => {
  it("builds the HLS source with the bearer header for a converting plan", () => {
    expect(derivePlayerStatus(inputs)).toMatchObject({
      status: "ready",
      source: {
        kind: "hls",
        url: "http://127.0.0.1:1/conversions/copy0001/index.m3u8",
        authorization: "Bearer t0k3n",
      },
    });
  });

  it("takes the frame rate from the video track", () => {
    expect(derivePlayerStatus(inputs)).toMatchObject({
      frameRate: { num: 24, den: 1 },
    });
  });

  it("fails when a converting plan names no playlist", () => {
    const state = derivePlayerStatus({
      ...inputs,
      playback: { ...fixtureCopyPlayback, playlist_path: null },
    });
    expect(state).toMatchObject({ status: "error" });
  });

  it("reports a tracks error before waiting for the plan", () => {
    const state = derivePlayerStatus({
      ...inputs,
      tracks: undefined,
      tracksError: { message: "Forbidden" },
      playback: undefined,
    });
    expect(state).toEqual({ status: "error", cause: "Forbidden" });
  });

  it("falls back to a plain sentence when an error has no message", () => {
    const state = derivePlayerStatus({ ...inputs, playbackError: {} });
    expect(state).toEqual({
      status: "error",
      cause: "The server did not answer.",
    });
  });
});
