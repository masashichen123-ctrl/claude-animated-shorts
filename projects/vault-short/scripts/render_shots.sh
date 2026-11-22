#!/bin/bash
# Render VaultShort shot by shot (resumable): out/vault/final/shot_XX.mp4, then concat.
# usage: scripts/render_shots.sh [shot numbers...]   (default: all missing)
cd "$(dirname "$0")/.."
export REMOTION_TMP=$PWD/.rtmp TMPDIR=$PWD/.rtmp
R=(0 198 300 389 469 618 715 817 937 1072 1223 1301 1489 1570 1770)
mkdir -p out/vault/final
SHOTS=${@:-$(seq 1 14)}
for s in $SHOTS; do
  o=out/vault/final/shot_$(printf %02d $s).mp4
  [ -z "$*" ] && [ -f "$o" ] && continue
  a=${R[$((s-1))]}; b=$((${R[$s]}-1))
  echo "shot $s frames $a-$b $(date -u +%H:%M)"
  npx remotion render src/index.tsx VaultShort "$o" --frames=$a-$b --scale=0.5 --concurrency=4 --codec=h264 --crf=14 \
    --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
    --gl=swiftshader --props='{"post":{"dpr":0.5}}' --timeout=1200000 --muted 2>&1 | grep -E "^\+|rror" 
done
echo ALLDONE
