import type { OfflineWasm } from "@easyimmerse/wasm";
import type {
  BackendClient,
  BackendRequest,
  BackendResult,
} from "./backendClient.ts";
import { createOfflineImportJobs } from "./offlineImportJobs.ts";
import type { OfflineOperation } from "./offlineOperation.ts";

type OfflineImportJobs = ReturnType<typeof createOfflineImportJobs>;

/** Builds a client that performs the offline subset of operations in WebAssembly and rejects the rest. */
export function createWasmBackendClient(wasm: OfflineWasm): BackendClient {
  const importJobs = createOfflineImportJobs();
  return {
    send: async <T>(request: BackendRequest): Promise<BackendResult<T>> => {
      const operation = request.offlineOperation;
      if (operation === undefined)
        return { error: { status: "OFFLINE", message: describeNeed(request) } };
      if (operation.kind === "importJobStatus")
        return importJobs.status(operation.id) as BackendResult<T>;
      return runOffline<T>(wasm, importJobs, operation);
    },
  };
}

function describeNeed(request: BackendRequest): string {
  return `${request.method} ${request.path} needs a server, and none is configured.`;
}

function runOffline<T>(
  wasm: OfflineWasm,
  importJobs: OfflineImportJobs,
  operation: Exclude<OfflineOperation, { kind: "importJobStatus" }>,
): BackendResult<T> {
  try {
    return { data: perform(wasm, importJobs, operation) as T };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { error: { status: 400, code: "bad_request", message } };
  }
}

function perform(
  wasm: OfflineWasm,
  importJobs: OfflineImportJobs,
  operation: Exclude<OfflineOperation, { kind: "importJobStatus" }>,
): unknown {
  switch (operation.kind) {
    case "parseTimedText":
      return wasm.parseTimedText(operation.request);
    case "parseDocument":
      return wasm.parseDocument(operation.bytes, operation.format);
    case "importDictionary":
      return importJobs.finish(
        wasm.parseDictionary(
          operation.fileName,
          operation.bytes,
          operation.tableLayout,
        ),
      );
    case "previewDictionaryTable":
      return wasm.previewDictionaryTable(operation.fileName, operation.bytes);
  }
}
