# @easyimmerse/licenses

License notices for third-party software that ships with the app, for the open-source licenses page in Settings.

`ffmpegNotices` lists one notice per bundled ffmpeg build (version, source code, build origin, and configure flags), the GNU license texts those builds are distributed under, and one notice per library statically linked into them. Each notice is a `{ title, text }` pair of plain text.

`crateNotices` lists one notice per Rust crate named in `scripts/crate-notices/crates.json`: its version, license expression and source, and the full text of every license, copyright, and notice file that the crate ships. A crate belongs in that list when its license asks for its text to ship with binaries and nothing else ships it yet; `encoding_rs`, for example, includes data under the BSD 3-Clause License. `licenseNotices` joins the two lists for the open-source licenses page.

`src/generated/crateNotices.json` is written by `mise run crate-notices`, which reads each crate's files through `cargo metadata`; do not edit it by hand. `mise run crate-notices:check` fails when it no longer matches `Cargo.lock`, for example after a crate is upgraded.

The ffmpeg files in `src/generated/` are written by `mise run ffmpeg-notices` from `scripts/fetch-ffmpeg/manifest.json`; do not edit them by hand. `ffmpeg-notices.txt` holds the same notices as one plain-text file, which the desktop app bundles as a resource. `mise run ffmpeg-notices:check` fails when these files no longer match the manifest.
