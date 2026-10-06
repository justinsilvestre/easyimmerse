# @easyimmerse/licenses

License notices for third-party software that ships with the app, for the open-source licenses page in Settings.

`ffmpegNotices` lists one notice per bundled ffmpeg build (version, source code, build origin, and configure flags), the GNU license texts those builds are distributed under, and one notice per library statically linked into them. Each notice is a `{ title, text }` pair of plain text.

`loadLicenseNoticeGroups` loads every notice for the page, grouped as FFmpeg, Rust crates, and JavaScript packages. The dependency notices are loaded on demand, because they hold the license texts of hundreds of packages and only the licenses page needs them. Each one names the package's version, license expression, the artifacts it ships in, and its source, then quotes every license, copyright, and notice file the package ships. A package that ships no license file gets the standard SPDX text of its license, kept in `scripts/dependency-notices/standard-texts/`.

`src/generated/dependencyNotices.json` is written by `mise run license-notices`; do not edit it by hand. The generator works out what ships from the dependency graphs:

- Rust crates: `cargo metadata` for every target the release workflows build, following normal dependencies from `easyimmerse-server`, `easyimmerse-native` (desktop and mobile), and `easyimmerse-wasm`. Build and dev dependencies are left out. The example plugins under `plugins/` do not ship.
- npm packages: the production dependencies of `apps/web`, `apps/native`, and `apps/extension`, followed through the workspace packages, plus the build-tool code that each build adds, listed in `scripts/dependency-notices/artifacts.ts`.

Generating runs `cargo metadata` once per target, which downloads the crate sources that are missing. `mise run license-notices:check` needs neither Cargo nor the network: it fails when the manifests, lockfiles, or generator changed since the notices were generated, and when a shipped license falls outside the allowed list (MIT, Apache-2.0, BSD, ISC, Zlib, Unlicense, MPL-2.0, and permissive equivalents) unless `scripts/dependency-notices/accepted-outliers.json` lists the package with the reason it was accepted.

The ffmpeg files in `src/generated/` are written by `mise run ffmpeg-notices` from `scripts/fetch-ffmpeg/manifest.json`; do not edit them by hand. `ffmpeg-notices.txt` holds the same notices as one plain-text file, which the desktop app bundles as a resource. `mise run ffmpeg-notices:check` fails when these files no longer match the manifest.
