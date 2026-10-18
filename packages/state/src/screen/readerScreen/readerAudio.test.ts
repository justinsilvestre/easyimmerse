import type { Alignment, MediaFile, TimedSpan } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfterWithCache } from "../../app/stateAfter.ts";
import { exampleKeyPress } from "../../keys/exampleKeyPress.ts";
import { bindAction } from "../../keys/keyBinding.ts";
import { selectReaderKeyBinding } from "../../keys/selectReaderKeyBinding.ts";
import type { ServerCacheSlice } from "../../server/cacheEntry.ts";
import { exampleMediaFile } from "../../server/exampleMediaFile.ts";
import {
  emptyServerCache,
  serverCacheWith,
} from "../../server/serverCacheWith.ts";
import { updateStoredPlaces } from "../../storedPlaces/updateStoredPlaces.ts";
import { exampleEnvironment } from "../mediaScreen/examplePlayback.ts";
import { selectPlayedMediaFile } from "../mediaScreen/playedMediaFile.ts";
import { updateMediaScreen } from "../mediaScreen/updateMediaScreen.ts";
import type { MediaScreenState } from "../screenState.ts";
import { selectReaderAlignedAudio } from "./readerAudioSelectors.ts";

const book: MediaFile = exampleMediaFile("b1", "sample.epub");
const audioOnDisk: MediaFile = exampleMediaFile("a1", "sample.mp3");
const audioInBrowser: MediaFile = {
  ...audioOnDisk,
  source: { kind: "browser_file", size: 1000, last_modified_ms: 0 },
};

const segment: TimedSpan = {
  span: { chapter_index: 0, paragraph_index: 0, start: 0, end: 10 },
  start_ms: 800,
  end_ms: 2000,
};

/** The book's alignment with the audio file of the given id. */
function alignmentWith(audioMediaFileId: string): Alignment {
  return {
    id: "al1",
    media_file_id: "b1",
    provider: null,
    created_at_ms: 0,
    content: {
      kind: "audio",
      audio_media_file_id: audioMediaFileId,
      segments: [segment],
    },
  };
}

const bookRoute = { projectId: "p1", mediaFileId: "b1" };

/** The server cache listing the book and the given audio file, and the book's alignments. */
function cacheWith(
  audio: MediaFile = audioOnDisk,
  alignments: Alignment[] = [alignmentWith(audio.id)],
): ServerCacheSlice {
  return serverCacheWith(
    "listAlignments",
    bookRoute,
    { alignments },
    serverCacheWith("listMediaFiles", "p1", { media_files: [book, audio] }),
  );
}

const openBook = actions.openMediaFileRequested("p1", "b1");

/** The answer to the reader's request for the book's alignments. */
const alignmentsSettled = (alignments: Alignment[] = [alignmentWith("a1")]) =>
  actions.requestSettled(
    "media/b1/alignments",
    { kind: "listAlignments", ...bookRoute },
    { ok: true, data: { alignments } },
  );

/** The answer to the request for the project's media files that opening the book sends. */
const bookListed = (audio: MediaFile = audioOnDisk) =>
  actions.requestSettled(
    "media/b1/mediaFile",
    { kind: "listMediaFiles", projectId: "p1" },
    { ok: true, data: { media_files: [book, audio] } },
  );

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

/** The app with book b1 open in the reader after the given actions, reading the given server cache. */
function reading(backend: ServerCacheSlice, ...done: AppAction[]) {
  return { app: stateAfterWithCache(backend, openBook, ...done), backend };
}

/** Applies an action to the reader's media screen state after the given earlier actions, reading the given server cache. */
function applyToReader(
  backend: ServerCacheSlice,
  action: AppAction,
  ...before: AppAction[]
) {
  const { app } = reading(backend, ...before);
  return updateMediaScreen(app.screen.main as MediaScreenState, action, {
    ...app,
    backend,
  });
}

/** Applies an action to the stored places after the given earlier actions, reading the given server cache. */
function applyToPlaces(
  backend: ServerCacheSlice,
  action: AppAction,
  ...before: AppAction[]
) {
  const { app } = reading(backend, ...before);
  return updateStoredPlaces(app.storedPlaces, action, { ...app, backend });
}

describe("selectReaderAlignedAudio", () => {
  it("returns the audio file the book's newest audio alignment names", () => {
    expect(selectReaderAlignedAudio(reading(cacheWith()))?.file).toBe(
      audioOnDisk,
    );
  });

  it("returns the alignment's segments", () => {
    expect(selectReaderAlignedAudio(reading(cacheWith()))?.segments).toEqual([
      segment,
    ]);
  });

  it("returns null while the alignments are not cached", () => {
    expect(selectReaderAlignedAudio(reading(emptyServerCache))).toBeNull();
  });

  it("returns null when the audio file is no longer in the project", () => {
    const cache = cacheWith(audioOnDisk, [alignmentWith("gone")]);
    expect(selectReaderAlignedAudio(reading(cache))).toBeNull();
  });

  it("keeps its reference while the cache does", () => {
    const state = reading(cacheWith());
    expect(selectReaderAlignedAudio(state)).toBe(
      selectReaderAlignedAudio({ ...state }),
    );
  });
});

describe("selectPlayedMediaFile", () => {
  it("returns the book's own file while its alignments are not cached", () => {
    const { app, backend } = reading(emptyServerCache);
    expect(selectPlayedMediaFile({ ...app, backend }).mediaFileId).toBe("b1");
  });

  it("returns the audio file the book is aligned with once cached", () => {
    const { app, backend } = reading(cacheWith());
    expect(selectPlayedMediaFile({ ...app, backend }).mediaFileId).toBe("a1");
  });
});

describe("updateMediaScreen", () => {
  describe("when the project's media files list the open book", () => {
    it("asks for the book's alignments", () => {
      const [, effects] = applyToReader(emptyServerCache, bookListed());
      expect(effects).toEqual([
        {
          type: "sendRequest",
          id: "media/b1/alignments",
          request: { kind: "listAlignments", ...bookRoute },
        },
      ]);
    });
  });

  describe("when the book's alignments arrive", () => {
    it("asks for the tracks of an audio file on the server's disk", () => {
      const [, effects] = applyToReader(cacheWith(), alignmentsSettled());
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
      const [screen] = applyToReader(
        cacheWith(audioInBrowser),
        alignmentsSettled(),
      );
      expect(screen.playback).toBeNull();
    });

    it("asks for nothing when the book has no audio alignment", () => {
      const [, effects] = applyToReader(
        cacheWith(audioOnDisk, []),
        alignmentsSettled([]),
      );
      expect(effects).toEqual([]);
    });

    it("resumes from the audio file's stored position", () => {
      const [screen] = applyToReader(
        cacheWith(),
        alignmentsSettled(),
        actions.playbackPositionLoaded("a1", 2000),
      );
      expect(screen.playing.pendingResumeMs).toBe(2000);
    });
  });

  describe("in the reader", () => {
    it("measures the browser for the audio file's tracks", () => {
      const [, effects] = applyToReader(
        cacheWith(),
        audioTracksSettled,
        alignmentsSettled(),
      );
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
        cacheWith(),
        actions.playbackEnvironmentMeasured("a1", exampleEnvironment),
        actions.preferencesLoaded({}),
        alignmentsSettled(),
      );
      expect(screen.playback?.methodRequest).not.toBeNull();
    });

    it("takes the audio file's stored position once it loads", () => {
      const [screen] = applyToReader(
        cacheWith(),
        actions.playbackPositionLoaded("a1", 2000),
        alignmentsSettled(),
      );
      expect(screen.playing.pendingResumeMs).toBe(2000);
    });
  });
});

describe("updateStoredPlaces", () => {
  it("loads the stored position of the audio file when the book's alignments arrive", () => {
    const [, effects] = applyToPlaces(cacheWith(), alignmentsSettled());
    expect(effects).toEqual([
      { type: "loadPlaybackPosition", mediaFileId: "a1" },
    ]);
  });

  it("does not load an audio file's stored position already known", () => {
    const [, effects] = applyToPlaces(
      cacheWith(),
      alignmentsSettled(),
      actions.playbackPositionLoaded("a1", 2000),
    );
    expect(effects).toEqual([]);
  });

  it("saves the reader's playback position under the audio file when it pauses", () => {
    const [, effects] = applyToPlaces(
      cacheWith(),
      actions.playerPlayingChanged(false),
      actions.playerDurationChanged(3),
      actions.playerTimeChanged(1.5),
    );
    expect(effects).toEqual([
      { type: "savePlaybackPosition", mediaFileId: "a1", ms: 1500 },
    ]);
  });
});

describe("selectReaderKeyBinding", () => {
  const pressK = exampleKeyPress("k");

  it("plays and pauses the audio on K", () => {
    expect(selectReaderKeyBinding(reading(cacheWith()), pressK)).toEqual(
      bindAction(actions.playToggleRequested()),
    );
  });

  it("leaves K to the browser for a book whose alignments are not cached", () => {
    expect(
      selectReaderKeyBinding(reading(emptyServerCache), pressK),
    ).toBeNull();
  });

  it("leaves K to the browser once the book's audio alignment is gone", () => {
    const cache = cacheWith(audioOnDisk, []);
    expect(selectReaderKeyBinding(reading(cache), pressK)).toBeNull();
  });

  it("leaves K to the browser once the audio file is gone from the project", () => {
    const cache = cacheWith(audioOnDisk, [alignmentWith("gone")]);
    expect(selectReaderKeyBinding(reading(cache), pressK)).toBeNull();
  });
});
