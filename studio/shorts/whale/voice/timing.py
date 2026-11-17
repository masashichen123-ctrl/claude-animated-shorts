# usage: python timing.py script.txt words.json out_timing.ts
# Aligns the script (one sentence per line) to the transcript words, reports mismatches, and writes the sentence
# start times + spoken lengths that story.ts uses.
import json, re, sys, difflib
lines = [l.strip() for l in open(sys.argv[1]) if l.strip()]
words = json.load(open(sys.argv[2]))
NUM = {"1970": ["nineteen", "seventy"], "45": ["forty", "five"], "20": ["twenty"]}
def norm(w):
    w = w.lower().replace("-", " ").replace("’", "'")
    w = re.sub(r"[^a-z0-9' ]", "", w)
    out = []
    for p in w.split():
        out += NUM.get(p, [p])
    return out
sc, sent_of = [], []
for i, l in enumerate(lines):
    for w in l.split():
        for p in norm(w):
            sc.append(p); sent_of.append(i)
tr, tr_idx = [], []
for j, w in enumerate(words):
    for p in norm(w["w"]):
        tr.append(p); tr_idx.append(j)
sm = difflib.SequenceMatcher(a=sc, b=tr, autojunk=False)
amap = {}
for a, b, n in sm.get_matching_blocks():
    for k in range(n):
        amap[a + k] = b + k
miss = [(op, " ".join(sc[a1:a2]), " ".join(tr[b1:b2])) for op, a1, a2, b1, b2 in sm.get_opcodes() if op != "equal"]
print(f"script tokens {len(sc)}, transcript tokens {len(tr)}, match ratio {sm.ratio():.3f}")
for m in miss: print("  MISMATCH", m)
starts, ends = [], []
for i in range(len(lines)):
    toks = [k for k in range(len(sc)) if sent_of[k] == i and k in amap]
    assert toks, f"sentence {i+1} not found in transcript"
    starts.append(words[tr_idx[amap[toks[0]]]]["s"])
    ends.append(words[tr_idx[amap[toks[-1]]]]["e"])
total = words[-1]["e"] + 1.2
sent = [0.0] + [round(max(starts[i] - 0.12, ends[i - 1] + 0.02), 3) for i in range(1, len(lines))] + [round(total, 3)]
spoken = [round(ends[i] - sent[i], 3) for i in range(len(lines))]
for i in range(len(lines)): print(f"{i+1:2d} start {sent[i]:6.2f}  spoken {spoken[i]:5.2f}  gap {sent[i+1]-sent[i]-spoken[i]:4.2f}  {lines[i][:50]}")
open(sys.argv[3], "w").write(
    "// Measured from voice/words.json by timing.py: sentence start times (s, index 16 = end of film) and spoken lengths.\n"
    f"export const SENT_MEASURED: number[] = {json.dumps(sent)};\nexport const SPOKEN_MEASURED: number[] = {json.dumps(spoken)};\n")
