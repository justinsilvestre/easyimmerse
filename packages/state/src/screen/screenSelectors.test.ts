import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import type { ServerRequest } from "../server/serverRequest.ts";
import {
  selectCurrentTime,
  selectOfflineCues,
  selectOfflineParseFailed,
  selectPendingFilePick,
  selectPlayer,
  selectPlayerDuration,
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
});
