#!/bin/bash
# usage: scripts/merge.sh sets char light post cam   — copy each sandbox's OWNED files into src/videos/marathon (backup first)
cd "$(dirname "$0")/.."
declare -A OWN=( [sets]="build.ts paint.ts" [char]="toon.ts cast.ts cardshade.ts" [light]="world.ts lights.ts shade.ts grade.ts" [post]="ink.ts lensblur.ts Marathon.tsx" [cam]="story.ts" )
B=backup/marathon_$(date +%H%M%S); mkdir -p $B; cp src/videos/marathon/* $B/
for n in "$@"; do for f in ${OWN[$n]}; do cp -f src/videos/marathon_$n/$f src/videos/marathon/$f; echo "merged $n/$f"; done; done
