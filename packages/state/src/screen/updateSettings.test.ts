import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { PickedDictionaryFile } from "../platform/effects.ts";
import type { Route } from "../route/route.ts";
import { updateSettings } from "./updateSettings.ts";

const zip: PickedDictionaryFile = {
  name: "jmdict.zip",
  source: { kind: "path", path: "/dictionaries/jmdict.zip" },
};

const dictionariesPage: Route = {
  screen: "settings",
  beneath: { screen: "home" },
  pages: ["general", "dictionaries"],
};

const generalPage: Route = {
  screen: "settings",
  beneath: { screen: "home" },
  pages: ["general"],
};

const importing = {
  dictionaryImport: { stage: "importing", file: zip, jobId: "job1" },
} as const;

const closeSettings = actions.navigated({ type: "closeSettings" });
const unwatch = { type: "unwatchJob", key: "jobs/dictionaryImport/job1" };

describe("updateSettings", () => {
  it("starts with no import when Settings open", () => {
    const [settings] = updateSettings(
      null,
      actions.settingsRequested(),
      dictionariesPage,
    );
    expect(settings).toEqual({ dictionaryImport: null });
  });

  it("starts adding a chosen dictionary file", () => {
    const [settings] = updateSettings(
      { dictionaryImport: null },
      actions.dictionaryFileChosen(zip),
      dictionariesPage,
    );
    expect(settings?.dictionaryImport).toEqual({
      stage: "starting",
      file: zip,
    });
  });

  it("drops the import when the dictionaries page closes", () => {
    const [settings] = updateSettings(importing, closeSettings, generalPage);
    expect(settings).toEqual({ dictionaryImport: null });
  });

  it("stops watching the import's job when the dictionaries page closes", () => {
    const [, effects] = updateSettings(importing, closeSettings, generalPage);
    expect(effects).toEqual([unwatch]);
  });

  it("drops its state once Settings close", () => {
    const [settings] = updateSettings(importing, closeSettings, {
      screen: "home",
    });
    expect(settings).toBeNull();
  });

  it("stops watching the import's job once Settings close", () => {
    const [, effects] = updateSettings(importing, closeSettings, {
      screen: "home",
    });
    expect(effects).toEqual([unwatch]);
  });

  it("removes a dictionary once its removal is confirmed", () => {
    const [, effects] = updateSettings(
      { dictionaryImport: null },
      actions.dictionaryRemovalConfirmed("d1"),
      dictionariesPage,
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "settings/dictionaries/remove/d1",
        request: { kind: "deleteDictionary", dictionaryId: "d1" },
      },
    ]);
  });
});
