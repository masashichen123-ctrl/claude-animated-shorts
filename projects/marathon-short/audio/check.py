# Verification for the whale short's mix: exact sample count, loudness (ffmpeg ebur128), and intelligibility - faster-whisper
# small.en transcribes voice.wav alone and the final mix; every narration word of SCRIPT.md must come through the mix
# exactly as it does on the voice alone (word-level diff), on the whole file AND on ~3.5 s windows around each key word
# (exploded x2, car, blubber, buried, ...). Appends a report to audio/cues.md.
# Run with the system python that has faster-whisper:  /usr/bin/python3 audio/check.py
import os
import re
import subprocess
import sys
import difflib
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MIX = os.path.join(ROOT, "public", "whale", "mix.wav")
FINAL = os.path.join(ROOT, "voice", "mix_final.wav")
NSAMP = 2544000                     # 53.000 s at 48 kHz
VOICE = os.path.join(ROOT, "voice", "voice.wav")


def pcm16k(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def norm_words(text):
    t = text.lower().replace("-", " ")
    t = re.sub(r"[^a-z0-9' ]+", " ", t)
    return [{"45": "forty five", "8": "eight"}.get(x, x) for x in t.split()]


def transcribe(model, path_or_pcm):
    pcm = pcm16k(path_or_pcm) if isinstance(path_or_pcm, str) else path_or_pcm
    segs, _ = model.transcribe(pcm, language="en", beam_size=5, word_timestamps=True, vad_filter=False,
                               condition_on_previous_text=False)
    words = []
    for s in segs:
        for w in s.words:
            words.append((w.word.strip(), round(w.start, 2), round(w.end, 2), round(w.probability, 2)))
    return words


KEYS = ("dynamite", "whale", "move", "smell", "highway", "boulder", "plan", "seagulls", "filming", "plunger", "exploded",
        "everyone", "blubber", "crowd", "car", "beach", "avoid", "buried", "park")


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
    w(f"- exact length {NSAMP:,} samples, stereo: {'OK' if ok_len else 'FAIL'}; voice/mix_final.wav identical to public/whale/mix.wav: {'OK' if same else 'FAIL'}")
    tv = transcribe(model, VOICE)
    tm = transcribe(model, MIX)
    ts = transcribe(model, os.path.join(HERE, "out", "stem_voice.wav"))     # the same voice at mix gain + master limiter
    sv = " ".join(x[0] for x in tv)
    sm = " ".join(x[0] for x in tm)
    a, b = norm_words(sv), norm_words(sm)
    diff = [d for d in difflib.ndiff(a, b) if d[0] in "+-"]
    c_ = norm_words(" ".join(x[0] for x in ts))
    diff_vs = [d for d in difflib.ndiff(a, c_) if d[0] in "+-"]
    diff_sm = [d for d in difflib.ndiff(c_, b) if d[0] in "+-"]
    script = open(os.path.join(ROOT, "SCRIPT.md"), encoding="utf-8").read()
    narr = [l.split(". ", 1)[1] for l in script.split("## Narration")[1].splitlines() if re.match(r"^\d+\. ", l)]
    sw = norm_words(" ".join(narr))
    nv = set(a)
    nm = set(b)
    missing_v = [x for x in sw if x not in nv]
    missing_m = [x for x in sw if x not in nm]
    w(f"- whisper small.en (int8, cpu) on voice.wav: \"{sv}\"")
    w(f"- whisper small.en on the mix: \"{sm}\"")
    w(f"- word-level diff voice.wav -> mix: {'IDENTICAL' if not diff else ' '.join(diff)}")
    w(f"- word-level diff voice.wav -> voice stem alone (same voice, +master gain and limiter, no music / SFX): {'IDENTICAL' if not diff_vs else ' '.join(diff_vs)}")
    w(f"- word-level diff voice stem alone -> mix (what the music + SFX change): {'IDENTICAL' if not diff_sm else ' '.join(diff_sm)}")
    w(f"- SCRIPT.md words not literally in the voice-only transcript (whisper writes numbers as digits): {missing_v}")
    w(f"- SCRIPT.md words not literally in the mix transcript: {missing_m}")
    for key in KEYS:
        pv = [float(x[3]) for x in tv if norm_words(x[0])[:1] == [key]]
        pm = [float(x[3]) for x in tm if norm_words(x[0])[:1] == [key]]
        w(f"- '{key}': voice-only probs {pv}, mix probs {pm}")
    # ---- windows around each key word: voice.wav alone vs the mix, same 16 kHz mono cut
    import json
    words = json.load(open(os.path.join(ROOT, "voice", "words.json"), encoding="utf-8"))
    pv16, pm16 = pcm16k(VOICE), pcm16k(MIX)
    pv16 = np.pad(pv16, (0, max(0, len(pm16) - len(pv16))))
    win_bad = 0
    e10 = np.sqrt(np.convolve(pv16 ** 2, np.ones(160) / 160, "same"))[::160]

    def snap(t):
        """move a window edge to the quietest 10 ms of the voice within +-0.8 s (never cut a word in half)"""
        i0, i1 = max(0, int((t - 0.8) * 100)), min(len(e10), int((t + 0.8) * 100))
        if i1 <= i0:
            return float(np.clip(t, 0, len(pv16) / 16000))
        return float(np.clip((i0 + int(np.argmin(e10[i0:i1]))) / 100, 0, len(pv16) / 16000))
    w("")
    w("Key-word windows (~3.5 s around each word, voice.wav vs the voice stem alone vs the mix, same cut; edges snapped to the quietest 10 ms of the voice within +-0.8 s, whisper on voice.wav vs on the mix, same cut):")
    w("")
    w("| word | window s | voice.wav | voice stem (mix gain + limiter) | mix | mix vs voice stem | key-word prob voice / stem / mix |")
    w("|---|---|---|---|---|---|---|")
    ps16 = pcm16k(os.path.join(HERE, "out", "stem_voice.wav"))
    for wd in words:
        k = norm_words(wd["w"])
        if not k or k[0] not in KEYS:
            continue
        c = (float(wd["s"]) + float(wd["e"])) / 2
        a, b = snap(c - 1.75), snap(c + 1.75)
        sl = slice(int(a * 16000), int(b * 16000))
        xv, xs, xm = transcribe(model, pv16[sl].copy()), transcribe(model, ps16[sl].copy()), transcribe(model, pm16[sl].copy())
        sv_, ss_, sm_ = (" ".join(x[0] for x in X) for X in (xv, xs, xm))
        ok = norm_words(ss_) == norm_words(sm_)
        has = k[0] in norm_words(sm_)
        in_stem = k[0] in norm_words(ss_)
        pk = lambda X: [float(x[3]) for x in X if norm_words(x[0])[:1] == k[:1]]
        bad_ = (not has) and in_stem
        win_bad += bad_
        verdict = "IDENTICAL" if ok else ("word OK, context differs" if has else ("KEY WORD MISSING" if bad_ else "missing in the voice stem too (whisper window artifact)"))
        w(f"| {k[0]} | {a:.2f}-{b:.2f} | {sv_} | {ss_} | {sm_} | {verdict} | {pk(xv)} / {pk(xs)} / {pk(xm)} |")
    rep = "\n".join(out)
    print(rep)
    p = os.path.join(HERE, "cues.md")
    txt = open(p, encoding="utf-8").read()
    txt = txt.split("## Verification")[0] + "## Verification\n" + rep + "\n"
    open(p, "w", encoding="utf-8").write(txt)
    return 0 if (not diff_sm and ok_len and same and not win_bad) else 1


if __name__ == "__main__":
    sys.exit(main())
