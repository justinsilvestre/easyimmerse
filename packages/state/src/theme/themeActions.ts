import type { Theme } from "./themeState.ts";

export const themeActions = {
  systemThemeChanged: (theme: Theme) =>
    ({ type: "systemThemeChanged", theme }) as const,
  themeToggled: () => ({ type: "themeToggled" }) as const,
};
