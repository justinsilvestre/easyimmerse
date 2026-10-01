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

/** Returns the theme the app shows. */
export function chooseTheme({ system, override }: ThemeState): Theme {
  return override ?? system;
}
