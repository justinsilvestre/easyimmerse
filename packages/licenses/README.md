# @easyimmerse/licenses

License notices for third-party software that ships with the app, for the open-source licenses page in Settings.

`ffmpegNotices` lists one notice per bundled ffmpeg build (version, source code, build origin, and configure flags), the GNU license texts those builds are distributed under, and one notice per library statically linked into them. Each notice is a `{ title, text }` pair of plain text.

Everything in `src/generated/` is written by `mise run ffmpeg-notices` from `scripts/fetch-ffmpeg/manifest.json`; do not edit it by hand. `ffmpeg-notices.txt` holds the same notices as one plain-text file, which the desktop app bundles as a resource. `mise run ffmpeg-notices:check` fails when these files no longer match the manifest.
