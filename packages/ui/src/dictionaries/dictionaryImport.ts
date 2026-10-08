import type { TablePreview } from "@easyimmerse/types";

/** A table file waiting for the user to check its columns before it is imported. */
export type PendingTable = {
  fileName: string;
  /** The file's bytes, as a browser holds them, or its path, from which the server reads it. */
  contents:
    | { kind: "bytes"; bytes: Uint8Array }
    | { kind: "path"; path: string };
  preview: TablePreview;
};

/** Where adding a dictionary from a file stands. */
export type DictionaryImport = {
  /** The file being read or imported. */
  addingFile: string | null;
  /** The job importing `addingFile`, once the server has started it. */
  jobId: string | null;
  /** The file last refused because no supported format reads it, until dismissed. */
  unsupportedFile: string | null;
  /** Why the last file could not be added for another reason, until dismissed. */
  importFailure: string | null;
  pendingTable: PendingTable | null;
};

export type DictionaryImportAction =
  | { type: "started"; fileName: string }
  | { type: "jobStarted"; jobId: string }
  | { type: "tablePreviewed"; table: PendingTable }
  | { type: "tableCancelled" }
  | { type: "finished" }
  | { type: "refusedAsUnsupported"; fileName: string }
  | { type: "unsupportedDismissed" }
  | { type: "failed"; message: string }
  | { type: "failureDismissed" };

export const initialDictionaryImport: DictionaryImport = {
  addingFile: null,
  jobId: null,
  unsupportedFile: null,
  importFailure: null,
  pendingTable: null,
};

const tableExtensions = [".csv", ".tsv", ".tab", ".txt"];

/** Tells whether a file is a table whose columns the user checks before importing it. */
export function isTableFile(fileName: string): boolean {
  const lowerCase = fileName.toLowerCase();
  return tableExtensions.some((extension) => lowerCase.endsWith(extension));
}

export function reduceDictionaryImport(
  state: DictionaryImport,
  action: DictionaryImportAction,
): DictionaryImport {
  switch (action.type) {
    case "started":
      return {
        addingFile: action.fileName,
        jobId: null,
        unsupportedFile: null,
        importFailure: null,
        pendingTable: null,
      };
    case "jobStarted":
      return { ...state, jobId: action.jobId };
    case "tablePreviewed":
      return { ...state, addingFile: null, pendingTable: action.table };
    case "tableCancelled":
      return { ...state, pendingTable: null };
    case "finished":
      return { ...state, addingFile: null, jobId: null };
    case "refusedAsUnsupported":
      return {
        ...state,
        addingFile: null,
        jobId: null,
        unsupportedFile: action.fileName,
      };
    case "unsupportedDismissed":
      return { ...state, unsupportedFile: null };
    case "failed":
      return {
        ...state,
        addingFile: null,
        jobId: null,
        importFailure: action.message,
      };
    case "failureDismissed":
      return { ...state, importFailure: null };
  }
}
