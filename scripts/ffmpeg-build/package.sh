#!/bin/sh
# Packs the binaries of one target into <dist-dir>/ffmpeg-<version>-<triple>.<tar.xz|zip>, the
# asset name the fetch-ffmpeg manifest derives, and copies the build's configure flags and the
# source hash into <dist-dir>/<triple>/ for the release notes. Runs in the directory where
# fetch-source.sh wrote source-sha256.txt.
#
# Usage: package.sh <version> <triple> <build-dir> <dist-dir>
set -eu
name="ffmpeg-$1-$2"
build="$(cd "$3" && pwd)"
dist="$(mkdir -p "$4/$2" && cd "$4" && pwd)"
case "$2" in
  *windows*) (cd "$build" && zip -q "$dist/$name.zip" ffmpeg.exe ffprobe.exe) ;;
  *) tar -C "$build" -cJf "$dist/$name.tar.xz" ffmpeg ffprobe ;;
esac
cp "$build/configure-flags.txt" source-sha256.txt "$dist/$2/"
