#!/usr/bin/env bash
# Exit on error
set -o errexit

npm install

# Store/pull Chrome from Render cache directory
mkdir -p "$PUPPETEER_CACHE_DIR"

echo '==> Downloading Chrome for Puppeteer...'
npx puppeteer browsers install chrome || true