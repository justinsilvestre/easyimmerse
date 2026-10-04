#!/bin/sh
# Configures and builds ffmpeg and ffprobe for Windows with the MSVC toolchain and a static C
# runtime, and writes them with the configure flags to the output directory. Runs in an MSYS2
# shell with the MSVC tools for the target architecture on PATH.
#
# Usage: windows.sh <ffmpeg-source-dir> <deps-prefix> <x86_64|aarch64> <output-dir>
set -eu
source_dir="$1"
deps_windows="$(cygpath -m "$(cd "$2" && pwd)")"
arch="$3"
out="$(mkdir -p "$4" && cd "$4" && pwd)"
common_flags="$(sh "$(dirname "$0")/read-common-flags.sh")"
# Media Foundation has a software H.264 encoder on every Windows 10 and 11 machine; the Nvidia
# and AMD encoders load their drivers at run time. -MT links the C runtime statically.
windows_flags="--toolchain=msvc --arch=$arch --target-os=win64 --enable-zlib \
  --enable-mediafoundation --enable-ffnvcodec --enable-nvenc --enable-amf \
  --enable-encoder=h264_mf,hevc_mf,h264_nvenc,hevc_nvenc,h264_amf,hevc_amf \
  --extra-cflags=-MT --extra-cflags=-I$deps_windows/include --extra-ldflags=-libpath:$deps_windows/lib"

report_configure_failure() {
  echo "pkg-config: $(command -v pkg-config)"
  PKG_CONFIG_PATH="$pkg_config_path" pkg-config --modversion ffnvcodec || true
  cat "$pkg_config_path/ffnvcodec.pc" || true
  grep -n -A40 'check_lib zlib' ffbuild/config.log || true
  grep -n -A40 'check_pkg_config ffnvcodec' ffbuild/config.log | head -120 || true
  tail -30 ffbuild/config.log
}

pkg_config_path="$(cygpath -u "$deps_windows")/lib/pkgconfig"
cd "$source_dir"
PKG_CONFIG_PATH="$pkg_config_path" ./configure $common_flags $windows_flags --prefix="$out/install" \
  || { report_configure_failure; exit 1; }
make -j"$(nproc)" > /dev/null
make install > /dev/null
cp "$out/install/bin/ffmpeg.exe" "$out/install/bin/ffprobe.exe" "$out/"
rm -rf "$out/install"
echo "$common_flags $windows_flags" > "$out/configure-flags.txt"
