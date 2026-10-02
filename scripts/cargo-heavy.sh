#!/bin/sh
# Runs a cold or workspace-wide cargo command while holding a machine-wide lock,
# so that only one such job runs at a time. Incremental builds of one crate need no lock.
# The lock names the process that holds it, so a lock left by a killed process is reclaimed.
#
# Usage: scripts/cargo-heavy.sh cargo test --workspace
set -u

lock=${CARGO_HEAVY_LOCK:-/tmp/easyimmerse-cargo-heavy.lock}

until shlock -f "$lock" -p $$; do
  echo "waiting for the cargo-heavy lock held by process $(cat "$lock" 2>/dev/null)"
  sleep 20
done
trap 'rm -f "$lock"' EXIT INT TERM

# A serialized job may use every core; the concurrent per-crate builds are the ones capped.
CARGO_BUILD_JOBS=$(sysctl -n hw.ncpu) nice -n 10 "$@"
