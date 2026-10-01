# ffmpeg

easyImmerse ships unmodified `ffmpeg` and `ffprobe` executables from the FFmpeg project (https://ffmpeg.org). They run as separate programs and are not linked into easyImmerse.

FFmpeg is free software licensed under the GNU Lesser General Public License. The builds shipped here are configured without GPL or nonfree components. Running `ffmpeg -L` prints the license of the bundled build, and `ffmpeg -buildconf` prints its configure flags. The license texts are in this directory.

## macOS

- Version: ffmpeg 8.1.2, licensed under the LGPL version 3 or later.
- Source: https://ffmpeg.org/releases/ffmpeg-8.1.2.tar.xz
- Configure flags: `--disable-gpl --disable-nonfree --enable-version3 --disable-shared --enable-static --disable-doc --disable-debug --disable-ffplay --pkg-config-flags=--static`, plus `--enable-cross-compile --arch=x86_64 --target-os=darwin --cc='clang -arch x86_64'` for the Intel build.
- Build: the `ffmpeg-macos-8.1.2` release of https://github.com/justinsilvestre/easyimmerse, produced by `.github/workflows/ffmpeg-macos.yml` in that repository.

## Linux and Windows

- Version: ffmpeg n8.1.3-6-gff48edd8b2, the `lgpl-8.1` variant built by BtbN/FFmpeg-Builds.
- Build and source: the `autobuild-2026-09-29-13-10` release at https://github.com/BtbN/FFmpeg-Builds/releases, whose build scripts list the configure flags and the third-party libraries included in the build, each under its own license. The FFmpeg source for that revision is at https://github.com/FFmpeg/FFmpeg/commit/ff48edd8b2.
