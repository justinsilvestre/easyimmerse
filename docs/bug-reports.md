# bug reports

Each bug report is to be logged in this format:

```md
- <title (up to 5 words)> <day reported (YYYY-MM-DD format)>
  - <how to reproduce the bug>
  - <how the application should behave>
```

---

## Media conversion

- First playback waits for encoders 2026-10-04
  - Start the app and, before anything else, open a file that needs converting.
  - The first playback request waits for the server to discover which video encoders work, up to five seconds on a machine where the hardware encoder test is slow (under half a second on a recent Mac). The player should show that it is preparing the file rather than appear stuck, or discovery should finish before the first file can be opened.
- HDR video converts washed out 2026-10-04
  - Open an HDR (10-bit, BT.2020) video that needs converting.
  - It is transcoded to 8-bit H.264 without tone mapping and looks washed out. Converted HDR video should be tone-mapped to look like the original.
- Linux and Windows ship no ffmpeg 2026-10-04
  - Install the desktop app on Linux or Windows from a build of this repository and open a file the webview cannot play.
  - Conversion is unavailable unless an ffmpeg is on `PATH`, because `scripts/fetch-ffmpeg/manifest.json` has no bundled build for those platforms: the only first-party LGPL builds, BtbN's autobuilds, link FFTW (GPL), parts of ZVBI (GPL), SRT and libzmq (MPL), glslang (GPL with exception), and the excluded libmp3lame and libopenh264, so the licence policy rejects them. Planned: a workflow like `ffmpeg-macos` that builds a minimal LGPL ffmpeg (`--disable-autodetect --disable-everything` plus the components the Rust code uses, measured at 15 MB for the pair on macOS arm64, 2.5 MB compressed) for Linux x86_64 and arm64 and for Windows x86_64 and arm64 with the MSVC toolchain, then pins them in the manifest. The decision and the brief for that work are in `docs/ffmpeg-distribution.tmp.md` while it lasts.

## Desktop app

- Native frontend build fails 2026-10-04
  - Run `mise exec -- pnpm --filter @easyimmerse/native exec vite build` (what `tauri build` runs first).
  - esbuild stops with hundreds of "Transforming destructuring to the configured target environment ("safari13" + 2 overrides) is not supported yet" errors from the Redux Toolkit chunk. The build also fails on the scaffold-based branch `20261003-1728-ui`, so it predates the media work. `--target safari15` on the command line builds, so either `build.target` in `apps/native/vite.config.ts` must rise to the oldest WKWebView the app supports, or the dependency that needs lowering must be pinned lower. The build should succeed with the configured target.
