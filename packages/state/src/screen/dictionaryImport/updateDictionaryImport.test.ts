import type {
  DictionarySummary,
  ImportJobStatus,
  TableLayout,
  TablePreview,
} from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { transientNotice } from "../../notices/transientNotice.ts";
import { runningImportStatus } from "../../operations/exampleJobReports.ts";
import type { PickedDictionaryFile } from "../../platform/effects.ts";
import type { DictionaryImportWizard } from "./dictionaryImportWizard.ts";
import { updateDictionaryImport } from "./updateDictionaryImport.ts";

const zip: PickedDictionaryFile = {
  name: "jmdict.zip",
  source: { kind: "path", path: "/d/jmdict.zip" },
};
const csv: PickedDictionaryFile = {
  name: "animals.csv",
  source: { kind: "path", path: "/d/animals.csv" },
};
const preview: TablePreview = {
  layout: { columns: ["term", "definition"], hasHeader: false },
  rows: [["Hund", "dog"]],
};
const layout: TableLayout = { columns: ["term", "ignored"], hasHeader: true };
const wiktionary = {
  id: "d1",
  title: "German-English Wiktionary",
} as DictionarySummary;

const previewing: DictionaryImportWizard = { stage: "previewing", file: csv };
const choosing: DictionaryImportWizard = {
  stage: "choosingColumns",
  file: csv,
  preview,
};
const starting: DictionaryImportWizard = { stage: "starting", file: zip };
const importing: DictionaryImportWizard = {
  stage: "importing",
  file: zip,
  jobId: "job1",
};
const failed: DictionaryImportWizard = { stage: "failed", message: "broken" };

const importRequest = (
  file: PickedDictionaryFile,
  tableLayout: TableLayout | null = null,
) => ({ kind: "importDictionary", file, tableLayout }) as const;

const importStarted = actions.requestSettled(
  "settings/dictionaryImport/import",
  importRequest(zip),
  { ok: true, data: { id: "job1" } },
);
const serverFailure = { status: 400, code: "bad_request", message: "broken" };
const statusRequest = { kind: "getImportJob", jobId: "job1" } as const;
const checked = (status: Partial<ImportJobStatus>) =>
  actions.requestSettled("jobs/dictionaryImport/job1", statusRequest, {
    ok: true,
    data: { ...runningImportStatus, ...status },
  });
const unwatch = { type: "unwatchJob", key: "jobs/dictionaryImport/job1" };

describe("updateDictionaryImport", () => {
  describe("when a file is chosen", () => {
    it("sends a picked archive to be imported", () => {
      const [, effects] = updateDictionaryImport(
        null,
        actions.dictionaryFileChosen(zip),
      );
      expect(effects).toEqual([
        {
          type: "sendRequest",
          id: "settings/dictionaryImport/import",
          request: importRequest(zip),
        },
      ]);
    });

    it("asks for a picked table's first rows", () => {
      const [, effects] = updateDictionaryImport(
        null,
        actions.dictionaryFileChosen(csv),
      );
      expect(effects).toEqual([
        {
          type: "sendRequest",
          id: "settings/dictionaryImport/preview",
          request: { kind: "previewDictionaryTable", file: csv },
        },
      ]);
    });

    it("forgets an earlier failure", () => {
      const [wizard] = updateDictionaryImport(
        failed,
        actions.dictionaryFileChosen(zip),
      );
      expect(wizard).toEqual(starting);
    });

    it("stops watching the job of the file imported before", () => {
      const [, effects] = updateDictionaryImport(
        importing,
        actions.dictionaryFileChosen(zip),
      );
      expect(effects).toContainEqual(unwatch);
    });
  });

  describe("for a table", () => {
    it("shows the previewed columns", () => {
      const settled = actions.requestSettled(
        "settings/dictionaryImport/preview",
        { kind: "previewDictionaryTable", file: csv },
        { ok: true, data: preview },
      );
      const [wizard] = updateDictionaryImport(previewing, settled);
      expect(wizard).toEqual(choosing);
    });

    it("says so when the table cannot be previewed", () => {
      const settled = actions.requestSettled(
        "settings/dictionaryImport/preview",
        { kind: "previewDictionaryTable", file: csv },
        { ok: false, error: serverFailure },
      );
      const [wizard] = updateDictionaryImport(previewing, settled);
      expect(wizard).toEqual({
        stage: "failed",
        message: "animals.csv could not be added: broken",
      });
    });

    it("imports the table with the columns the user checked", () => {
      const [, effects] = updateDictionaryImport(
        choosing,
        actions.dictionaryColumnsChosen(layout),
      );
      expect(effects).toEqual([
        {
          type: "sendRequest",
          id: "settings/dictionaryImport/import",
          request: importRequest(csv, layout),
        },
      ]);
    });

    it("ends the wizard when the columns are cancelled", () => {
      const [wizard] = updateDictionaryImport(
        choosing,
        actions.dictionaryColumnsCancelled(),
      );
      expect(wizard).toBeNull();
    });
  });

  describe("once the import has started", () => {
    it("remembers the job", () => {
      const [wizard] = updateDictionaryImport(starting, importStarted);
      expect(wizard).toEqual(importing);
    });

    it("watches the job", () => {
      const [, effects] = updateDictionaryImport(starting, importStarted);
      expect(effects).toEqual([
        {
          type: "watchJob",
          job: { kind: "dictionaryImport", request: statusRequest },
        },
      ]);
    });

    it("says what the server reported when the import could not start", () => {
      const settled = actions.requestSettled(
        "settings/dictionaryImport/import",
        importRequest(zip),
        { ok: false, error: serverFailure },
      );
      const [wizard] = updateDictionaryImport(starting, settled);
      expect(wizard).toEqual({
        stage: "failed",
        message: "jmdict.zip could not be added: broken",
      });
    });
  });

  describe("while the job runs", () => {
    it("names the added dictionary once the job is done", () => {
      const [, effects] = updateDictionaryImport(
        importing,
        checked({ state: "done", dictionary: wiktionary }),
      );
      expect(effects).toContainEqual({
        type: "showNotice",
        content: transientNotice("success", "Added German-English Wiktionary"),
      });
    });

    it("ends once the job is done", () => {
      const [wizard] = updateDictionaryImport(
        importing,
        checked({ state: "done", dictionary: wiktionary }),
      );
      expect(wizard).toBeNull();
    });

    it("stops watching the job once it is done", () => {
      const [, effects] = updateDictionaryImport(
        importing,
        checked({ state: "done", dictionary: wiktionary }),
      );
      expect(effects).toContainEqual(unwatch);
    });

    it("says what the server reported when the job failed", () => {
      const [wizard] = updateDictionaryImport(
        importing,
        checked({
          state: "failed",
          error: { code: "bad_request", message: "term_bank_3.json is broken" },
        }),
      );
      expect(wizard).toEqual({
        stage: "failed",
        message: "jmdict.zip could not be added: term_bank_3.json is broken",
      });
    });

    it("names a file in a format no reader supports", () => {
      const [wizard] = updateDictionaryImport(
        importing,
        checked({
          state: "failed",
          error: { code: "unsupported_dictionary_format", message: "no" },
        }),
      );
      expect(wizard).toEqual({ stage: "unsupported", fileName: "jmdict.zip" });
    });

    it("says so when the job can no longer be found", () => {
      const lost = actions.requestSettled(
        "jobs/dictionaryImport/job1",
        statusRequest,
        {
          ok: false,
          error: { status: 404, message: 'no import job has the id "job1"' },
        },
      );
      const [wizard] = updateDictionaryImport(importing, lost);
      expect(wizard).toEqual({
        stage: "failed",
        message:
          'jmdict.zip could not be added: no import job has the id "job1"',
      });
    });

    it("stays as it is while the job runs", () => {
      const [wizard] = updateDictionaryImport(importing, checked({}));
      expect(wizard).toBe(importing);
    });
  });

  it("ends the alert once it is dismissed", () => {
    const [wizard] = updateDictionaryImport(
      failed,
      actions.dictionaryImportAlertDismissed(),
    );
    expect(wizard).toBeNull();
  });

  it("ignores a request that was aborted", () => {
    const aborted = actions.requestSettled(
      "settings/dictionaryImport/import",
      importRequest(zip),
      { ok: false, error: { status: "ABORTED", message: "aborted" } },
    );
    const [wizard] = updateDictionaryImport(starting, aborted);
    expect(wizard).toBe(starting);
  });

  it("ignores a preview that settles after another file was chosen", () => {
    const settled = actions.requestSettled(
      "settings/dictionaryImport/preview",
      { kind: "previewDictionaryTable", file: csv },
      { ok: true, data: preview },
    );
    const [wizard] = updateDictionaryImport(starting, settled);
    expect(wizard).toBe(starting);
  });
});
