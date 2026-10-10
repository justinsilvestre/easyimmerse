import { describe, expect, it } from "vitest";
import { initialAppState } from "./appState.ts";
import type { RootState } from "./createAppStore.ts";
import {
  selectChosenMediaFile,
  selectCurrentMediaFileId,
  selectCurrentTime,
  selectIsSettingsOpen,
  selectPendingFilePick,
  selectPlayer,
  selectPlayerDuration,
  selectPreference,
  selectPreferencesLoaded,
  selectReadingLocation,
  selectRoute,
  selectTextScale,
} from "./selectors.ts";

const rootState: RootState = {
  app: {
    ...initialAppState,
    player: {
      ...initialAppState.player,
      currentTimeSeconds: 4,
      durationSeconds: 90,
    },
    chosenSubtitleFile: null,
    preferences: { showTranslations: "true" },
    preferencesLoaded: true,
    pendingFilePick: true,
    currentMediaFileId: "m1",
    route: { screen: "project", projectId: "p1" },
    chosenMediaFile: { name: "a.mp4", source: { kind: "path", path: "/a" } },
    readingLocations: {
      b1: { chapterIndex: 1, paragraphIndex: 2, offset: 3 },
      b2: null,
    },
  },
};

describe("selectors", () => {
  it("selectCurrentTime returns the player's current time", () => {
    expect(selectCurrentTime(rootState)).toBe(4);
  });

  it("selectPlayerDuration returns the loaded file's duration", () => {
    expect(selectPlayerDuration(rootState)).toBe(90);
  });

  it("selectPlayer returns the whole player state", () => {
    expect(selectPlayer(rootState)).toEqual(rootState.app.player);
  });

  it("selectPreference returns the stored preference value", () => {
    expect(selectPreference("showTranslations")(rootState)).toBe("true");
  });

  it("selectPreferencesLoaded returns whether the stored preferences have arrived", () => {
    expect(selectPreferencesLoaded(rootState)).toBe(true);
  });

  it("selectPendingFilePick returns whether a file pick is pending", () => {
    expect(selectPendingFilePick(rootState)).toBe(true);
  });

  it("selectCurrentMediaFileId returns the open media file's id", () => {
    expect(selectCurrentMediaFileId(rootState)).toBe("m1");
  });

  it("selectChosenMediaFile returns the media file waiting to be added", () => {
    expect(selectChosenMediaFile(rootState)?.name).toBe("a.mp4");
  });

  it("selectRoute returns where the app is", () => {
    expect(selectRoute(rootState)).toEqual({
      screen: "project",
      projectId: "p1",
    });
  });

  it("selectIsSettingsOpen returns false while a main screen shows", () => {
    expect(selectIsSettingsOpen(rootState)).toBe(false);
  });

  it("selectIsSettingsOpen returns true while Settings lie over the main screen", () => {
    const route = {
      screen: "settings",
      beneath: { screen: "home" },
      pages: ["general"],
    } as const;
    expect(selectIsSettingsOpen({ app: { ...rootState.app, route } })).toBe(
      true,
    );
  });

  it("selectTextScale returns 100 until a scale is stored", () => {
    expect(selectTextScale(rootState)).toBe(100);
  });

  it("selectReadingLocation returns the book's last reading location", () => {
    expect(selectReadingLocation("b1")(rootState)).toEqual({
      chapterIndex: 1,
      paragraphIndex: 2,
      offset: 3,
    });
  });

  it("selectReadingLocation returns null for a book with no stored location", () => {
    expect(selectReadingLocation("b2")(rootState)).toBeNull();
  });

  it("selectReadingLocation returns undefined until the book's location has loaded", () => {
    expect(selectReadingLocation("b3")(rootState)).toBeUndefined();
  });
});
