# Plugin host

`easyimmerse-plugins` loads plugins, which are WebAssembly components built against the interfaces in [`crates/plugin-api`](../plugin-api), and runs them through wasmtime. The example plugins its tests use live in [`plugins/`](../../plugins); build them with `mise run plugins:build`.

## Media-source plugins

A media-source plugin imports media and subtitles from an external source, such as a video site. The plugin never ships user interface code. Instead, it describes forms declaratively, with text fields, choices, toggles, notes and action buttons, and the app renders them.

The plugin has two interfaces, each a sequence of forms. The import interface starts with `import-form`. Each time the user presses an action, the host sends the action and the form's input to `import-step`, which answers with the next form or with the import to run. The host then calls `import`, granting the plugin a fresh directory to write the media and subtitle files into, and adds the media file to the project with the locator the plugin gave as its origin.

The media interface belongs to a media file imported through the plugin. It starts with `media-form`, which the host calls with the media file's locator, the project's languages and the subtitle tracks the host holds for it. Each action goes to `media-step`, which answers with the next form or with an update: held tracks to remove, and tracks to fetch through `fetch-subtitles` into a new directory beside the media file.

The host grants no directory for the form calls, so a plugin cannot write anything while the user is still filling in a form. `MediaSourcePlugin` wraps each export, converting the WIT forms and form input to and from the core types that cross HTTP.

## Downloads

A plugin fetches a file with `http.download`, which writes the response body straight to a path and returns the number of bytes written. The bytes never enter the plugin, so a download costs the plugin the same small amount of fuel whatever the file's size. The host applies the same checks as `http.get` to the URL, allowing only the manifest's allowed hosts and following no redirects, and the same checks as `fs.write-file` to the path, which must lie inside a granted directory. A 404 response fails with `not-found` and any other status outside 200 to 299 with `io`, both before the file is created; the body goes to a temporary file in the destination's directory, which is renamed into place only when the transfer completes, and the temporary file is removed on every failure.

A download has no cap on its size or total duration, because media files can be many gigabytes, but it protects the device's storage and does not hang. `DownloadLimits::reserve_bytes` (default 2 GiB) is the free space a download must leave on the destination's volume. The host reads the free space with the `fs4` crate (replaceable through `free_space`) before the request, counting the response's `Content-Length` when present, and again after every 8 MiB written (`space_check_interval_bytes`), since the length may be missing or wrong. A download that would breach the reserve fails with an `io` error saying that the device has too little free space. `DownloadLimits::stall_timeout` (default 60 seconds) aborts a download that receives no bytes for that long, with an `io` error saying it stalled; this covers connecting, waiting for the response head, and waiting between chunks of the body, which fuel cannot bound because the time passes in host I/O.

The stall timeout bounds each wait for incoming bytes on its own, rather than the transfer as a whole, so a long download that keeps receiving data never times out. A plugin calls `http.get` only when it needs to read the body itself.

## Plugins in JavaScript

A plugin can be written in JavaScript and built into a component with `jco componentize`, which embeds the StarlingMonkey JavaScript engine. `plugins/fixture-media-source-js` does the same work as the Rust `fixture-media-source`. `mise run plugins:build-js` builds it with `--bundle`, which joins its modules into the single module ComponentizeJS accepts, and `--disable all`, which leaves out the WASI imports the host does not provide.

The plugin imports each host interface as a module, such as `easyimmerse:plugin/http@0.1.0`, and exports each interface as an object of camel-cased functions, such as `mediaSource.fetchSubtitles`. A WIT variant is an object `{ tag, val }`, an enum case is its name as a string, and an absent option is `undefined`. A function returns the `ok` value of a WIT result and throws a `plugin-error` variant for the `err` value. A host import that fails throws an error carrying the host's `plugin-error`, so a plugin that does not catch it passes the host's error back unchanged.

The engine makes the component large, about 13 MB against about 100 KB for the Rust build. Its calls also cost more fuel. The costliest fixture call, an import that runs `fetch-locator` and downloads the 48 KB sample media and its subtitles, needs about 15.5 million, which fits the default budget of 100 million per call with about six times headroom. Because the plugin downloads through `http.download`, that cost does not grow with the size of the media; reading the same bytes through `http.get` and `fs.write-file` costs about 17 more fuel per byte.

## Execution modes

The host runs a plugin in one of two modes. The native mode compiles it to machine code with Cranelift. The interpreter mode compiles it to bytecode for wasmtime's Pulley interpreter instead, which needs the crate's `interpreter` feature and is an order of magnitude slower. `EASYIMMERSE_PLUGIN_EXECUTION=interpreter` selects the interpreter on desktop and Android; any other value or an unset variable selects native execution.

iOS forbids just-in-time compilation, so on iOS the host ignores the variable and always uses the interpreter, and building the crate for an iOS target without the `interpreter` feature fails at compile time. The native shell enables the feature for iOS targets in its `Cargo.toml`. Android allows just-in-time compilation and keeps the native mode.

Plugins on Android must not be granted preopened directories through WASI until wasmtime's filesystem code stops using `openat2`, which Android's seccomp filter blocks ([wasmtime issue 14496](https://github.com/bytecodealliance/wasmtime/issues/14496)). The host's own `fs` import does not go through WASI and is unaffected.

The `plugins` workflow checks that the crate cross-compiles with the interpreter for `aarch64-apple-ios` and `aarch64-linux-android`.

## Checking the host inside the app

The `plugin-check` cargo feature of `easyimmerse-native`, off by default, embeds the built `hello-rust` plugin in the binary and registers the `check_plugin_host` command. The command writes the plugin into the app cache directory, loads it in the platform's execution mode, calls `greet("world")`, and returns `{ greeting, executionMode }`; `capabilities/plugin-check.json` lets the main window call it on every platform. Build the plugin first with `mise run plugins:build-rust`, or the build script fails with that instruction.

Only the end-to-end tests and the smoke test use the feature; release builds leave it off. The [desktop and mobile app README](../../apps/native/README.md) describes those tests.
