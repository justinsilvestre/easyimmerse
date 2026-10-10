import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { PickedDictionaryFile } from "../platform/effects.ts";
import type { Route } from "../route/route.ts";
import { updateSettings } from "./updateSettings.ts";

const pickedDictionaryFile: PickedDictionaryFile = {
  name: "jmdict.zip",
  source: { kind: "path", path: "/dictionaries/jmdict.zip" },
};

const settings: Route = {
  screen: "settings",
  beneath: { screen: "home" },
  pages: ["dictionaries"],
};

const chosen = {
  dictionaryImport: { stage: "fileChosen", file: pickedDictionaryFile },
} as const;

describe("updateSettings", () => {
  it("starts with no import when Settings open", () => {
    expect(updateSettings(null, actions.settingsRequested(), settings)).toEqual(
      { dictionaryImport: null },
    );
  });

  it("keeps the chosen dictionary file for dictionaryFileChosen", () => {
    expect(
      updateSettings(
        { dictionaryImport: null },
        actions.dictionaryFileChosen(pickedDictionaryFile),
        settings,
      ),
    ).toEqual(chosen);
  });

  it("forgets the chosen dictionary file for dictionaryFileHandled", () => {
    expect(
      updateSettings(chosen, actions.dictionaryFileHandled(), settings),
    ).toEqual({ dictionaryImport: null });
  });

  it("drops its state once Settings close", () => {
    expect(
      updateSettings(chosen, actions.navigated({ type: "closeSettings" }), {
        screen: "home",
      }),
    ).toBeNull();
  });
});
