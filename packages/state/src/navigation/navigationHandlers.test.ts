import { describe, expect, it } from "vitest";
import { actions } from "../actions.ts";
import { initialAppState } from "../appState.ts";
import { initialPlayerState } from "../player/playerState.ts";
import { createAppState } from "../testSupport/createAppState.ts";
import { createEditingFlashcardEditor } from "../testSupport/createEditingFlashcardEditor.ts";
import { createMediaFile } from "../testSupport/createMediaFile.ts";
import { update } from "../update.ts";

const mediaWithTracks = () =>
  createMediaFile({
    subtitle_tracks: [
      {
        id: "t1",
        name: "episode.de.srt",
        role: "target",
        language: "de",
        source: { kind: "file", source: { kind: "browser_file", key: "k1" } },
      },
      {
        id: "t2",
        name: "episode.en.srt",
        role: "translation",
        language: "en",
        source: { kind: "file", source: { kind: "path", path: "/en.srt" } },
      },
      {
        id: "t3",
        name: "Embedded",
        role: "target",
        language: null,
        source: { kind: "embedded", track_id: 2 },
      },
    ],
  });

const loop = { start_ms: 1000, end_ms: 2000 };

const busyMediaState = () =>
  createAppState(
    { playing: true, currentTimeMs: 4000, loop },
    {
      screen: { kind: "media", projectId: "p1", mediaId: "m0" },
      lookup: {
        kind: "open",
        term: "Katze",
        context: null,
        clip: null,
        typed: false,
        resumePlaybackOnClose: true,
      },
      flashcardEditor: createEditingFlashcardEditor(),
      subtitles: {
        ...initialAppState.subtitles,
        browserFileTexts: { t0: "text" },
      },
    },
  );

describe("update", () => {
  it("shows the home screen for homeOpened", () => {
    const inProject = createAppState(
      {},
      { screen: { kind: "project", projectId: "p1" } },
    );
    const [state] = update(inProject, actions.homeOpened());
    expect(state.screen).toEqual({ kind: "home" });
  });

  it("shows the new-project form for newProjectFormOpened", () => {
    const [state] = update(initialAppState, actions.newProjectFormOpened());
    expect(state.screen).toEqual({ kind: "newProject" });
  });

  it("shows the project for projectOpened", () => {
    const [state] = update(initialAppState, actions.projectOpened("p1"));
    expect(state.screen).toEqual({ kind: "project", projectId: "p1" });
  });

  describe("for mediaOpened", () => {
    const openMedia = () =>
      update(busyMediaState(), actions.mediaOpened("p1", mediaWithTracks()));

    it("shows the media screen", () => {
      const [state] = openMedia();
      expect(state.screen).toEqual({
        kind: "media",
        projectId: "p1",
        mediaId: "m1",
      });
    });

    it("resets the player with the media's known duration", () => {
      const [state] = openMedia();
      expect(state.player).toEqual({
        ...initialPlayerState,
        durationMs: 90_000,
      });
    });

    it("closes the lookup", () => {
      const [state] = openMedia();
      expect(state.lookup).toEqual({ kind: "closed" });
    });

    it("closes the flashcard editor", () => {
      const [state] = openMedia();
      expect(state.flashcardEditor).toEqual({ kind: "closed" });
    });

    it("forgets the previous media's subtitle texts", () => {
      const [state] = openMedia();
      expect(state.subtitles.browserFileTexts).toEqual({});
    });

    it("stops the previous media's loop before anything else", () => {
      const [, effects] = openMedia();
      expect(effects[0]).toEqual({ type: "setPlayerLoop", range: null });
    });

    it("resolves the media URL and reads only the subtitle files stored in the browser", () => {
      const media = mediaWithTracks();
      const [, effects] = update(
        initialAppState,
        actions.mediaOpened("p1", media),
      );
      expect(effects).toEqual([
        { type: "resolveMediaUrl", projectId: "p1", media },
        { type: "readStoredFileText", trackId: "t1", key: "k1" },
      ]);
    });
  });

  describe("when media is open", () => {
    it("returns to the project screen for mediaClosed", () => {
      const [state] = update(busyMediaState(), actions.mediaClosed());
      expect(state.screen).toEqual({ kind: "project", projectId: "p1" });
    });

    it("resets the player for mediaClosed", () => {
      const [state] = update(busyMediaState(), actions.mediaClosed());
      expect(state.player).toEqual(initialPlayerState);
    });

    it("stops the loop and pauses for mediaClosed", () => {
      const [, effects] = update(busyMediaState(), actions.mediaClosed());
      expect(effects).toEqual([
        { type: "setPlayerLoop", range: null },
        { type: "pausePlayer" },
      ]);
    });

    it("only pauses for mediaClosed when no loop is set", () => {
      const inMedia = createAppState(
        {},
        { screen: { kind: "media", projectId: "p1", mediaId: "m0" } },
      );
      const [, effects] = update(inMedia, actions.mediaClosed());
      expect(effects).toEqual([{ type: "pausePlayer" }]);
    });
  });

  describe("when no media is open", () => {
    it("leaves state unchanged for mediaClosed", () => {
      const [state] = update(initialAppState, actions.mediaClosed());
      expect(state).toBe(initialAppState);
    });
  });
});
