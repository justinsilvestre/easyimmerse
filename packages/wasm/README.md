# @easyimmerse/wasm

The typed wrapper around the offline WebAssembly build of `easyimmerse-core`.

`pkg/` is generated and not committed. `src/` imports from it, so build it before running the
typecheck or the tests:

```sh
mise run wasm:build
mise exec -- pnpm --filter @easyimmerse/wasm test
mise exec -- pnpm --filter @easyimmerse/wasm typecheck
```

`loadOfflineWasm(source)` takes the bytes of `pkg/easyimmerse_wasm_bg.wasm` in Node and the
`?url` import of that file under Vite.
