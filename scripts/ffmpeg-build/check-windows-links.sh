#!/bin/sh
# Fails when a binary imports a DLL other than the ones every Windows 10 system has, since such
# a binary would not start without that DLL installed. The Visual C++ runtime DLLs are not
# allowed, because the build links the C runtime statically instead of needing the redistributable.
#
# Usage: check-windows-links.sh <binary>...
set -eu
allowed='^(kernel32|user32|advapi32|ws2_32|bcrypt|ole32|oleaut32|shell32|shlwapi|psapi|avrt|mf|mfplat|mfreadwrite|mfuuid|d3d11|dxgi|api-ms-win-crt-[a-z0-9-]+|api-ms-win-core-[a-z0-9-]+)\.dll$'
status=0
for binary in "$@"; do
  imports="$(dumpbin -nologo -dependents "$binary" | tr -d ' \r' | tr 'A-Z' 'a-z' | grep '\.dll$' || true)"
  if echo "$imports" | grep -Ev "$allowed"; then
    echo "$binary imports the DLLs above, which a Windows system may lack." >&2
    status=1
  fi
done
exit $status
