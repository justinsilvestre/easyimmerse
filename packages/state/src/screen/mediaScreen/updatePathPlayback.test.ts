import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import {
  exampleTracksOneEach,
  exampleTracksTwoAudio,
  exampleTranscodePlayback,
} from "./examplePlayback.ts";
import { applyToMediaScreen as apply } from "./mediaScreenTestSupport.ts";
import {
  environmentMeasured,
  fileOnDisk,
  mediaFilesListed,
  methodRequestSent,
  methodSettled,
  tracksSettled,
} from "./playbackTestActions.ts";

const loaded = actions.preferencesLoaded({});
const savedChoice = {
  ...fileOnDisk,
  track_selection_json: '{"video":0,"audio":2}',
};

/** The actions that bring m1 to the measured environment, with the given tracks and file. */
const measuredWith = (tracks = exampleTracksOneEach, file = fileOnDisk) => [
  mediaFilesListed(file),
  tracksSettled(tracks),
];

describe("updateMediaScreen", () => {
  describe("for a file on the server's disk", () => {
    it("asks for the tracks of a file on the server's disk once its record arrives", () => {
      const [, effects] = apply(mediaFilesListed());
      expect(effects).toEqual([
        {
          type: "sendRequest",
          id: "media/m1/tracks",
          request: {
            kind: "getMediaTracks",
            projectId: "p1",
            mediaFileId: "m1",
          },
        },
      ]);
    });

    it("asks for no tracks of a file the browser holds", () => {
      const browserFile = {
        ...fileOnDisk,
        source: { kind: "browser_file", size: 1, last_modified_ms: 0 } as const,
      };
      const [, effects] = apply(mediaFilesListed(browserFile));
      expect(effects).not.toContainEqual(
        expect.objectContaining({ id: "media/m1/tracks" }),
      );
    });

    it("keeps the saved track choice once the record arrives", () => {
      const [screen] = apply(mediaFilesListed(savedChoice));
      expect(screen.playback?.selection).toEqual({ video: 0, audio: 2 });
    });

    it("measures the browser once the tracks arrive", () => {
      const [, effects] = apply(
        tracksSettled(exampleTracksOneEach),
        mediaFilesListed(),
      );
      expect(effects).toEqual([
        {
          type: "measurePlaybackEnvironment",
          mediaFileId: "m1",
          directMimeType: exampleTracksOneEach.direct_mime_type,
          codecStrings: ["avc1.4D000C", "mp4a.40.2"],
        },
      ]);
    });

    it("asks for the playback method once the browser is measured", () => {
      const [, effects] = apply(environmentMeasured, loaded, ...measuredWith());
      expect(effects).toEqual([methodRequestSent(null)]);
    });

    it("sends the saved choice with the playback method request", () => {
      const [, effects] = apply(
        environmentMeasured,
        loaded,
        ...measuredWith(exampleTracksOneEach, savedChoice),
      );
      expect(effects).toEqual([methodRequestSent({ video: 0, audio: 2 })]);
    });

    it("asks for FLAC when lossless audio is preferred", () => {
      const [, effects] = apply(
        environmentMeasured,
        actions.preferencesLoaded({ losslessAudio: "true" }),
        ...measuredWith(),
      );
      expect(effects).toEqual([methodRequestSent(null, "flac")]);
    });

    it("waits for the preferences before asking for the playback method", () => {
      const [, effects] = apply(environmentMeasured, ...measuredWith());
      expect(effects).toEqual([]);
    });

    it("asks for FLAC when the preferences load after the file opens", () => {
      const [, effects] = apply(
        actions.preferencesLoaded({ losslessAudio: "true" }),
        ...measuredWith(),
        environmentMeasured,
      );
      expect(effects).toEqual([methodRequestSent(null, "flac")]);
    });

    it("holds the playback method request while the first track choice is open", () => {
      const [, effects] = apply(
        environmentMeasured,
        loaded,
        ...measuredWith(exampleTracksTwoAudio),
      );
      expect(effects).toEqual([]);
    });

    it("asks for a playback method with the chosen tracks", () => {
      const [, effects] = apply(
        actions.tracksChosen({ video: 0, audio: 2 }),
        loaded,
        ...measuredWith(exampleTracksTwoAudio),
        environmentMeasured,
      );
      expect(effects).toContainEqual(methodRequestSent({ video: 0, audio: 2 }));
    });

    it("saves the chosen tracks through the server", () => {
      const [, effects] = apply(
        actions.tracksChosen({ video: 0, audio: 2 }),
        loaded,
        ...measuredWith(exampleTracksTwoAudio),
        environmentMeasured,
      );
      expect(effects).toContainEqual({
        type: "sendRequest",
        id: "media/m1/saveTrackSelection",
        request: {
          kind: "saveTrackSelection",
          projectId: "p1",
          mediaFileId: "m1",
          selection: { video: 0, audio: 2 },
        },
      });
    });

    it("asks for a playback method with no selection when the first choice is cancelled", () => {
      const [, effects] = apply(
        actions.trackChoiceCancelled(),
        loaded,
        ...measuredWith(exampleTracksTwoAudio),
        environmentMeasured,
      );
      expect(effects).toEqual([methodRequestSent(null)]);
    });

    it("keeps the first request's audio target when the tracks change", () => {
      const [, effects] = apply(
        actions.tracksChosen({ video: 0, audio: 1 }),
        actions.preferencesLoaded({ losslessAudio: "true" }),
        ...measuredWith(),
        environmentMeasured,
        actions.preferenceSet("losslessAudio", "false"),
      );
      expect(effects).toContainEqual(
        methodRequestSent({ video: 0, audio: 1 }, "flac"),
      );
    });

    it("leaves the playback method request alone when the preference changes", () => {
      const [, effects] = apply(
        actions.preferenceSet("losslessAudio", "true"),
        loaded,
        ...measuredWith(),
        environmentMeasured,
      );
      expect(effects).toEqual([]);
    });

    it("sends nothing when the track choice is reopened", () => {
      const [, effects] = apply(
        actions.trackChoiceRequested(),
        loaded,
        ...measuredWith(),
        environmentMeasured,
      );
      expect(effects).toEqual([]);
    });

    it("remembers that the notice is due when a playback method calls for it while the track choice is open", () => {
      const [screen] = apply(
        methodSettled(exampleTranscodePlayback),
        loaded,
        ...measuredWith(),
        environmentMeasured,
        actions.trackChoiceRequested(),
      );
      expect(screen.playback?.noticeDue).toBe(true);
    });

    it("records that the user let the conversion go ahead", () => {
      const [screen] = apply(
        actions.conversionNoticeAccepted(),
        mediaFilesListed(),
      );
      expect(screen.playback?.isConversionAccepted).toBe(true);
    });
  });
});
