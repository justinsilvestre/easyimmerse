import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { serverCacheWith } from "../../server/serverCacheWith.ts";
import {
  learner,
  withLibraryVideoFor,
} from "../libraryPreparationTestSupport.ts";
import {
  exampleTracksOneEach,
  exampleTracksTwoAudio,
} from "./examplePlayback.ts";
import {
  selectCanChooseTracks,
  selectOpenTracksEntry,
} from "./mediaCacheSelectors.ts";
import { mediaFilesListed } from "./playbackTestActions.ts";

const file = { projectId: "p1", mediaFileId: "m1" };
const opened = stateAfter(actions.openMediaFileRequested("p1", "m1"));

describe("selectCanChooseTracks", () => {
  it("is true for a file with several tracks of a kind", () => {
    const backend = serverCacheWith(
      "getMediaTracks",
      file,
      exampleTracksTwoAudio,
    );
    expect(selectCanChooseTracks({ app: opened, backend })).toBe(true);
  });

  it("is false for a file with one track of each kind", () => {
    const backend = serverCacheWith(
      "getMediaTracks",
      file,
      exampleTracksOneEach,
    );
    expect(selectCanChooseTracks({ app: opened, backend })).toBe(false);
  });

  it("is false for a learner's file from the library, which plays the tracks its library manager chose", () => {
    const backend = serverCacheWith(
      "getMediaTracks",
      file,
      exampleTracksTwoAudio,
      withLibraryVideoFor(learner, { kind: "published" }),
    );
    expect(selectCanChooseTracks({ app: opened, backend })).toBe(false);
  });

  it("is true for a file from the library while its library manager prepares the draft", () => {
    const backend = serverCacheWith(
      "getMediaTracks",
      file,
      exampleTracksTwoAudio,
      withLibraryVideoFor({ kind: "launch" }, { kind: "draft" }),
    );
    expect(selectCanChooseTracks({ app: opened, backend })).toBe(true);
  });

  it("is false outside the media screen", () => {
    const backend = serverCacheWith(
      "getMediaTracks",
      file,
      exampleTracksTwoAudio,
    );
    expect(selectCanChooseTracks({ app: stateAfter(), backend })).toBe(false);
  });
});

describe("selectOpenTracksEntry", () => {
  const backend = serverCacheWith("getMediaTracks", file, exampleTracksOneEach);

  it("is the open file's tracks once the media screen has asked for them", () => {
    const app = stateAfter(
      actions.openMediaFileRequested("p1", "m1"),
      mediaFilesListed(),
    );
    expect(selectOpenTracksEntry({ app, backend })?.data).toBe(
      exampleTracksOneEach,
    );
  });

  it("is undefined before the media screen has asked for them", () => {
    expect(selectOpenTracksEntry({ app: opened, backend })).toBeUndefined();
  });
});
