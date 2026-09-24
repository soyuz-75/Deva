#!/usr/bin/env bash
#
# Turn the raw source media into small, web-ready files.
#
#   media/source/video/<showreel>.mov|.mp4   ->  media/web/video/
#       showreel.mp4         H.264 + AAC, max 1080p, "faststart" (plays while downloading)
#       showreel-poster.jpg  still shown instantly while the video buffers
#
#   media/source/photos/*.jpg|jpeg|png|tif   ->  media/web/photos/
#       <slug>-{1000,2000}.{webp,jpg}
#
# Requires ffmpeg (macOS: `brew install ffmpeg`, or `pip install imageio-ffmpeg`).
#
# Why this matters: a video exported straight from an editor usually has its
# index (the "moov" atom) at the END of the file, so the browser must download
# the whole thing before the first frame. `-movflags +faststart` moves it to the
# front, and the re-encode keeps the file small, so the reel starts right away.
#
# Usage:
#   scripts/prepare-media.sh                 # everything
#   scripts/prepare-media.sh video           # video only
#   scripts/prepare-media.sh photos          # photos only
#
# Tunables (env vars):
#   VIDEO_SRC=path      source video (default: newest file in media/source/video)
#   MAX_HEIGHT=1080     never upscales; smaller sources keep their size
#   VIDEO_CRF=23        quality (higher = smaller file)
#   POSTER_AT=1         timestamp (s) used for the poster frame

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_VIDEO_DIR="$ROOT/media/source/video"
SRC_PHOTO_DIR="$ROOT/media/source/photos"
OUT_VIDEO_DIR="$ROOT/media/web/video"
OUT_PHOTO_DIR="$ROOT/media/web/photos"

MAX_HEIGHT="${MAX_HEIGHT:-1080}"
VIDEO_CRF="${VIDEO_CRF:-23}"
POSTER_AT="${POSTER_AT:-1}"
PHOTO_WIDTHS=(1000 2000)

FFMPEG="${FFMPEG:-$(command -v ffmpeg || true)}"
if [[ -z "$FFMPEG" ]]; then
  FFMPEG="$(python3 -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())' 2>/dev/null || true)"
fi
[[ -n "$FFMPEG" ]] || { echo "ffmpeg not found (brew install ffmpeg)" >&2; exit 1; }
ff() { "$FFMPEG" -hide_banner -loglevel error -y "$@"; }

slugify() {
  basename "$1" | sed -E 's/\.[^.]+$//' | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/%20/-/g; s/[^a-z0-9]+/-/g; s/^-+|-+$//g'
}

prepare_video() {
  local src="${VIDEO_SRC:-}"
  if [[ -z "$src" ]]; then
    src="$(ls -t "$SRC_VIDEO_DIR"/*.{mov,MOV,mp4,MP4,m4v} 2>/dev/null | head -n 1 || true)"
  fi
  if [[ -z "$src" ]]; then
    echo "No video in $SRC_VIDEO_DIR — add the showreel (.mov or .mp4) there." >&2
    return 1
  fi
  mkdir -p "$OUT_VIDEO_DIR"
  echo "▸ Source video: $src"

  echo "▸ showreel.mp4 (H.264/AAC, ≤${MAX_HEIGHT}p, faststart)"
  ff -i "$src" \
    -vf "scale=-2:'min(${MAX_HEIGHT},ih)':flags=lanczos" \
    -c:v libx264 -profile:v high -preset slow -crf "$VIDEO_CRF" -pix_fmt yuv420p \
    -c:a aac -b:a 128k -movflags +faststart \
    "$OUT_VIDEO_DIR/showreel.mp4"

  echo "▸ showreel-poster.jpg"
  ff -ss "$POSTER_AT" -i "$src" -frames:v 1 -q:v 2 "$OUT_VIDEO_DIR/showreel-poster.jpg"

  ls -lh "$OUT_VIDEO_DIR"
}

prepare_photos() {
  mkdir -p "$OUT_PHOTO_DIR"
  shopt -s nullglob nocaseglob
  local files=("$SRC_PHOTO_DIR"/*.{jpg,jpeg,png,tif,tiff})
  shopt -u nocaseglob
  if (( ${#files[@]} == 0 )); then
    echo "No photos in $SRC_PHOTO_DIR." >&2
    return 1
  fi
  for f in "${files[@]}"; do
    local slug; slug="$(slugify "$f")"
    echo "▸ $slug"
    for w in "${PHOTO_WIDTHS[@]}"; do
      local vf="scale='min($w,iw)':-2:flags=lanczos"
      ff -i "$f" -vf "$vf" -q:v 3 "$OUT_PHOTO_DIR/$slug-$w.jpg"
      ff -i "$f" -vf "$vf" -c:v libwebp -quality 80 "$OUT_PHOTO_DIR/$slug-$w.webp"
    done
  done
  echo "Note: .psd files are skipped — export them to .jpg first."
  ls -lh "$OUT_PHOTO_DIR"
}

case "${1:-all}" in
  video)  prepare_video ;;
  photos) prepare_photos ;;
  all)    prepare_video; prepare_photos ;;
  *)      echo "usage: $0 [all|video|photos]" >&2; exit 1 ;;
esac
