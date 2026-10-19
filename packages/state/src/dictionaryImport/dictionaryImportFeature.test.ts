import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { PickedDictionaryFile } from "../platform/effects.ts";
import type { Route } from "../route/route.ts";
import { dictionaryImportFeature } from "./dictionaryImportFeature.ts";
import type { DictionaryImportWizard } from "./dictionaryImportWizard.ts";

const zip: PickedDictionaryFile = {
  name: "jmdict.zip",
  source: { kind: "path", path: "/d/jmdict.zip" },
};
const csv: PickedDictionaryFile = {
  name: "animals.csv",
  source: { kind: "path", path: "/d/animals.csv" },
};

const dictionariesPage: Route = {
  screen: "settings",
  beneath: { screen: "home" },
  pages: ["general", "dictionaries"],
};

const importing: DictionaryImportWizard = {
  stage: "importing",
  file: zip,
  jobId: "job1",
};
const choosing: DictionaryImportWizard = {
  stage: "choosingColumns",
  file: csv,
  preview: { layout: { columns: ["term"], hasHeader: false }, rows: [] },
  layout: { columns: ["term"], hasHeader: false },
};

const closeSettings = actions.navigated({ type: "closeSettings" });

/** Applies an action while the dictionaries page is on top. */
const updateOnPage = (
  wizard: DictionaryImportWizard | null,
  action: Parameters<typeof dictionaryImportFeature.update>[1],
) =>
  dictionaryImportFeature.update(wizard, action, {
    route: dictionariesPage,
    screen: { main: { kind: "home" }, settings: null, dialog: null },
    mediaImports: {},
  });

describe("dictionaryImportFeature", () => {
  it("starts adding a chosen file", () => {
    const [wizard] = updateOnPage(null, actions.dictionaryFileChosen(zip));
    expect(wizard).toEqual({ stage: "starting", file: zip });
  });

  it("keeps a running import once Settings close", () => {
    const [wizard] = updateOnPage(importing, closeSettings);
    expect(wizard).toBe(importing);
  });

  it("goes on watching a running import's job once Settings close", () => {
    const [, effects] = updateOnPage(importing, closeSettings);
    expect(effects).toEqual([]);
  });

  it("keeps a failure until it is dismissed, after Settings close", () => {
    const failed: DictionaryImportWizard = { stage: "failed", message: "no" };
    const [wizard] = updateOnPage(failed, closeSettings);
    expect(wizard).toBe(failed);
  });

  it("aborts the preview of a table once Settings close", () => {
    const previewing: DictionaryImportWizard = {
      stage: "previewing",
      file: csv,
    };
    const [, effects] = updateOnPage(previewing, closeSettings);
    expect(effects).toEqual([
      { type: "abortRequest", id: "settings/dictionaryImport/preview" },
    ]);
  });

  it("drops a table whose columns are being checked once Settings close", () => {
    const [wizard] = updateOnPage(choosing, closeSettings);
    expect(wizard).toBeNull();
  });
});
