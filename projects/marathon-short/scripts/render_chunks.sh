#!/bin/bash
# Resumable chunked render for shots that keep getting interrupted: 40-frame chunks -> out/marathon/chunks/, then joined into out/marathon/final/shot_XX.mp4
cd "$(dirname "$0")/.."
export REMOTION_TMP=$PWD/.rtmp TMPDIR=$PWD/.rtmp
R=(0 136 198 334 422 496 648 768 890 938 988 1062 1140 1228 1322 1458 1590)
mkdir -p out/marathon/chunks out/marathon/final
for s in "$@"; do
  o=out/marathon/final/shot_$(printf %02d $s).mp4; [ -f "$o" ] && continue
  a=${R[$((s-1))]}; e=$((${R[$s]}-1)); L=out/marathon/chunks/s${s}.txt; : > $L
  for ((c=a; c<=e; c+=40)); do
    d=$((c+39<e ? c+39 : e)); k=out/marathon/chunks/s${s}_$(printf %04d $c).mp4
    if [ ! -f "$k" ]; then
      echo "shot $s chunk $c-$d $(date -u +%H:%M)"
      npx remotion render src/index.tsx MarathonShort "$k.tmp.mp4" --frames=$c-$d --scale=0.5 --concurrency=4 --codec=h264 --crf=14 \
        --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
        --gl=swiftshader --props='{"post":{"dpr":0.5}}' --timeout=1200000 --muted 2>&1 | grep -E "rror" ; mv "$k.tmp.mp4" "$k"
    fi
    echo "file '$PWD/$k'" >> $L
  done
  ffmpeg -y -v error -f concat -safe 0 -i $L -c copy "$o" && echo "+ $o"
done
echo CHUNKSDONE
