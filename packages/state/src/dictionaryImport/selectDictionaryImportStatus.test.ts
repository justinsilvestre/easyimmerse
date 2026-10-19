import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { runningImportStatus } from "../operations/exampleJobReports.ts";
import type { PickedDictionaryFile } from "../platform/effects.ts";
import { selectDictionaryImportStatus } from "./selectDictionaryImportStatus.ts";

const zip: PickedDictionaryFile = {
  name: "jmdict.zip",
  source: { kind: "path", path: "/d/jmdict.zip" },
};
const importRequest = {
  kind: "importDictionary",
  file: zip,
  tableLayout: null,
} as const;

const started = [
  actions.navigated({ type: "openDictionaries" }),
  actions.dictionaryFileChosen(zip),
  actions.requestSettled("settings/dictionaryImport/import", importRequest, {
    ok: true,
    data: { id: "job1" },
  }),
  actions.requestSettled(
    "jobs/dictionaryImport/job1",
    { kind: "getImportJob", jobId: "job1" },
    { ok: true, data: runningImportStatus },
  ),
];
const closeSettings = actions.navigated({ type: "closeSettings" });

describe("selectDictionaryImportStatus", () => {
  it("gives a running import's file and progress once the dictionaries page closes", () => {
    const app = stateAfter(...started, closeSettings);
    expect(selectDictionaryImportStatus({ app })).toEqual({
      kind: "running",
      fileName: "jmdict.zip",
      percent: 40,
    });
  });

  it("gives nothing while the dictionaries page is on top", () => {
    const app = stateAfter(...started);
    expect(selectDictionaryImportStatus({ app })).toBeNull();
  });

  it("tells of a failure once the dictionaries page closes", () => {
    const app = stateAfter(
      actions.navigated({ type: "openDictionaries" }),
      actions.dictionaryFileChosen(zip),
      actions.requestSettled(
        "settings/dictionaryImport/import",
        importRequest,
        {
          ok: false,
          error: { status: 400, message: "broken" },
        },
      ),
      closeSettings,
    );
    expect(selectDictionaryImportStatus({ app })).toEqual({ kind: "failed" });
  });

  it("gives nothing while no dictionary is being added", () => {
    expect(selectDictionaryImportStatus({ app: stateAfter() })).toBeNull();
  });
});
