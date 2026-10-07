#!/bin/sh
# Fails when ffmpeg cannot write a media file's text subtitle track as SubRip, which the server
# does to add the subtitle tracks inside a media file. It uses the same arguments as
# crates/media-ffmpeg/src/subtitle_command.rs, on the SubRip track of fixtures/sample.mkv.
#
# Usage: check-subtitle-extraction.sh <ffmpeg>
set -eu
fixture="$(dirname "$0")/../../fixtures/sample.mkv"
output=$("$1" -hide_banner -nostdin -loglevel error -i "$fixture" -map 0:2 -f srt -)
if ! printf '%s\n' "$output" | grep -q -- '-->'; then
  echo "$1 wrote no SubRip cues for the subtitle track of $fixture." >&2
  exit 1
fi
