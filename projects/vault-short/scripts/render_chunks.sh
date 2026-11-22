#!/bin/bash
# Resumable chunked render for shots that keep getting interrupted: 40-frame chunks -> out/vault/chunks/, then joined into out/vault/final/shot_XX.mp4
cd "$(dirname "$0")/.."
export REMOTION_TMP=$PWD/.rtmp TMPDIR=$PWD/.rtmp
R=(0 198 300 389 469 618 715 817 937 1072 1223 1301 1489 1570 1770)
mkdir -p out/vault/chunks out/vault/final
for s in "$@"; do
  o=out/vault/final/shot_$(printf %02d $s).mp4; [ -f "$o" ] && continue
  a=${R[$((s-1))]}; e=$((${R[$s]}-1)); L=out/vault/chunks/s${s}.txt; : > $L
  for ((c=a; c<=e; c+=40)); do
    d=$((c+39<e ? c+39 : e)); k=out/vault/chunks/s${s}_$(printf %04d $c).mp4
    if [ ! -f "$k" ]; then
      echo "shot $s chunk $c-$d $(date -u +%H:%M)"
      npx remotion render src/index.tsx VaultShort "$k.tmp.mp4" --frames=$c-$d --scale=0.5 --concurrency=4 --codec=h264 --crf=14 \
        --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
        --gl=swiftshader --props='{"post":{"dpr":0.5}}' --timeout=1200000 --muted 2>&1 | grep -E "rror" ; mv "$k.tmp.mp4" "$k"
    fi
    echo "file '$PWD/$k'" >> $L
  done
  ffmpeg -y -v error -f concat -safe 0 -i $L -c copy "$o" && echo "+ $o"
done
echo CHUNKSDONE
