# fetch-ffmpeg

Downloads the LGPL ffmpeg build for one target triple, checks its SHA-256, and copies `ffmpeg` and `ffprobe` into `apps/native/src-tauri/binaries/` under the sidecar names Tauri expects (`ffmpeg-<triple>` and `ffprobe-<triple>`, with `.exe` for Windows targets). That directory is not committed.

```sh
mise run fetch-ffmpeg                      # the triple of this machine, from rustc
mise run fetch-ffmpeg x86_64-pc-windows-msvc
mise run fetch-ffmpeg -- --force           # refetch even when the binaries exist
```

The script has no dependencies and is run directly by Node. Extraction uses the system `tar` for `.tar.xz` and `unzip` (or `Expand-Archive` on Windows) for `.zip`.

## manifest.json

One entry per Rust target triple:

| Field | Meaning |
|---|---|
| `url` | The archive to download. |
| `sha256` | Hex SHA-256 of the archive. A value starting with `TODO` makes the script refuse that triple. |
| `archive` | `tar.xz` or `zip`. |
| `paths.ffmpeg`, `paths.ffprobe` | Where each binary sits inside the archive. |

Linux and Windows entries point at a dated `autobuild-*` release of [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds/releases) rather than the `latest` release, whose assets are replaced daily and would no longer match the pinned hashes. To update, pick a newer dated release, download its four `*-lgpl-8.1` assets, and record their `shasum -a 256` output and inner paths (`tar tJf` or `unzip -l`).

## macOS entries

No first-party LGPL macOS build exists, so the `*-apple-darwin` entries point at this repository's own release produced by the `ffmpeg-macos` GitHub Actions workflow (`.github/workflows/ffmpeg-macos.yml`). To build a version, push a tag named `ffmpeg-macos-<version>` on any branch (`git tag ffmpeg-macos-8.1.2 && git push origin ffmpeg-macos-8.1.2`), wait for the release with that tag, then copy the two hashes from its `SHA256SUMS` asset into the `sha256` fields here. While a hash is `TODO` the script skips that triple with a warning, so the desktop app on macOS finds ffmpeg on `PATH` or not at all.
