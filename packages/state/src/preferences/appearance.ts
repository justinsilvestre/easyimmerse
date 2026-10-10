import type { AppState } from "../app/appState.ts";
import type { FeatureUpdate } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import type { PreferencesState } from "./preferencesState.ts";
import { parseTextScale } from "./textScale.ts";
import { chooseTheme, parseThemeChoice, type Theme } from "./theme.ts";

/** How the document looks: the theme shown, and the text scale as a percentage of the browser's default. */
export type Appearance = { theme: Theme; textScale: number };

/** Returns the appearance that the preferences call for. */
export function appearanceOf(preferences: PreferencesState): Appearance {
  const choice = parseThemeChoice(preferences.values.theme);
  return {
    theme: chooseTheme(choice, preferences.systemTheme),
    textScale: parseTextScale(preferences.values.textScale),
  };
}

/** Adds an `applyAppearance` effect to an update of the preferences when the app starts and whenever the appearance changes. */
export function applyingAppearance<Deps extends keyof AppState>(
  update: FeatureUpdate<PreferencesState, Deps>,
): FeatureUpdate<PreferencesState, Deps> {
  return (preferences, action, app) => {
    const [next, effects] = update(preferences, action, app);
    const appearance = appearanceOf(next);
    return action.type === "appStarted" ||
      !isSameAppearance(appearance, appearanceOf(preferences))
      ? updated(next, ...effects, { type: "applyAppearance", appearance })
      : updated(next, ...effects);
  };
}

function isSameAppearance(one: Appearance, other: Appearance): boolean {
  return one.theme === other.theme && one.textScale === other.textScale;
}
