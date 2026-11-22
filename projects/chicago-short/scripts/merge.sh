#!/bin/bash
# usage: scripts/merge.sh sets char light post cam   — copy each sandbox's OWNED files into src/videos/chicago (backup first)
cd "$(dirname "$0")/.."
declare -A OWN=( [sets]="build.ts paint.ts" [char]="toon.ts cast.ts cardshade.ts" [light]="world.ts lights.ts shade.ts grade.ts" [post]="ink.ts lensblur.ts Chicago.tsx" [cam]="story.ts" )
B=backup/chicago_$(date +%H%M%S); mkdir -p $B; cp src/videos/chicago/* $B/
for n in "$@"; do for f in ${OWN[$n]}; do cp -f src/videos/chicago_$n/$f src/videos/chicago/$f; echo "merged $n/$f"; done; done
