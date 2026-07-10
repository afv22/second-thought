#!/usr/bin/env bash
# Assembles loadable extension bundles in dist/firefox and dist/chrome:
#   dist/<browser>/manifest.json, background.js, shared/
set -euo pipefail
cd "$(dirname "$0")"

for browser in firefox chrome; do
  rm -rf "dist/$browser"
  mkdir -p "dist/$browser"
  cp -R src/shared "dist/$browser/shared"
  cp src/"$browser"/* "dist/$browser/"
done

echo "Built dist/firefox and dist/chrome"
