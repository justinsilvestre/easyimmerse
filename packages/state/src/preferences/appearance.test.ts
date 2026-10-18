import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { applyingAppearance } from "./appearance.ts";
import type { Theme } from "./theme.ts";
import { updatePreferences } from "./updatePreferences.ts";

const update = applyingAppearance(updatePreferences);

/** Returns the effects of an action on the preferences, through the wrapped update, after the given earlier actions. */
const effectsOf = (action: AppAction, ...before: AppAction[]) => {
  const app = stateAfter(...before);
  return update(app.preferences, action, app)[1];
};

const applyAppearance = (theme: Theme, textScale = 100) => ({
  type: "applyAppearance",
  appearance: { theme, textScale },
});

describe("applyingAppearance", () => {
  it("applies the appearance when the app starts", () => {
    expect(effectsOf(actions.appStarted())).toContainEqual(
      applyAppearance("light"),
    );
  });

  it("applies a chosen theme", () => {
    expect(effectsOf(actions.preferenceSet("theme", "dark"))).toContainEqual(
      applyAppearance("dark"),
    );
  });

  it("applies a chosen text scale", () => {
    expect(effectsOf(actions.textScaleChosen(125))).toContainEqual(
      applyAppearance("light", 125),
    );
  });

  it("applies the loaded appearance", () => {
    const loaded = actions.preferencesLoaded({
      theme: "dark",
      textScale: "150",
    });
    expect(effectsOf(loaded)).toContainEqual(applyAppearance("dark", 150));
  });

  it("applies a changed system theme while following the system", () => {
    expect(effectsOf(actions.systemThemeChanged("dark"))).toEqual([
      applyAppearance("dark"),
    ]);
  });

  it("applies nothing when the system theme changes under a chosen theme", () => {
    expect(
      effectsOf(
        actions.systemThemeChanged("dark"),
        actions.preferenceSet("theme", "light"),
      ),
    ).toEqual([]);
  });

  it("applies nothing when a preference other than the appearance changes", () => {
    expect(
      effectsOf(actions.preferenceSet("showTranslations", "true")),
    ).not.toContainEqual(expect.objectContaining({ type: "applyAppearance" }));
  });
});
