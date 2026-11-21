#!/bin/bash
# usage: scripts/merge.sh sets char light post cam   — copy each sandbox's OWNED files into src/videos/bat (backup first)
cd "$(dirname "$0")/.."
declare -A OWN=( [sets]="build.ts paint.ts" [char]="toon.ts cast.ts cardshade.ts" [light]="world.ts lights.ts shade.ts grade.ts" [post]="ink.ts lensblur.ts Bat.tsx" [cam]="story.ts" )
B=backup/bat_$(date +%H%M%S); mkdir -p $B; cp src/videos/bat/* $B/
for n in "$@"; do for f in ${OWN[$n]}; do cp -f src/videos/bat_$n/$f src/videos/bat/$f; echo "merged $n/$f"; done; done
