import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import type { PickedFile } from "../../platform/effects.ts";
import type { ServerRequest } from "../../server/serverRequest.ts";
import type { OfflineScreenState } from "../screenState.ts";
import { updateOfflineScreen } from "./updateOfflineScreen.ts";

const picked: PickedFile = {
  name: "sample.srt",
  source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHi" },
};

const parseRequest: ServerRequest = {
  kind: "parseTimedText",
  request: { source: picked.source, format: null },
};

const cue: Cue = { index: 1, start_ms: 1000, end_ms: 2000, text: "Hi" };

const empty: OfflineScreenState = {
  kind: "offline",
  cues: [],
  hasFailed: false,
};

const parsed = actions.requestSettled("offline/parseTimedText", parseRequest, {
  ok: true,
  data: { format: "srt", cues: [cue] },
});

const failed = actions.requestSettled("offline/parseTimedText", parseRequest, {
  ok: false,
  error: { status: 400, message: "not a subtitles file" },
});

describe("updateOfflineScreen", () => {
  it("asks for the picked subtitles file to be parsed", () => {
    const [, effects] = updateOfflineScreen(
      empty,
      actions.subtitleFileChosen(picked),
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "offline/parseTimedText",
        request: parseRequest,
      },
    ]);
  });

  it("clears the cues shown while a new file is parsed", () => {
    const [screen] = updateOfflineScreen(
      { kind: "offline", cues: [cue], hasFailed: true },
      actions.subtitleFileChosen(picked),
    );
    expect(screen).toEqual(empty);
  });

  it("keeps the cues of the parsed file", () => {
    const [screen] = updateOfflineScreen(empty, parsed);
    expect(screen.cues).toEqual([cue]);
  });

  it("marks the parse as failed", () => {
    const [screen] = updateOfflineScreen(empty, failed);
    expect(screen.hasFailed).toBe(true);
  });

  it("ignores a request that another feature sent", () => {
    const [screen] = updateOfflineScreen(
      empty,
      actions.requestSettled("other", parseRequest, {
        ok: true,
        data: { format: "srt", cues: [cue] },
      }),
    );
    expect(screen).toBe(empty);
  });
});
