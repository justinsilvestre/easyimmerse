import type { SubtitleSelection } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { transientNotice } from "../../notices/transientNotice.ts";
import type { PickedFile } from "../../platform/effects.ts";
import type { ServerRequest } from "../../server/serverRequest.ts";
import { applyToMediaScreen as apply } from "./mediaScreenTestSupport.ts";

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

const choose = (...args: Parameters<typeof actions.subtitleTrackChosen>) =>
  apply(actions.subtitleTrackChosen(...args))[1];

describe("updateMediaScreen", () => {
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
          type: "dispatch",
          action: actions.noticeRequested(
            transientNotice("danger", "The subtitles file could not be added"),
          ),
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

  describe("for the chosen subtitle tracks", () => {
    it("saves the shown selection with the chosen translation track", () => {
      expect(choose("translation", "s2", targetShown)).toEqual([
        {
          type: "sendRequest",
          id: "media/m1/subtitleSelection/s1/s2",
          request: {
            kind: "setSubtitleSelection",
            projectId: "p1",
            mediaFileId: "m1",
            selection: { target_track_id: "s1", translation_track_id: "s2" },
          },
        },
      ]);
    });

    it("names an emptied role as none in the request's id", () => {
      expect(choose("target", null, targetShown)).toMatchObject([
        { id: "media/m1/subtitleSelection/none/none" },
      ]);
    });

    it("saves no selection for another action", () => {
      const [, effects] = apply(actions.playRequested());
      expect(effects).not.toContainEqual(
        expect.objectContaining({ type: "sendRequest" }),
      );
    });
  });
});
