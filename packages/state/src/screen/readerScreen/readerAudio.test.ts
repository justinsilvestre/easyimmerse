import type { ListMediaFilesResponse, MediaFile } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { exampleKeyPress } from "../../keys/exampleKeyPress.ts";
import { bindAction } from "../../keys/keyBinding.ts";
import { selectReaderKeyBinding } from "../../keys/selectReaderKeyBinding.ts";
import { exampleMediaFile } from "../../server/exampleMediaFile.ts";
import { withEmptyServerCache } from "../../server/serverCacheWith.ts";
import { updateStoredPlaces } from "../../storedPlaces/updateStoredPlaces.ts";
import { exampleEnvironment } from "../mediaScreen/examplePlayback.ts";
import { selectPlayedMediaFile } from "../mediaScreen/playedMediaFile.ts";
import { updateMediaScreen } from "../mediaScreen/updateMediaScreen.ts";
import type { MediaScreenState } from "../screenState.ts";
import { selectReaderAudioMediaFileId } from "./readerAudioSelectors.ts";

const book: MediaFile = exampleMediaFile("b1", "sample.epub");
const audioOnDisk: MediaFile = exampleMediaFile("a1", "sample.mp3");
const audioInBrowser: MediaFile = {
  ...audioOnDisk,
  source: { kind: "browser_file", size: 1000, last_modified_ms: 0 },
};

const openBook = actions.openMediaFileRequested("p1", "b1");
const audioOpened = actions.readerAudioOpened(audioOnDisk);

/** The app with book b1 open in the reader, after the given actions. */
const reading = (...done: AppAction[]) => stateAfter(openBook, ...done);

/** Applies an action to the reader's media screen state after the given earlier actions. */
function applyToReader(action: AppAction, ...before: AppAction[]) {
  const app = reading(...before);
  return updateMediaScreen(
    app.screen.main as MediaScreenState,
    action,
    withEmptyServerCache(app),
  );
}

/** Applies an action to the stored places after the given earlier actions. */
function applyToPlaces(action: AppAction, ...before: AppAction[]) {
  const app = reading(...before);
  return updateStoredPlaces(app.storedPlaces, action, app);
}

/** The settle of the request for the project's media files that opening the book sends. */
function bookListed() {
  const data: ListMediaFilesResponse = { media_files: [book, audioOnDisk] };
  return actions.requestSettled(
    "media/b1/mediaFile",
    { kind: "listMediaFiles", projectId: "p1" },
    { ok: true, data },
  );
}

const audioTracksSettled = actions.requestSettled(
  "media/a1/tracks",
  { kind: "getMediaTracks", projectId: "p1", mediaFileId: "a1" },
  {
    ok: true,
    data: {
      container: {
        format: "mp3",
        duration_ms: 3030,
        start_ms: 0,
        bit_rate: 64_000,
        tracks: [],
      },
      default_selection: { video: null, audio: null },
      direct_mime_type: "audio/mpeg",
    },
  },
);

describe("updateReaderScreen", () => {
  it("records the audio file the reader plays on readerAudioOpened", () => {
    expect(selectReaderAudioMediaFileId(reading(audioOpened))).toBe("a1");
  });
});

describe("selectPlayedMediaFile", () => {
  it("returns the book's own file before the reader opens its audio", () => {
    expect(selectPlayedMediaFile(reading()).mediaFileId).toBe("b1");
  });

  it("returns the audio file the reader opened", () => {
    expect(selectPlayedMediaFile(reading(audioOpened)).mediaFileId).toBe("a1");
  });
});

describe("updateMediaScreen", () => {
  describe("on readerAudioOpened", () => {
    it("asks for the tracks of an audio file on the server's disk", () => {
      const [, effects] = applyToReader(audioOpened);
      expect(effects).toEqual([
        {
          type: "sendRequest",
          id: "media/a1/tracks",
          request: {
            kind: "getMediaTracks",
            projectId: "p1",
            mediaFileId: "a1",
          },
        },
      ]);
    });

    it("works out no path playback for an audio file the browser holds", () => {
      const [screen] = applyToReader(actions.readerAudioOpened(audioInBrowser));
      expect(screen.playback).toBeNull();
    });

    it("asks for nothing when the player plays the audio file already", () => {
      const [, effects] = applyToReader(audioOpened, audioOpened);
      expect(effects).toEqual([]);
    });

    it("resumes from the audio file's stored position", () => {
      const [screen] = applyToReader(
        audioOpened,
        actions.playbackPositionLoaded("a1", 2000),
      );
      expect(screen.playing.pendingResumeMs).toBe(2000);
    });
  });

  describe("in the reader", () => {
    it("works out no playback for the book itself", () => {
      const [, effects] = applyToReader(bookListed());
      expect(effects).toEqual([]);
    });

    it("measures the browser for the audio file's tracks", () => {
      const [, effects] = applyToReader(audioTracksSettled, audioOpened);
      expect(effects).toEqual([
        {
          type: "measurePlaybackEnvironment",
          mediaFileId: "a1",
          directMimeType: "audio/mpeg",
          codecStrings: [],
        },
      ]);
    });

    it("asks how to play the audio file once the browser is measured", () => {
      const [screen] = applyToReader(
        actions.playbackEnvironmentMeasured("a1", exampleEnvironment),
        actions.preferencesLoaded({}),
        audioOpened,
      );
      expect(screen.playback?.methodRequest).not.toBeNull();
    });

    it("takes the audio file's stored position once it loads", () => {
      const [screen] = applyToReader(
        actions.playbackPositionLoaded("a1", 2000),
        audioOpened,
      );
      expect(screen.playing.pendingResumeMs).toBe(2000);
    });
  });
});

describe("updateStoredPlaces", () => {
  it("loads the stored position of the audio file the reader opens", () => {
    const [, effects] = applyToPlaces(audioOpened);
    expect(effects).toEqual([
      { type: "loadPlaybackPosition", mediaFileId: "a1" },
    ]);
  });

  it("does not load an audio file's stored position already known", () => {
    const [, effects] = applyToPlaces(
      audioOpened,
      actions.playbackPositionLoaded("a1", 2000),
    );
    expect(effects).toEqual([]);
  });

  it("saves the reader's playback position under the audio file when it pauses", () => {
    const [, effects] = applyToPlaces(
      actions.playerPlayingChanged(false),
      audioOpened,
      actions.playerDurationChanged(3),
      actions.playerTimeChanged(1.5),
    );
    expect(effects).toEqual([
      { type: "savePlaybackPosition", mediaFileId: "a1", ms: 1500 },
    ]);
  });
});

describe("selectReaderKeyBinding", () => {
  it("plays and pauses the audio on K", () => {
    expect(
      selectReaderKeyBinding(reading(audioOpened), exampleKeyPress("k")),
    ).toEqual(bindAction(actions.playToggleRequested()));
  });

  it("leaves K to the browser for a book with no audio", () => {
    expect(selectReaderKeyBinding(reading(), exampleKeyPress("k"))).toBeNull();
  });
});
