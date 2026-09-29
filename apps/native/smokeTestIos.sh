#!/usr/bin/env bash
# Verifies that the iOS app, built for the simulator, starts on a simulated iPhone
# and keeps running.
set -euo pipefail

app_identifier="app.easyimmerse"
build_folder="$(dirname "$0")/src-tauri/gen/apple/build"

app_path="$(find "$build_folder" -name "*.app" -type d | head -n 1)"
if [ -z "$app_path" ]; then
  echo "Failed: no app was found in $build_folder."
  exit 1
fi

device="$(xcrun simctl list devices available | grep -m 1 -o -E "iPhone [^(]+" | sed 's/ *$//')"
xcrun simctl boot "$device"
xcrun simctl bootstatus "$device"
xcrun simctl install "$device" "$app_path"
xcrun simctl launch "$device" "$app_identifier"
sleep 15

# An app that has crashed is no longer listed among the running services.
if xcrun simctl spawn "$device" launchctl list | grep --quiet "$app_identifier"; then
  echo "Passed: the app is running."
else
  echo "Failed: the app is not running."
  exit 1
fi
