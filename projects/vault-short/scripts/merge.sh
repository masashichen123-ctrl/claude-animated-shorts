#!/bin/bash
# usage: scripts/merge.sh sets char light post cam   — copy each sandbox's OWNED files into src/videos/vault (backup first)
cd "$(dirname "$0")/.."
declare -A OWN=( [sets]="build.ts paint.ts" [char]="toon.ts cast.ts cardshade.ts" [light]="world.ts lights.ts shade.ts grade.ts" [post]="ink.ts lensblur.ts Vault.tsx" [cam]="story.ts" )
B=backup/vault_$(date +%H%M%S); mkdir -p $B; cp src/videos/vault/* $B/
for n in "$@"; do for f in ${OWN[$n]}; do cp -f src/videos/vault_$n/$f src/videos/vault/$f; echo "merged $n/$f"; done; done
