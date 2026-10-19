import { actions } from "../app/appAction.ts";
import { runningImportStatus } from "../operations/exampleJobReports.ts";
import type { PickedDictionaryFile } from "../platform/effects.ts";

const zip: PickedDictionaryFile = {
  name: "jmdict.zip",
  source: { kind: "path", path: "/d/jmdict.zip" },
};
const importRequest = {
  kind: "importDictionary",
  file: zip,
  tableLayout: null,
} as const;

/** The actions that start importing jmdict.zip on the dictionaries page, up to its job's first report of 40 percent. */
export const startedDictionaryImport = [
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

/** The actions that try importing jmdict.zip on the dictionaries page, which the server refuses. */
export const failedDictionaryImport = [
  actions.navigated({ type: "openDictionaries" }),
  actions.dictionaryFileChosen(zip),
  actions.requestSettled("settings/dictionaryImport/import", importRequest, {
    ok: false,
    error: { status: 400, message: "broken" },
  }),
];
