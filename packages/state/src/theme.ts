export type Theme = "light" | "dark";

/**
 * The operating system's theme, and a theme the user chose in its place.
 * The override lasts until the system theme next changes.
 */
export type ThemeState = {
  system: Theme;
  override: Theme | null;
};

export const initialThemeState: ThemeState = {
  system: "light",
  override: null,
};

/** Returns the theme the app shows: the one the user chose, or else the operating system's. */
export function chooseTheme({ system, override }: ThemeState): Theme {
  return override ?? system;
}

/** Records the operating system's theme. A change drops the user's override. */
export function followSystemTheme(
  state: ThemeState,
  system: Theme,
): ThemeState {
  return system === state.system ? state : { system, override: null };
}

/** Switches to the other theme, as an override unless that is the system theme. */
export function toggleTheme(state: ThemeState): ThemeState {
  const next = chooseTheme(state) === "light" ? "dark" : "light";
  return {
    system: state.system,
    override: next === state.system ? null : next,
  };
}
