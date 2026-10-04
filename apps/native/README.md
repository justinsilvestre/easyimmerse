# Desktop and mobile app

The Tauri app for macOS, Windows, Linux, Android, and iOS. `src/` holds the frontend entry point, `src-tauri/` the Rust shell, and `e2e/` the WebdriverIO specs. The [root README](../../README.md) lists the commands that build, run, and test it.

## The shell

On start-up, the shell opens the SQLite database in the app data directory, creates the app cache directory for converted media, binds the API server to `127.0.0.1:8787` (or a free port when that one is taken), and creates the main window with `window.__EASYIMMERSE__ = { serverUrl, token }` injected before the page runs. The page then talks to the server over plain HTTP. Tauri IPC carries only the dialog, notification, clipboard, and opener plugins, plus the `check_plugin_host` command in builds with the `plugin-check` feature, which the [plugin host README](../../crates/plugins/README.md) describes.

## ffmpeg sidecars

The media routes call the `ffmpeg` and `ffprobe` sidecar binaries. `mise run fetch-ffmpeg` downloads the LGPL build for one target triple, checks its SHA-256, and copies the binaries into `src-tauri/binaries/` (gitignored) under the names Tauri expects (`ffmpeg-<triple>` and `ffprobe-<triple>`, with `.exe` for Windows targets).

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

No first-party LGPL build passes the licence policy below on any platform, so every entry points at a release of this repository produced by one of three workflows: `ffmpeg-macos` (`.github/workflows/ffmpeg-macos.yml`, both Mac architectures in one job), `ffmpeg-linux` (x86-64 and ARM64 in a Debian 11 container, so the binaries run on distributions with glibc 2.31 or newer), and `ffmpeg-windows` (x86-64 and ARM64 with the MSVC toolchain and a static C runtime, so no Visual C++ redistributable is needed). All three configure ffmpeg with the flags in `scripts/ffmpeg-build/common-flags.txt`, which disable every component and enable only the containers, codecs, filters, and protocols the Rust code uses, plus decoders for formats common in personal libraries (MPEG-1 and MPEG-2, MP2, DTS, TrueHD, WMV and WMA, ProRes, DNxHD, and PGS, DVD, and DVB subtitles). Each workflow adds its platform's hardware encoders: VideoToolbox and the AudioToolbox AAC encoder on macOS; VA-API, NVENC, and V4L2 on Linux; Media Foundation, NVENC, and AMF on Windows. ffmpeg supports NVENC on Windows only for x86-64, so the Windows ARM64 build has no NVENC encoder. The Linux and Windows build steps are shell scripts in `scripts/ffmpeg-build/`, so a build can be reproduced outside CI.

To build a version, push a tag named `ffmpeg-<platform>-<version>` on any branch (for example `git tag ffmpeg-linux-8.1.3 && git push origin ffmpeg-linux-8.1.3`), or `ffmpeg-<platform>-<version>-<n>` to build the same version again after changing the workflow. Pushing a branch of the same name triggers the same build, for environments that cannot push tags; the release then creates the tag at the built commit, and the branch can be deleted afterwards. Wait for the release with that tag, then copy the hashes from its `SHA256SUMS` asset into the `sha256` fields and set `paths` to the bare file names. Every workflow configures ffmpeg with autodetection off and only the wanted system features enabled, and fails when a binary links a library the operating system does not provide: `otool -L` on macOS allows only `/System/Library` and `/usr/lib`, `ldd` on Linux allows only glibc, and `dumpbin /dependents` on Windows allows only system DLLs. While this repository is private, the release assets are only reachable through the GitHub API with a token: the script uses `GITHUB_TOKEN` or `GH_TOKEN` when set, and otherwise the token of the logged-in `gh` CLI. While a hash is `TODO`, the desktop app on that platform finds ffmpeg on `PATH` or not at all.

The sidecars of ffmpeg 8.1.3 add the following to the app, measured on the published binaries (stripped on macOS and Linux; the MSVC linker writes no symbols) and on the archive the fetch script downloads:

| Platform | `ffmpeg` | `ffprobe` | Archive |
| --- | ---: | ---: | ---: |
| macOS (Apple silicon) | 8.6 MB | 8.5 MB | 5.1 MB |
| macOS (Intel) | 11.0 MB | 10.8 MB | 6.3 MB |
| Linux (x86-64) | 10.7 MB | 10.5 MB | 6.5 MB |
| Linux (ARM64) | 8.5 MB | 8.3 MB | 5.1 MB |
| Windows (x86-64) | 10.0 MB | 9.9 MB | 7.6 MB |
| Windows (ARM64) | 7.8 MB | 7.6 MB | 6.4 MB |

The desktop builds declare the sidecars in `tauri.macos.conf.json`, `tauri.linux.conf.json`, and `tauri.windows.conf.json`, which Tauri merges over `tauri.conf.json` for the matching target. They are not declared in the shared file because the mobile builds have no sidecars. Tauri refuses to build the desktop app while a declared sidecar file is missing, so `mise run fetch-ffmpeg` must run before every desktop build; the `desktop`, `web:desktop`, and `e2e:desktop` tasks and the CI native job do so.

The licence notices for these builds are generated by `mise run ffmpeg-notices` (`scripts/ffmpeg-notices/`). For each manifest entry it downloads the archive (cached in the system temporary directory, or the directory given with `--cache-dir`), reads the configure line embedded in the `ffmpeg` binary, and maps each enabled feature to the libraries it links through the table in `featureLibraries.ts` and `libraries.ts`. Every library must be under MIT, a BSD licence, ISC, Zlib, Apache-2.0, or the LGPL; a build that links anything else, enables `gpl` or `nonfree`, or uses a feature missing from the table is rejected, gets no notices, and makes the task fail with the list of problems. The task writes `packages/licenses/src/generated/ffmpegNotices.json` (exported as `ffmpegNotices` by `@easyimmerse/licenses` for the licenses page in Settings) and `ffmpeg-notices.txt` (bundled by Tauri as `licenses/ffmpeg-notices.txt`), and records what it read, including the fetched licence texts, in `scripts/ffmpeg-notices/noticeInputs.json`. Commit all three after changing the manifest. `mise run ffmpeg-notices:check`, which CI runs, works offline: it fails when the manifest's hashes differ from the recorded ones, when rendering the recorded inputs would change the committed files, or when a recorded build breaks the licence policy. Pass `--refresh` to download the archives and licence texts again.

## End-to-end tests

`mise run e2e:desktop` builds the app in debug mode and runs the specs in `e2e/` against it on Linux, macOS, and Windows. Debug builds register an embedded WebDriver server plugin when the test runner sets `TAURI_WEBDRIVER_PORT`, so no browser driver is needed and an ordinary development run exposes no automation server. The build merges `e2e/tauri.conf.json`, which exposes the global Tauri object that the test service uses to inspect windows. Each run opens an empty database in a temporary directory through `EASYIMMERSE_DATABASE`. CI runs the same specs in the `desktop` job, under `xvfb-run` on Linux.

Every test build, desktop or mobile, enables the `plugin-check` feature, so the tasks build the `hello-rust` plugin first. `plugins.spec.ts` calls the `check_plugin_host` command through the global Tauri object and expects the plugin's greeting, which proves the plugin host runs on the platform under test.

`mise run e2e:android` and `mise run e2e:ios` run the same specs on mobile. The WebdriverIO Tauri service drives only desktop builds, so these tasks go through [Appium](https://appium.io), whose UiAutomator2 and XCUITest drivers install a debug build and switch the session into the app's WebView. `e2e/appiumConfig.ts` holds the settings both platforms share, and `e2e/wdio.android.conf.ts` and `e2e/wdio.ios.conf.ts` hold their capabilities. Appium installs its drivers itself, so `mise.toml` pins their versions and `mise run appium:install` puts them in the gitignored `.appium/`; each test task installs the driver it needs. The Appium server and test worker logs of the last run are written to `e2e/logs/`, and CI uploads them when a mobile job fails.

## Mobile

`src-tauri/gen/android` and `src-tauri/gen/apple` are gitignored for now, and the build tasks and CI create them with `tauri android init --ci` and `tauri ios init --ci`. Building through the Tauri CLI is required: the generated Xcode project's build phase asks a server started by `tauri ios build` for its options, so a direct `xcodebuild` fails. On both platforms the page loads the embedded server over plain HTTP at 127.0.0.1.

### Android

`mise.toml` defaults `ANDROID_HOME` to Android Studio's SDK location and `NDK_HOME` to the pinned NDK inside it; a value already in the environment wins. The Android tasks run with a Mise-installed Temurin 17, because the Android build fails on the newest JDKs. `mise run android:build` builds the x86_64 debug APK with the global Tauri object, and `mise run e2e:android` builds it and runs the specs on a running emulator.

Start an x86_64 emulator first. A dedicated AVD is the safest choice, because the debug APK needs a few hundred megabytes and an AVD used for daily work can be too full to install it:

```sh
sdk=~/Library/Android/sdk
$sdk/cmdline-tools/latest/bin/avdmanager create avd -n easyimmerse-e2e -k "system-images;android-36;google_apis;x86_64" -d pixel_3a
$sdk/emulator/emulator -avd easyimmerse-e2e -no-window -no-snapshot -noaudio -no-boot-anim -gpu swiftshader_indirect
```

On its first run, Appium downloads the chromedriver that matches the emulator's WebView into `.appium/chromedriver`. Each run reinstalls the APK and clears the app's data, so the app seeds its placeholder projects as on a fresh install. Starting a session can take a minute or two, most of it in Appium's own setup; the specs themselves take well under a minute.

CI's `android` job builds the same APK, enables KVM, and runs the specs on an x86_64 emulator through `reactivecircus/android-emulator-runner`, booting from a cached snapshot. It uses a `default` image rather than `google_apis`, because the Google app's frozen DevTools sockets can stall Appium's WebView detection. The Appium driver and chromedriver are cached between runs.

Debug builds already allow cleartext traffic: the generated Gradle file sets the `usesCleartextTraffic` placeholder to true for debug and false for release. Release builds need a network security config that permits cleartext for 127.0.0.1 only. That file lives inside `gen/android`, so commit `gen/android` when adding it. No release build has been tried yet.

Log output at the info level and above goes to logcat under the tag `easyimmerse`; `adb logcat -s easyimmerse` shows it.

### iOS

`mise run e2e:ios` builds the app for this machine's simulator (`x86_64` on Intel, `aarch64-sim` on Apple silicon) and runs the specs on it. When no "easyImmerse e2e" simulator exists, the config creates one on the runtime of the selected Xcode's SDK, and it boots the simulator before the tests. The build step is its own task, `mise run ios:build`, which pins Ruby through Mise and installs CocoaPods for `tauri ios init` when it is missing. The test config downloads the driver's prebuilt simulator WebDriverAgent into `.appium/WebDriverAgent-<version>-sim/` and launches it without xcodebuild, so no Xcode build runs during the tests. Each run removes the app from the simulator first, so the app starts with a new database.

Two details of the setup are easy to break:

- On an Intel Mac, the Tauri CLI archives with a named simulator destination, which recent Xcode versions answer by archiving for a device, where x86_64 is excluded. `scripts/ios-project-simulator-only.sh` restricts the generated project to the simulator platform, and the task applies it when the target is `x86_64`.
- The web inspector lists the unsigned app by process name, `process-easyImmerse`, not by bundle id, and the driver only inspects applications whose id it knows. The config passes that name through `appium:additionalWebviewBundleIds`; without it, the driver polls an empty WebKit helper process and the session fails after a minute.

App Transport Security does not apply to loads that name an IP address, so the WKWebView reaches `http://127.0.0.1:<port>` without any `Info.plist` exception. The simulator tests confirm this.

CI's `ios` job does the same on a macOS runner with a recent Xcode, because only the newest Xcode versions on the runner image keep their simulator runtime. It caches `.appium/`, which holds the driver and the downloaded WebDriverAgent; a tag-triggered run cannot read the caches of other refs, so such runs download again. The job starts creating and booting the simulator in the background while the app builds. About three minutes of the test step still go to the first launch of WebDriverAgent on a freshly booted simulator, while later sessions take about half a minute, so the config allows a single session attempt of up to ten minutes. When the tests fail, the job also uploads the simulator's screen and the app's log in the `ios-diagnostics` artifact.
