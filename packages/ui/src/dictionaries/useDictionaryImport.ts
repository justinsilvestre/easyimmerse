import {
  type BackendError,
  useImportDictionaryMutation,
  useImportLocalDictionaryMutation,
  usePreviewDictionaryTableMutation,
} from "@easyimmerse/backend";
import type { PickedDictionaryFile } from "@easyimmerse/state";
import { actions, selectChosenDictionaryFile } from "@easyimmerse/state";
import type { DictionarySummary, TableLayout } from "@easyimmerse/types";
import { useEffect, useReducer, useRef } from "react";
import { useBrowserFileRegistry } from "../browserFileRegistryContext.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import {
  initialDictionaryImport,
  isTableFile,
  reduceDictionaryImport,
} from "./dictionaryImport.ts";

const unsupportedFormatCode = "unsupported_dictionary_format";

/**
 * Imports the dictionary file the user picked through the backend.
 * A desktop app's file is read by the server from its path; a browser's file is sent as bytes,
 * and a table among them is previewed first so that the user can check its columns.
 */
export function useDictionaryImport() {
  const dispatch = useAppDispatch();
  const chosen = useAppSelector(selectChosenDictionaryFile);
  const registry = useBrowserFileRegistry();
  const [state, dispatchImport] = useReducer(
    reduceDictionaryImport,
    initialDictionaryImport,
  );
  const [importDictionary] = useImportDictionaryMutation();
  const [importLocalDictionary] = useImportLocalDictionaryMutation();
  const [previewTable] = usePreviewDictionaryTableMutation();
  const settle = (fileName: string, request: Promise<DictionarySummary>) =>
    request
      .then((summary) => {
        dispatchImport({ type: "finished" });
        dispatch(actions.notificationRequested(`Added ${summary.title}`));
      })
      .catch((error: BackendError) => {
        if (error.code === unsupportedFormatCode)
          dispatchImport({ type: "refusedAsUnsupported", fileName });
        else {
          dispatchImport({ type: "finished" });
          dispatch(actions.notificationRequested(describeFailure(error)));
        }
      });
  const add = async (file: PickedDictionaryFile) => {
    dispatchImport({ type: "started", fileName: file.name });
    if (file.source.kind === "path")
      return settle(
        file.name,
        importLocalDictionary({ path: file.source.path }).unwrap(),
      );
    const held = registry?.find(file.name, file.source);
    if (!held)
      return settle(file.name, Promise.reject(missingFileError(file.name)));
    const bytes = new Uint8Array(await held.arrayBuffer());
    if (!isTableFile(file.name))
      return settle(
        file.name,
        importDictionary({ fileName: file.name, bytes }).unwrap(),
      );
    return previewTable({ fileName: file.name, bytes })
      .unwrap()
      .then((preview) =>
        dispatchImport({
          type: "tablePreviewed",
          table: { fileName: file.name, bytes, preview },
        }),
      )
      .catch((error: BackendError) => settle(file.name, Promise.reject(error)));
  };
  // Strict mode runs effects twice, and the same chosen file must be imported only once.
  const handled = useRef<PickedDictionaryFile | null>(null);
  useEffect(() => {
    if (chosen === null || handled.current === chosen) return;
    handled.current = chosen;
    dispatch(actions.dictionaryFileHandled());
    add(chosen);
  });
  return {
    ...state,
    importTable: (layout: TableLayout) => {
      const table = state.pendingTable;
      if (table === null) return;
      dispatchImport({ type: "started", fileName: table.fileName });
      settle(
        table.fileName,
        importDictionary({
          fileName: table.fileName,
          bytes: table.bytes,
          tableLayout: layout,
        }).unwrap(),
      );
    },
    cancelTable: () => dispatchImport({ type: "tableCancelled" }),
    dismissUnsupported: () => dispatchImport({ type: "unsupportedDismissed" }),
  };
}

function describeFailure(error: BackendError): string {
  return `The dictionary could not be added: ${error.message}`;
}

function missingFileError(fileName: string): BackendError {
  return {
    status: "NETWORK",
    message: `${fileName} is no longer available. Pick it again.`,
  };
}
