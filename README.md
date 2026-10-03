# easyImmerse

A free, cross-platform suite for learning languages through native media: videos, audiobooks, and ebooks become learning material with instant word lookups and rich flashcards. See [docs/overview.md](docs/overview.md) for what the product does.

The suite consists of:
- a desktop app (Mac, Windows, iOS) built with Rust/Tauri
- a mobile app (Android and iOS) built with Rust/Tauri
- a web frontend built with TypeScript/React/Vite
- a backend API server built with Rust/Axum
- a browser extension built with TypeScript/WXT

### Getting started

[Mise](https://mise.jdx.dev) manages every tool version (Node, pnpm, Rust, WebAssembly tooling). On Linux, the desktop app additionally needs the [Tauri system dependencies](https://v2.tauri.app/start/prerequisites/).

```sh
mise install             # tools
pnpm install             # Node dependencies
mise run wasm:build      # the offline WebAssembly module, needed by the web app and the extension
mise run plugins:build   # the example plugins, needed by the plugin host tests
mise run check           # lint, typecheck, and test every layer
```

`mise tasks` lists every task. Run Node tooling through Mise (`mise exec -- pnpm ...`) so that the pinned versions apply.

### Running the apps

```sh
mise run web-dev        # web app with hot reloading, against a local server
mise run desktop        # desktop app with its embedded server
mise run web:desktop    # web app with hot reloading, against the server of a running `mise run desktop`
mise run storybook      # UI component stories at http://localhost:6006
```

`web-dev` starts the server at `http://127.0.0.1:8788` with the token `dev`. The server keeps its data in `.dev/server.sqlite` and seeds two placeholder projects when that file is new. Delete `.dev/` to start over.

`desktop` fetches the ffmpeg sidecar first if it is missing, then starts Vite on port 1421 and the Rust app in debug mode, so the frontend reloads on change. The database lands in the app data directory, for example `~/Library/Application Support/com.easyimmerse.app/easyimmerse.sqlite` on macOS.

The browser extension has no dev task. Build it, then load it unpacked:

```sh
mise exec -- pnpm --filter @easyimmerse/extension build            # Chrome, into .output/chrome-mv3
mise exec -- pnpm --filter @easyimmerse/extension build:firefox    # Firefox, into .output/firefox-mv3
```

- Chrome: open `chrome://extensions`, enable developer mode, choose "Load unpacked", and select `.output/chrome-mv3`. The toolbar button opens the side panel.
- Firefox: open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on", and select `.output/firefox-mv3/manifest.json`. The panel appears in the sidebar.

Set `VITE_EASYIMMERSE_SERVER_URL` and `VITE_EASYIMMERSE_TOKEN` before building to point the extension at a server. Without them it runs offline through the WebAssembly module.

### Generated code

Rust types are the source of truth for everything that crosses HTTP or WebAssembly. After changing one, regenerate the TypeScript types and the OpenAPI document and commit the output. CI fails when it is stale.

```sh
mise run typegen        # packages/types/src/generated, from Rust with ts-rs
mise run openapi        # crates/api/openapi.json and its TypeScript schema
mise run watch          # rerun both whenever a Rust file changes
```

### Testing

`mise run check` is the full local gate and what CI runs. While iterating, run the narrowest relevant command:

```sh
cargo test -p <crate>                                 # one crate's unit and integration tests
cargo test -p easyimmerse-api --test api auth::       # one integration test module
mise exec -- pnpm --filter <package> test             # one TypeScript package
mise exec -- pnpm lint && mise exec -- pnpm format     # Biome lint, then format in place
```

Each crate's integration tests form one binary named after the crate. Cargo builds are heavy on a shared machine, so build one crate at a time and run cold or workspace-wide jobs through `scripts/cargo-heavy.sh`, which lets one such job run at a time.

#### End-to-end tests

```sh
mise run e2e            # web app and extension, through Playwright
mise run e2e:desktop    # desktop app, through WebDriver
```

`e2e` builds the server, runs the web app's Playwright specs against it, then builds the Chrome extension against the same server, loads it into Chromium, and opens the side panel page directly. Playwright cannot load Firefox extensions, so Firefox is covered in CI by a build and `web-ext lint` only.

`e2e:desktop` builds the desktop app in debug mode and runs the WebdriverIO specs in `apps/native/e2e/` against it on Linux, macOS, and Windows. Debug builds register an embedded WebDriver server plugin when the test runner sets `TAURI_WEBDRIVER_PORT`, so no browser driver is needed and an ordinary development run exposes no automation server. The build merges `e2e/tauri.conf.json`, which exposes the global Tauri object that the test service uses to inspect windows. Each run opens an empty database in a temporary directory through `EASYIMMERSE_DATABASE`. CI runs the same specs in the `desktop` job, under `xvfb-run` on Linux.

#### Desktop smoke test

CI also builds the desktop app and runs it with `EASYIMMERSE_SMOKE_TEST=1`. The app then requests its own `/health` route, prints `smoke test: 200 {"status":"ok"}`, and exits before any window is created.

```sh
mise exec -- pnpm --filter @easyimmerse/native exec tauri build --debug --no-bundle
EASYIMMERSE_SMOKE_TEST=1 target/debug/easyimmerse-native
```

On Linux the Tauri runtime initializes GTK before the check runs, so the command needs a display; CI wraps it in `xvfb-run`.



## Repository structure


Each independent platform has its own entrypoint under `apps/`. 

```
apps/ 
├── web/              web app, built with Vite
│   ├── e2e/            Playwright specs
├── native/           Tauri desktop and mobile app
│   ├── src/            frontend entry point
│   ├── src-tauri/      the Rust shell
│   └── e2e/            WebdriverIO specs
├── extension/        the browser extension, built with WXT
│   ├── entrypoints/    background script and side panel
│   └── e2e/            Playwright specs
└── server/           the standalone API server (a command-line wrapper around crates/api)
```

The core logic and shared code for the Rust layer lives in `crates/`. 

```
crates/               the Rust workspace
├── core/             domain logic and shared types
├── media/            media handling
├── media-ffmpeg/     media handling through the ffmpeg binaries
├── storage/          persistence
├── api/              the HTTP API; routes in src/routes/, generated document in openapi.json
├── plugin-api/       the plugin interfaces, written in WIT under wit/ (MIT licensed)
├── plugins/          the plugin host, which loads and runs plugins
└── wasm/             the WebAssembly facade over core, used for offline mode
```

The core logic and shared code for the TypeScript layer lives in `packages/`.

```
packages/             the TypeScript workspace
├── types/            types generated from Rust (src/generated/) and from the OpenAPI document (src/openapi/)
├── state/            the Redux store, actions, update functions, and the Effects interface
├── backend/          the RTK Query endpoints
├── ui/               screens and components, with their Storybook stories beside them
├── effects-web/      each platform's implementation of the Effects interface
├── effects-native/
├── effects-extension/
├── wasm/             the typed wrapper around the offline WebAssembly module
└── config/           shared TypeScript configuration
```


The remaining directories are mostly for testing, scripts, and documentation.

```
plugins/              example plugins, used only by tests; plugin-manifest.md describes their plugin.toml
fixtures/             small sample files shared by every layer's tests; see its README.md
scripts/              setup and build scripts, including the ffmpeg fetcher
docs/                 product documentation: overview, user stories, UX refinements, bug reports
.github/workflows/    CI, one workflow per layer, plus the macOS ffmpeg build
.claude/rules/        conventions that apply to a whole directory
```



## Platform notes

### Desktop and mobile app

`apps/native/src-tauri` is the Tauri shell. On start-up it opens the SQLite database in the app data directory, binds the API server to `127.0.0.1:8787` (or a free port when that one is taken), and creates the main window with `window.__EASYIMMERSE__ = { serverUrl, token }` injected before the page runs. The page then talks to the server over plain HTTP; Tauri IPC carries only the dialog, notification, clipboard, and opener plugins.

#### ffmpeg sidecars

The media routes will call `ffmpeg` and `ffprobe` sidecar binaries. `mise run fetch-ffmpeg` downloads the LGPL build for one target triple, checks its SHA-256, and copies the binaries into `apps/native/src-tauri/binaries/` (gitignored) under the names Tauri expects (`ffmpeg-<triple>` and `ffprobe-<triple>`, with `.exe` for Windows targets).

```sh
mise run fetch-ffmpeg                      # the triple of this machine, from rustc
mise run fetch-ffmpeg x86_64-pc-windows-msvc
mise run fetch-ffmpeg -- --force           # refetch even when the binaries exist
```

The script in `scripts/fetch-ffmpeg/` has no dependencies and is run directly by Node. Extraction uses the system `tar` for `.tar.xz` and `unzip` (or `Expand-Archive` on Windows) for `.zip`. Its `manifest.json` has one entry per Rust target triple:

- `url`: the archive to download.
- `sha256`: hex SHA-256 of the archive. A value starting with `TODO` makes the script skip that triple with a warning.
- `archive`: `tar.xz` or `zip`.
- `paths.ffmpeg` and `paths.ffprobe`: where each binary sits inside the archive.

Linux and Windows entries point at a dated `autobuild-*` release of [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds/releases) rather than the `latest` release, whose assets are replaced daily and would no longer match the pinned hashes. To update, pick a newer dated release, download its four `*-lgpl-8.1` assets, and record their `shasum -a 256` output and inner paths (`tar tJf` or `unzip -l`).

No first-party LGPL macOS build exists, so the `*-apple-darwin` entries point at this repository's own release produced by the `ffmpeg-macos` workflow (`.github/workflows/ffmpeg-macos.yml`). To build a version, push a tag named `ffmpeg-macos-<version>` on any branch (`git tag ffmpeg-macos-8.1.2 && git push origin ffmpeg-macos-8.1.2`), wait for the release with that tag, then copy the two hashes from its `SHA256SUMS` asset into the `sha256` fields. While this repository is private, those assets are only reachable through the GitHub API with a token: the script uses `GITHUB_TOKEN` or `GH_TOKEN` when set, and otherwise the token of the logged-in `gh` CLI. While a hash is `TODO`, the desktop app on macOS finds ffmpeg on `PATH` or not at all.

`tauri.conf.json` does not declare the sidecars yet, because Tauri fails the build when a declared sidecar file is missing. Once `mise run fetch-ffmpeg` is part of every developer's setup, add this to `bundle` (the CI job already runs the fetch task):

```json
"externalBin": ["binaries/ffmpeg", "binaries/ffprobe"]
```

#### Mobile

`gen/android` and `gen/apple` are gitignored for now. CI creates them with `tauri android init --ci` and `tauri ios init --ci`, builds a debug APK, and builds an unsigned iOS simulator app with `tauri ios build --no-sign`. Building through the Tauri CLI is required: the generated Xcode project's build phase asks a server started by `tauri ios build` for its options, so a direct `xcodebuild` fails.

Building proves the projects compile. Loading the app at runtime needs plain HTTP to the embedded server at 127.0.0.1, which both platforms restrict:

- Android allows cleartext traffic in debug builds already; the generated Gradle file sets the `usesCleartextTraffic` placeholder to true for debug and false for release. Release builds need a network security config that permits cleartext for 127.0.0.1 only. That file lives inside `gen/android`, so commit `gen/android` when adding it.
- iOS App Transport Security blocks `http://127.0.0.1` inside WKWebView, and an IP address cannot be an exception domain. Add the exception to `apps/native/src-tauri/Info.ios.plist`, which Tauri merges into the generated project on every build, so `gen/apple` can stay uncommitted. Either allow web content loads with `NSAllowsArbitraryLoadsInWebContent`, or set `NSAllowsLocalNetworking` and have the app use `http://localhost:<port>` with `localhost` added to the server's expected hosts.

Neither change has been tried on a device or simulator yet.

On Android, log output at the info level and above goes to logcat under the tag `easyimmerse`; `adb logcat -s easyimmerse` shows it.

### WebAssembly package

`packages/wasm` is the typed wrapper around the offline WebAssembly build of `easyimmerse-core`. Its `pkg/` directory is generated and not committed, and `src/` imports from it, so run `mise run wasm:build` before the package's typecheck or tests. `loadOfflineWasm(source)` takes the bytes of `pkg/easyimmerse_wasm_bg.wasm` in Node and the `?url` import of that file under Vite.

## License

AGPL-3.0-only. See [LICENSE](LICENSE).

The plugin interface in `crates/plugin-api` is licensed MIT, so that plugins under any license can build against it. See [crates/plugin-api/LICENSE](crates/plugin-api/LICENSE).
