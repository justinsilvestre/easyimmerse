# easyimmerse-native

The Tauri shell for desktop and mobile. On start-up it opens the SQLite database in the app data directory, binds the API server to `127.0.0.1:8787` (or a free port when that one is taken), and creates the main window with `window.__EASYIMMERSE__ = { serverUrl, token }` injected before the page runs. The page then talks to the server over plain HTTP; Tauri IPC carries only the dialog, notification, clipboard, and opener plugins.

## Running

From the repository root:

```sh
mise exec -- pnpm --filter @easyimmerse/native dev
```

This starts Vite on port 1421 and the Rust app in debug mode. The database lands in the app data directory, for example `~/Library/Application Support/com.easyimmerse.app/easyimmerse.sqlite` on macOS.

## Smoke test

CI builds the app and runs it with `EASYIMMERSE_SMOKE_TEST=1`. The app then requests its own `/health` route, prints `smoke test: 200 {"status":"ok"}`, and exits before any window is created.

```sh
mise exec -- pnpm --filter @easyimmerse/native exec tauri build --debug --no-bundle
EASYIMMERSE_SMOKE_TEST=1 target/debug/easyimmerse-native
```

On Linux the Tauri runtime initializes GTK before the check runs, so the command needs a display; CI wraps it in `xvfb-run`.

## ffmpeg sidecars

The media routes will call `ffmpeg` and `ffprobe` sidecar binaries. `mise run fetch-ffmpeg` downloads them to `binaries/` (gitignored). `tauri.conf.json` does not declare them yet because Tauri fails the build when a declared sidecar file is missing, and local development has none. Once `mise run fetch-ffmpeg` is part of every developer's setup, add this to `bundle` (the CI job already runs the fetch task):

```json
"externalBin": ["binaries/ffmpeg", "binaries/ffprobe"]
```

## Mobile

`gen/android` and `gen/apple` are gitignored for now. CI creates them with `tauri android init --ci` and `tauri ios init --ci`, builds a debug APK, and builds an unsigned iOS simulator app with `tauri ios build --no-sign`. Building through the Tauri CLI is required: the generated Xcode project's build phase asks a server started by `tauri ios build` for its options, so a direct `xcodebuild` fails.

Building proves the projects compile. Loading the app at runtime needs plain HTTP to the embedded server at 127.0.0.1, which both platforms restrict:

- Android allows cleartext traffic in debug builds already; the generated Gradle file sets the `usesCleartextTraffic` placeholder to true for debug and false for release. Release builds need a network security config that permits cleartext for 127.0.0.1 only. That file lives inside `gen/android`, so commit `gen/android` when adding it.
- iOS App Transport Security blocks `http://127.0.0.1` inside WKWebView, and an IP address cannot be an exception domain. Add the exception to `Info.ios.plist` in this directory, which Tauri merges into the generated project on every build, so `gen/apple` can stay uncommitted. Either allow web content loads with `NSAllowsArbitraryLoadsInWebContent`, or set `NSAllowsLocalNetworking` and have the app use `http://localhost:<port>` with `localhost` added to the server's expected hosts.

Neither change has been tried on a device or simulator yet.

On Android, log output at the info level and above goes to logcat under the tag `easyimmerse`; `adb logcat -s easyimmerse` shows it.
