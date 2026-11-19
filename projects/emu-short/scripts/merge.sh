#!/bin/bash
# usage: scripts/merge.sh sets char light post cam   — copy each sandbox's OWNED files into src/videos/emu (backup first)
cd "$(dirname "$0")/.."
declare -A OWN=( [sets]="build.ts paint.ts" [char]="toon.ts cast.ts cardshade.ts" [light]="world.ts lights.ts shade.ts grade.ts" [post]="ink.ts lensblur.ts Emu.tsx" [cam]="story.ts" )
B=backup/emu_$(date +%H%M%S); mkdir -p $B; cp src/videos/emu/* $B/
for n in "$@"; do for f in ${OWN[$n]}; do cp -f src/videos/emu_$n/$f src/videos/emu/$f; echo "merged $n/$f"; done; done
