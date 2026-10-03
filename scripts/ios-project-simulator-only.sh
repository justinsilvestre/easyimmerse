#!/bin/sh
# Restricts the generated Xcode project to the simulator platform, for Intel Macs.
# On an Intel host the Tauri CLI archives a simulator build with a named simulator destination,
# which Xcode 16 answers by archiving for a device instead, where x86_64 is excluded.
# With the simulator as the only supported platform, Xcode archives for the simulator.
# The project under gen/apple is generated and gitignored, so this is applied after `tauri ios init`.
#
# Usage: scripts/ios-project-simulator-only.sh
set -eu

project=apps/native/src-tauri/gen/apple/easyimmerse-native.xcodeproj/project.pbxproj

if grep -q 'SUPPORTED_PLATFORMS = iphonesimulator;' "$project"; then
  exit 0
fi
sed -i '' 's/^\([[:space:]]*\)SDKROOT = iphoneos;/\1SDKROOT = iphoneos;\
\1SUPPORTED_PLATFORMS = iphonesimulator;/' "$project"
echo "restricted $project to the simulator platform"
