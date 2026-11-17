# usage: python estimate_timing.py <slug>  -> src/videos/<slug>/timing.ts from word counts (until the voice exists)
import json, sys, os
slug = sys.argv[1]; H = os.path.dirname(os.path.abspath(__file__))
lines = [l.strip() for l in open(f"{H}/{slug}/voice/script.txt") if l.strip()]
W = [len(l.split()) for l in lines]
S = [0.0]
for i, w in enumerate(W): S.append(round(S[-1] + w / 3.7 + 0.3, 3))
S[-1] = round(S[-1] + 0.9, 3)
os.makedirs(f"{H}/../src/videos/{slug}", exist_ok=True)
open(f"{H}/../src/videos/{slug}/timing.ts", "w").write("// ESTIMATED from word counts; replaced by the measured timings once the voice exists.\n"
  f"export const SENT_MEASURED: number[] = {json.dumps(S)};\nexport const SPOKEN_MEASURED: number[] = {json.dumps([round(w / 3.7, 3) for w in W])};\n")
print(slug, len(W), "sentences", S[-1], "s")
