#!/bin/sh
# Fails when a binary links a shared library other than the ones every glibc system has, since
# such a binary would not start on a machine without that library installed.
#
# Usage: check-linux-links.sh <binary>...
set -eu
allowed='^\s*(linux-vdso|ld-linux-[a-z0-9-]*|libc|libm|libpthread|libdl|librt)\.so'
status=0
for binary in "$@"; do
  if ldd "$binary" | grep -Ev "$allowed" | grep -Ev '^\s*/lib.*/ld-linux'; then
    echo "$binary links the libraries above, which a Linux system may lack." >&2
    status=1
  fi
done
exit $status
