# Plugin host

`easyimmerse-plugins` loads plugins, which are WebAssembly components built against the interfaces in [`crates/plugin-api`](../plugin-api), and runs them through wasmtime. The example plugins its tests use live in [`plugins/`](../../plugins); build them with `mise run plugins:build`.

## Execution modes

The host runs a plugin in one of two modes. The native mode compiles it to machine code with Cranelift. The interpreter mode compiles it to bytecode for wasmtime's Pulley interpreter instead, which needs the crate's `interpreter` feature and is an order of magnitude slower. `EASYIMMERSE_PLUGIN_EXECUTION=interpreter` selects the interpreter on desktop and Android; any other value or an unset variable selects native execution.

iOS forbids just-in-time compilation, so on iOS the host ignores the variable and always uses the interpreter, and building the crate for an iOS target without the `interpreter` feature fails at compile time. The native shell enables the feature for iOS targets in its `Cargo.toml`. Android allows just-in-time compilation and keeps the native mode.

Plugins on Android must not be granted preopened directories through WASI until wasmtime's filesystem code stops using `openat2`, which Android's seccomp filter blocks ([wasmtime issue 14496](https://github.com/bytecodealliance/wasmtime/issues/14496)). The host's own `fs` import does not go through WASI and is unaffected.

The `plugins` workflow checks that the crate cross-compiles with the interpreter for `aarch64-apple-ios` and `aarch64-linux-android`.

## Checking the host inside the app

The `plugin-check` cargo feature of `easyimmerse-native`, off by default, embeds the built `hello-rust` plugin in the binary and registers the `check_plugin_host` command. The command writes the plugin into the app cache directory, loads it in the platform's execution mode, calls `greet("world")`, and returns `{ greeting, executionMode }`; `capabilities/plugin-check.json` lets the main window call it on every platform. Build the plugin first with `mise run plugins:build-rust`, or the build script fails with that instruction.

Only the end-to-end tests and the smoke test use the feature; release builds leave it off. The [desktop and mobile app README](../../apps/native/README.md) describes those tests.
