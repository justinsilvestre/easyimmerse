import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import type { MediaScreenState } from "../screenState.ts";
import {
  exampleTracksOneEach,
  exampleTracksTwoAudio,
  exampleTranscodePlayback,
} from "./examplePlayback.ts";
import {
  environmentMeasured,
  fileOnDisk,
  mediaFilesListed,
  planSent,
  planSettled,
  tracksSettled,
} from "./playbackTestActions.ts";
import { updatePathPlayback } from "./updatePathPlayback.ts";

const route = { screen: "media", projectId: "p1", mediaFileId: "m1" } as const;
const loaded = actions.preferencesLoaded({});
const savedChoice = {
  ...fileOnDisk,
  track_selection_json: '{"video":0,"audio":2}',
};

/** Applies an action to the media screen of m1 after the given earlier actions. */
const apply = (action: AppAction, ...before: AppAction[]) => {
  const app = stateAfter(actions.openMediaFileRequested("p1", "m1"), ...before);
  const screen = app.screen.main as MediaScreenState;
  return updatePathPlayback(screen, action, route, app);
};

/** The actions that bring m1 to the measured environment, with the given tracks and file. */
const measuredWith = (tracks = exampleTracksOneEach, file = fileOnDisk) => [
  mediaFilesListed(file),
  tracksSettled(tracks),
];

describe("updatePathPlayback", () => {
  it("asks for the tracks of a file on the server's disk once its record arrives", () => {
    const [, effects] = apply(mediaFilesListed());
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "media/m1/tracks",
        request: { kind: "getMediaTracks", projectId: "p1", mediaFileId: "m1" },
      },
    ]);
  });

  it("asks nothing for a file the browser holds", () => {
    const browserFile = {
      ...fileOnDisk,
      source: { kind: "browser_file", size: 1, last_modified_ms: 0 } as const,
    };
    const [, effects] = apply(mediaFilesListed(browserFile));
    expect(effects).toEqual([]);
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

  it("asks for the plan once the browser is measured", () => {
    const [, effects] = apply(environmentMeasured, loaded, ...measuredWith());
    expect(effects).toEqual([planSent(null)]);
  });

  it("sends the saved choice with the plan", () => {
    const [, effects] = apply(
      environmentMeasured,
      loaded,
      ...measuredWith(exampleTracksOneEach, savedChoice),
    );
    expect(effects).toEqual([planSent({ video: 0, audio: 2 })]);
  });

  it("asks for FLAC when lossless audio is preferred", () => {
    const [, effects] = apply(
      environmentMeasured,
      actions.preferencesLoaded({ losslessAudio: "true" }),
      ...measuredWith(),
    );
    expect(effects).toEqual([planSent(null, "flac")]);
  });

  it("waits for the preferences before asking for the plan", () => {
    const [, effects] = apply(environmentMeasured, ...measuredWith());
    expect(effects).toEqual([]);
  });

  it("asks for FLAC when the preferences load after the file opens", () => {
    const [, effects] = apply(
      actions.preferencesLoaded({ losslessAudio: "true" }),
      ...measuredWith(),
      environmentMeasured,
    );
    expect(effects).toEqual([planSent(null, "flac")]);
  });

  it("holds the plan while the first track choice is open", () => {
    const [, effects] = apply(
      environmentMeasured,
      loaded,
      ...measuredWith(exampleTracksTwoAudio),
    );
    expect(effects).toEqual([]);
  });

  it("asks for a plan with the chosen tracks", () => {
    const [, effects] = apply(
      actions.tracksChosen({ video: 0, audio: 2 }),
      loaded,
      ...measuredWith(exampleTracksTwoAudio),
      environmentMeasured,
    );
    expect(effects).toContainEqual(planSent({ video: 0, audio: 2 }));
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

  it("plans with no selection when the first choice is cancelled", () => {
    const [, effects] = apply(
      actions.trackChoiceCancelled(),
      loaded,
      ...measuredWith(exampleTracksTwoAudio),
      environmentMeasured,
    );
    expect(effects).toEqual([planSent(null)]);
  });

  it("keeps the first plan's audio target when the tracks change", () => {
    const [, effects] = apply(
      actions.tracksChosen({ video: 0, audio: 1 }),
      actions.preferencesLoaded({ losslessAudio: "true" }),
      ...measuredWith(),
      environmentMeasured,
      actions.preferenceSet("losslessAudio", "false"),
    );
    expect(effects).toContainEqual(planSent({ video: 0, audio: 1 }, "flac"));
  });

  it("leaves the plan alone when the preference changes", () => {
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

  it("remembers that the notice is due when a plan calls for it while the track choice is open", () => {
    const [screen] = apply(
      planSettled(exampleTranscodePlayback),
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
