#!/bin/sh
# Stands in for yt-dlp in the host tests of the youtube-media-source plugin, which run
# offline. It answers the two commands the plugin runs: a description, and a download
# that copies the repository's sample video and subtitles into the requested place.
# A URL containing "unavailable" fails as yt-dlp does for a video that cannot be fetched.
fixtures="$(dirname "$0")/../../../fixtures"
url=""
for arg in "$@"; do url="$arg"; done
case "$url" in
  *unavailable*)
    echo "ERROR: [youtube] $url: Video unavailable" >&2
    exit 1
    ;;
esac
for arg in "$@"; do
  if [ "$arg" = "--skip-download" ]; then
    echo "Video $url"
    echo "12.5"
    echo "$url"
    echo '{"en": [{"url": "https://example.com/en.vtt", "ext": "vtt"}], "live_chat": [{"url": "https://example.com/chat.json", "ext": "json"}]}'
    echo '{"es-orig": [{"url": "https://example.com/es-orig.vtt", "ext": "vtt"}], "es": [{"url": "https://example.com/es.vtt", "ext": "vtt"}], "fr": [{"url": "https://example.com/fr.vtt", "ext": "vtt"}]}'
    exit 0
  fi
done
template=""
languages=""
previous=""
for arg in "$@"; do
  case "$previous" in
    -o) template="$arg" ;;
    --sub-langs) languages="$arg" ;;
  esac
  previous="$arg"
done
dir=$(dirname "$template")
cp "$fixtures/sample.mp4" "$dir/media.mp4"
echo "$dir/media.mp4"
json=""
for language in $(echo "$languages" | tr ',' ' '); do
  cp "$fixtures/sample.vtt" "$dir/media.$language.vtt"
  [ -n "$json" ] && json="$json, "
  json="$json\"$language\": {\"url\": \"https://example.com/$language.vtt\", \"ext\": \"vtt\", \"filepath\": \"$dir/media.$language.vtt\"}"
done
echo "{$json}"
