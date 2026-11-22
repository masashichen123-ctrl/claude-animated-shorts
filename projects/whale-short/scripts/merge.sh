#!/bin/bash
# usage: scripts/merge.sh sets char light post cam   — copy each sandbox's OWNED files into src/videos/whale (backup first)
cd "$(dirname "$0")/.."
declare -A OWN=( [sets]="build.ts paint.ts" [char]="toon.ts cast.ts cardshade.ts" [light]="world.ts lights.ts shade.ts grade.ts" [post]="ink.ts lensblur.ts Whale.tsx" [cam]="story.ts" )
B=backup/whale_$(date +%H%M%S); mkdir -p $B; cp src/videos/whale/* $B/
for n in "$@"; do for f in ${OWN[$n]}; do cp -f src/videos/whale_$n/$f src/videos/whale/$f; echo "merged $n/$f"; done; done
