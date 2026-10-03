# WebAssembly package

`@easyimmerse/wasm` is the typed wrapper around the offline WebAssembly build of `easyimmerse-core`, which the web app and the extension use in offline mode.

Its `pkg/` directory is generated and not committed, and `src/` imports from it, so run `mise run wasm:build` before the package's typecheck or tests.

`loadOfflineWasm(source)` takes the bytes of `pkg/easyimmerse_wasm_bg.wasm` in Node and the `?url` import of that file under Vite.
