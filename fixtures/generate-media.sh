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

# Conversion fixtures: frame index as 16 binary columns over gray, a tone that steps 50 Hz each second, and one click per second.
FRAME_BITS="color=gray:size=128x72:rate=24000/1001:duration=24,format=gray,geq=lum='if(lt(Y,H/2),255*mod(floor(N/pow(2,floor(X*16/W))),2),128)',format=yuv420p"
TONE="0.3*sin(2*PI*(300+50*floor(t))*t)"
CLICK="0.6*between(t-floor(t)-0.1*mod(floor(t),5),0,0.005)*sin(2*PI*2000*t)"
SIGNAL="aevalsrc='$TONE+$CLICK':channel_layout=stereo:sample_rate=48000"

ffmpeg -y -loglevel error \
  -f lavfi -i "$FRAME_BITS" -f lavfi -i "$SIGNAL:duration=24" \
  -map 0:v -map 1:a \
  -c:v libx264 -preset veryfast -crf 30 -bf 3 -g 96 -keyint_min 24 -sc_threshold 0 \
  -force_key_frames "0,1.5,2.7,6.1,7.2,12.9,14.0,19.3" \
  -c:a libmp3lame -b:a 32k \
  conversion.mkv

ffmpeg -y -loglevel error \
  -f lavfi -i "$SIGNAL:duration=10" \
  -c:a libmp3lame -q:a 7 conversion.mp3

ls -l sample.mp4 sample.mkv sample.mp3 conversion.mkv conversion.mp3
