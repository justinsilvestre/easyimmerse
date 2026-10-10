import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { runningImportStatus } from "../../operations/exampleJobReports.ts";
import type { PickedDictionaryFile } from "../../platform/effects.ts";
import { selectDictionaryImport } from "./selectDictionaryImport.ts";

const zip: PickedDictionaryFile = {
  name: "jmdict.zip",
  source: { kind: "path", path: "/d/jmdict.zip" },
};

const started = [
  actions.navigated({ type: "openDictionaries" }),
  actions.dictionaryFileChosen(zip),
  actions.requestSettled(
    "settings/dictionaryImport/import",
    { kind: "importDictionary", file: zip, tableLayout: null },
    { ok: true, data: { id: "job1" } },
  ),
];

const csv: PickedDictionaryFile = {
  name: "animals.csv",
  source: { kind: "path", path: "/d/animals.csv" },
};

/** A table previewed with no term column detected. */
const previewedWithoutTerm = [
  actions.navigated({ type: "openDictionaries" }),
  actions.dictionaryFileChosen(csv),
  actions.requestSettled(
    "settings/dictionaryImport/preview",
    { kind: "previewDictionaryTable", file: csv },
    {
      ok: true,
      data: {
        layout: { columns: ["ignored", "definition"], hasHeader: false },
        rows: [["Hund", "dog"]],
      },
    },
  ),
];

const reported = actions.requestSettled(
  "jobs/dictionaryImport/job1",
  { kind: "getImportJob", jobId: "job1" },
  { ok: true, data: runningImportStatus },
);

describe("selectDictionaryImport", () => {
  it("names the file being added", () => {
    const app = stateAfter(...started);
    expect(selectDictionaryImport({ app }).addingFile).toBe("jmdict.zip");
  });

  it("gives what the job has stored so far", () => {
    const app = stateAfter(...started, reported);
    expect(selectDictionaryImport({ app }).progress).toEqual(
      runningImportStatus.progress,
    );
  });

  it("gives no progress before the job reports any", () => {
    const app = stateAfter(...started);
    expect(selectDictionaryImport({ app }).progress).toBeNull();
  });

  it("gives the failure to show", () => {
    const app = stateAfter(
      actions.navigated({ type: "openDictionaries" }),
      actions.dictionaryFileChosen(zip),
      actions.requestSettled(
        "settings/dictionaryImport/import",
        { kind: "importDictionary", file: zip, tableLayout: null },
        { ok: false, error: { status: 400, message: "broken" } },
      ),
    );
    expect(selectDictionaryImport({ app }).importFailure).toBe(
      "jmdict.zip could not be added: broken",
    );
  });

  it("gives the table's columns as the user has set them", () => {
    const app = stateAfter(
      ...previewedWithoutTerm,
      actions.dictionaryColumnRoleChosen(0, "term"),
    );
    expect(selectDictionaryImport({ app }).pendingTable?.layout).toEqual({
      columns: ["term", "definition"],
      hasHeader: false,
    });
  });

  it("says why the table cannot be imported yet", () => {
    const app = stateAfter(...previewedWithoutTerm);
    expect(selectDictionaryImport({ app }).pendingTable?.hint).toBe(
      "Choose the column that holds the term.",
    );
  });

  it("gives nothing to show while no file is being added", () => {
    expect(selectDictionaryImport({ app: stateAfter() })).toEqual({
      addingFile: null,
      progress: null,
      unsupportedFile: null,
      importFailure: null,
      pendingTable: null,
    });
  });

  it("gives the same result while nothing it shows changes", () => {
    const app = stateAfter(...started, reported);
    const before = selectDictionaryImport({ app });
    const after = { ...app, preferences: { ...app.preferences } };
    expect(selectDictionaryImport({ app: after })).toBe(before);
  });
});
