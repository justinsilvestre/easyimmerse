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
mise run web:desktop    # web app with hot reloading, reachable on the local network, against the desktop app's server or a standalone server on its data
mise run dev            # desktop app, with the web app served to this machine and the local network against its server
mise run storybook      # UI component stories at http://localhost:6006
mise run storybook-diff # before and after screenshots of the stories the working tree changes against main
```

#### Web app against a local server (`web-dev`)

- The **server** listens at `http://127.0.0.1:8788` and accepts the token `dev`. The web app is configured to use it.
- The **development database** is the file `.dev/server.sqlite`. To start with a fresh database, stop the task, delete `.dev/`, and start the task again.
- A new database is **seeded with two placeholder projects**: "Spanish practice", with Spanish as the target language, and "Japanese drama", with Japanese. Both translate into English.
- Once per database, the server also **adds sample content** from the checkout's `fixtures/` directory. Each placeholder project that has no media yet receives a short sample video with subtitles in its target language and in English, the Japanese project also receives a Japanese novel, and small dictionaries for both languages are imported.
- Each placeholder project also receives a **sample book with its English translation and a narrated clip**: the opening of *Lazarillo de Tormes* for Spanish and of Akutagawa's 杜子春 for Japanese. Each book is paired with its translation and aligned with it sentence by sentence, and the clip, about a minute of a LibriVox reading, is aligned with the book's first sentences. Each book is added once per database, so an older database receives a book that was added to the seed after it was created.
- The **sample media do not open under this task.** They are stored as paths into `fixtures/`, and this server runs without `--allow-local-paths`, so it refuses to read files outside its own directories. The desktop app and `web:desktop` allow local paths, so the same sample content opens there.
- The server's **directories** are set with a flag or an environment variable each.

  | Directory | Flag | Environment variable | Under `web-dev` |
  | --- | --- | --- | --- |
  | converted-media cache | `--cache-dir` | `EASYIMMERSE_CACHE_DIR` | not set yet |
  | installed plugins, one package per subdirectory | `--plugins-dir` | `EASYIMMERSE_PLUGINS_DIR` | `.dev/plugins` |
  | media fetched by media-source plugins | `--media-dir` | `EASYIMMERSE_MEDIA_DIR` | `.dev/media` |

- A media file **plays only if the browser plays its format directly, or if the server can convert it**. Conversion needs a cache directory, and ffmpeg and ffprobe in `EASYIMMERSE_FFMPEG_DIR`, next to the executable, or on `PATH`. Since `web-dev` sets no cache directory, it plays only files the browser plays directly.
- Files in the **media directory** are readable even without `--allow-local-paths`, since the server fetched them itself.
- An **exported Anki package** includes the flashcards' sentence audio and screenshots only when the server has ffmpeg and may read the media file. A package exported under `web-dev` without `EASYIMMERSE_FFMPEG_DIR`, or from a file the browser holds, includes no media. The export still succeeds, and the app says how many media files it left out.

#### Desktop app (`desktop`)

- On **start-up**, the task fetches the ffmpeg sidecars when they are missing or come from an older release than the one pinned (through `mise run fetch-ffmpeg`, described in the [app README](apps/native/README.md#ffmpeg-sidecars)). It then starts Vite on port 1421 and the Rust app in debug mode, so the frontend reloads on change. The first build can take several minutes.
- The **database** is stored in the app data directory, for example `~/Library/Application Support/com.easyimmerse.app/easyimmerse.sqlite` on macOS. Installed plugins go in `plugins/` and the media they fetch in `media/`, both next to the database.
- **Converted media** is cached in the app cache directory, for example `~/Library/Caches/com.easyimmerse.app`.
- Each start **writes `.dev/desktop-server.env`** with the server's address, a new token, and the database and cache paths. The `web:desktop` and `dev` tasks read this file.
- A debug build **seeds the same placeholder projects and sample content** as `web-dev`: the projects into an empty database, and the sample content once per database. A placeholder project that still has no media receives the sample content on the next start, even in an older database. A release build starts empty.
- The app **refuses to start while the standalone server of `web:desktop` is running**, because both would convert media into the same cache.

#### Web app on the desktop app's data (`web:desktop`)

- The task **reads `.dev/desktop-server.env`**, so run `mise run desktop` once before the first use.
- While the **desktop app is running**, the web app sends its requests to the desktop app's embedded server.
- While the **desktop app is not running**, the task starts a standalone server at `http://127.0.0.1:8789` on the desktop app's database and cache, with `EASYIMMERSE_FFMPEG_DIR` pointing at the sidecars in `apps/native/src-tauri/binaries/`, and the web app uses that server instead. Quit the task before starting the desktop app again.
- **Restart the task after starting or quitting the desktop app**, because Vite reads the server address only when it starts.

#### Web app on the local network (`web:desktop`)

- The task serves the web app to **this machine and to other devices on the local network**, such as a phone, and prints the address to open, for example `http://192.168.1.5:5173`.
- The web app reaches the server through a **forwarder on port 8790**. The server accepts a request only when its Host header names the server's loopback address, so the forwarder listens on every network interface and passes each request on with the Host header rewritten.
- **Use the task only on a network you trust.** The page includes the server's token and is served to the whole network, so anyone on the network can use both the page and the API.
- macOS may ask whether **node may accept incoming connections**.
- When the machine has **several network addresses**, for example because of a VPN interface, set `EASYIMMERSE_LAN_ADDRESS` to the one to use.
- When the machine's **address changes**, restart the task. When the machine has no network address, the task serves the web app to this machine only.

#### Desktop app and web app together (`dev`)

- The task **starts the desktop app** as `desktop` does, waits until the app has written a new token to `.dev/desktop-server.env` and its server accepts that token, and then **serves the web app** as `web:desktop` does, against the desktop app's server.
- **Restart the task after a change to Rust sources.** `tauri dev` rebuilds and restarts the desktop app, which writes a new token and possibly a new port, while Vite keeps the values it started with.
- **Quitting the desktop app or stopping Vite** stops the whole task.

#### Storybook (`storybook`)

- The task **serves the stories** of `packages/ui`, where screens are designed before they are wired to the store.
- The `storybook` **GitHub Actions workflow** publishes a built copy of every pull request's stories to GitHub Pages at `https://justinsilvestre.github.io/easyimmerse/storybook/pr-<number>/` and posts the link on the pull request.
- To **preview a branch without a pull request**, run the workflow by hand from the Actions tab. The stories appear at `storybook/<branch>/`.
- The repository's **Pages setting** must serve the `gh-pages` branch.
- The workflow also **screenshots every story on both sides of a pull request**, in both themes at a phone and a desktop width, and publishes a report of the stories that differ at `storybook/pr-<number>/changes/` with a second comment. `mise run storybook-diff` produces the same report locally for the working tree against `main`. See [scripts/storybook-diff/README.md](scripts/storybook-diff/README.md).

#### Browser extension

The browser extension has no dev task. Build it, then load it unpacked:

```sh
mise exec -- pnpm --filter @easyimmerse/extension build            # Chrome, into .output/chrome-mv3
mise exec -- pnpm --filter @easyimmerse/extension build:firefox    # Firefox, into .output/firefox-mv3
```

- Chrome: open `chrome://extensions`, enable developer mode, choose "Load unpacked", and select `.output/chrome-mv3`. The toolbar button opens the side panel.
- Firefox: open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on", and select `.output/firefox-mv3/manifest.json`. The panel appears in the sidebar.

Set `VITE_EASYIMMERSE_SERVER_URL` and `VITE_EASYIMMERSE_TOKEN` before building to point the extension at a server. Without them it runs offline through the WebAssembly module.

Set `VITE_EASYIMMERSE_CLOUD_URL` before building the web app or the extension to offer the official easyImmerse server in the Account section of Settings. Without it, the section offers only a server whose address the person types in.

### Running a server of your own

To run an instance of the easyImmerse server, build its release binary and start it on a database file:

```sh
cargo build --release -p easyimmerse-server
target/release/easyimmerse-server serve --db server.sqlite
```

- Without `--db`, the server keeps its **data in memory**, and the data is lost when the server stops.
- The server **listens at `127.0.0.1:8787`** by default. To reach it from other machines, bind it to every interface with `--bind 0.0.0.0:8787`, and name each address that clients use with `--expected-host`, for example `--expected-host 192.168.1.5:8787`. The server refuses a request whose Host header names any other address.
- The server's **directories and ffmpeg** are set as described under `web-dev` above, or with `--ffmpeg-dir` for a directory holding `ffmpeg` and `ffprobe`. `easyimmerse-server serve --help` lists every flag.
- The settings can also live in a **config file**, named with `--config server.toml` or `EASYIMMERSE_CONFIG`. Its keys are the flag names with underscores, such as `bind = "0.0.0.0:8787"` or `cache_dir = "cache"`, and relative paths in it are relative to the file. A flag or an environment variable overrides the file. `easyimmerse-server config show --config server.toml` prints the settings the server would use, and `easyimmerse-server config set bind 0.0.0.0:8787 --config server.toml` changes one of them.
- The server **serves the web app** at its own address from a directory named `web` next to its executable, or from the directory `--web-app-dir` names. A CI build holds the binary and `web/` together, as described under Test builds. When building from source, build the web app with `mise exec -- pnpm --filter @easyimmerse/web build` and pass `--web-app-dir apps/web/dist`. `--api-only` turns this off.
- By default every client presents the server's launch token. To let several people log in with their own accounts, see [docs/self-hosting.md](docs/self-hosting.md).

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

Tests that run `ffmpeg` or `ffprobe` (in `crates/media-ffmpeg`, `crates/conversion`, and `crates/api`) skip with a message when the binaries are found neither in `EASYIMMERSE_FFMPEG_DIR` nor on `PATH`. To run them against the bundled LGPL build, run `mise run fetch-ffmpeg` and set `EASYIMMERSE_FFMPEG_DIR` to the absolute path of `apps/native/src-tauri/binaries/`, for example `EASYIMMERSE_FFMPEG_DIR=$PWD/apps/native/src-tauri/binaries cargo test -p easyimmerse-conversion`. The transcoding tests in `crates/conversion` also need a working H.264 encoder: one from the hardware list in `crates/media-ffmpeg/src/encoders.rs`, or the software encoder `libx264` or `libopenh264` of an ffmpeg build found in `EASYIMMERSE_FFMPEG_DIR` or on `PATH`. The bundled builds include no software H.264 encoder of their own. The tests skip with a message on a machine where none works, which includes most Linux machines with the bundled build and without a VA-API or NVENC capable GPU.

The tests in `crates/api/tests/api/local_media_sample.rs` add a media file from your own library, so they skip unless `EASYIMMERSE_SAMPLE_MEDIA` names one. The file must hold an embedded English text subtitle track and sit beside a `.ja.srt` file. `mise run test:sample-media` fetches the sidecars and runs these tests against them; the variable can be set in `.env`. The tests fail, rather than skip, when the ffmpeg they find cannot write SubRip, since the app would then add the file without its embedded tracks.

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

To run one job of the `native`, `server`, or `plugins` workflow at any commit, push a tag named `<workflow>-ci-<job>-<stamp>`, for example `git tag native-ci-ios-1 && git push origin native-ci-ios-1`. The jobs that can be named this way are `desktop`, `bundle`, `apk`, `android`, and `ios` in `native`, `server` and `bundle` in `server`, and `mobile` in `plugins`. A tag named `rust-ci-<stamp>` runs the whole `rust` workflow. A tag run never skips its job because of an earlier pass, and it records no pass of its own. The `bundle` and `apk` jobs never run on pull requests, so a tag is how to check a branch's installers and server download before it merges. For example, `server-ci-bundle-1` builds the server download for macOS, Windows and Linux.

#### Test builds

CI keeps the builds it makes as artifacts of each workflow run for 14 days, so prerelease versions can be tested without a GitHub release. Open a run of the workflow on the Actions tab and download from the Artifacts list at the bottom of its summary page. Downloading needs a GitHub sign-in.

- `easyimmerse-desktop-<runner>`: the installers from the `native` workflow's `bundle` job, one artifact per platform (`.dmg` on macOS; `.deb`, `.rpm`, and `.AppImage` on Linux; `.msi` and `-setup.exe` on Windows).
  The bundled ffmpeg converts video that the system cannot play directly with the computer's hardware encoder: VideoToolbox on macOS, Media Foundation, NVENC or AMF on Windows, and VA-API or NVENC on Linux. It has no software H.264 encoder. A computer without a working hardware encoder, such as most Linux machines without a VA-API or NVENC capable GPU, needs an ffmpeg build with libx264 or libopenh264, chosen in the Media conversion section of Settings. Such builds include the distribution's ffmpeg package on Linux, Homebrew's on macOS, and the gyan.dev and BtbN builds on Windows. The app says so the first time it starts on such a computer.
- `easyimmerse-server-<runner>`: the server from the `server` workflow's `bundle` job, one artifact per platform. It holds the `easyimmerse-server` binary with its `web/` directory beside it. To try it, unzip it, run `easyimmerse-server serve --db server.sqlite`, and open the address it prints. On macOS and Linux, first run `chmod +x easyimmerse-server`, since the zip drops the executable bit. The binary is unsigned, so on macOS also run `xattr -dr com.apple.quarantine` on the unzipped folder.
- `easyimmerse-android-arm64`: a debug APK from the `native` workflow's `apk` job, for 64-bit ARM phones. Allow installs from unknown sources on the phone to open it.
- `easyimmerse-extension`: the Chrome and Firefox zips from the `extension` workflow. Unzip one and load it unpacked as described under Browser extension.

The desktop installers, the server download, and the APK are built only on pushes to main and on tags, and a run that touches none of a workflow's paths builds nothing new. The installers are unsigned: macOS refuses to open the app until `xattr -dr com.apple.quarantine /Applications/easyImmerse.app` clears its quarantine flag, and Windows shows a SmartScreen warning that "More info" then "Run anyway" passes.

For a link that needs no sign-in, [nightly.link](https://nightly.link) serves the newest artifact of a branch, for example `https://nightly.link/justinsilvestre/easyimmerse/workflows/native/main/easyimmerse-android-arm64.zip`.

iOS has no CI build for devices, because installing on an iPhone needs code signing; see the native app's README to build and install one from a Mac.

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
├── media-ffmpeg/     ffprobe probing, keyframe listing, encoder discovery, and ffmpeg command lines, including frame grabs and audio clips for flashcards
├── conversion/ *     converting media into HLS segments as it plays, with the on-disk cache and its budget
├── storage/          persistence
├── srs/              scheduling of flashcard reviews with FSRS: the next state and interval of a card after an answer
├── anki/             Anki notes, note types and deck packages (.apkg) made from flashcards
├── api/              the HTTP API; routes in src/routes/, generated document in openapi.json
├── plugin-api/       the plugin interfaces, written in WIT under wit/ (MIT licensed)
├── plugins/ *        the plugin host, which loads and runs plugins
└── wasm/             the WebAssembly facade over core, used for offline mode
```

The core logic and shared code for the TypeScript layer lives in `packages/`.

```
packages/             the TypeScript workspace
├── types/            types generated from Rust (src/generated/) and from the OpenAPI document (src/openapi/)
├── state/ *          the Redux store, actions, update functions, and the Effects interface
├── backend/          the RTK Query endpoints
├── ui/               screens and components, with their Storybook stories beside them
├── effects-web/      each platform's implementation of the Effects interface
├── effects-native/
├── effects-extension/
├── wasm/ *           the typed wrapper around the offline WebAssembly module
├── licenses/         the open-source notices shown in Settings, generated for ffmpeg and every shipped dependency
└── config/           shared TypeScript configuration
```

The remaining directories are mostly for testing, scripts, and documentation.

```
plugins/              example plugins, used only by tests; plugin-manifest.md describes their plugin.toml
fixtures/ *           small sample files shared by every layer's tests
scripts/ *            setup and build scripts, including the ffmpeg fetcher, the ffmpeg build scripts, the ffmpeg licence-notice generator, and the Storybook screenshot diff
docs/                 product documentation: overview, user stories, UX refinements, bug reports
.github/workflows/    CI, one workflow per layer, plus the ffmpeg workflow that builds the desktop sidecars
.claude/rules/        conventions that apply to a whole directory
```

## Further documentation

Notes on the internals of individual parts live beside them:

- [apps/native/README.md](apps/native/README.md): the Tauri shell, the ffmpeg sidecars, and the Android and iOS builds and end-to-end tests.
- [crates/conversion/README.md](crates/conversion/README.md): the conversion service's measured behaviour that is left as it is.
- [crates/plugins/README.md](crates/plugins/README.md): the plugin host's execution modes, its iOS and Android constraints, and the `plugin-check` feature.
- [packages/state/README.md](packages/state/README.md): the state package's pipeline, folders, and test helpers.
- [packages/wasm/README.md](packages/wasm/README.md): the offline WebAssembly package and its build.
- [fixtures/README.md](fixtures/README.md): the sample files shared by every layer's tests.
- [scripts/storybook-diff/README.md](scripts/storybook-diff/README.md): the Storybook screenshot diff, locally and on pull requests, and how its captures stay deterministic.
- [plugins/plugin-manifest.md](plugins/plugin-manifest.md): the `plugin.toml` format of the example plugins.
- [docs/self-hosting.md](docs/self-hosting.md): running the standalone server with accounts, and managing them with the `users` command.
- [docs/](docs/): the product documentation: overview, user stories, UX refinements, bug reports, and the [alignment data](docs/alignment-data.md) format.

## License

AGPL-3.0-only. See [LICENSE](LICENSE).

The plugin interface in `crates/plugin-api` is licensed MIT, so that plugins under any license can build against it. See [crates/plugin-api/LICENSE](crates/plugin-api/LICENSE).
