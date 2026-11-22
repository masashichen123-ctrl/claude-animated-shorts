#!/bin/bash
# Concat shots -> upscale 540x960 to 1080x1920 (lanczos + light sharpen) -> mux the final mix (already mastered at -14 LUFS) -> out/vault/vault_premium.mp4
cd "$(dirname "$0")/.."
F=out/vault/final
ls $F/shot_*.mp4 | sort | sed "s#^#file '$PWD/#; s#\$#'#" > $F/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i $F/list.txt -c copy $F/picture_540.mp4
ffmpeg -y -loglevel error -i $F/picture_540.mp4 -i voice/mix_final.wav -map 0:v:0 -map 1:a:0 \
  -vf "scale=1080:1920:flags=lanczos,unsharp=5:5:0.45:5:5:0" -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart out/vault/vault_premium.mp4
ffprobe -v error -show_entries format=duration:stream=width,height,nb_frames -of compact out/vault/vault_premium.mp4
