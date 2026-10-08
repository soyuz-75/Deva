#!/usr/bin/env bash
# Copy the publishable files into dist/ (what Netlify serves).
# Originals in media/source/ stay out of the deploy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$ROOT/dist"
mkdir -p "$ROOT/dist/media"
cp "$ROOT"/index.html "$ROOT"/works.html "$ROOT"/photos.html "$ROOT/dist/"
cp -r "$ROOT/assets" "$ROOT/dist/assets"
cp -r "$ROOT/media/web" "$ROOT/dist/media/web"
du -sh "$ROOT/dist"
