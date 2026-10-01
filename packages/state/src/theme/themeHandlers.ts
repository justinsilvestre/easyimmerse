import type { AppState } from "../appState.ts";
import type { UpdateHandlers } from "../updateHandlers.ts";
import type { Theme } from "./themeState.ts";
import { chooseTheme } from "./themeState.ts";

export const themeHandlers = {
  systemThemeChanged: (state, { theme }) => [
    theme === state.theme.system
      ? state
      : { ...state, theme: { system: theme, override: null } },
    [],
  ],
  themeToggled: (state) => [toggleTheme(state), []],
} satisfies Partial<UpdateHandlers>;

function toggleTheme(state: AppState): AppState {
  const { system } = state.theme;
  const next = oppositeTheme(chooseTheme(state.theme));
  return {
    ...state,
    theme: { system, override: next === system ? null : next },
  };
}

function oppositeTheme(theme: Theme): Theme {
  return theme === "light" ? "dark" : "light";
}
