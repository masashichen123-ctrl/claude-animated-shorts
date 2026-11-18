#!/bin/bash
# Render MissileShort shot by shot (resumable): out/missile/final/shot_XX.mp4, then concat.
# usage: scripts/render_shots.sh [shot numbers...]   (default: all missing)
cd "$(dirname "$0")/.."
export REMOTION_TMP=$PWD/.rtmp TMPDIR=$PWD/.rtmp
R=(0 121 176 249 374 463 497 574 659 785 848 931 1055 1189 1267 1352)
mkdir -p out/missile/final
SHOTS=${@:-$(seq 1 15)}
for s in $SHOTS; do
  o=out/missile/final/shot_$(printf %02d $s).mp4
  [ -z "$*" ] && [ -f "$o" ] && continue
  a=${R[$((s-1))]}; b=$((${R[$s]}-1))
  echo "shot $s frames $a-$b $(date -u +%H:%M)"
  npx remotion render src/index.tsx MissileShort "$o" --frames=$a-$b --scale=0.5 --concurrency=4 --codec=h264 --crf=14 \
    --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
    --gl=swiftshader --props='{"post":{"dpr":0.5}}' --timeout=300000 --muted 2>&1 | grep -E "^\+|rror" 
done
echo ALLDONE
