# usage: python words.py in.wav out.json  -> [{"w": word, "s": start, "e": end}, ...] + prints the transcript
import json, sys
from faster_whisper import WhisperModel
m = WhisperModel("Systran/faster-whisper-small", device="cpu", compute_type="int8", cpu_threads=4)
segs, info = m.transcribe(sys.argv[1], language="en", word_timestamps=True, beam_size=5, vad_filter=False)
out = []
for s in segs:
    for w in s.words:
        out.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)})
json.dump(out, open(sys.argv[2], "w"), indent=0)
print(" ".join(x["w"] for x in out))
print(len(out), "words; low-confidence:", [(x["w"], x["s"]) for x in out if x["p"] < 0.5])
