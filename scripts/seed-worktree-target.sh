#!/bin/sh
# Seeds a worktree's target directory with the dependency artifacts of another checkout,
# so that the worktree's first cargo build compiles only the workspace crates.
# The copies are APFS clones, which take no extra space until a file changes.
#
# Usage: scripts/seed-worktree-target.sh <worktree> [<source checkout>]
# The source defaults to the checkout containing this script.
set -eu

worktree=${1:?usage: seed-worktree-target.sh <worktree> [<source checkout>]}
source=${2:-$(cd "$(dirname "$0")/.." && pwd)}
mkdir -p "$worktree"
# Cargo records physical paths, so symbolic links such as /tmp are resolved first.
worktree=$(cd "$worktree" && pwd -P)

for profile in debug release; do
  from="$source/target/$profile"
  to="$worktree/target/$profile"
  [ -d "$from/deps" ] || continue
  mkdir -p "$to"
  # A build running in the source checkout may remove files during the copy.
  # Cargo rebuilds whatever is missing, so those errors are reported but not fatal.
  for part in deps build .fingerprint; do
    [ -e "$to/$part" ] && continue
    cp -c -R -p "$from/$part" "$to/$part" 2>&1 | grep -v 'No such file or directory' || true
  done
  # A build script's output directory records, in `root-output` and `output`, absolute paths
  # into the checkout where the script ran, and some crates (Tauri's among them) fail to build
  # against another checkout's paths. Removing the directory and its fingerprint makes cargo
  # rerun just that build script here.
  for root_output in "$to"/build/*/root-output; do
    [ -f "$root_output" ] || continue
    case $(cat "$root_output") in
      "$to"/*) continue ;;
    esac
    unit=$(basename "$(dirname "$root_output")")
    rm -rf "$to/build/$unit" "$to/.fingerprint/$unit"
  done
  echo "seeded $to from $from"
done
