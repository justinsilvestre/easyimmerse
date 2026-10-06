#!/bin/sh
# Runs yt-dlp with the given arguments: the copy placed beside this script when there is
# one, else the one on PATH. The youtube-media-source plugin asks the host to run this.
# The app's bundled ffmpeg, named by EASYIMMERSE_FFMPEG_DIR, goes first on PATH so that
# yt-dlp merges separate video and audio streams with it.
dir=$(dirname "$0")
if [ -n "${EASYIMMERSE_FFMPEG_DIR:-}" ]; then
  PATH="$EASYIMMERSE_FFMPEG_DIR:$PATH"
  export PATH
fi
if [ -x "$dir/yt-dlp" ]; then
  exec "$dir/yt-dlp" "$@"
fi
exec yt-dlp "$@"
