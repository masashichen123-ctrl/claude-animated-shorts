#!/bin/bash
# usage: render.sh <slug> <CompositionId> [scale]  -> out/<slug>/<slug>.mp4 (half resolution by default) with the mix
set -e
SLUG=$1; COMP=$2; SC=${3:-0.5}; cd /home/user/claude-animated-shorts/studio; mkdir -p out/$SLUG
DPR=$([ "$SC" = "0.5" ] && echo '{"post":{"dpr":0.5}}' || echo '{}')
npx remotion render src/index.ts $COMP out/$SLUG/${SLUG}_silent.mp4 --scale $SC --props "$DPR" --gl swangle --browser-executable /opt/pw-browsers/chromium --concurrency 4 --crf 20 --timeout 180000 --log error
ffmpeg -hide_banner -loglevel error -y -i out/$SLUG/${SLUG}_silent.mp4 -i shorts/$SLUG/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest out/$SLUG/$SLUG.mp4
ffprobe -v error -count_frames -show_entries stream=codec_type,nb_read_frames:format=duration -of compact out/$SLUG/$SLUG.mp4
