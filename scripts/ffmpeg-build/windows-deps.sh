#!/bin/sh
# Builds the libraries the Windows ffmpeg links beyond the system DLLs into a prefix, for the
# MSVC toolchain: zlib as a static library, the Nvidia encoder headers, and the AMD AMF headers.
# Runs in an MSYS2 shell with the MSVC tools for the target architecture on PATH.
#
# Usage: windows-deps.sh <prefix>
set -eu
prefix="$(mkdir -p "$1" && cd "$1" && pwd)"
prefix_windows="$(cygpath -m "$prefix")"
zlib_version=1.3.1
nv_codec_headers_version=n13.1.15.0
amf_version=v1.5.3
work="$(mktemp -d)"
cd "$work"
mkdir -p "$prefix/include" "$prefix/lib"

# The MSVC toolchain in ffmpeg's configure turns -lz into zlib.lib. The objects must use the
# static C runtime like ffmpeg's, or the linker rejects the mix.
git clone -q --depth 1 --branch "v$zlib_version" https://github.com/madler/zlib
(cd zlib && nmake -nologo -f win32/Makefile.msc zlib.lib LOC=-MT > /dev/null)
# ffmpeg's config.h defines HAVE_UNISTD_H as 0, which zconf.h mistakes for the header being
# present; ffmpeg's platform notes say to drop that inclusion when building with MSVC.
sed 's/^#ifdef HAVE_UNISTD_H/#if HAVE_UNISTD_H/' zlib/zconf.h > "$prefix/include/zconf.h"
cp zlib/zlib.h "$prefix/include/"
cp zlib/zlib.lib "$prefix/lib/zlib.lib"

git clone -q --depth 1 --branch "$nv_codec_headers_version" https://github.com/FFmpeg/nv-codec-headers
make -C nv-codec-headers install PREFIX="$prefix_windows" > /dev/null

# Only the headers are needed; the repository otherwise holds samples and binaries.
git clone -q --depth 1 --filter=blob:none --sparse --branch "$amf_version" https://github.com/GPUOpen-LibrariesAndSDKs/AMF
git -C AMF sparse-checkout set amf/public/include > /dev/null
cp -r AMF/amf/public/include "$prefix/include/AMF"

rm -rf "$work"
