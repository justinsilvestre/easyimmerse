import { describe, expect, it } from "vitest";
import { actions } from "./actions.ts";
import type { AppState } from "./appState.ts";
import { initialAppState } from "./appState.ts";
import { dictionaryFileExtensions } from "./dictionaryFileExtensions.ts";
import type {
  PickedDictionaryFile,
  PickedFile,
  PickedMediaFile,
} from "./effects.ts";
import { mediaFileExtensions } from "./mediaFileExtensions.ts";
import type { ReaderLocation } from "./readingLocation.ts";
import { update } from "./update.ts";

const pickedFile: PickedFile = {
  name: "episode.srt",
  source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHello" },
};

const pickedMediaFile: PickedMediaFile = {
  name: "episode.mkv",
  source: { kind: "path", path: "/videos/episode.mkv" },
};

const location = { chapterIndex: 1, paragraphIndex: 4, offset: 10 };

const withReadingLocation = (
  mediaFileId: string,
  stored: ReaderLocation | null,
): AppState => ({
  ...initialAppState,
  currentMediaFileId: mediaFileId,
  readingLocations: { [mediaFileId]: stored },
});

const pickedDictionaryFile: PickedDictionaryFile = {
  name: "jmdict.zip",
  source: { kind: "path", path: "/dictionaries/jmdict.zip" },
};

const withPreference = (value: string): AppState => ({
  ...initialAppState,
  preferences: { showTranslations: value },
});

describe("update", () => {
  it("guards the app's closing when the first unsaved work begins", () => {
    const [, effects] = update(initialAppState, actions.unsavedWorkBegan());
    expect(effects).toEqual([{ type: "guardClose", isActive: true }]);
  });

  it("keeps the guard while more unsaved work begins", () => {
    const [saving] = update(initialAppState, actions.unsavedWorkBegan());
    const [, effects] = update(saving, actions.unsavedWorkBegan());
    expect(effects).toEqual([]);
  });

  it("keeps the guard while other unsaved work remains", () => {
    const [one] = update(initialAppState, actions.unsavedWorkBegan());
    const [two] = update(one, actions.unsavedWorkBegan());
    const [, effects] = update(two, actions.unsavedWorkEnded());
    expect(effects).toEqual([]);
  });

  it("lifts the guard once the last unsaved work ends", () => {
    const [saving] = update(initialAppState, actions.unsavedWorkBegan());
    const [, effects] = update(saving, actions.unsavedWorkEnded());
    expect(effects).toEqual([{ type: "guardClose", isActive: false }]);
  });

  it("stores the target as the current time for seekRequested", () => {
    const [state] = update(initialAppState, actions.seekRequested(12.5));
    expect(state.player.currentTimeSeconds).toBe(12.5);
  });

  it("returns a seekPlayer effect for seekRequested", () => {
    const [, effects] = update(initialAppState, actions.seekRequested(12.5));
    expect(effects).toEqual([{ type: "seekPlayer", seconds: 12.5 }]);
  });

  it("stores the current time for playerTimeChanged", () => {
    const [state] = update(initialAppState, actions.playerTimeChanged(3));
    expect(state.player.currentTimeSeconds).toBe(3);
  });

  it("keeps the duration for playerTimeChanged", () => {
    const loaded = {
      ...initialAppState,
      player: { ...initialAppState.player, durationSeconds: 60 },
    };
    const [state] = update(loaded, actions.playerTimeChanged(3));
    expect(state.player.durationSeconds).toBe(60);
  });

  it("stores the duration for playerDurationChanged", () => {
    const [state] = update(initialAppState, actions.playerDurationChanged(90));
    expect(state.player.durationSeconds).toBe(90);
  });

  it("stores what the player has loaded for playerBufferedChanged", () => {
    const buffered = [{ startSeconds: 0, endSeconds: 30 }];
    const [state] = update(
      initialAppState,
      actions.playerBufferedChanged(buffered),
    );
    expect(state.player.buffered).toEqual(buffered);
  });

  it("returns no effects for playerTimeChanged", () => {
    const [, effects] = update(initialAppState, actions.playerTimeChanged(3));
    expect(effects).toEqual([]);
  });

  it("marks a file pick as pending for filePickRequested", () => {
    const [state] = update(initialAppState, actions.filePickRequested());
    expect(state.pendingFilePick).toBe(true);
  });

  it("returns a pickFile effect accepting subtitle files for filePickRequested", () => {
    const [, effects] = update(initialAppState, actions.filePickRequested());
    expect(effects).toEqual([{ type: "pickFile", accept: [".srt", ".vtt"] }]);
  });

  it("clears the pending file pick for fileChosen", () => {
    const pending = { ...initialAppState, pendingFilePick: true };
    const [state] = update(pending, actions.fileChosen(pickedFile));
    expect(state.pendingFilePick).toBe(false);
  });

  it("keeps the chosen file for fileChosen", () => {
    const [state] = update(initialAppState, actions.fileChosen(pickedFile));
    expect(state.chosenSubtitleFile).toEqual(pickedFile);
  });

  it("forgets the chosen file for subtitleFileAdded", () => {
    const chosen = { ...initialAppState, chosenSubtitleFile: pickedFile };
    const [state] = update(chosen, actions.subtitleFileAdded());
    expect(state.chosenSubtitleFile).toBeNull();
  });

  it("returns a notification for subtitleFileAddFailed", () => {
    const [, effects] = update(
      initialAppState,
      actions.subtitleFileAddFailed(),
    );
    expect(effects).toEqual([
      {
        type: "showNotification",
        message: "The subtitles file could not be added",
      },
    ]);
  });

  it("returns a playPlayer effect for playRequested", () => {
    const [, effects] = update(initialAppState, actions.playRequested());
    expect(effects).toEqual([{ type: "playPlayer" }]);
  });

  it("returns a pausePlayer effect for pauseRequested", () => {
    const [, effects] = update(initialAppState, actions.pauseRequested());
    expect(effects).toEqual([{ type: "pausePlayer" }]);
  });

  it("returns a togglePlayer effect for playToggleRequested", () => {
    const [, effects] = update(initialAppState, actions.playToggleRequested());
    expect(effects).toEqual([{ type: "togglePlayer" }]);
  });

  it("stores whether the player plays for playerPlayingChanged", () => {
    const [state] = update(initialAppState, actions.playerPlayingChanged(true));
    expect(state.player.isPlaying).toBe(true);
  });

  it("stores the volume for volumeChangeRequested", () => {
    const [state] = update(initialAppState, actions.volumeChangeRequested(0.4));
    expect(state.player.volume).toBe(0.4);
  });

  it("returns a setPlayerVolume effect for volumeChangeRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.volumeChangeRequested(0.4),
    );
    expect(effects).toEqual([{ type: "setPlayerVolume", volume: 0.4 }]);
  });

  it("returns a setPlayerSpeed effect for speedChangeRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.speedChangeRequested(1.5),
    );
    expect(effects).toEqual([{ type: "setPlayerSpeed", speed: 1.5 }]);
  });

  it("clears the pending file pick for filePickCancelled", () => {
    const pending = { ...initialAppState, pendingFilePick: true };
    const [state] = update(pending, actions.filePickCancelled());
    expect(state.pendingFilePick).toBe(false);
  });

  it("returns a pickMediaFile effect accepting media files for mediaFilePickRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.mediaFilePickRequested(),
    );
    expect(effects).toEqual([
      { type: "pickMediaFile", accept: mediaFileExtensions },
    ]);
  });

  it("keeps the chosen media file for mediaFileChosen", () => {
    const [state] = update(
      initialAppState,
      actions.mediaFileChosen(pickedMediaFile),
    );
    expect(state.chosenMediaFile).toBe(pickedMediaFile);
  });

  it("returns a pickDictionaryFile effect accepting dictionary files for dictionaryFilePickRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.dictionaryFilePickRequested(),
    );
    expect(effects).toEqual([
      { type: "pickDictionaryFile", accept: dictionaryFileExtensions },
    ]);
  });

  it("keeps the chosen dictionary file for dictionaryFileChosen", () => {
    const [state] = update(
      initialAppState,
      actions.dictionaryFileChosen(pickedDictionaryFile),
    );
    expect(state.chosenDictionaryFile).toBe(pickedDictionaryFile);
  });

  it("forgets the chosen dictionary file for dictionaryFileHandled", () => {
    const chosen = {
      ...initialAppState,
      chosenDictionaryFile: pickedDictionaryFile,
    };
    const [state] = update(chosen, actions.dictionaryFileHandled());
    expect(state.chosenDictionaryFile).toBeNull();
  });

  it("opens the added media file for mediaFileAdded", () => {
    const [state] = update(initialAppState, actions.mediaFileAdded("m1"));
    expect(state.currentMediaFileId).toBe("m1");
  });

  it("forgets the chosen media file for mediaFileAdded", () => {
    const chosen = { ...initialAppState, chosenMediaFile: pickedMediaFile };
    const [state] = update(chosen, actions.mediaFileAdded("m1"));
    expect(state.chosenMediaFile).toBeNull();
  });

  it("forgets the chosen media file for mediaFileAddFailed", () => {
    const chosen = { ...initialAppState, chosenMediaFile: pickedMediaFile };
    const [state] = update(chosen, actions.mediaFileAddFailed());
    expect(state.chosenMediaFile).toBeNull();
  });

  it("returns a notification for mediaFileAddFailed", () => {
    const [, effects] = update(initialAppState, actions.mediaFileAddFailed());
    expect(effects).toEqual([
      {
        type: "showNotification",
        message: "The media file could not be added",
      },
    ]);
  });

  it("closes the open media file for mediaFileRemoved when it is the removed one", () => {
    const open = { ...initialAppState, currentMediaFileId: "m1" };
    const [state] = update(open, actions.mediaFileRemoved("m1"));
    expect(state.currentMediaFileId).toBeNull();
  });

  it("keeps the open media file for mediaFileRemoved when another is removed", () => {
    const open = { ...initialAppState, currentMediaFileId: "m1" };
    const [state] = update(open, actions.mediaFileRemoved("m2"));
    expect(state.currentMediaFileId).toBe("m1");
  });

  it("stores the opened media file id for openMedia", () => {
    const [state] = update(initialAppState, actions.openMedia("m2"));
    expect(state.currentMediaFileId).toBe("m2");
  });

  it("clears the open media file for closeMedia", () => {
    const open = { ...initialAppState, currentMediaFileId: "m1" };
    const [state] = update(open, actions.closeMedia());
    expect(state.currentMediaFileId).toBeNull();
  });

  it("resets the player's position and duration for closeMedia", () => {
    const playing = {
      ...initialAppState,
      player: {
        ...initialAppState.player,
        currentTimeSeconds: 5,
        durationSeconds: 60,
        isPlaying: true,
      },
    };
    const [state] = update(playing, actions.closeMedia());
    expect(state.player).toEqual(initialAppState.player);
  });

  it("keeps the volume and speed for closeMedia", () => {
    const playing = {
      ...initialAppState,
      player: { ...initialAppState.player, volume: 0.3, speed: 1.5 },
    };
    const [state] = update(playing, actions.closeMedia());
    expect([state.player.volume, state.player.speed]).toEqual([0.3, 1.5]);
  });

  it("turns an unset preference on for preferenceToggled", () => {
    const [state] = update(
      initialAppState,
      actions.preferenceToggled("showTranslations"),
    );
    expect(state.preferences.showTranslations).toBe("true");
  });

  it("turns a preference that is on off for preferenceToggled", () => {
    const [state] = update(
      withPreference("true"),
      actions.preferenceToggled("showTranslations"),
    );
    expect(state.preferences.showTranslations).toBe("false");
  });

  it("returns a savePreference effect with the new value for preferenceToggled", () => {
    const [, effects] = update(
      withPreference("true"),
      actions.preferenceToggled("showTranslations"),
    );
    expect(effects).toEqual([
      { type: "savePreference", key: "showTranslations", value: "false" },
    ]);
  });

  it("returns one loadPreferences effect with every preference key for preferencesLoadRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.preferencesLoadRequested(),
    );
    expect(effects).toEqual([
      {
        type: "loadPreferences",
        keys: [
          "showTranslations",
          "textScale",
          "losslessAudio",
          "conversionNoticeDismissed",
          "readerPreferences",
          "theme",
        ],
      },
    ]);
  });

  it("stores the given value for preferenceSet", () => {
    const [state] = update(
      initialAppState,
      actions.preferenceSet("conversionNoticeDismissed", "true"),
    );
    expect(state.preferences.conversionNoticeDismissed).toBe("true");
  });

  it("returns a savePreference effect with the given value for preferenceSet", () => {
    const [, effects] = update(
      initialAppState,
      actions.preferenceSet("conversionNoticeDismissed", "true"),
    );
    expect(effects).toEqual([
      {
        type: "savePreference",
        key: "conversionNoticeDismissed",
        value: "true",
      },
    ]);
  });

  it("stores the loaded values for preferencesLoaded", () => {
    const [state] = update(
      initialAppState,
      actions.preferencesLoaded({ showTranslations: "true" }),
    );
    expect(state.preferences.showTranslations).toBe("true");
  });

  it("keeps a preference that storage did not hold for preferencesLoaded", () => {
    const [state] = update(
      withPreference("true"),
      actions.preferencesLoaded({ losslessAudio: "true" }),
    );
    expect(state.preferences.showTranslations).toBe("true");
  });

  it("marks the preferences as loaded for preferencesLoaded", () => {
    const [state] = update(initialAppState, actions.preferencesLoaded({}));
    expect(state.preferencesLoaded).toBe(true);
  });

  it("returns a showNotification effect for notificationRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.notificationRequested("Saved"),
    );
    expect(effects).toEqual([{ type: "showNotification", message: "Saved" }]);
  });

  it("returns an openExternalUrl effect for externalLinkRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.externalLinkRequested("https://example.com"),
    );
    expect(effects).toEqual([
      { type: "openExternalUrl", url: "https://example.com" },
    ]);
  });

  it("stores the chosen scale as a preference for textScaleChosen", () => {
    const [state] = update(initialAppState, actions.textScaleChosen(125));
    expect(state.preferences.textScale).toBe("125");
  });

  it("returns a savePreference effect for textScaleChosen", () => {
    const [, effects] = update(initialAppState, actions.textScaleChosen(125));
    expect(effects).toEqual([
      { type: "savePreference", key: "textScale", value: "125" },
    ]);
  });

  describe("for the reading location", () => {
    it("returns a loadReadingLocation effect for readingLocationLoadRequested", () => {
      const [, effects] = update(
        initialAppState,
        actions.readingLocationLoadRequested("b1"),
      );
      expect(effects).toEqual([
        { type: "loadReadingLocation", mediaFileId: "b1" },
      ]);
    });

    it("returns no effects for readingLocationLoadRequested once the location is known", () => {
      const [, effects] = update(
        withReadingLocation("b1", null),
        actions.readingLocationLoadRequested("b1"),
      );
      expect(effects).toEqual([]);
    });

    it("stores the loaded location for readingLocationLoaded", () => {
      const [state] = update(
        initialAppState,
        actions.readingLocationLoaded("b1", location),
      );
      expect(state.readingLocations.b1).toEqual(location);
    });

    it("records a book without a stored location for readingLocationLoaded", () => {
      const [state] = update(
        initialAppState,
        actions.readingLocationLoaded("b1", null),
      );
      expect(state.readingLocations.b1).toBeNull();
    });

    it("keeps a location reported before the stored one arrived for readingLocationLoaded", () => {
      const [state] = update(
        withReadingLocation("b1", location),
        actions.readingLocationLoaded("b1", null),
      );
      expect(state.readingLocations.b1).toEqual(location);
    });

    it("stores the reported location for readingLocationReported", () => {
      const moved = { ...location, offset: 80 };
      const [state] = update(
        withReadingLocation("b1", location),
        actions.readingLocationReported("b1", moved),
      );
      expect(state.readingLocations.b1).toEqual(moved);
    });

    it("returns a saveReadingLocation effect for readingLocationReported in a new paragraph", () => {
      const moved = { ...location, paragraphIndex: 5, offset: 0 };
      const [, effects] = update(
        withReadingLocation("b1", location),
        actions.readingLocationReported("b1", moved),
      );
      expect(effects).toEqual([
        { type: "saveReadingLocation", mediaFileId: "b1", location: moved },
      ]);
    });

    it("returns no effects for readingLocationReported within the same paragraph", () => {
      const [, effects] = update(
        withReadingLocation("b1", location),
        actions.readingLocationReported("b1", { ...location, offset: 80 }),
      );
      expect(effects).toEqual([]);
    });

    it("returns a saveReadingLocation effect with the last location for closeMedia", () => {
      const [, effects] = update(
        withReadingLocation("b1", location),
        actions.closeMedia(),
      );
      expect(effects).toEqual([
        { type: "saveReadingLocation", mediaFileId: "b1", location },
      ]);
    });

    it("returns no effects for closeMedia when the open file has no reading location", () => {
      const [, effects] = update(
        withReadingLocation("b1", null),
        actions.closeMedia(),
      );
      expect(effects).toEqual([]);
    });
  });
});

describe("update, for the playback position", () => {
  const loaded: AppState = {
    ...initialAppState,
    currentMediaFileId: "m1",
    player: {
      ...initialAppState.player,
      currentTimeSeconds: 14,
      durationSeconds: 60,
    },
  };

  it("returns a loadPlaybackPosition effect for playbackPositionLoadRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.playbackPositionLoadRequested("m1"),
    );
    expect(effects).toEqual([
      { type: "loadPlaybackPosition", mediaFileId: "m1" },
    ]);
  });

  it("returns no effects for playbackPositionLoadRequested once the position is known", () => {
    const [, effects] = update(
      { ...initialAppState, playbackPositions: { m1: null } },
      actions.playbackPositionLoadRequested("m1"),
    );
    expect(effects).toEqual([]);
  });

  it("stores the loaded position for playbackPositionLoaded", () => {
    const [state] = update(
      initialAppState,
      actions.playbackPositionLoaded("m1", 8000),
    );
    expect(state.playbackPositions.m1).toBe(8000);
  });

  it("saves the position when playback enters a new stretch for playerTimeChanged", () => {
    const [, effects] = update(loaded, actions.playerTimeChanged(15.5));
    expect(effects).toEqual([
      { type: "savePlaybackPosition", mediaFileId: "m1", ms: 15_500 },
    ]);
  });

  it("saves nothing within the same stretch for playerTimeChanged", () => {
    const [, effects] = update(loaded, actions.playerTimeChanged(14.5));
    expect(effects).toEqual([]);
  });

  it("saves the position when playback pauses for playerPlayingChanged", () => {
    const [, effects] = update(loaded, actions.playerPlayingChanged(false));
    expect(effects).toEqual([
      { type: "savePlaybackPosition", mediaFileId: "m1", ms: 14_000 },
    ]);
  });

  it("saves the position for closeMedia", () => {
    const [, effects] = update(loaded, actions.closeMedia());
    expect(effects).toEqual([
      { type: "savePlaybackPosition", mediaFileId: "m1", ms: 14_000 },
    ]);
  });

  it("remembers the saved position for closeMedia, so that reopening the file finds it", () => {
    const [state] = update(loaded, actions.closeMedia());
    expect(state.playbackPositions.m1).toBe(14_000);
  });

  it("saves nothing before the player has loaded the file", () => {
    const unloaded = {
      ...loaded,
      player: { ...loaded.player, durationSeconds: 0 },
    };
    const [, effects] = update(unloaded, actions.closeMedia());
    expect(effects).toEqual([]);
  });
});
