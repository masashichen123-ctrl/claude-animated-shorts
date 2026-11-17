# Shared sound for every short: original music (no ending sting), ambience per shot, effects from the film's cue sheet,
# whooshes on cuts and glides, the narration cleaned up (rumble cut, presence lift, sentences levelled) and ducking the
# music. Mix: voice on top, music ~12 dB under, effects under that; -15 LUFS, soft-limited below -1.5 dBFS.
# usage: python sound_kit.py <slug>      (reads shorts/<slug>/voice/{voice.wav,words.json}, shorts/<slug>/cues.json)
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "templates", "audio"))
from dsp import SR, ns, tt, rng, lp, hp, bp, peq, shelf, colored, smooth_noise, pan, st, place, read_wav, write_wav, integrated  # noqa: E402
import instruments as I  # noqa: E402
import sfx_gen as X  # noqa: E402

slug = sys.argv[1]
D = os.path.join(HERE, slug)
cue = json.load(open(os.path.join(D, "cues.json")))
FPS = 30
TOTAL = cue["TOTAL"]; DUR = TOTAL / FPS; N = ns(DUR)
SENT, SPOKEN = cue["SENT"], cue["SPOKEN"]
sec = lambda f: f / FPS
seed = sum(map(ord, slug))
R, S = rng(seed), rng(seed + 1)

# ---------------- voice ----------------
v, vsr = read_wav(os.path.join(D, "voice", "voice.wav"))
assert vsr == SR, f"voice must be {SR} Hz"
v = np.asarray(v, float); v = v.mean(0) if v.ndim > 1 else v
v = hp(v, 85, order=4); v = peq(v, 280, -2.5, q=0.9); v = peq(v, 3200, 3.5, q=0.8); v = shelf(v, 9000, 2.0, kind="high")
act = lambda x: np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2)) if np.any(np.abs(x) > 0.01) else None
lv = [act(v[ns(SENT[i]):ns(SENT[i] + SPOKEN[i])]) for i in range(len(SPOKEN))]
ref = float(np.median([x for x in lv if x]))
gains = np.zeros(len(v))
for i, x in enumerate(lv):
    if x: gains[ns(SENT[i]):min(len(v), ns(SENT[i + 1]))] = np.clip(20 * np.log10(ref / x), -6, 6)
k = int(0.15 * SR); gains = np.convolve(np.pad(gains, (k, k), mode="edge"), np.ones(k) / k, mode="same")[k:-k]
v = v * 10 ** (gains / 20)
voice = np.zeros((2, N)); place(voice, v, 0.0)
words = json.load(open(os.path.join(D, "voice", "words.json")))

# ---------------- music ----------------
mu = cue.get("music", {})
KEY = mu.get("key", 0); Q = 60 / mu.get("tempo", 104); MOOD = mu.get("mood", "sneaky"); MV = mu.get("vel", 0.65)
m2f = lambda m: I.m2f(m + KEY)
music = np.zeros((2, N))
LOOPS = {
    "sneaky": ([41, 48, 45, 48, 46, 53, 48, 52], [(0, 77), (1.5, 76), (2, 74), (3, 72), (4, 74), (5.5, 72), (6, 70), (7, 69)]),
    "bouncy": ([41, 45, 48, 45, 43, 47, 50, 47], [(0, 72), (0.5, 74), (1, 77), (2, 76), (3, 72), (4, 74), (4.5, 76), (5, 79), (6, 77), (7, 74)]),
    "march": ([41, 48, 41, 48, 46, 53, 48, 43], [(0, 72), (1, 72), (1.5, 74), (2, 76), (3, 72), (4, 77), (5, 76), (6, 74), (7, 72)]),
    "grand": ([41, 41, 46, 46, 43, 43, 48, 48], [(0, 69), (2, 72), (4, 74), (6, 72)]),
}
BASS, MEL = LOOPS[MOOD]
def loop(t0, t1, vel):
    b = 0
    while t0 + b * Q < t1 - 0.05:
        t = t0 + b * Q
        if MOOD == "march":
            place(music, pan(I.brass(m2f(BASS[b % 8] - 12), Q * 0.8, vel=0.6 * vel, r=R, kind="tuba"), -0.2), t)
            place(music, pan(I.snare(vel=0.3 * vel, r=R, dur=0.2, tune=1.2), 0.3), t + (Q / 2 if b % 2 else 0))
        else:
            place(music, pan(I.pluck(m2f(BASS[b % 8]), vel=0.9 * vel, r=R, dur=0.7, bright=0.35), -0.2), t)
            if b % 2 == 1: place(music, pan(I.snare(vel=0.18 * vel, r=R, dur=0.12, tune=1.6, snappy=0.4), 0.3), t)
        if MOOD == "grand" and b % 8 == 0:
            place(music, I.pad([m2f(53), m2f(57), m2f(60)], 8 * Q, vel=0.35 * vel, r=R, att=0.4, rel=0.6), t)
        for bt, m in MEL:
            tb = t0 + (b - b % 8 + bt) * Q
            if int(bt) == b % 8 and tb < t1 - 0.05:
                inst = I.glock(m2f(m), vel=0.42 * vel, r=R, dur=1.2) if MOOD != "march" else I.fife(m2f(m), Q * 0.45, vel=0.35 * vel, r=R)
                place(music, pan(inst, 0.25), tb)
        b += 1
stops = [(sec(a), sec(b)) for a, b in cue.get("musicStops", [])]
edges = [0.4] + [x for ab in stops for x in ab] + [DUR - 1.6]
for a, b in zip(edges[::2], edges[1::2]):
    if b - a > 1.0: loop(a, b, MV)
place(music, pan(I.brass(m2f(53), 0.35, vel=0.5, r=R, kind="tuba"), -0.1), 0.05)  # opening note

# ---------------- ambience ----------------
sfx = np.zeros((2, N))
def amb(kind, a, b):
    d = b - a
    if d <= 0.05: return
    if kind == "beach":
        x = X.breeze(d, S, level=0.6, bright=700) * 0.5 + st(hp(lp(colored(ns(d), S, 0.9), 900), 60) * (0.5 + 0.5 * smooth_noise(ns(d), S, 0.12)) * 0.35)
    elif kind in ("city", "street"):
        x = st(lp(colored(ns(d), S, 1.2), 500) * (0.6 + 0.4 * smooth_noise(ns(d), S, 0.2)) * (0.5 if kind == "city" else 0.3))
    elif kind == "field":
        x = X.breeze(d, S, level=0.55, bright=900) * 0.5 + st(X.bird_chirps(d, S, density=0.4) * 0.25)
    elif kind == "room":
        x = st(lp(colored(ns(d), S, 1.5), 300) * 0.08)
    elif kind == "space":
        x = st(lp(colored(ns(d), S, 2.0), 160) * 0.18 + 0.03 * np.sin(2 * np.pi * 55 * tt(d)))
    elif kind == "river":
        x = X.water_bed(d, S, close=0.6) * 0.4
    elif kind == "night":
        x = st(X.crickets(d, S) * 0.3)
    else:
        return
    x = st(x).copy(); f = min(ns(0.15), x.shape[1] // 2)
    x[:, :f] *= np.linspace(0, 1, f); x[:, -f:] *= np.linspace(1, 0, f)
    place(sfx, x, a)
for s in cue["shots"]:
    amb(s["amb"], sec(s["a"]), sec(s["b"]))

# ---------------- effects ----------------
def tone(f0, f1, d, shape=0.15):
    x = tt(d); f = np.linspace(f0, f1, len(x)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / shape)
def boom(g):
    d = 3.5; t = tt(d)
    y = np.sin(2 * np.pi * (38 + 60 * np.exp(-t / 0.08)) * t) * np.exp(-t / 0.9) + lp(colored(ns(d), S, 1.0), 400) * np.exp(-t / 0.6) * 0.8
    return st(y + hp(colored(ns(d), S, 0.0), 1500) * np.exp(-t / 0.12) * 0.5) * 1.3 * g
def noise_hit(lo, hi, tau, d=0.6, slope=0.3):
    x = tt(d); return bp(colored(ns(d), S, slope), lo, hi) * np.exp(-x / tau)
def seqm(items):
    """[(offset_s, mono or stereo sound), ...] -> one stereo buffer"""
    L = max(ns(o) + np.asarray(x).shape[-1] for o, x in items)
    out = np.zeros((2, L))
    for o, x in items: place(out, x, o)
    return out
def gull():
    d = 0.5; x = tt(d); f = 1900 + 900 * np.sin(np.pi * x / d) - 700 * x / d
    e = np.exp(-((x - 0.18) / 0.15) ** 2); return bp(np.sin(2 * np.pi * np.cumsum(f) / SR) * e, 900, 5000) * 0.18
FX = {
    "boom": lambda e: boom(e.get("gain", 1)),
    "thud": lambda e: st(np.sin(2 * np.pi * 70 * tt(0.5)) * np.exp(-tt(0.5) / 0.09) + noise_hit(80, 600, 0.05, 0.5) * 0.6),
    "crunch": lambda e: st(noise_hit(150, 4000, 0.18, 1.2, 0.4) + np.sin(2 * np.pi * 60 * tt(1.2)) * np.exp(-tt(1.2) / 0.25) * 0.9),
    "splat": lambda e: st(noise_hit(200, 2200, 0.06, 0.35) + np.sin(2 * np.pi * 95 * tt(0.35)) * np.exp(-tt(0.35) / 0.05) * 0.6) * 0.6,
    "click": lambda e: st(noise_hit(2000, 8000, 0.006, 0.06) * 0.6),
    "ding": lambda e: st(I.glock(I.m2f(84), vel=0.5, r=R, dur=1.4)),
    "bell": lambda e: st(I.vibes(I.m2f(72), vel=0.6, r=R, dur=2.4)),
    "honk": lambda e: st((np.sign(np.sin(2 * np.pi * 415 * tt(0.35))) + np.sign(np.sin(2 * np.pi * 523 * tt(0.35)))) * np.exp(-tt(0.35) / 0.3) * 0.04),
    "whoa": lambda e: _crowd(X.whoa, e),
    "oof": lambda e: _crowd(lambda r: X.oof(r, kind="ugh"), e),
    "laugh": lambda e: _crowd(lambda r: X.hurrah(r, r.uniform(110, 200), r.uniform(0.95, 1.15)), e),
    "cheer": lambda e: _crowd(lambda r: X.hurrah(r, r.uniform(110, 220), r.uniform(0.95, 1.2)), e),
    "applause": lambda e: X.applause(e.get("dur", 2.5), S, people=24) * 0.6,
    "murmur": lambda e: sum(pan(X.babble(e.get("dur", 2.0), S, S.uniform(110, 230), S.uniform(0.95, 1.2)) * 0.05, -0.8 + 0.22 * k) for k in range(8)),
    "gull": lambda e: seqm([(0.3 * k, pan(gull(), -0.6 + 0.3 * k)) for k in range(e.get("n", 3))]),
    "squawk": lambda e: st(bp(tone(900, 600, 0.35, 0.2) + 0.5 * np.sign(tone(450, 300, 0.35, 0.2)), 400, 3500) * 0.25),
    "croak": lambda e: st(bp(np.sign(np.sin(2 * np.pi * 22 * tt(0.35))) * tone(180, 140, 0.35, 0.3), 100, 1200) * 0.4),
    "pop": lambda e: st(noise_hit(400, 3000, 0.02, 0.2) + tone(600, 300, 0.2, 0.04) * 0.5),
    "boing": lambda e: st(tone(180, 420, 0.6, 0.35) * (1 + 0.5 * np.sin(2 * np.pi * 14 * tt(0.6))) * 0.5),
    "splash": lambda e: X.splash_big(S) * 0.5,
    "glass": lambda e: seqm([(0.06 * k, pan(I.triangle(vel=0.15, r=R, dur=0.4, f=R.uniform(2800, 5200)), R.uniform(-0.6, 0.6))) for k in range(10)]),
    "clank": lambda e: st(sum(np.sin(2 * np.pi * f * tt(0.9)) * np.exp(-tt(0.9) / (0.25 / (j + 1))) for j, f in enumerate([310, 787, 1440, 2210])) * 0.25),
    "whistle_down": lambda e: st(np.sin(2 * np.pi * np.cumsum(np.linspace(1500, 600, ns(e.get("dur", 0.85)))) / SR) * np.linspace(0, 0.25, ns(e.get("dur", 0.85)))),
    "sizzle": lambda e: st(hp(colored(ns(e.get("dur", 2.0)), S, 0.0), 3000) * (0.5 + 0.5 * smooth_noise(ns(e.get("dur", 2.0)), S, 8)) * 0.12),
    "engine": lambda e: st(lp(colored(ns(e.get("dur", 2.0)), S, 1.4), 220) * (1 + 0.5 * np.sin(2 * np.pi * 27 * tt(e.get("dur", 2.0)))) * np.interp(tt(e.get("dur", 2.0)), [0, 0.3, e.get("dur", 2.0) - 0.4, e.get("dur", 2.0)], [0, 1, 1, 0.1]) * 0.9),
    "brake": lambda e: st(hp(colored(ns(0.6), S, 0.2), 2500) * np.exp(-tt(0.6) / 0.25) * 0.25),
    "rumble": lambda e: st(lp(colored(ns(e.get("dur", 2.5)), S, 1.6), 150) * np.interp(tt(e.get("dur", 2.5)), [0, 0.4, e.get("dur", 2.5)], [0, 1, 0]) * 1.2),
    "zap": lambda e: st(tone(2400, 300, 0.4, 0.2) * 0.3),
    "jet": lambda e: st(bp(colored(ns(e.get("dur", 3.0)), S, 0.5), 300, 4000) * np.interp(tt(e.get("dur", 3.0)), [0, 0.5, e.get("dur", 3.0)], [0, 1, 0.2]) * 0.6),
    "beep": lambda e: st(np.sin(2 * np.pi * 1320 * tt(0.12)) * 0.15),
    "gunburst": lambda e: seqm([(0.09 * k, st(noise_hit(200, 5000, 0.03, 0.15, 0.2) + np.sin(2 * np.pi * 90 * tt(0.15)) * np.exp(-tt(0.15) / 0.03) * 0.6) * 0.5) for k in range(e.get("n", 6))]),
    "drip": lambda e: st(tone(1200, 2400, 0.12, 0.03) * 0.3),
    "flush": lambda e: X.water_bed(2.5, S, close=1.0) * np.interp(tt(2.5), [0, 0.2, 2.5], [0, 1, 0])[None, :] * 0.8,
    "fanfare": lambda e: seqm([(0.18 * j, pan(I.brass(I.m2f(m), 0.3, vel=0.5, r=R, kind="horn"), 0.0)) for j, m in enumerate([67, 72, 76, 79])]),
    "ratchet": lambda e: seqm([(0.045 * k, st(noise_hit(1500, 6000, 0.01, 0.05)) * 0.4) for k in range(e.get("n", 10))]),
    "wind_gust": lambda e: X.breeze(e.get("dur", 2.0), S, level=1.4, gust=0.6) * 0.8,
    "stamp": lambda e: st(np.sin(2 * np.pi * 85 * tt(0.4)) * np.exp(-tt(0.4) / 0.06) + noise_hit(300, 3000, 0.02, 0.4) * 0.5),
}
def _crowd(fn, e):
    out = np.zeros((2, ns(e.get("dur", 1.6)) + ns(1.5)))
    for k in range(e.get("n", 4)):
        place(out, pan(fn(S) * 0.35, -0.6 + 1.2 * k / max(1, e.get("n", 4) - 1)), 0.12 * k)
    return out
for e in cue["events"]:
    x = st(FX[e["kind"]](e)) * e.get("gain", 1.0)
    if "pan" in e: x = pan(x.mean(0), e["pan"])
    place(sfx, x, sec(e["f"]))
for f in cue["cuts"]: place(sfx, X.whoosh(0.45, S, peak=0.3, f_lo=500, f_hi=3000) * 0.25, sec(f) - 0.2)
for f in cue["glides"]: place(sfx, X.whoosh(0.7, S, peak=0.5) * 0.3, sec(f) - 0.35)
for f in cue["flashes"]: place(sfx, st(np.sin(2 * np.pi * 55 * tt(0.6)) * np.exp(-tt(0.6) / 0.2) * 0.6), sec(f))

# ---------------- mix ----------------
duck = np.zeros(N)
spans = []
for w in words:
    if spans and w["s"] - spans[-1][1] < 0.3: spans[-1][1] = w["e"]
    else: spans.append([w["s"], w["e"]])
for a, b in spans: duck[ns(max(0, a - 0.08)):ns(b + 0.12)] = 1.0
k = int(0.12 * SR); duck = np.convolve(duck, np.ones(k) / k, mode="same")
music *= 10 ** (-5.0 * duck / 20)
gate = np.ones(N)
for a, b in stops: gate[ns(a - 0.05):ns(b - 0.05)] = 0.0
music *= np.convolve(gate, np.ones(int(0.04 * SR)) / int(0.04 * SR), mode="same")
LV = integrated(voice)
def at(x, target):
    L = integrated(x)
    return x * 10 ** ((target - L) / 20) if np.isfinite(L) else x
music = at(music, LV - 15.0) * 10 ** (3 / 20)
sfx = at(sfx, LV - 10.5) * 10 ** (-6 / 20)
y = voice + music + sfx
g = 10 ** ((-15.0 - integrated(y)) / 20)
y = y * g
CEIL = 10 ** (-1.5 / 20); y = CEIL * np.tanh(y / CEIL)
write_wav(os.path.join(D, "mix.wav"), y)
print(f"{slug}: {DUR:.2f} s, mix {integrated(y):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(y))):.1f} dBFS, "
      f"voice {integrated(voice * g):.1f}, music {integrated(music * g):.1f}, sfx {integrated(sfx * g):.1f}")
