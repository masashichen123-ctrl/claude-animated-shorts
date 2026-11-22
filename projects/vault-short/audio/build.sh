#!/bin/bash
# One command for the whole soundtrack of "Chicago Lifts a Hotel": render music + SFX, mix, master, write stems and
# cues.md, then verify (ffmpeg loudness is inside mix.py; whisper intelligibility check appends to cues.md).
set -e
cd "$(dirname "$0")/.."
nice python3 audio/mix.py --fresh
nice /usr/bin/python3 audio/check.py
