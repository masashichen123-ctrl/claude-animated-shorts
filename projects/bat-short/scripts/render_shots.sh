#!/bin/bash
# Render BatShort shot by shot (resumable): out/bat/final/shot_XX.mp4, then concat.
# usage: scripts/render_shots.sh [shot numbers...]   (default: all missing)
cd "$(dirname "$0")/.."
export REMOTION_TMP=$PWD/.rtmp TMPDIR=$PWD/.rtmp
R=(0 121 157 305 389 450 602 695 825 937 1135 1201 1270 1382 1504 1656 1694 1770)
mkdir -p out/bat/final
SHOTS=${@:-$(seq 1 17)}
for s in $SHOTS; do
  o=out/bat/final/shot_$(printf %02d $s).mp4
  [ -z "$*" ] && [ -f "$o" ] && continue
  a=${R[$((s-1))]}; b=$((${R[$s]}-1))
  echo "shot $s frames $a-$b $(date -u +%H:%M)"
  npx remotion render src/index.tsx BatShort "$o" --frames=$a-$b --scale=0.5 --concurrency=4 --codec=h264 --crf=14 \
    --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
    --gl=swiftshader --props='{"post":{"dpr":0.5}}' --timeout=1200000 --muted 2>&1 | grep -E "^\+|rror" 
done
echo ALLDONE
