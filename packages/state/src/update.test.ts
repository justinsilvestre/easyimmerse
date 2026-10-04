import { describe, expect, it } from "vitest";
import { actions } from "./actions.ts";
import type { AppState } from "./appState.ts";
import { initialAppState, initialPlayerState } from "./appState.ts";
import type {
  PickedDictionaryFile,
  PickedFile,
  PickedMediaFile,
} from "./effects.ts";
import { mediaFileExtensions } from "./mediaFileExtensions.ts";
import { update } from "./update.ts";

const pickedFile: PickedFile = {
  name: "episode.srt",
  source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHello" },
};

const pickedMediaFile: PickedMediaFile = {
  name: "episode.mkv",
  source: { kind: "path", path: "/videos/episode.mkv" },
};

const pickedDictionaryFile: PickedDictionaryFile = {
  name: "jmdict.zip",
  source: { kind: "path", path: "/dictionaries/jmdict.zip" },
};

const dictionaryLanguages = { sourceLanguage: "ja", targetLanguage: "en" };

const withChosenDictionaryFile: AppState = {
  ...initialAppState,
  chosenDictionaryFile: {
    file: pickedDictionaryFile,
    languages: dictionaryLanguages,
  },
};

const withPreference = (value: string): AppState => ({
  ...initialAppState,
  preferences: { showTranslations: value },
});

describe("update", () => {
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
      player: { ...initialPlayerState, durationSeconds: 60 },
    };
    const [state] = update(loaded, actions.playerTimeChanged(3));
    expect(state.player.durationSeconds).toBe(60);
  });

  it("stores the duration for playerDurationChanged", () => {
    const [state] = update(initialAppState, actions.playerDurationChanged(90));
    expect(state.player.durationSeconds).toBe(90);
  });

  it("returns no effects for playerTimeChanged", () => {
    const [, effects] = update(initialAppState, actions.playerTimeChanged(3));
    expect(effects).toEqual([]);
  });

  it("stores whether the player plays for playerPlayingChanged", () => {
    const [state] = update(initialAppState, actions.playerPlayingChanged(true));
    expect(state.player.isPlaying).toBe(true);
  });

  it("returns a play command for playToggleRequested while paused", () => {
    const [, effects] = update(initialAppState, actions.playToggleRequested());
    expect(effects).toEqual([
      { type: "controlPlayer", command: { kind: "play" } },
    ]);
  });

  it("returns a pause command for playToggleRequested while playing", () => {
    const playing = {
      ...initialAppState,
      player: { ...initialPlayerState, isPlaying: true },
    };
    const [, effects] = update(playing, actions.playToggleRequested());
    expect(effects).toEqual([
      { type: "controlPlayer", command: { kind: "pause" } },
    ]);
  });

  it("returns a setVolume command for volumeChosen", () => {
    const [, effects] = update(initialAppState, actions.volumeChosen(0.4));
    expect(effects).toEqual([
      { type: "controlPlayer", command: { kind: "setVolume", volume: 0.4 } },
    ]);
  });

  it("returns a setRate command for rateChosen", () => {
    const [, effects] = update(initialAppState, actions.rateChosen(1.5));
    expect(effects).toEqual([
      { type: "controlPlayer", command: { kind: "setRate", rate: 1.5 } },
    ]);
  });

  it("stores the role being picked for subtitleFilePickRequested", () => {
    const [state] = update(
      initialAppState,
      actions.subtitleFilePickRequested("translation"),
    );
    expect(state.pendingSubtitlePick).toBe("translation");
  });

  it("returns a pickFile effect accepting subtitle files for subtitleFilePickRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.subtitleFilePickRequested("target"),
    );
    expect(effects).toEqual([{ type: "pickFile", accept: [".srt", ".vtt"] }]);
  });

  it("keeps the chosen file with the pending role for fileChosen", () => {
    const pending: AppState = {
      ...initialAppState,
      pendingSubtitlePick: "target",
    };
    const [state] = update(pending, actions.fileChosen(pickedFile));
    expect(state.chosenSubtitleFile).toEqual({
      file: pickedFile,
      role: "target",
    });
  });

  it("clears the pending subtitle pick for fileChosen", () => {
    const pending: AppState = {
      ...initialAppState,
      pendingSubtitlePick: "target",
    };
    const [state] = update(pending, actions.fileChosen(pickedFile));
    expect(state.pendingSubtitlePick).toBeNull();
  });

  it("clears the pending subtitle pick for filePickCancelled", () => {
    const pending: AppState = {
      ...initialAppState,
      pendingSubtitlePick: "target",
    };
    const [state] = update(pending, actions.filePickCancelled());
    expect(state.pendingSubtitlePick).toBeNull();
  });

  it("forgets the chosen subtitles file for subtitleFileAdded", () => {
    const chosen: AppState = {
      ...initialAppState,
      chosenSubtitleFile: { file: pickedFile, role: "target" },
    };
    const [state] = update(chosen, actions.subtitleFileAdded());
    expect(state.chosenSubtitleFile).toBeNull();
  });

  it("forgets the chosen media file for chosenMediaFileTaken", () => {
    const chosen = { ...initialAppState, chosenMediaFile: pickedMediaFile };
    const [state] = update(chosen, actions.chosenMediaFileTaken());
    expect(state.chosenMediaFile).toBeNull();
  });

  it("marks a media file pick as pending for mediaFilePickRequested", () => {
    const [state] = update(initialAppState, actions.mediaFilePickRequested());
    expect(state.pendingMediaFilePick).toBe(true);
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

  it("clears the pending media file pick for mediaFileChosen", () => {
    const pending = { ...initialAppState, pendingMediaFilePick: true };
    const [state] = update(pending, actions.mediaFileChosen(pickedMediaFile));
    expect(state.pendingMediaFilePick).toBe(false);
  });

  it("keeps the chosen media file for mediaFileChosen", () => {
    const [state] = update(
      initialAppState,
      actions.mediaFileChosen(pickedMediaFile),
    );
    expect(state.chosenMediaFile).toBe(pickedMediaFile);
  });

  it("clears the pending media file pick for mediaFilePickCancelled", () => {
    const pending = { ...initialAppState, pendingMediaFilePick: true };
    const [state] = update(pending, actions.mediaFilePickCancelled());
    expect(state.pendingMediaFilePick).toBe(false);
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
        ...initialPlayerState,
        currentTimeSeconds: 5,
        durationSeconds: 60,
      },
    };
    const [state] = update(playing, actions.closeMedia());
    expect(state.player).toEqual(initialPlayerState);
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

  it("returns two effects for cueCopyRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.cueCopyRequested("Hello"),
    );
    expect(effects).toHaveLength(2);
  });

  it("returns a copyToClipboard effect first for cueCopyRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.cueCopyRequested("Hello"),
    );
    expect(effects[0]).toEqual({ type: "copyToClipboard", text: "Hello" });
  });

  it("returns a confirmation notification second for cueCopyRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.cueCopyRequested("Hello"),
    );
    expect(effects[1]).toEqual({
      type: "showNotification",
      message: "Copied to clipboard",
    });
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
  describe("when importing a dictionary file", () => {
    it("keeps the chosen languages for dictionaryFilePickRequested", () => {
      const [state] = update(
        initialAppState,
        actions.dictionaryFilePickRequested(dictionaryLanguages),
      );
      expect(state.pendingDictionaryPick).toEqual(dictionaryLanguages);
    });

    it("returns a pickDictionaryFile effect for dictionaryFilePickRequested", () => {
      const [, effects] = update(
        initialAppState,
        actions.dictionaryFilePickRequested(dictionaryLanguages),
      );
      expect(effects).toEqual([{ type: "pickDictionaryFile" }]);
    });

    it("clears the unsupported file notice for dictionaryFilePickRequested", () => {
      const noticed = {
        ...initialAppState,
        unsupportedDictionaryFile: "a.zip",
      };
      const [state] = update(
        noticed,
        actions.dictionaryFilePickRequested(dictionaryLanguages),
      );
      expect(state.unsupportedDictionaryFile).toBeNull();
    });

    it("pairs the chosen file with the pending languages for dictionaryFileChosen", () => {
      const pending = {
        ...initialAppState,
        pendingDictionaryPick: dictionaryLanguages,
      };
      const [state] = update(
        pending,
        actions.dictionaryFileChosen(pickedDictionaryFile),
      );
      expect(state.chosenDictionaryFile).toEqual({
        file: pickedDictionaryFile,
        languages: dictionaryLanguages,
      });
    });

    it("clears the pending pick for dictionaryFileChosen", () => {
      const pending = {
        ...initialAppState,
        pendingDictionaryPick: dictionaryLanguages,
      };
      const [state] = update(
        pending,
        actions.dictionaryFileChosen(pickedDictionaryFile),
      );
      expect(state.pendingDictionaryPick).toBeNull();
    });

    it("ignores a chosen file without a pending pick for dictionaryFileChosen", () => {
      const [state] = update(
        initialAppState,
        actions.dictionaryFileChosen(pickedDictionaryFile),
      );
      expect(state.chosenDictionaryFile).toBeNull();
    });

    it("clears the pending pick for dictionaryFilePickCancelled", () => {
      const pending = {
        ...initialAppState,
        pendingDictionaryPick: dictionaryLanguages,
      };
      const [state] = update(pending, actions.dictionaryFilePickCancelled());
      expect(state.pendingDictionaryPick).toBeNull();
    });

    it("forgets the chosen file for dictionaryFileImported", () => {
      const [state] = update(
        withChosenDictionaryFile,
        actions.dictionaryFileImported(),
      );
      expect(state.chosenDictionaryFile).toBeNull();
    });

    it("forgets the chosen file for dictionaryFileUnsupported", () => {
      const [state] = update(
        withChosenDictionaryFile,
        actions.dictionaryFileUnsupported("jmdict.zip"),
      );
      expect(state.chosenDictionaryFile).toBeNull();
    });

    it("keeps the unsupported file's name for dictionaryFileUnsupported", () => {
      const [state] = update(
        withChosenDictionaryFile,
        actions.dictionaryFileUnsupported("jmdict.zip"),
      );
      expect(state.unsupportedDictionaryFile).toBe("jmdict.zip");
    });

    it("forgets the chosen file for dictionaryFileImportFailed", () => {
      const [state] = update(
        withChosenDictionaryFile,
        actions.dictionaryFileImportFailed(),
      );
      expect(state.chosenDictionaryFile).toBeNull();
    });

    it("returns a notification for dictionaryFileImportFailed", () => {
      const [, effects] = update(
        withChosenDictionaryFile,
        actions.dictionaryFileImportFailed(),
      );
      expect(effects).toEqual([
        {
          type: "showNotification",
          message: "The dictionary could not be added",
        },
      ]);
    });

    it("clears the notice for unsupportedDictionaryFileDismissed", () => {
      const noticed = {
        ...initialAppState,
        unsupportedDictionaryFile: "a.zip",
      };
      const [state] = update(
        noticed,
        actions.unsupportedDictionaryFileDismissed(),
      );
      expect(state.unsupportedDictionaryFile).toBeNull();
    });
  });
});
