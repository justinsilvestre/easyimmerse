#!/bin/sh
# Stands in for yt-dlp in the host tests of the youtube-media-source plugin, which run
# offline. It answers the three commands the plugin runs: the version, a description, and
# a download that copies the repository's sample video and subtitles into the requested
# place while printing progress lines as yt-dlp does. A URL containing "unavailable" fails
# as yt-dlp does for a video it cannot fetch; one containing "nosubs" describes a video
# without subtitles, for which yt-dlp leaves the subtitle fields out of its report.
fixtures="$(dirname "$0")/../../../fixtures"
url=""
for arg in "$@"; do url="$arg"; done
if [ "$1" = "--version" ]; then
  echo "2026.08.19"
  exit 0
fi
case "$url" in
  *unavailable*)
    echo "ERROR: [youtube] $url: Video unavailable" >&2
    exit 1
    ;;
esac
for arg in "$@"; do
  if [ "$arg" = "--skip-download" ]; then
    echo "[youtube] Extracting URL: $url"
    case "$url" in
      *nosubs*)
        echo "{\"title\": \"Video $url\", \"duration\": 12.5, \"webpage_url\": \"$url\"}"
        ;;
      *)
        echo "{\"title\": \"Video $url\", \"duration\": 12.5, \"webpage_url\": \"$url\", \"subtitles\": {\"en\": [{\"url\": \"https://example.com/en.vtt\", \"ext\": \"vtt\"}], \"live_chat\": [{\"url\": \"https://example.com/chat.json\", \"ext\": \"json\"}]}, \"automatic_captions\": {\"es-orig\": [{\"url\": \"https://example.com/es-orig.vtt\", \"ext\": \"vtt\"}], \"es\": [{\"url\": \"https://example.com/es.vtt\", \"ext\": \"vtt\"}], \"fr\": [{\"url\": \"https://example.com/fr.vtt\", \"ext\": \"vtt\"}]}}"
        ;;
    esac
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
echo "[download]  50.0% of   47.68KiB at   10.00MiB/s ETA 00:00"
cp "$fixtures/sample.mp4" "$dir/media.mp4"
echo "[download] 100% of   47.68KiB in 00:00:00 at 14.64MiB/s"
json=""
for language in $(echo "$languages" | tr ',' ' '); do
  cp "$fixtures/sample.vtt" "$dir/media.$language.vtt"
  [ -n "$json" ] && json="$json, "
  json="$json\"$language\": {\"url\": \"https://example.com/$language.vtt\", \"ext\": \"vtt\", \"filepath\": \"$dir/media.$language.vtt\"}"
done
if [ -n "$json" ]; then
  echo "{\"filepath\": \"$dir/media.mp4\", \"requested_subtitles\": {$json}}"
else
  echo "{\"filepath\": \"$dir/media.mp4\"}"
fi
