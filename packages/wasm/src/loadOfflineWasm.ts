import init, * as wasmModule from "../pkg/easyimmerse_wasm.js";
import { createOfflineWasm, type OfflineWasm } from "./offlineWasm.ts";

/**
 * Initializes the WebAssembly module and returns the typed wrapper.
 *
 * `source` is the module's bytes, or a URL or string the runtime can fetch. When it is
 * omitted, the module is fetched from next to the generated JavaScript file.
 */
export async function loadOfflineWasm(
  source?: BufferSource | URL | string,
): Promise<OfflineWasm> {
  await init(source === undefined ? undefined : { module_or_path: source });
  return createOfflineWasm(wasmModule);
}
