#!/usr/bin/env bash
#
# Turn the raw source media into small, web-ready files.
#
#   media/source/video/<showreel>.mp4|.mov   ->  media/web/video/
#       showreel-loop.mp4    silent, 1080p, short cut for the autoplay background
#       showreel-full.mp4    full reel with sound for the "Watch showreel" player
#       showreel-poster.jpg  still shown instantly while the loop buffers
#
#   media/source/photos/*.jpg|jpeg|png|tif   ->  media/web/photos/
#       <slug>-{800,1600,2400}.{webp,jpg}
#
# Requires ffmpeg (macOS: `brew install ffmpeg`).
#
# Why this matters: the original SHOWREELV1.mp4 is ~527 MB. A browser cannot
# start a file like that "right away", and if the MP4 index (moov atom) sits at
# the end of the file it has to download almost everything before frame one.
# The loop produced here is a few MB with `+faststart`, so it starts instantly.
#
# Usage:
#   scripts/prepare-media.sh                 # everything
#   scripts/prepare-media.sh video           # video only
#   scripts/prepare-media.sh photos          # photos only
#
# Tunables (env vars):
#   LOOP_START=0        where the background cut starts, in seconds
#   LOOP_DURATION=20    length of the background cut; 0 = whole reel
#   LOOP_HEIGHT=1080    background loop height (720 is lighter for mobile)
#   LOOP_CRF=26         background quality (higher = smaller file)
#   FULL_CRF=22         full reel quality
#   POSTER_AT=1         timestamp (s, from LOOP_START) used for the poster

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_VIDEO_DIR="$ROOT/media/source/video"
SRC_PHOTO_DIR="$ROOT/media/source/photos"
OUT_VIDEO_DIR="$ROOT/media/web/video"
OUT_PHOTO_DIR="$ROOT/media/web/photos"

LOOP_START="${LOOP_START:-0}"
LOOP_DURATION="${LOOP_DURATION:-20}"
LOOP_HEIGHT="${LOOP_HEIGHT:-1080}"
LOOP_CRF="${LOOP_CRF:-26}"
FULL_CRF="${FULL_CRF:-22}"
POSTER_AT="${POSTER_AT:-1}"
PHOTO_WIDTHS=(800 1600 2400)

command -v ffmpeg >/dev/null || { echo "ffmpeg not found (brew install ffmpeg)" >&2; exit 1; }

slugify() {
  basename "$1" | sed -E 's/\.[^.]+$//' | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/%20/-/g; s/[^a-z0-9]+/-/g; s/^-+|-+$//g'
}

prepare_video() {
  local src
  src="$(find "$SRC_VIDEO_DIR" -maxdepth 1 -type f \( -iname '*.mp4' -o -iname '*.mov' -o -iname '*.m4v' \) | head -n 1)"
  if [[ -z "$src" ]]; then
    echo "No video in $SRC_VIDEO_DIR — put SHOWREELV1.mp4 (or .mov) there." >&2
    return 1
  fi
  mkdir -p "$OUT_VIDEO_DIR"
  echo "▸ Source video: $src"

  local cut=(-ss "$LOOP_START")
  [[ "$LOOP_DURATION" != "0" ]] && cut+=(-t "$LOOP_DURATION")

  echo "▸ Background loop (${LOOP_HEIGHT}p, silent, faststart)"
  ffmpeg -hide_banner -loglevel warning -y "${cut[@]}" -i "$src" \
    -an -vf "scale=-2:${LOOP_HEIGHT}:flags=lanczos,fps=25" \
    -c:v libx264 -profile:v high -preset slow -crf "$LOOP_CRF" \
    -pix_fmt yuv420p -movflags +faststart \
    "$OUT_VIDEO_DIR/showreel-loop.mp4"

  echo "▸ Full reel (1080p, with sound, faststart)"
  ffmpeg -hide_banner -loglevel warning -y -i "$src" \
    -vf "scale=-2:1080:flags=lanczos" \
    -c:v libx264 -profile:v high -preset slow -crf "$FULL_CRF" -pix_fmt yuv420p \
    -c:a aac -b:a 160k -movflags +faststart \
    "$OUT_VIDEO_DIR/showreel-full.mp4"

  echo "▸ Poster"
  ffmpeg -hide_banner -loglevel warning -y \
    -ss "$(awk "BEGIN{print $LOOP_START + $POSTER_AT}")" -i "$src" \
    -frames:v 1 -vf "scale=-2:1080:flags=lanczos" -q:v 3 \
    "$OUT_VIDEO_DIR/showreel-poster.jpg"

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
      ffmpeg -hide_banner -loglevel error -y -i "$f" -vf "$vf" -q:v 3 \
        "$OUT_PHOTO_DIR/$slug-$w.jpg"
      ffmpeg -hide_banner -loglevel error -y -i "$f" -vf "$vf" \
        -c:v libwebp -quality 80 "$OUT_PHOTO_DIR/$slug-$w.webp"
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
