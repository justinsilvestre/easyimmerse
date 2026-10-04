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
# Media Foundation has a software H.264 encoder on every Windows 10 and 11 machine, and its
# encoder code needs the Direct3D 11 hardware context, which links only system DLLs. The Nvidia
# and AMD encoders load their drivers at run time. ffmpeg supports NVENC on Windows only for
# x86, so the ARM64 build leaves it out. -MT links the C runtime statically.
nvenc_flags="--enable-ffnvcodec --enable-nvenc --enable-encoder=h264_nvenc,hevc_nvenc"
[ "$arch" = x86_64 ] || nvenc_flags=""
windows_flags="--toolchain=msvc --arch=$arch --target-os=win64 --enable-zlib \
  --enable-mediafoundation --enable-d3d11va --enable-amf $nvenc_flags \
  --enable-encoder=h264_mf,hevc_mf,h264_amf,hevc_amf \
  --extra-cflags=-MT --extra-cflags=-I$deps_windows/include --extra-ldflags=-libpath:$deps_windows/lib"

cd "$source_dir"
PKG_CONFIG_PATH="$(cygpath -u "$deps_windows")/lib/pkgconfig" ./configure $common_flags $windows_flags --prefix="$out/install" \
  || { tail -50 ffbuild/config.log; exit 1; }
# cl.exe prints its diagnostics on standard output, which the Linux build discards. A parallel
# build keeps compiling other files after an error, so the log is searched rather than tailed.
make -j"$(nproc)" > make.log 2>&1 || { grep -n -A12 'error' make.log | head -150; exit 1; }
make install > /dev/null
cp "$out/install/bin/ffmpeg.exe" "$out/install/bin/ffprobe.exe" "$out/"
rm -rf "$out/install"
echo "$common_flags $windows_flags" > "$out/configure-flags.txt"
