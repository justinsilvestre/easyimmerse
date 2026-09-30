import type { OfflineWasm } from "@easyimmerse/wasm";
import type {
  BackendClient,
  BackendRequest,
  BackendResult,
} from "./backendClient.ts";
import type { OfflineOperation } from "./offlineOperation.ts";

/** Builds a client that performs the offline subset of operations in WebAssembly and rejects the rest. */
export function createWasmBackendClient(wasm: OfflineWasm): BackendClient {
  return {
    send: async <T>(request: BackendRequest): Promise<BackendResult<T>> => {
      if (request.offlineOperation === undefined)
        return { error: { status: "OFFLINE", message: describeNeed(request) } };
      return runOffline<T>(wasm, request.offlineOperation);
    },
  };
}

function describeNeed(request: BackendRequest): string {
  return `${request.method} ${request.path} needs a server, and none is configured.`;
}

function runOffline<T>(
  wasm: OfflineWasm,
  operation: OfflineOperation,
): BackendResult<T> {
  try {
    return { data: perform(wasm, operation) as T };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { error: { status: 400, code: "bad_request", message } };
  }
}

function perform(wasm: OfflineWasm, operation: OfflineOperation): unknown {
  switch (operation.kind) {
    case "parseTimedText":
      return wasm.parseTimedText(operation.request);
    case "parseDocument":
      return wasm.parseDocument(operation.bytes, operation.format);
    case "parseDictionary":
      return wasm.parseDictionary(operation.bytes);
  }
}
