#!/usr/bin/env bash
# Fails unless every desktop bundle under a directory contains the ffmpeg and ffprobe sidecars and both start.
# Each bundle is unpacked the way its installer would place the files, and the sidecars run from there.
# Expects to run on the platform the bundles were built for.
#
# Usage: check-bundle-sidecars.sh <bundle-dir>
set -euo pipefail

main() {
  local bundle_dir=$1 work_dir status=0 count=0
  work_dir=$(mktemp -d)
  trap 'rm -rf "$work_dir"' EXIT
  while IFS= read -r bundle; do
    count=$((count + 1))
    echo "::group::$bundle"
    check_bundle "$bundle" "$work_dir/$count" || status=1
    echo "::endgroup::"
  done < <(find "$bundle_dir" -mindepth 2 -maxdepth 2 \( -name '*.app' -o -name '*.dmg' -o -name '*.deb' -o -name '*.rpm' -o -name '*.AppImage' -o -name '*.msi' -o -name '*-setup.exe' \))
  if [ "$count" -eq 0 ]; then
    echo "No bundles found under $bundle_dir." >&2
    exit 1
  fi
  exit $status
}

check_bundle() {
  local bundle=$1 dest=$2
  mkdir -p "$dest"
  if ! unpack "$(realpath "$bundle")" "$dest"; then
    echo "Could not unpack $bundle." >&2
    return 1
  fi
  check_sidecar "$bundle" "$dest" ffmpeg && check_sidecar "$bundle" "$dest" ffprobe
}

unpack() {
  local bundle=$1 dest=$2
  case "$bundle" in
    *.app) cp -R "$bundle" "$dest/" ;;
    *.dmg) unpack_dmg "$bundle" "$dest" ;;
    *.deb) dpkg-deb -x "$bundle" "$dest" ;;
    *.rpm) (cd "$dest" && rpm2cpio "$bundle" | cpio -idm --quiet) ;;
    *.AppImage) unpack_appimage "$bundle" "$dest" ;;
    *.msi) msiexec //a "$(cygpath -w "$bundle")" //qn "TARGETDIR=$(cygpath -w "$dest")" ;;
    *-setup.exe) 7z x -y -o"$dest" "$bundle" > /dev/null ;;
  esac
}

# Copies the disk image's contents out, so the sidecars run from a writable directory after it is detached.
unpack_dmg() {
  local mount_point
  mount_point=$(mktemp -d)
  hdiutil attach -nobrowse -readonly -mountpoint "$mount_point" "$1" > /dev/null
  cp -R "$mount_point"/*.app "$2/"
  hdiutil detach "$mount_point" > /dev/null
}

# Extracting avoids mounting the AppImage, which needs FUSE.
unpack_appimage() {
  chmod +x "$1"
  (cd "$2" && "$1" --appimage-extract > /dev/null)
}

check_sidecar() {
  local bundle=$1 dest=$2 name=$3 binary version
  binary=$(find "$dest" -type f \( -name "$name" -o -name "$name.exe" \) | head -n 1)
  if [ -z "$binary" ]; then
    echo "$bundle has no $name sidecar." >&2
    return 1
  fi
  echo "${binary#"$dest"/}"
  if ! version=$("$binary" -version); then
    echo "$bundle has a $name sidecar that does not start." >&2
    return 1
  fi
  echo "${version%%$'\n'*}"
}

main "$@"
