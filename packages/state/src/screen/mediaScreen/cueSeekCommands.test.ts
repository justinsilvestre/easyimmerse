import type { SubtitleTracksResponse } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { dispatch } from "../../app/dispatchEffect.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import type { ServerCacheSlice } from "../../server/cacheEntry.ts";
import {
  emptyServerCache,
  serverCacheWith,
} from "../../server/serverCacheWith.ts";
import { cueSeekCommands } from "./cueSeekCommands.ts";
import { exampleCues } from "./exampleCues.ts";

const file = { projectId: "p1", mediaFileId: "m1" };

/** The cache after the subtitle tracks of m1 are listed with the given track chosen for the target language. */
const tracksListed = (targetTrackId: string | null) => {
  const data: SubtitleTracksResponse = {
    tracks: [],
    selection: { target_track_id: targetTrackId, translation_track_id: null },
  };
  return serverCacheWith("listSubtitleTracks", file, data);
};

/** The cache with t1 chosen for the target language and the example cues loaded for it. */
const withCues = serverCacheWith(
  "getSubtitleCues",
  { ...file, trackId: "t1" },
  { format: "srt", cues: [...exampleCues] },
  tracksListed("t1"),
);

/** The media screen of m1, with its file 24 seconds long and the player at the given time. */
const playingAt = (seconds: number, ...before: AppAction[]) =>
  stateAfter(
    actions.openMediaFileRequested("p1", "m1"),
    actions.playerDurationChanged(24),
    actions.playerTimeChanged(seconds),
    ...before,
  );

const apply = (
  action: AppAction,
  seconds: number,
  backend: ServerCacheSlice = withCues,
) => cueSeekCommands(action, { ...playingAt(seconds), backend });

const seekTo = (seconds: number) => [dispatch(actions.seekRequested(seconds))];

describe("cueSeekCommands", () => {
  describe("for cueSkipRequested forward", () => {
    const forward = actions.cueSkipRequested("forward");

    it("seeks to the start of the next cue", () => {
      expect(apply(forward, 6)).toEqual(seekTo(8.6));
    });

    it("seeks to the first cue from before it", () => {
      expect(apply(forward, 0.1)).toEqual(seekTo(0.5));
    });

    it("seeks a few seconds on, within the file, after the last cue", () => {
      expect(apply(forward, 22)).toEqual(seekTo(24));
    });

    it("seeks a few seconds on while no track is chosen", () => {
      expect(apply(forward, 6, tracksListed(null))).toEqual(seekTo(11));
    });

    it("seeks a few seconds on while the cache holds neither tracks nor cues", () => {
      expect(apply(forward, 6, emptyServerCache)).toEqual(seekTo(11));
    });

    it("does nothing outside the media screen", () => {
      const app = { ...stateAfter(), backend: withCues };
      expect(cueSeekCommands(forward, app)).toEqual([]);
    });
  });

  describe("for cueSkipRequested back", () => {
    const back = actions.cueSkipRequested("back");

    it("seeks to the start of the current cue once well into it", () => {
      expect(apply(back, 7)).toEqual(seekTo(5.4));
    });

    it("seeks to the previous cue from the start of a cue", () => {
      expect(apply(back, 5.5)).toEqual(seekTo(2.8));
    });

    it("seeks to the start of the file from before the first cue", () => {
      expect(apply(back, 0.3)).toEqual(seekTo(0));
    });

    it("seeks to the last cue from after it", () => {
      expect(apply(back, 23.5)).toEqual(seekTo(21.5));
    });

    it("seeks a few seconds back while no track is chosen", () => {
      expect(apply(back, 12, tracksListed(null))).toEqual(seekTo(7));
    });
  });

  describe("for cueReplayRequested", () => {
    const replay = actions.cueReplayRequested();

    it("seeks to the start of the cue shown now", () => {
      expect(apply(replay, 7)).toEqual(seekTo(5.4));
    });

    it("seeks to the start of the last cue after it ends", () => {
      expect(apply(replay, 23.5)).toEqual(seekTo(21.5));
    });

    it("seeks to the start of the file from before the first cue", () => {
      expect(apply(replay, 0.3)).toEqual(seekTo(0));
    });

    it("seeks a few seconds back while no track is chosen", () => {
      expect(apply(replay, 12, tracksListed(null))).toEqual(seekTo(7));
    });

    it("does nothing for an unrelated action", () => {
      expect(apply(actions.playRequested(), 7)).toEqual([]);
    });
  });
});
