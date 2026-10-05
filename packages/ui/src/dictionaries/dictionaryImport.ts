import type { TablePreview } from "@easyimmerse/types";

/** A table file waiting for the user to check its columns before it is imported. */
export type PendingTable = {
  fileName: string;
  bytes: Uint8Array;
  preview: TablePreview;
};

/** Where adding a dictionary from a file stands. */
export type DictionaryImport = {
  /** The file being read or imported. */
  addingFile: string | null;
  /** The file last refused because no supported format reads it, until dismissed. */
  unsupportedFile: string | null;
  pendingTable: PendingTable | null;
};

export type DictionaryImportAction =
  | { type: "started"; fileName: string }
  | { type: "tablePreviewed"; table: PendingTable }
  | { type: "tableCancelled" }
  | { type: "finished" }
  | { type: "refusedAsUnsupported"; fileName: string }
  | { type: "unsupportedDismissed" };

export const initialDictionaryImport: DictionaryImport = {
  addingFile: null,
  unsupportedFile: null,
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
        unsupportedFile: null,
        pendingTable: null,
      };
    case "tablePreviewed":
      return { ...state, addingFile: null, pendingTable: action.table };
    case "tableCancelled":
      return { ...state, pendingTable: null };
    case "finished":
      return { ...state, addingFile: null };
    case "refusedAsUnsupported":
      return { ...state, addingFile: null, unsupportedFile: action.fileName };
    case "unsupportedDismissed":
      return { ...state, unsupportedFile: null };
  }
}
