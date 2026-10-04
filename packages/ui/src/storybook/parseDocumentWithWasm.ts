import type { Document } from "@easyimmerse/types";

type WasmModule = {
  default: (options: { module_or_path: string }) => Promise<unknown>;
  parse_document: (bytes: Uint8Array, formatJson: string) => string;
};

// Globs rather than imports, so that Storybook still builds when the module has not been built.
const modules = import.meta.glob<WasmModule>(
  "../../../wasm/pkg/easyimmerse_wasm.js",
);
const wasmUrls = import.meta.glob<string>(
  "../../../wasm/pkg/easyimmerse_wasm_bg.wasm",
  { query: "?url", import: "default" },
);

/** Whether `mise run wasm:build` has produced the module that parses documents. */
export const isWasmBuilt = Object.keys(modules).length > 0;

let loaded: Promise<WasmModule> | null = null;

/** Parses an EPUB or text file with the same Rust code the app runs offline. */
export async function parseDocumentWithWasm(
  bytes: Uint8Array,
): Promise<Document> {
  loaded ??= loadModule();
  const module = await loaded;
  return JSON.parse(module.parse_document(bytes, "null"));
}

async function loadModule(): Promise<WasmModule> {
  const loadModule = Object.values(modules)[0];
  const loadUrl = Object.values(wasmUrls)[0];
  if (!loadModule || !loadUrl)
    throw new Error("Build the WebAssembly module with `mise run wasm:build`.");
  const module = await loadModule();
  await module.default({ module_or_path: await loadUrl() });
  return module;
}
