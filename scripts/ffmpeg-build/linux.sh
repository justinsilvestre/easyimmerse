#!/bin/sh
# Configures, builds and strips ffmpeg and ffprobe for Linux, linking everything except glibc
# statically, and writes them with the configure flags to the output directory.
#
# Usage: linux.sh <ffmpeg-source-dir> <deps-prefix> <output-dir>
set -eu
source_dir="$1"
deps="$(cd "$2" && pwd)"
out="$(mkdir -p "$3" && cd "$3" && pwd)"
common_flags="$(sh "$(dirname "$0")/read-common-flags.sh")"
# VA-API and NVENC cover most Linux GPUs; V4L2 covers the stateful encoders of ARM boards.
linux_flags="--enable-zlib --enable-vaapi --enable-ffnvcodec --enable-nvenc --enable-v4l2-m2m \
  --enable-encoder=h264_vaapi,hevc_vaapi,h264_nvenc,hevc_nvenc,h264_v4l2m2m \
  --extra-cflags=-I$deps/include --extra-ldflags=-L$deps/lib --extra-ldflags=-static-libgcc"

cd "$source_dir"
PKG_CONFIG_PATH="$deps/lib/pkgconfig" ./configure $common_flags $linux_flags --prefix="$out/install" \
  || { tail -50 ffbuild/config.log; exit 1; }
make -j"$(nproc)" > /dev/null
make install > /dev/null
for bin in ffmpeg ffprobe; do
  cp "$out/install/bin/$bin" "$out/$bin"
  strip "$out/$bin"
done
rm -rf "$out/install"
echo "$common_flags $linux_flags" > "$out/configure-flags.txt"
