#!/bin/sh
# Prints the media URL, subtitle URL, and title for the locator given as the
# first argument. The fixture-media-source plugin asks the host to run this.
printf '{"media_url":"%s.mp4","subtitle_url":"%s.srt","title":"Fixture"}\n' "$1" "$1"
