#!/bin/sh
# Prints the shared configure flags on one line, without the comment lines, so that a workflow
# can pass them to ffmpeg's configure. Carriage returns are dropped for checkouts on Windows.
set -eu
tr -d '\r' < "$(dirname "$0")/common-flags.txt" | grep -v '^#' | tr '\n' ' '
