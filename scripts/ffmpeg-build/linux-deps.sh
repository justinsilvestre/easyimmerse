#!/bin/sh
# Builds the libraries the Linux ffmpeg links beyond glibc into a prefix, as static libraries:
# zlib, the Nvidia encoder headers, and libdrm and libva for the VA-API encoders.
#
# Usage: linux-deps.sh <prefix>
set -eu
prefix="$(mkdir -p "$1" && cd "$1" && pwd)"
zlib_version=1.3.1
nv_codec_headers_version=n13.1.15.0
libdrm_version=2.4.125
libva_version=2.24.1
work="$(mktemp -d)"
cd "$work"

# The distribution's zlib is a shared library; ffmpeg finds this static one first through -L.
git clone -q --depth 1 --branch "v$zlib_version" https://github.com/madler/zlib
(cd zlib && ./configure --static --prefix="$prefix" > /dev/null && make install > /dev/null)

git clone -q --depth 1 --branch "$nv_codec_headers_version" https://github.com/FFmpeg/nv-codec-headers
make -C nv-codec-headers install PREFIX="$prefix" > /dev/null

# Only the core library is needed; the vendor helpers and their libpciaccess dependency are not.
git clone -q --depth 1 --branch "libdrm-$libdrm_version" https://gitlab.freedesktop.org/mesa/drm libdrm
meson setup libdrm/build libdrm --prefix="$prefix" --libdir=lib --default-library=static --buildtype=release \
  -Dintel=disabled -Dradeon=disabled -Damdgpu=disabled -Dnouveau=disabled -Dvmwgfx=disabled \
  -Domap=disabled -Dexynos=disabled -Dfreedreno=disabled -Dtegra=disabled -Dvc4=disabled -Detnaviv=disabled \
  -Dcairo-tests=disabled -Dman-pages=disabled -Dvalgrind=disabled -Dtests=false -Dudev=false > /dev/null
ninja -C libdrm/build install > /dev/null

# libva declares its libraries as shared; `library` lets the static default apply.
git clone -q --depth 1 --branch "$libva_version" https://github.com/intel/libva
sed -i 's/shared_library(/library(/' libva/va/meson.build
PKG_CONFIG_PATH="$prefix/lib/pkgconfig" meson setup libva/build libva --prefix="$prefix" --libdir=lib \
  --default-library=static --buildtype=release \
  -Dwith_x11=no -Dwith_glx=no -Dwith_wayland=no -Dwith_win32=no -Denable_docs=false > /dev/null
ninja -C libva/build install > /dev/null

rm -rf "$work"
