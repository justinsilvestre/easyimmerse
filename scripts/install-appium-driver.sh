#!/bin/sh
# Installs one Appium driver at a pinned version into the repository's Appium home,
# replacing another version and leaving an already matching install alone,
# since Appium refuses to install over an installed driver.
#
# Usage: scripts/install-appium-driver.sh xcuitest 12.14.0
set -eu

name=$1
version=$2

appium() {
  pnpm --filter @easyimmerse/native exec appium "$@"
}

installed=$(appium driver list --installed --json 2>/dev/null |
  node -e "let text = ''; process.stdin.on('data', (chunk) => { text += chunk; }).on('end', () => { console.log(JSON.parse(text)['$name']?.version ?? ''); });")

if [ "$installed" = "$version" ]; then
  echo "Appium driver $name@$version is already installed"
  exit 0
fi
if [ -n "$installed" ]; then
  appium driver uninstall "$name"
fi
appium driver install "$name@$version"
