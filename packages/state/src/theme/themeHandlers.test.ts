import { describe, expect, it } from "vitest";
import { actions } from "../actions.ts";
import type { AppState } from "../appState.ts";
import { initialAppState } from "../appState.ts";
import { update } from "../update.ts";
import type { Theme } from "./themeState.ts";

const withTheme = (system: Theme, override: Theme | null): AppState => ({
  ...initialAppState,
  theme: { system, override },
});

describe("update", () => {
  it("stores the new system theme for systemThemeChanged", () => {
    const [state] = update(initialAppState, actions.systemThemeChanged("dark"));
    expect(state.theme.system).toBe("dark");
  });

  it("drops the override for systemThemeChanged", () => {
    const [state] = update(
      withTheme("light", "dark"),
      actions.systemThemeChanged("dark"),
    );
    expect(state.theme.override).toBeNull();
  });

  it("keeps the override when systemThemeChanged repeats the current system theme", () => {
    const [state] = update(
      withTheme("light", "dark"),
      actions.systemThemeChanged("light"),
    );
    expect(state.theme.override).toBe("dark");
  });

  it("returns no effects for systemThemeChanged", () => {
    const [, effects] = update(
      initialAppState,
      actions.systemThemeChanged("dark"),
    );
    expect(effects).toEqual([]);
  });

  it("overrides the system theme with the other theme for themeToggled", () => {
    const [state] = update(withTheme("light", null), actions.themeToggled());
    expect(state.theme.override).toBe("dark");
  });

  it("drops an override that themeToggled switches back to the system theme", () => {
    const [state] = update(withTheme("light", "dark"), actions.themeToggled());
    expect(state.theme.override).toBeNull();
  });

  it("returns no effects for themeToggled", () => {
    const [, effects] = update(initialAppState, actions.themeToggled());
    expect(effects).toEqual([]);
  });
});
