#!/bin/sh
# Downloads an ffmpeg release from ffmpeg.org into the current directory, verifies its signature
# with the FFmpeg release signing key, records its SHA-256 in source-sha256.txt for the release
# notes, and extracts it to ffmpeg-<version>.
#
# Usage: fetch-source.sh <version>
set -eu
tarball="ffmpeg-$1.tar.xz"
curl -fsSLO "https://ffmpeg.org/releases/$tarball"
curl -fsSLO "https://ffmpeg.org/releases/$tarball.asc"
curl -fsSL https://ffmpeg.org/ffmpeg-devel.asc | gpg --import
gpg --verify "$tarball.asc" "$tarball"
if command -v sha256sum > /dev/null; then
  sha256sum "$tarball" > source-sha256.txt
else
  shasum -a 256 "$tarball" > source-sha256.txt
fi
tar xf "$tarball"
