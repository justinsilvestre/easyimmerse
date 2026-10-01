#!/usr/bin/env bash
# Prints a hash of the tracked files that a workflow's pull_request path filter selects.
# Usage: hashInputs.sh <workflow file>
set -euo pipefail

workflow=$1
# Command substitution, unlike process substitution, lets set -e stop the script when yq fails.
included="$(yq '(.on.pull_request.paths // [])[]' "$workflow")"
excluded="$(yq '(.on.pull_request.paths-ignore // [])[]' "$workflow")"

pathspecs=()
while IFS= read -r pattern; do
  if [ -n "$pattern" ]; then pathspecs+=(":(glob)$pattern"); fi
done <<< "$included"
while IFS= read -r pattern; do
  if [ -n "$pattern" ]; then pathspecs+=(":(glob,exclude)$pattern"); fi
done <<< "$excluded"

# Each line holds a file's mode, blob hash, and path, so the hash changes when any selected file does.
stage="$(git ls-files --stage -- "${pathspecs[@]}")"
if [ -z "$stage" ]; then
  echo "The path filter in $workflow selects no tracked files." >&2
  exit 1
fi
git hash-object --stdin <<< "$stage"
