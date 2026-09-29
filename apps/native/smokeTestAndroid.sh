#!/usr/bin/env bash
# Verifies that the Android app starts on the connected device or emulator,
# and that its user interface is loaded.
#
# Usage: smokeTestAndroid.sh <path of the APK file>
set -euo pipefail

apk_path="$1"
app_identifier="app.easyimmerse"
attempts_count=60

adb install -r "$apk_path"
adb logcat -c
adb shell monkey -p "$app_identifier" -c android.intent.category.LAUNCHER 1

# The user interface writes this message to the log once it has started.
for _ in $(seq "$attempts_count"); do
  if adb logcat -d | grep --quiet "easyImmerse has started"; then
    echo "Passed: the user interface has started."
    exit 0
  fi
  sleep 2
done

echo "Failed: the user interface has not started."
adb logcat -d | tail -n 200
exit 1
