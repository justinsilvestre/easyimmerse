import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import {
  exampleTracksOneEach,
  exampleTranscodePlayback,
} from "../screen/mediaScreen/examplePlayback.ts";
import {
  environmentMeasured,
  mediaFilesListed,
  methodSettled,
  tracksSettled,
} from "../screen/mediaScreen/playbackTestActions.ts";
import { updatePreferences } from "./updatePreferences.ts";

/** Applies an action to the preferences after the given earlier actions. */
const apply = (action: AppAction, ...before: AppAction[]) => {
  const app = stateAfter(...before);
  return updatePreferences(app.preferences, action, app);
};

/** The actions that open the conversion notice on the media screen of m1. */
const openConversionNotice: AppAction[] = [
  actions.openMediaFileRequested("p1", "m1"),
  actions.preferencesLoaded({}),
  mediaFilesListed(),
  tracksSettled(exampleTracksOneEach),
  environmentMeasured,
  methodSettled(exampleTranscodePlayback),
];

const translationsOn = actions.preferenceSet("showTranslations", "true");

describe("updatePreferences", () => {
  it("turns an unset preference on for preferenceToggled", () => {
    const [preferences] = apply(actions.preferenceToggled("showTranslations"));
    expect(preferences.values.showTranslations).toBe("true");
  });

  it("turns a preference that is on off for preferenceToggled", () => {
    const [preferences] = apply(
      actions.preferenceToggled("showTranslations"),
      translationsOn,
    );
    expect(preferences.values.showTranslations).toBe("false");
  });

  it("returns a savePreference effect with the new value for preferenceToggled", () => {
    const [, effects] = apply(
      actions.preferenceToggled("showTranslations"),
      translationsOn,
    );
    expect(effects).toEqual([
      { type: "savePreference", key: "showTranslations", value: "false" },
    ]);
  });

  it("loads every preference when the app starts", () => {
    const [, effects] = apply(actions.appStarted());
    expect(effects).toEqual([
      {
        type: "loadPreferences",
        keys: [
          "showTranslations",
          "textScale",
          "losslessAudio",
          "conversionNoticeDismissed",
          "readerPreferences",
          "subtitleAppearance",
          "theme",
        ],
      },
    ]);
  });

  it("stores the given value for preferenceSet", () => {
    const [preferences] = apply(
      actions.preferenceSet("conversionNoticeDismissed", "true"),
    );
    expect(preferences.values.conversionNoticeDismissed).toBe("true");
  });

  it("stores a structured preference as the given JSON for preferenceSet", () => {
    const [preferences] = apply(
      actions.preferenceSet("subtitleAppearance", '{"boxOpacity":40}'),
    );
    expect(preferences.values.subtitleAppearance).toBe('{"boxOpacity":40}');
  });

  it("returns a savePreference effect with the given value for preferenceSet", () => {
    const [, effects] = apply(
      actions.preferenceSet("conversionNoticeDismissed", "true"),
    );
    expect(effects).toEqual([
      {
        type: "savePreference",
        key: "conversionNoticeDismissed",
        value: "true",
      },
    ]);
  });

  it("stores the loaded values for preferencesLoaded", () => {
    const [preferences] = apply(
      actions.preferencesLoaded({ showTranslations: "true" }),
    );
    expect(preferences.values.showTranslations).toBe("true");
  });

  it("keeps a preference that storage did not hold for preferencesLoaded", () => {
    const [preferences] = apply(
      actions.preferencesLoaded({ losslessAudio: "true" }),
      translationsOn,
    );
    expect(preferences.values.showTranslations).toBe("true");
  });

  it("marks the preferences as loaded for preferencesLoaded", () => {
    const [preferences] = apply(actions.preferencesLoaded({}));
    expect(preferences.isLoaded).toBe(true);
  });

  it("stores the chosen scale as a preference for textScaleChosen", () => {
    const [preferences] = apply(actions.textScaleChosen(125));
    expect(preferences.values.textScale).toBe("125");
  });

  it("returns a savePreference effect for textScaleChosen", () => {
    const [, effects] = apply(actions.textScaleChosen(125));
    expect(effects).toEqual([
      { type: "savePreference", key: "textScale", value: "125" },
    ]);
  });

  it("stores the operating system's theme for systemThemeChanged", () => {
    const [preferences] = apply(actions.systemThemeChanged("dark"));
    expect(preferences.systemTheme).toBe("dark");
  });

  it("stores the conversion notice's dismissal when it is accepted with its box ticked", () => {
    const [preferences] = apply(
      actions.conversionNoticeAccepted(),
      ...openConversionNotice,
    );
    expect(preferences.values.conversionNoticeDismissed).toBe("true");
  });

  it("stores nothing when the conversion notice is accepted with its box cleared", () => {
    const [, effects] = apply(
      actions.conversionNoticeAccepted(),
      ...openConversionNotice,
      actions.conversionNoticeDismissalToggled(),
    );
    expect(effects).toEqual([]);
  });

  describe("for the player controls", () => {
    it("stores the volume for volumeChangeRequested", () => {
      const [preferences] = apply(actions.volumeChangeRequested(0.4));
      expect(preferences.playerControls.volume).toBe(0.4);
    });

    it("returns a setPlayerVolume effect for volumeChangeRequested", () => {
      const [, effects] = apply(actions.volumeChangeRequested(0.4));
      expect(effects).toEqual([{ type: "setPlayerVolume", volume: 0.4 }]);
    });

    it("returns a setPlayerSpeed effect for speedChangeRequested", () => {
      const [, effects] = apply(actions.speedChangeRequested(1.5));
      expect(effects).toEqual([{ type: "setPlayerSpeed", speed: 1.5 }]);
    });

    it("flips isMuted for muteToggleRequested", () => {
      const [preferences] = apply(actions.muteToggleRequested());
      expect(preferences.playerControls.isMuted).toBe(true);
    });

    it("flips isMuted back for a second muteToggleRequested", () => {
      const [preferences] = apply(
        actions.muteToggleRequested(),
        actions.muteToggleRequested(),
      );
      expect(preferences.playerControls.isMuted).toBe(false);
    });

    it("returns a setPlayerMuted effect for muteToggleRequested", () => {
      const [, effects] = apply(actions.muteToggleRequested());
      expect(effects).toEqual([{ type: "setPlayerMuted", isMuted: true }]);
    });

    it("returns an unmuting setPlayerMuted effect when muted", () => {
      const [, effects] = apply(
        actions.muteToggleRequested(),
        actions.muteToggleRequested(),
      );
      expect(effects).toEqual([{ type: "setPlayerMuted", isMuted: false }]);
    });

    it("keeps the volume for muteToggleRequested", () => {
      const [preferences] = apply(
        actions.muteToggleRequested(),
        actions.volumeChangeRequested(0.4),
      );
      expect(preferences.playerControls.volume).toBe(0.4);
    });
  });
});
