#!/bin/bash
# Resumable chunked render for shots that keep getting interrupted: 40-frame chunks -> out/bat/chunks/, then joined into out/bat/final/shot_XX.mp4
cd "$(dirname "$0")/.."
export REMOTION_TMP=$PWD/.rtmp TMPDIR=$PWD/.rtmp
R=(0 121 157 305 389 450 602 695 825 937 1135 1201 1270 1382 1504 1656 1694 1770)
mkdir -p out/bat/chunks out/bat/final
for s in "$@"; do
  o=out/bat/final/shot_$(printf %02d $s).mp4; [ -f "$o" ] && continue
  a=${R[$((s-1))]}; e=$((${R[$s]}-1)); L=out/bat/chunks/s${s}.txt; : > $L
  for ((c=a; c<=e; c+=40)); do
    d=$((c+39<e ? c+39 : e)); k=out/bat/chunks/s${s}_$(printf %04d $c).mp4
    if [ ! -f "$k" ]; then
      echo "shot $s chunk $c-$d $(date -u +%H:%M)"
      npx remotion render src/index.tsx BatShort "$k.tmp.mp4" --frames=$c-$d --scale=0.5 --concurrency=4 --codec=h264 --crf=14 \
        --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
        --gl=swiftshader --props='{"post":{"dpr":0.5}}' --timeout=1200000 --muted 2>&1 | grep -E "rror" ; mv "$k.tmp.mp4" "$k"
    fi
    echo "file '$PWD/$k'" >> $L
  done
  ffmpeg -y -v error -f concat -safe 0 -i $L -c copy "$o" && echo "+ $o"
done
echo CHUNKSDONE
