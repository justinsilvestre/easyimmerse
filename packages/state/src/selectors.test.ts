import { describe, expect, it } from "vitest";
import { initialAppState } from "./appState.ts";
import type { RootState } from "./createAppStore.ts";
import {
  selectCurrentTime,
  selectPendingFilePick,
  selectPreference,
  selectSubtitleSource,
  selectTextScale,
} from "./selectors.ts";

const rootState: RootState = {
  app: {
    ...initialAppState,
    player: { currentTimeSeconds: 4 },
    subtitleSource: { kind: "inline", text: "Hello" },
    preferences: { showTranslations: "true" },
    pendingFilePick: true,
  },
};

describe("selectors", () => {
  it("selectCurrentTime returns the player's current time", () => {
    expect(selectCurrentTime(rootState)).toBe(4);
  });

  it("selectSubtitleSource returns the subtitle source", () => {
    expect(selectSubtitleSource(rootState)).toEqual({
      kind: "inline",
      text: "Hello",
    });
  });

  it("selectPreference returns the stored preference value", () => {
    expect(selectPreference("showTranslations")(rootState)).toBe("true");
  });

  it("selectPendingFilePick returns whether a file pick is pending", () => {
    expect(selectPendingFilePick(rootState)).toBe(true);
  });

  it("selectTextScale returns 100 until a scale is stored", () => {
    expect(selectTextScale(rootState)).toBe(100);
  });
});
