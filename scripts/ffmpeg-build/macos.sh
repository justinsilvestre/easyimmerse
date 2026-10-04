#!/bin/sh
# Configures, builds and strips ffmpeg and ffprobe for macOS on arm64 and, cross-compiled, on
# x86_64, and writes each pair with its configure flags to <output-dir>/<target triple>.
# Runs on an Apple silicon Mac with the Xcode command line tools and nasm.
#
# Usage: macos.sh <ffmpeg-source-dir> <output-dir>
set -eu
out="$(mkdir -p "$2" && cd "$2" && pwd)"
common_flags="$(sh "$(dirname "$0")/read-common-flags.sh")"
# The shared flags turn autodetection off, so that the configure line names every library the
# binaries link, which the licence-notice generator reads, and so that configure cannot pick up
# Homebrew's X11 and XCB libraries on the runner, which a Mac without Homebrew lacks. These flags
# add the hardware codecs and the system zlib and iconv. With autodetection off, configure probes
# only the C library for iconv and never adds the separate system libiconv that macOS has, so it
# is linked through --extra-libs.
macos_flags="--enable-videotoolbox --enable-audiotoolbox --enable-zlib --enable-iconv --extra-libs=-liconv \
  --enable-encoder=h264_videotoolbox,hevc_videotoolbox,aac_at"

# Usage: build <triple> [configure flag]...
build() {
  triple="$1"
  shift
  ./configure $common_flags $macos_flags "$@" --prefix="$out/install" \
    || { tail -50 ffbuild/config.log; exit 1; }
  make -j"$(sysctl -n hw.ncpu)" > /dev/null
  make install > /dev/null
  make distclean
  mkdir -p "$out/$triple"
  for bin in ffmpeg ffprobe; do
    cp "$out/install/bin/$bin" "$out/$triple/$bin"
    strip "$out/$triple/$bin"
  done
  rm -rf "$out/install"
  echo "$common_flags $macos_flags $*" > "$out/$triple/configure-flags.txt"
}

cd "$1"
build aarch64-apple-darwin
build x86_64-apple-darwin --enable-cross-compile --arch=x86_64 --target-os=darwin "--cc=clang -arch x86_64"
