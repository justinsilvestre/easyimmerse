#!/bin/sh
# Packs the sample-yomitan directory into sample-yomitan.zip, with index.json first.
set -eu

cd "$(dirname "$0")/sample-yomitan"
rm -f ../sample-yomitan.zip
zip -X9 ../sample-yomitan.zip index.json styles.css ./*_bank_*.json
zip -X9rD ../sample-yomitan.zip images
