#!/bin/sh
# Regenerates the media fixtures from the subtitle fixture and synthetic sources.
# Run from anywhere: `mise run fixtures:media`.
# Requires ffmpeg with libx264, libx265, libmp3lame, aac, the native vorbis and flac encoders, mov_text, and srt.
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

# The conversion fixtures below are documented in README.md, which describes how to decode their frame index and audio position.

# Draws the frame index as 16 full-height columns, bit i in column i with the least significant bit on the left.
FRAME_INDEX="geq=lum='if(mod(floor(N/pow(2,floor(X*16/W))),2),235,16)':cb=128:cr=128"

# Prints a video source of the given frame rate and duration whose frames show their own index.
frame_index_video() {
  echo "color=c=black:s=256x144:r=$1:d=$2,format=yuv420p,$FRAME_INDEX"
}

# Prints a stereo audio source with a tone starting at the given base frequency, rising 20 Hz each second, and a 2 ms click at the start of each second.
stepping_tone() {
  sample="if(lt(mod(t,1),0.00199),0.9,0.25*sin(2*PI*($1+20*floor(t))*t))"
  echo "aevalsrc=exprs='$sample|$sample':c=stereo:s=$2:d=$3"
}

BITEXACT="-fflags +bitexact -flags:v +bitexact -flags:a +bitexact"
X264="-c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -sc_threshold 0"
AAC="-c:a aac -b:a 48k"
MATROSKA="-default_mode infer_no_subs"

ffmpeg -y -loglevel error \
  -f lavfi -i "$(frame_index_video 25 10)" -f lavfi -i "$(stepping_tone 220 48000 10)" \
  $X264 -profile:v main -g 50 -keyint_min 50 $AAC \
  -movflags +faststart $BITEXACT conversion-h264-aac.mp4

ffmpeg -y -loglevel error \
  -f lavfi -i "$(frame_index_video 24 10)" \
  -f lavfi -i "$(stepping_tone 220 48000 10)" -f lavfi -i "$(stepping_tone 660 48000 10)" \
  -i sample.srt \
  -map 0:v -map 1:a -map 2:a -map 3:s \
  $X264 -profile:v main -g 48 -keyint_min 48 $AAC -c:s srt $MATROSKA \
  -metadata:s:a:0 language=jpn -metadata:s:a:0 title="Japanese" -disposition:a:0 default \
  -metadata:s:a:1 language=eng -metadata:s:a:1 title="English" -disposition:a:1 0 \
  -metadata:s:s:0 language=eng \
  $BITEXACT conversion-h264-aac.mkv

ffmpeg -y -loglevel error \
  -f lavfi -i "$(frame_index_video 25 10)" -f lavfi -i "$(stepping_tone 220 48000 10)" \
  -c:v mpeg4 -q:v 4 -g 50 -keyint_min 50 -sc_threshold 0 \
  -c:a vorbis -strict experimental -b:a 48k \
  $MATROSKA $BITEXACT conversion-mpeg4-vorbis.mkv

ffmpeg -y -loglevel error \
  -f lavfi -i "$(frame_index_video 25 10)" -f lavfi -i "$(stepping_tone 220 48000 10)" \
  -c:v libx265 -preset fast -crf 30 -pix_fmt yuv420p -tag:v hvc1 \
  -x265-params log-level=error:keyint=50:min-keyint=50:scenecut=0:pools=1:frame-threads=1 \
  $AAC -movflags +faststart $BITEXACT conversion-hevc-aac.mp4

# The Matroska muxer labels an encoder's top-field-first output as field order "tb", so the video is encoded into MPEG-TS first.
# Remuxing it lets the Matroska muxer take the field order "tt" that the H.264 parser reads from the stream.
INTERLACED_VIDEO="$(mktemp -d)/interlaced.ts"
ffmpeg -y -loglevel error \
  -f lavfi -i "$(frame_index_video 25 10),setfield=tff" \
  $X264 -profile:v main -g 50 -keyint_min 50 -x264opts tff=1 \
  -fflags +bitexact -flags:v +bitexact+ilme+ildct "$INTERLACED_VIDEO"
ffmpeg -y -loglevel error \
  -i "$INTERLACED_VIDEO" -f lavfi -i "$(stepping_tone 220 48000 10)" \
  -c:v copy $AAC $MATROSKA $BITEXACT conversion-interlaced-h264.mkv
rm -r "$(dirname "$INTERLACED_VIDEO")"

ffmpeg -y -loglevel error \
  -f lavfi -i "$(frame_index_video 25 10)" -f lavfi -i "$(stepping_tone 220 48000 10)" \
  $X264 -profile:v main -g 50 -keyint_min 50 $AAC \
  $BITEXACT conversion-h264-aac.ts

ffmpeg -y -loglevel error \
  -f lavfi -i "$(frame_index_video 25 10)" -f lavfi -i "$(stepping_tone 220 48000 10)" \
  -c:v mpeg4 -q:v 4 -g 50 -keyint_min 50 -sc_threshold 0 \
  -c:a libmp3lame -b:a 48k \
  -avoid_negative_ts disabled $BITEXACT conversion-mpeg4-mp3.avi

TONE="$(stepping_tone 220 48000 8)"
ffmpeg -y -loglevel error -f lavfi -i "$TONE" -c:a libmp3lame -b:a 64k $BITEXACT conversion-tone.mp3
ffmpeg -y -loglevel error -f lavfi -i "$TONE" -c:a aac -b:a 64k $BITEXACT conversion-tone.aac
ffmpeg -y -loglevel error -f lavfi -i "$TONE" -c:a vorbis -strict experimental -b:a 64k $BITEXACT conversion-tone.ogg
ffmpeg -y -loglevel error -f lavfi -i "$TONE" -ar 16000 -sample_fmt s16 -c:a flac $BITEXACT conversion-tone.flac
ffmpeg -y -loglevel error \
  -f lavfi -i "$(stepping_tone 220 16000 6)" -ac 1 -c:a pcm_s16le $BITEXACT conversion-tone.wav

ls -l sample.mp4 sample.mkv sample.mp3 conversion-*
