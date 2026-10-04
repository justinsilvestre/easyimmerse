import { describe, expect, it } from "vitest";
import { initialAppState } from "./appState.ts";
import type { RootState } from "./createAppStore.ts";
import {
  selectChosenMediaFile,
  selectCurrentMediaFileId,
  selectCurrentTime,
  selectPendingFilePick,
  selectPendingMediaFilePick,
  selectPlayerDuration,
  selectPreference,
  selectPreferencesLoaded,
  selectPlayer,
  selectTextScale,
} from "./selectors.ts";

const rootState: RootState = {
  app: {
    ...initialAppState,
    player: { ...initialAppState.player, currentTimeSeconds: 4, durationSeconds: 90 },
    chosenSubtitleFile: null,
    preferences: { showTranslations: "true" },
    preferencesLoaded: true,
    pendingFilePick: true,
    currentMediaFileId: "m1",
    pendingMediaFilePick: true,
    chosenMediaFile: { name: "a.mp4", source: { kind: "path", path: "/a" } },
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

  it("selectPendingMediaFilePick returns whether a media file pick is pending", () => {
    expect(selectPendingMediaFilePick(rootState)).toBe(true);
  });

  it("selectChosenMediaFile returns the media file waiting to be added", () => {
    expect(selectChosenMediaFile(rootState)?.name).toBe("a.mp4");
  });

  it("selectTextScale returns 100 until a scale is stored", () => {
    expect(selectTextScale(rootState)).toBe(100);
  });
});
