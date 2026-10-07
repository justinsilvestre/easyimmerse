export type Theme = "light" | "dark";

/** What the user asked for: one theme for good, or whichever the operating system shows. */
export type ThemeChoice = Theme | "system";

export const themeChoices: readonly ThemeChoice[] = ["system", "light", "dark"];

/** Reads a stored theme choice; anything unknown counts as following the system. */
export function parseThemeChoice(value: string | undefined): ThemeChoice {
  return value === "light" || value === "dark" ? value : "system";
}

/** Returns the theme the app shows for a choice: the chosen one, or else the operating system's. */
export function chooseTheme(choice: ThemeChoice, system: Theme): Theme {
  return choice === "system" ? system : choice;
}
