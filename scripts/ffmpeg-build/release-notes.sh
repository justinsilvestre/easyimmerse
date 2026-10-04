#!/bin/sh
# Writes the release notes (BUILD.md) and SHA256SUMS into the directory where package.sh put
# the archives and, for each target triple, a directory with its configure flags and source hash.
#
# Usage: release-notes.sh <version> <dist-dir>
set -eu
version="$1"

write_notes() {
  echo "# ffmpeg $version (LGPL)"
  echo
  echo "Source: https://ffmpeg.org/releases/ffmpeg-$version.tar.xz"
  # Every build verified the same signed tarball, so this prints one hash.
  echo "Source SHA-256: $(cut -d' ' -f1 */source-sha256.txt | sort -u)"
  echo
  echo "The macOS builds link only system libraries. The Linux builds were made on Debian 11"
  echo "(glibc 2.31) with libva, libdrm and the Nvidia encoder headers linked statically. The"
  echo "Windows builds were made with the MSVC toolchain and a static C runtime, with zlib linked"
  echo "statically."
  for flags in */configure-flags.txt; do
    echo
    echo "## ${flags%/configure-flags.txt}"
    echo
    echo '```'
    cat "$flags"
    echo '```'
  done
}

cd "$2"
write_notes > BUILD.md
sha256sum ffmpeg-* > SHA256SUMS
