# Verification for the bat short's mix: exact sample count, loudness (ffmpeg ebur128), and intelligibility - faster-whisper
# small.en transcribes voice.wav alone and the final mix; every narration word of SCRIPT.md must come through the mix
# exactly as it does on the voice alone (word-level diff). Appends a report to audio/cues.md.
# Run with the system python that has faster-whisper:  /usr/bin/python3 audio/check.py
import os
import re
import subprocess
import sys
import difflib
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MIX = os.path.join(ROOT, "public", "bat", "mix.wav")
FINAL = os.path.join(ROOT, "voice", "mix_final.wav")
NSAMP = 2640000                     # 55.000 s at 48 kHz
VOICE = os.path.join(ROOT, "voice", "voice.wav")


def pcm16k(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def norm_words(text):
    t = text.lower().replace("-", " ").replace("$2 million", "two million dollars")   # whisper's number formatting only
    t = re.sub(r"[^a-z0-9' ]+", " ", t)
    return [{"canceled": "cancelled", "airbase": "air base"}.get(x, x) for x in t.replace("airbase", "air base").split()]


def transcribe(model, path):
    segs, _ = model.transcribe(pcm16k(path), language="en", beam_size=5, word_timestamps=True, vad_filter=False,
                               condition_on_previous_text=False)
    words = []
    for s in segs:
        for w in s.words:
            words.append((w.word.strip(), round(w.start, 2), round(w.end, 2), round(w.probability, 2)))
    return words


def main():
    from faster_whisper import WhisperModel
    model = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=2)
    out = []
    w = out.append
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=duration_ts,sample_rate,channels,bits_per_sample",
                          "-of", "compact", MIX], capture_output=True, text=True).stdout.strip()
    w(f"- Mix stream: `{dur}`")
    same = open(MIX, "rb").read() == open(FINAL, "rb").read()
    ok_len = f"duration_ts={NSAMP}" in dur and "channels=2" in dur
    w(f"- exact length {NSAMP:,} samples, stereo: {'OK' if ok_len else 'FAIL'}; voice/mix_final.wav identical to public/bat/mix.wav: {'OK' if same else 'FAIL'}")
    tv = transcribe(model, VOICE)
    tm = transcribe(model, MIX)
    sv = " ".join(x[0] for x in tv)
    sm = " ".join(x[0] for x in tm)
    a, b = norm_words(sv), norm_words(sm)
    diff = [d for d in difflib.ndiff(a, b) if d[0] in "+-"]
    script = open(os.path.join(ROOT, "SCRIPT.md"), encoding="utf-8").read()
    narr = [l.split(". ", 1)[1] for l in script.split("## Narration")[1].splitlines() if re.match(r"^\d+\. ", l)]
    sw = norm_words(" ".join(narr))
    nv = set(a)
    nm = set(b)
    missing_v = [x for x in sw if x not in nv]
    missing_m = [x for x in sw if x not in nm]
    w(f"- whisper small.en (int8, cpu) on voice.wav: \"{sv}\"")
    w(f"- whisper small.en on the mix: \"{sm}\"")
    w(f"- word-level diff voice -> mix: {'IDENTICAL' if not diff else ' '.join(diff)}")
    w(f"- SCRIPT.md words not literally in the voice-only transcript (whisper writes numbers as digits): {missing_v}")
    w(f"- SCRIPT.md words not literally in the mix transcript: {missing_m}")
    for key in ("bats", "bombed", "napalm", "escaped", "perfectly", "unluckily", "cancelled", "battle"):
        pv = [float(x[3]) for x in tv if norm_words(x[0])[:1] == [key]]
        pm = [float(x[3]) for x in tm if norm_words(x[0])[:1] == [key]]
        w(f"- '{key}': voice-only probs {pv}, mix probs {pm}")
    rep = "\n".join(out)
    print(rep)
    p = os.path.join(HERE, "cues.md")
    txt = open(p, encoding="utf-8").read()
    txt = txt.split("## Verification")[0] + "## Verification\n" + rep + "\n"
    open(p, "w", encoding="utf-8").write(txt)
    return 0 if (not diff and ok_len and same) else 1


if __name__ == "__main__":
    sys.exit(main())
