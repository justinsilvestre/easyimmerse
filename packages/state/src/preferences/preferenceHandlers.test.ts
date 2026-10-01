import { describe, expect, it } from "vitest";
import { actions } from "../actions.ts";
import type { AppState } from "../appState.ts";
import { initialAppState } from "../appState.ts";
import { update } from "../update.ts";

const withPreference = (value: string): AppState => ({
  ...initialAppState,
  preferences: { showTranslations: value },
});

describe("update", () => {
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

  it("returns a loadPreference effect for every preference key for preferencesLoadRequested", () => {
    const [, effects] = update(
      initialAppState,
      actions.preferencesLoadRequested(),
    );
    expect(effects).toEqual([
      { type: "loadPreference", key: "showTranslations" },
      { type: "loadPreference", key: "conversionNoticeDismissed" },
    ]);
  });

  it("stores the loaded value for preferenceLoaded", () => {
    const [state] = update(
      initialAppState,
      actions.preferenceLoaded("showTranslations", "true"),
    );
    expect(state.preferences.showTranslations).toBe("true");
  });

  it("leaves state unchanged when preferenceLoaded carries null", () => {
    const [state] = update(
      initialAppState,
      actions.preferenceLoaded("showTranslations", null),
    );
    expect(state).toBe(initialAppState);
  });
});
