import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import { initialMediaPanels } from "./mediaScreen/mediaPanels.ts";
import {
  selectCurrentTime,
  selectDictionaryRemovalQuestion,
  selectIsSubtitleAppearanceOpen,
  selectMediaPanels,
  selectOfflineCues,
  selectOfflineParseFailed,
  selectPendingFilePick,
  selectPlayer,
  selectPlayerDuration,
  selectPlayerFailure,
} from "./screenSelectors.ts";

const parseSource = { kind: "inline", text: "" } as const;

const parseRequest: ServerRequest = {
  kind: "parseTimedText",
  request: { source: parseSource, format: null },
};

const cue: Cue = { index: 1, start_ms: 0, end_ms: 1000, text: "Hi" };

const playing = {
  app: stateAfter(
    actions.openMediaFileRequested("p1", "m1"),
    actions.playerDurationChanged(90),
    actions.playerTimeChanged(4),
    actions.subtitleFilePickRequested(),
  ),
};

describe("screenSelectors", () => {
  it("selectCurrentTime returns the player's current time", () => {
    expect(selectCurrentTime(playing)).toBe(4);
  });

  it("selectPlayerDuration returns the loaded file's duration", () => {
    expect(selectPlayerDuration(playing)).toBe(90);
  });

  it("selectPlayer returns the whole player state", () => {
    expect(selectPlayer(playing)).toEqual({
      currentTimeSeconds: 4,
      durationSeconds: 90,
      buffered: [],
      isPlaying: false,
      lastSeekSeconds: null,
      failure: null,
    });
  });

  it("selectPlayer returns an idle player while no media screen is open", () => {
    expect(selectPlayer({ app: stateAfter() }).durationSeconds).toBe(0);
  });

  it("selectPendingFilePick returns whether a file pick is pending", () => {
    expect(selectPendingFilePick(playing)).toBe(true);
  });

  it("selectOfflineCues returns the cues of the file parsed offline", () => {
    const parsed = {
      app: stateAfter(
        actions.navigated({ type: "continueOffline" }),
        actions.subtitleFileChosen({ name: "a.srt", source: parseSource }),
        actions.requestSettled("offline/parseTimedText", parseRequest, {
          ok: true,
          data: { format: "srt", cues: [cue] },
        }),
      ),
    };
    expect(selectOfflineCues(parsed)).toEqual([cue]);
  });

  it("selectOfflineParseFailed tells whether the offline parse failed", () => {
    const failed = {
      app: stateAfter(
        actions.navigated({ type: "continueOffline" }),
        actions.subtitleFileChosen({ name: "a.srt", source: parseSource }),
        actions.requestSettled("offline/parseTimedText", parseRequest, {
          ok: false,
          error: { status: 400, message: "not a subtitles file" },
        }),
      ),
    };
    expect(selectOfflineParseFailed(failed)).toBe(true);
  });

  describe("selectPlayerFailure", () => {
    const failed = {
      app: stateAfter(
        actions.openMediaFileRequested("p1", "m1"),
        actions.playerFailed("a.mp4", "It is damaged."),
      ),
    };

    it("returns the cause of a failure on the source", () => {
      expect(selectPlayerFailure(failed, "a.mp4")).toBe("It is damaged.");
    });

    it("returns null for another source", () => {
      expect(selectPlayerFailure(failed, "b.m3u8")).toBeNull();
    });

    it("returns null once another media file opens", () => {
      const reopened = {
        app: stateAfter(
          actions.openMediaFileRequested("p1", "m1"),
          actions.playerFailed("a.mp4", "It is damaged."),
          actions.openMediaFileRequested("p1", "m2"),
        ),
      };
      expect(selectPlayerFailure(reopened, "a.mp4")).toBeNull();
    });
  });

  describe("selectMediaPanels", () => {
    const openM1 = actions.openMediaFileRequested("p1", "m1");

    it("returns the open media screen's panels", () => {
      const state = { app: stateAfter(openM1, actions.waveformToggled()) };
      expect(selectMediaPanels(state).waveform).toBe(true);
    });

    it("returns the panels a media screen starts with once another file opens", () => {
      const state = {
        app: stateAfter(
          openM1,
          actions.waveformToggled(),
          actions.openMediaFileRequested("p1", "m2"),
        ),
      };
      expect(selectMediaPanels(state)).toEqual(initialMediaPanels);
    });

    it("returns the panels a media screen starts with while none is open", () => {
      expect(selectMediaPanels({ app: stateAfter() })).toEqual(
        initialMediaPanels,
      );
    });
  });

  describe("selectIsSubtitleAppearanceOpen", () => {
    it("tells that the subtitle appearance dialog is open", () => {
      const state = {
        app: stateAfter(
          actions.openMediaFileRequested("p1", "m1"),
          actions.subtitleAppearanceOpened(),
        ),
      };
      expect(selectIsSubtitleAppearanceOpen(state)).toBe(true);
    });

    it("tells that it is closed while another dialog is open", () => {
      expect(selectIsSubtitleAppearanceOpen(playing)).toBe(false);
    });
  });

  it("selectDictionaryRemovalQuestion returns the dictionary the removal question asks about", () => {
    const app = stateAfter(
      actions.navigated({ type: "openDictionaries" }),
      actions.dictionaryRemovalRequested("d1"),
    );
    expect(selectDictionaryRemovalQuestion({ app })).toBe("d1");
  });
});
