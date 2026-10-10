import {
  type BackendError,
  useImportDictionaryMutation,
  useImportLocalDictionaryMutation,
  usePreviewDictionaryTableMutation,
  usePreviewLocalDictionaryTableMutation,
} from "@easyimmerse/backend";
import type { PickedDictionaryFile } from "@easyimmerse/state";
import { actions, selectPendingDictionaryFile } from "@easyimmerse/state";
import type {
  ImportJobStarted,
  MediaFileSource,
  TableLayout,
  TablePreview,
} from "@easyimmerse/types";
import { useEffect, useReducer, useRef } from "react";
import { useBrowserFileRegistry } from "../browserFileRegistryContext.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import {
  initialDictionaryImport,
  isTableFile,
  type PendingTable,
  reduceDictionaryImport,
} from "./dictionaryImport.ts";
import { type ImportJobOutcome, useImportJob } from "./useImportJob.ts";

const unsupportedFormatCode = "unsupported_dictionary_format";

/** Why adding a file failed: the server's error, or a message for the user. */
type ImportFailure = Pick<BackendError, "code" | "message"> & {
  isOwnMessage?: boolean;
};

/** A request whose cached arguments, which may hold a whole dictionary file, can be dropped once it settles. */
type ResettableRequest<T> = { unwrap(): Promise<T>; reset(): void };

/**
 * Imports the dictionary file the user picked through the backend.
 * A desktop app's file is read by the server from its path; a browser's file is sent as bytes.
 * Either way, a table is previewed first so that the user can check its columns.
 * The backend answers with a job, which is polled until the dictionary is stored.
 */
export function useDictionaryImport() {
  const dispatch = useAppDispatch();
  const chosen = useAppSelector(selectPendingDictionaryFile);
  const registry = useBrowserFileRegistry();
  const [state, dispatchImport] = useReducer(
    reduceDictionaryImport,
    initialDictionaryImport,
  );
  const [importDictionary] = useImportDictionaryMutation();
  const [importLocalDictionary] = useImportLocalDictionaryMutation();
  const [previewTable] = usePreviewDictionaryTableMutation();
  const [previewLocalTable] = usePreviewLocalDictionaryTableMutation();
  const fail = (fileName: string, failure: ImportFailure) => {
    if (failure.code === unsupportedFormatCode)
      return dispatchImport({ type: "refusedAsUnsupported", fileName });
    dispatchImport({
      type: "failed",
      message: describeFailure(fileName, failure),
    });
  };
  const settleJob = (outcome: ImportJobOutcome) => {
    if (outcome.kind === "failed")
      return fail(state.addingFile ?? "", outcome.error);
    dispatchImport({ type: "finished" });
    dispatch(
      actions.notificationRequested(`Added ${outcome.dictionary.title}`),
    );
  };
  const progress = useImportJob(state.jobId, settleJob);
  const start = (fileName: string, request: Promise<ImportJobStarted>) =>
    request
      .then(({ id }) => dispatchImport({ type: "jobStarted", jobId: id }))
      .catch((error: BackendError) => fail(fileName, error));
  const showColumns = (
    fileName: string,
    contents: PendingTable["contents"],
    preview: Promise<TablePreview>,
  ) =>
    preview.then((tablePreview) =>
      dispatchImport({
        type: "tablePreviewed",
        table: { fileName, contents, preview: tablePreview },
      }),
    );
  const addFromPath = (fileName: string, path: string) =>
    isTableFile(fileName)
      ? showColumns(
          fileName,
          { kind: "path", path },
          previewLocalTable({ path }).unwrap(),
        ).catch((error: BackendError) => fail(fileName, error))
      : start(fileName, importLocalDictionary({ path }).unwrap());
  const sendBytes = (fileName: string, bytes: Uint8Array) =>
    isTableFile(fileName)
      ? showColumns(
          fileName,
          { kind: "bytes", bytes },
          settledOnce(previewTable({ fileName, bytes })),
        )
      : start(fileName, settledOnce(importDictionary({ fileName, bytes })));
  const addFromBrowser = (fileName: string, source: MediaFileSource) => {
    const held = registry?.find(fileName, source);
    if (!held)
      return fail(fileName, {
        message: `${fileName} is no longer available. Pick it again.`,
        isOwnMessage: true,
      });
    held
      .arrayBuffer()
      .then((buffer) => sendBytes(fileName, new Uint8Array(buffer)))
      .catch((error: unknown) => fail(fileName, asFailure(error)));
  };
  // Strict mode runs effects twice, and the same chosen file must be imported only once.
  const handled = useRef<PickedDictionaryFile | null>(null);
  useEffect(() => {
    if (chosen === null || handled.current === chosen) return;
    handled.current = chosen;
    dispatch(actions.dictionaryFileHandled());
    dispatchImport({ type: "started", fileName: chosen.name });
    if (chosen.source.kind === "path")
      addFromPath(chosen.name, chosen.source.path);
    else addFromBrowser(chosen.name, chosen.source);
  });
  return {
    ...state,
    progress,
    importTable: (layout: TableLayout) => {
      const table = state.pendingTable;
      if (table === null) return;
      dispatchImport({ type: "started", fileName: table.fileName });
      const { contents, fileName } = table;
      start(
        fileName,
        contents.kind === "path"
          ? importLocalDictionary({
              path: contents.path,
              tableLayout: layout,
            }).unwrap()
          : settledOnce(
              importDictionary({
                fileName,
                bytes: contents.bytes,
                tableLayout: layout,
              }),
            ),
      );
    },
    cancelTable: () => dispatchImport({ type: "tableCancelled" }),
    dismissUnsupported: () => dispatchImport({ type: "unsupportedDismissed" }),
    dismissFailure: () => dispatchImport({ type: "failureDismissed" }),
  };
}

/** Unwraps a request and then drops its cached arguments, so that the file's bytes are not kept alive. */
function settledOnce<T>(request: ResettableRequest<T>): Promise<T> {
  return request.unwrap().finally(() => request.reset());
}

function asFailure(error: unknown): ImportFailure {
  if (typeof error === "object" && error !== null && "message" in error)
    return error as ImportFailure;
  return { message: String(error) };
}

function describeFailure(fileName: string, failure: ImportFailure): string {
  return failure.isOwnMessage
    ? failure.message
    : `${fileName} could not be added: ${failure.message}`;
}
