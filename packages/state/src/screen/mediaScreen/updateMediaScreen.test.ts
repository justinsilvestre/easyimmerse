import type { SubtitleSelection } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import type { PickedFile } from "../../platform/effects.ts";
import type { ServerRequest } from "../../server/serverRequest.ts";
import type { MediaScreenState } from "../screenState.ts";
import { updateMediaScreen } from "./updateMediaScreen.ts";

/** Applies an action to the media screen of m1 after the given earlier actions. */
const apply = (action: AppAction, ...before: AppAction[]) => {
  const main = stateAfter(actions.openMediaFileRequested("p1", "m1"), ...before)
    .screen.main as MediaScreenState;
  return updateMediaScreen(main, action, route);
};

const route = { screen: "media", projectId: "p1", mediaFileId: "m1" } as const;

const srt: PickedFile = {
  name: "english.srt",
  source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHi" },
};

const tracksRequest: ServerRequest = {
  kind: "listSubtitleTracks",
  projectId: "p1",
  mediaFileId: "m1",
};

const tracksListed = (selection: SubtitleSelection) =>
  actions.requestSettled("media/m1/listSubtitleTracks", tracksRequest, {
    ok: true,
    data: { tracks: [], selection },
  });

const tracksFailed = actions.requestSettled(
  "media/m1/listSubtitleTracks",
  tracksRequest,
  { ok: false, error: { status: 500, message: "down" } },
);

const targetShown: SubtitleSelection = {
  target_track_id: "s1",
  translation_track_id: null,
};

describe("updateMediaScreen", () => {
  it("stores the target as the current time for seekRequested", () => {
    const [screen] = apply(actions.seekRequested(12.5));
    expect(screen.player.currentTimeSeconds).toBe(12.5);
  });

  it("returns a seekPlayer effect for seekRequested", () => {
    const [, effects] = apply(actions.seekRequested(12.5));
    expect(effects).toEqual([{ type: "seekPlayer", seconds: 12.5 }]);
  });

  it("stores the current time for playerTimeChanged", () => {
    const [screen] = apply(actions.playerTimeChanged(3));
    expect(screen.player.currentTimeSeconds).toBe(3);
  });

  it("keeps the duration for playerTimeChanged", () => {
    const [screen] = apply(
      actions.playerTimeChanged(3),
      actions.playerDurationChanged(60),
    );
    expect(screen.player.durationSeconds).toBe(60);
  });

  it("stores the duration for playerDurationChanged", () => {
    const [screen] = apply(actions.playerDurationChanged(90));
    expect(screen.player.durationSeconds).toBe(90);
  });

  it("stores what the player has loaded for playerBufferedChanged", () => {
    const buffered = [{ startSeconds: 0, endSeconds: 30 }];
    const [screen] = apply(actions.playerBufferedChanged(buffered));
    expect(screen.player.buffered).toEqual(buffered);
  });

  it("returns no effects for playerTimeChanged", () => {
    const [, effects] = apply(actions.playerTimeChanged(3));
    expect(effects).toEqual([]);
  });

  it("returns a playPlayer effect for playRequested", () => {
    const [, effects] = apply(actions.playRequested());
    expect(effects).toEqual([{ type: "playPlayer" }]);
  });

  it("returns a pausePlayer effect for pauseRequested", () => {
    const [, effects] = apply(actions.pauseRequested());
    expect(effects).toEqual([{ type: "pausePlayer" }]);
  });

  it("returns a togglePlayer effect for playToggleRequested", () => {
    const [, effects] = apply(actions.playToggleRequested());
    expect(effects).toEqual([{ type: "togglePlayer" }]);
  });

  it("stores whether the player plays for playerPlayingChanged", () => {
    const [screen] = apply(actions.playerPlayingChanged(true));
    expect(screen.player.isPlaying).toBe(true);
  });

  describe("for a picked subtitles file", () => {
    it("keeps the chosen file", () => {
      const [screen] = apply(actions.subtitleFileChosen(srt));
      expect(screen.pendingSubtitleFile).toEqual(srt);
    });

    it("asks for the tracks once a subtitles file is chosen", () => {
      const [, effects] = apply(actions.subtitleFileChosen(srt));
      expect(effects).toEqual([
        {
          type: "sendRequest",
          id: "media/m1/listSubtitleTracks",
          request: tracksRequest,
        },
      ]);
    });

    it("sends the chosen file as the role the selection leaves for it", () => {
      const [, effects] = apply(
        tracksListed(targetShown),
        actions.subtitleFileChosen(srt),
      );
      expect(effects).toEqual([
        {
          type: "sendRequest",
          id: "media/m1/addSubtitleTrack",
          request: {
            kind: "addSubtitleTrack",
            projectId: "p1",
            mediaFileId: "m1",
            request: {
              name: "english.srt",
              source: srt.source,
              format: null,
              role: "translation",
            },
          },
        },
      ]);
    });

    it("forgets the chosen file once it is sent", () => {
      const [screen] = apply(
        tracksListed(targetShown),
        actions.subtitleFileChosen(srt),
      );
      expect(screen.pendingSubtitleFile).toBeNull();
    });

    it("says the file could not be added when the tracks could not be listed", () => {
      const [, effects] = apply(tracksFailed, actions.subtitleFileChosen(srt));
      expect(effects).toEqual([
        {
          type: "showNotification",
          message: "The subtitles file could not be added",
        },
      ]);
    });

    it("forgets the chosen file when the tracks could not be listed", () => {
      const [screen] = apply(tracksFailed, actions.subtitleFileChosen(srt));
      expect(screen.pendingSubtitleFile).toBeNull();
    });

    it("ignores a listing it did not ask for", () => {
      const [, effects] = apply(
        actions.requestSettled("other", tracksRequest, {
          ok: true,
          data: { tracks: [], selection: targetShown },
        }),
        actions.subtitleFileChosen(srt),
      );
      expect(effects).toEqual([]);
    });

    it("ignores a listing once no file is chosen", () => {
      const [, effects] = apply(tracksListed(targetShown));
      expect(effects).toEqual([]);
    });
  });
});
