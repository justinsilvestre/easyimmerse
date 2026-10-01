#!/bin/sh
# Regenerates the media fixtures from the subtitle fixture and synthetic sources.
# Run from anywhere: `mise run fixtures:media`. Requires ffmpeg with libx264, aac, libmp3lame, mov_text, and srt.
set -eu
cd "$(dirname "$0")"

VIDEO="testsrc=size=320x180:rate=24:duration=5"
AUDIO="sine=frequency=440:sample_rate=44100:duration=5"

ffmpeg -y -loglevel error \
  -f lavfi -i "$VIDEO" -f lavfi -i "$AUDIO" -i sample.srt \
  -map 0:v -map 1:a -map 2:s \
  -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p \
  -c:a aac -b:a 48k -ac 1 \
  -c:s mov_text -metadata:s:s:0 language=eng \
  -shortest sample.mp4

ffmpeg -y -loglevel error \
  -f lavfi -i "$VIDEO" -f lavfi -i "$AUDIO" -i sample.srt \
  -map 0:v -map 1:a -map 2:s \
  -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p \
  -c:a aac -b:a 48k -ac 1 \
  -c:s srt -metadata:s:s:0 language=eng \
  -shortest sample.mkv

ffmpeg -y -loglevel error \
  -f lavfi -i "sine=frequency=440:sample_rate=44100:duration=3" \
  -ac 1 -c:a libmp3lame -b:a 64k sample.mp3

ls -l sample.mp4 sample.mkv sample.mp3
