#!/bin/sh
# Installs an Appium driver at a pinned version into APPIUM_HOME.
# Appium refuses to install a driver that is already installed,
# so this skips a driver already at the pinned version and replaces one at any other version.
#
# Usage: scripts/install-appium-driver.sh <driver> <version>
set -eu

driver=${1:?usage: install-appium-driver.sh <driver> <version>}
version=${2:?usage: install-appium-driver.sh <driver> <version>}
cd "$(dirname "$0")/../apps/native"

installed=$(pnpm exec appium driver list --installed --json 2>/dev/null |
  node -e 'let json = ""; process.stdin.on("data", (chunk) => (json += chunk)).on("end", () => console.log(JSON.parse(json)[process.argv[1]]?.version ?? ""))' "$driver")

[ "$installed" = "$version" ] && exit 0
[ -n "$installed" ] && pnpm exec appium driver uninstall "$driver"
pnpm exec appium driver install "$driver@$version"
