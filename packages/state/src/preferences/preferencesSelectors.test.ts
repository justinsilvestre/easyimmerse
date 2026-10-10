import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import {
  selectPlayerControls,
  selectPreference,
  selectPreferencesLoaded,
  selectTextScale,
  selectTheme,
} from "./preferencesSelectors.ts";

const loaded = {
  app: stateAfter(actions.preferencesLoaded({ showTranslations: "true" })),
};

describe("preferencesSelectors", () => {
  it("selectPreference returns the stored preference value", () => {
    expect(selectPreference("showTranslations")(loaded)).toBe("true");
  });

  it("selectPreferencesLoaded returns whether the stored preferences have arrived", () => {
    expect(selectPreferencesLoaded(loaded)).toBe(true);
  });

  it("selectTextScale returns 100 until a scale is stored", () => {
    expect(selectTextScale(loaded)).toBe(100);
  });

  it("selectTheme returns the operating system's theme until one is chosen", () => {
    const dark = { app: stateAfter(actions.systemThemeChanged("dark")) };
    expect(selectTheme(dark)).toBe("dark");
  });

  it("selectPlayerControls returns the player's volume, mute and speed", () => {
    const quiet = { app: stateAfter(actions.volumeChangeRequested(0.2)) };
    expect(selectPlayerControls(quiet)).toEqual({
      volume: 0.2,
      isMuted: false,
      speed: 1,
    });
  });
});
