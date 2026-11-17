#!/bin/bash
# usage: make_voice.sh <slug>  -> shorts/<slug>/voice/{voice.wav,words.json,timing.ts}; narrator profile b93c074d, +2 semitones
set -e
SLUG=$1; D=/home/user/claude-animated-shorts/studio/shorts/$SLUG/voice; PY=/home/user/debpalash/voicestudio/.venv/bin/python
TOOLS=/home/user/claude-animated-shorts/studio/shorts/whale/voice
cd $D
python3 -I -c "
import json
t=' '.join(l.strip() for l in open('script.txt') if l.strip())
json.dump({'model':'voxcpm2','voice':'b93c074d','input':t,'response_format':'wav','seed':${SEED:-22}}, open('req.json','w'))"
curl -s --noproxy '*' -m 3000 -o raw.wav -w "$SLUG http %{http_code} %{time_total}s\n" http://127.0.0.1:3900/v1/audio/speech -H 'Content-Type: application/json' --data-binary @req.json
head -c 4 raw.wav | grep -q RIFF || { head -c 300 raw.wav; exit 1; }
ffmpeg -hide_banner -loglevel error -y -i raw.wav -af "rubberband=pitch=1.12246:formant=preserved:pitchq=quality" -ar 48000 -ac 1 -c:a pcm_s16le voice.wav
$PY -I $TOOLS/words.py voice.wav words.json 2>&1 | grep -v Warning | tail -1
python3 -I $TOOLS/timing.py script.txt words.json timing.ts | head -3
