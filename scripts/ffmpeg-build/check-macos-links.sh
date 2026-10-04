#!/bin/sh
# Fails when a binary links a library outside /System/Library and /usr/lib, since such a binary
# would not start on a Mac without that library installed, for example through Homebrew.
#
# Usage: check-macos-links.sh <binary>...
set -eu
status=0
for binary in "$@"; do
  if otool -L "$binary" | tail -n +2 | grep -Ev '^[[:space:]]+(/System/Library/|/usr/lib/)'; then
    echo "$binary links the libraries above, which a Mac may lack." >&2
    status=1
  fi
done
exit $status
