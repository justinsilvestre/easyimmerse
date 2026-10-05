# easyImmerse

A free, cross-platform suite for learning languages through native media: videos, audiobooks, and ebooks become learning material with instant word lookups and rich flashcards. See [docs/overview.md](docs/overview.md) for what the product does.

The suite consists of:
- a desktop app (macOS, Windows, Linux) built with Rust/Tauri
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
mise run web:desktop    # web app with hot reloading, against the desktop app's server or a standalone server on its data
mise run storybook      # UI component stories at http://localhost:6006
```

`web-dev` starts the server at `http://127.0.0.1:8788` with the token `dev`. The server keeps its data in `.dev/server.sqlite` and seeds two placeholder projects when that file is new. Delete `.dev/` to start over. The server takes `--cache-dir` (or `EASYIMMERSE_CACHE_DIR`) for the directory where converted media is cached; without it, and without ffmpeg and ffprobe in `EASYIMMERSE_FFMPEG_DIR`, next to the executable, or on `PATH`, it plays only files the browser plays directly. `web-dev` does not set it yet.

`desktop` fetches the ffmpeg sidecars first if they are missing (`mise run fetch-ffmpeg`, described in the [app README](apps/native/README.md#ffmpeg-sidecars)), then starts Vite on port 1421 and the Rust app in debug mode, so the frontend reloads on change. The database lands in the app data directory, for example `~/Library/Application Support/com.easyimmerse.app/easyimmerse.sqlite` on macOS, and converted media in the app cache directory, for example `~/Library/Caches/com.easyimmerse.app`. Each time it starts, it writes its server's address, a new token, and those two paths to `.dev/desktop-server.env`. A debug build seeds two placeholder projects into a new database, as `web-dev` does; a release build starts empty. It refuses to start while the standalone server of `web:desktop` is running, because both would convert into the same cache.

`web:desktop` reads `.dev/desktop-server.env`, so run `mise run desktop` once before using it. While the desktop app is running, the web app talks to its embedded server. Otherwise the task starts a standalone server at `http://127.0.0.1:8789` on the desktop app's database and cache, with `EASYIMMERSE_FFMPEG_DIR` pointing at the sidecars in `apps/native/src-tauri/binaries/`, and points the web app at it. Quit the task before starting the desktop app again. Vite reads the server address only at start-up, so restart the task after starting or quitting the desktop app.

`storybook` serves the stories of `packages/ui`, where screens are designed before they are wired to the store. The `storybook` workflow also publishes a built copy of every pull request's stories to GitHub Pages at `https://justinsilvestre.github.io/easyimmerse/storybook/pr-<number>/` and posts the link on the pull request; it can be run by hand from the Actions tab to preview a branch without one, at `storybook/<branch>/`. The repository's Pages setting must serve the `gh-pages` branch.

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

Each crate's integration tests form one binary named after the crate. Cargo builds are heavy on a shared machine, so build one crate at a time and run cold or workspace-wide jobs through `scripts/cargo-heavy.sh`, which lets one such job run at a time. Before the first build in a new git worktree, run `scripts/seed-worktree-target.sh <worktree>` from the main checkout; it clones the `target/` directory and removes build-script outputs that name paths into another checkout.

Tests that run `ffmpeg` or `ffprobe` (in `crates/media-ffmpeg`, `crates/conversion`, and `crates/api`) skip with a message when the binaries are found neither in `EASYIMMERSE_FFMPEG_DIR` nor on `PATH`. To run them against the bundled LGPL build, run `mise run fetch-ffmpeg` and set `EASYIMMERSE_FFMPEG_DIR` to the absolute path of `apps/native/src-tauri/binaries/`, for example `EASYIMMERSE_FFMPEG_DIR=$PWD/apps/native/src-tauri/binaries cargo test -p easyimmerse-conversion`. The transcoding tests in `crates/conversion` also need a working H.264 encoder from the hardware list in `crates/media-ffmpeg/src/encoders.rs`, because the bundled builds include no software H.264 encoder of their own. They skip with a message on a machine where none works, which includes most Linux machines without a VA-API or NVENC capable GPU.

#### End-to-end tests

```sh
mise run e2e            # web app and extension, through Playwright
mise run e2e:desktop    # desktop app, through WebDriver
mise run e2e:android    # the app on a running Android emulator, through Appium
mise run e2e:ios        # the app on an iOS simulator, through Appium
```

`e2e` builds the server, runs the web app's Playwright specs against it, then builds the Chrome extension against the same server, loads it into Chromium, and opens the side panel page directly. Playwright cannot load Firefox extensions, so Firefox is covered in CI by a build and `web-ext lint` only.

`e2e:desktop` builds the desktop app in debug mode and drives it through an embedded WebDriver server, so it needs no browser driver. `e2e:android` and `e2e:ios` drive the same specs on mobile through [Appium](https://appium.io). Each mobile task installs the Appium driver it needs; `mise run appium:install` installs both ahead of time. The native tests build the example `hello-rust` plugin first, to check that the plugin host runs on each platform.

The mobile tests need more setup than the rest of the repository:

- Android: Android Studio's SDK and NDK, and a running x86_64 emulator. `mise run android:build` builds the debug APK on its own. The [app README](apps/native/README.md#android) gives the commands that create and start a dedicated emulator.
- iOS: Xcode with a simulator runtime. `mise run ios:build` builds the simulator app on its own; it pins Ruby through Mise and installs CocoaPods when it is missing. The test task creates and boots its own simulator.

The [app README](apps/native/README.md#end-to-end-tests) describes how the native tests work and how CI runs them.

#### Desktop smoke test

CI also builds the desktop app and runs it with `EASYIMMERSE_SMOKE_TEST=1`. The app then requests its own `/health` route, prints `smoke test: 200 {"status":"ok"}`, and exits before any window is created. A build with the `plugin-check` feature also runs the [plugin host check](crates/plugins/README.md#checking-the-host-inside-the-app) and prints the greeting and the execution mode.

```sh
mise exec -- pnpm --filter @easyimmerse/native exec tauri build --debug --no-bundle
EASYIMMERSE_SMOKE_TEST=1 target/debug/easyimmerse-native
```

On Linux the Tauri runtime initializes GTK before the check runs, so the command needs a display; CI wraps it in `xvfb-run`.

#### One-off CI runs

To run one job of the `native` or `plugins` workflow at any commit, push a tag named `<workflow>-ci-<job>-<stamp>`, for example `git tag native-ci-ios-1 && git push origin native-ci-ios-1`. The jobs that can be named this way are `desktop`, `bundle`, `android`, and `ios` in `native`, and `mobile` in `plugins`. A tag named `rust-ci-<stamp>` runs the whole `rust` workflow. A tag run never skips its job because of an earlier pass, and it records no pass of its own.

## Repository structure

Each independent platform has its own entrypoint under `apps/`. Directories marked with an asterisk have a README of their own, listed under [Further documentation](#further-documentation).

```
apps/
├── web/              web app, built with Vite
│   ├── e2e/            Playwright specs
├── native/ *         Tauri desktop and mobile app
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
├── media/            pure media handling: container probing, codec strings, playback and segment planning, HLS playlists, fMP4 reading, waveform peaks
├── media-ffmpeg/     ffprobe probing, keyframe listing, encoder discovery, and ffmpeg command lines
├── conversion/ *     converting media into HLS segments as it plays, with the on-disk cache and its budget
├── storage/          persistence
├── api/              the HTTP API; routes in src/routes/, generated document in openapi.json
├── plugin-api/       the plugin interfaces, written in WIT under wit/ (MIT licensed)
├── plugins/ *        the plugin host, which loads and runs plugins
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
├── wasm/ *           the typed wrapper around the offline WebAssembly module
├── licenses/         the open-source notices shown in Settings, including the generated ffmpeg notices
└── config/           shared TypeScript configuration
```

The remaining directories are mostly for testing, scripts, and documentation.

```
plugins/              example plugins, used only by tests; plugin-manifest.md describes their plugin.toml
fixtures/ *           small sample files shared by every layer's tests
scripts/              setup and build scripts, including the ffmpeg fetcher, the ffmpeg build scripts, and the ffmpeg licence-notice generator
docs/                 product documentation: overview, user stories, UX refinements, bug reports
.github/workflows/    CI, one workflow per layer, plus the ffmpeg workflow that builds the desktop sidecars
.claude/rules/        conventions that apply to a whole directory
```

## Further documentation

Notes on the internals of individual parts live beside them:

- [apps/native/README.md](apps/native/README.md): the Tauri shell, the ffmpeg sidecars, and the Android and iOS builds and end-to-end tests.
- [crates/conversion/README.md](crates/conversion/README.md): the conversion service's measured behaviour that is left as it is.
- [crates/plugins/README.md](crates/plugins/README.md): the plugin host's execution modes, its iOS and Android constraints, and the `plugin-check` feature.
- [packages/wasm/README.md](packages/wasm/README.md): the offline WebAssembly package and its build.
- [fixtures/README.md](fixtures/README.md): the sample files shared by every layer's tests.
- [plugins/plugin-manifest.md](plugins/plugin-manifest.md): the `plugin.toml` format of the example plugins.
- [docs/](docs/): the product documentation: overview, user stories, UX refinements, and bug reports.

## License

AGPL-3.0-only. See [LICENSE](LICENSE).

The plugin interface in `crates/plugin-api` is licensed MIT, so that plugins under any license can build against it. See [crates/plugin-api/LICENSE](crates/plugin-api/LICENSE).
