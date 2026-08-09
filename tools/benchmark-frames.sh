#!/usr/bin/env bash
# Pull inspection frames out of the exact rendered file, one per shot plus the
# frames either side of every cut. Contact sheets hide detail; these are full
# resolution stills meant to be looked at one at a time.
set -euo pipefail
VIDEO="${1:-benchmark/what-if-episode1-hook-benchmark.mp4}"
OUT="${2:-benchmark/frames}"
shift 2 || true
STAMPS=("$@")
if [ ${#STAMPS[@]} -eq 0 ]; then
  STAMPS=(1.8 3.55 3.75 5.4 7.25 7.5 9.4 10.65 10.9 12.2 13.05 13.3 14.9 15.75 16.4 17.6 18.85 20.4 21.85 22.6 24.6 25.55 26.9 27.9)
fi
rm -rf "$OUT"; mkdir -p "$OUT"
for stamp in "${STAMPS[@]}"; do
  ffmpeg -v error -ss "$stamp" -i "$VIDEO" -frames:v 1 -q:v 2 "$OUT/t$(printf '%06.2f' "$stamp").png" -y
done
ls -1 "$OUT"
