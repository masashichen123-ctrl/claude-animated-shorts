# Sound for "A Whale of a Deal": an original comic score (pizzicato bass + glockenspiel, a stop-time at the blast, a
# brass button at the end), synthesized effects on every story beat, the narration ducking the music.
# usage: python sound.py <voice.wav> <words.json> <timing.ts> <out_dir>
# Reuses the synthesis helpers in templates/audio (dsp, instruments, sfx_gen). Event times mirror story.ts exactly.
import json, os, re, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "..", "templates", "audio"))
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, read_wav, write_wav, integrated, true_peak  # noqa: E402
import instruments as I  # noqa: E402
import sfx_gen as X  # noqa: E402

voice_path, words_path, timing_path, out_dir = sys.argv[1:5]
os.makedirs(out_dir, exist_ok=True)

# ---------------- the picture's clock (mirrors story.ts) ----------------
FPS = 30
txt = open(timing_path).read()
SENT = json.loads(re.search(r"SENT_MEASURED: number\[\] = (\[.*?\]);", txt).group(1))
SPOKEN = json.loads(re.search(r"SPOKEN_MEASURED: number\[\] = (\[.*?\]);", txt).group(1))
assert len(SENT) == 17, "timing.ts has no measured timings"
F = lambda n, u=0: round((SENT[n - 1] + u * SPOKEN[n - 1]) * FPS)
TOTAL = round(SENT[16] * FPS)
DUR = TOTAL / FPS
N = ns(DUR)
sec = lambda f: f / FPS
PUSH, TRUCK_IN, TRUCK_HALT = sec(F(1, 0.9)), sec(F(3, 0)), sec(F(3, 0.42))
BLAST, RAIN, CRUSH, SLAP = sec(F(8, 0.1)), sec(F(8, 0.62)), sec(F(10, 0.58)), sec(F(13, 0.5))
SHOT = [sec(F(i)) for i in range(1, 17)]
# camera cuts inside shots (story.ts keys with cut: true) and glides (whoosh at the glide's middle)
CUTS = [sec(F(2, 0.62)), sec(F(3, 0.68)), sec(F(4, 0.7)), sec(F(5, 0.72)), sec(F(7, 0.6)), RAIN, sec(F(12, 0.55))]
GLIDES = [sec(F(1, 0.34)) + 0.5, sec(F(1, 0.72)) + 0.43, sec(F(3, 0.45)) + 0.47, sec(F(16, 0.55)) + 0.77]

# ---------------- voice ----------------
v, vsr = read_wav(voice_path)
assert vsr == SR, f"voice must be {SR} Hz (got {vsr})"
voice = np.zeros((2, N)); place(voice, v, 0.0)
words = json.load(open(words_path))

# ---------------- music ----------------
Q = 60 / 104  # quarter note at 104 bpm
m2f = I.m2f
music = np.zeros((2, N))
R = rng(7)
# F major, a sneaky two-bar loop: bass (pizzicato pluck) on beats, glockenspiel melody on top
BASS = [41, 48, 45, 48, 46, 53, 48, 52]           # F2 C3 A2 C3 Bb2 F3 C3 E3
MEL = [(0, 77), (1.5, 76), (2, 74), (3, 72), (4, 74), (5.5, 72), (6, 70), (7, 69)]  # beat, midi
def bar_loop(t0, t1, vel=0.7, glock=True):
    b = 0
    while t0 + b * Q < t1 - 0.05:
        t = t0 + b * Q
        place(music, pan(I.pluck(m2f(BASS[b % 8]), vel=0.9 * vel, r=R, dur=0.7, bright=0.35), -0.2), t)
        if b % 2 == 1:
            place(music, pan(I.snare(vel=0.18 * vel, r=R, dur=0.12, tune=1.6, snappy=0.4), 0.3), t)  # light rim tick
        if glock:
            for bt, m in MEL:
                if int(bt) == b % 8 and t0 + (b - b % 8 + bt) * Q < t1 - 0.05:
                    place(music, pan(I.glock(m2f(m), vel=0.45 * vel, r=R, dur=1.2), 0.25), t0 + (b - b % 8 + bt) * Q)
        b += 1
# hook sting, then the loop until the blast; a held tension pad over "twenty cases" / backing up
place(music, pan(I.brass(m2f(53), 0.35, vel=0.55, r=R, kind="tuba"), -0.1), 0.05)
bar_loop(0.6, SHOT[5] - 0.1, 0.62)
place(music, I.pad([m2f(53), m2f(56), m2f(60)], SHOT[6] - SHOT[5] + 0.3, vel=0.5, r=R, att=0.2, rel=0.3), SHOT[5])
bar_loop(SHOT[6], BLAST - 0.25, 0.75, glock=False)
# stop-time: silence at the blast, then a dazed slow version, then the loop back for the explanation and ending
bar_loop(sec(F(9)), sec(F(13)) - 0.2, 0.5)
for k, m in enumerate([72, 69, 65, 60]):  # descending "wah" over the still-there whale
    place(music, pan(I.brass(m2f(m - 12), 0.42, vel=0.5, r=R, kind="tuba", fall=-80 if k == 3 else 0), 0.1), sec(F(12, 0.5)) + k * 0.45)
bar_loop(sec(F(13)), DUR - 2.4, 0.6)
# button: "Whale of a Deal" -> brass chord + cymbal
t_end = sec(F(16, 0.85))
for m in (53, 57, 60, 65):
    place(music, pan(I.brass(m2f(m), 1.4, vel=0.55, r=R, kind="tuba" if m < 55 else "horn"), 0.0), t_end)
place(music, I.cymbal(vel=0.35, r=R, dur=2.0), t_end)

# ---------------- effects ----------------
sfx = np.zeros((2, N))
S = rng(11)
amb_beach = X.breeze(DUR, S, level=0.6, bright=700)
surf = hp(lp(colored(N, S, 0.9), 900), 60) * (0.5 + 0.5 * smooth_noise(N, S, 0.12))
for i in range(16):  # waves + wind only while we are on the beach
    a, b = SHOT[i], SHOT[i + 1] if i < 15 else DUR
    if i + 1 in (1, 2, 3, 4, 5, 6, 8, 11, 12, 14):
        g = np.zeros(N); g[ns(a):ns(b)] = 1.0
        sfx += (amb_beach * 0.5 + st(surf * 0.35)) * g
def gull(t, p=0.0, g=1.0):
    d = 0.5; x = tt(d); f = 1900 + 900 * np.sin(np.pi * x / d) - 700 * x / d
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-((x - 0.18) / 0.15) ** 2)
    place(sfx, pan(bp(y + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR) * np.exp(-((x - 0.18) / 0.15) ** 2), 900, 5000) * 0.18 * g, p), t)
for k in range(6): gull(SHOT[1] + 0.3 + k * 0.7, -0.6 + 0.25 * k)
for k in range(5): gull(sec(F(4, 0.7)) + 0.2 + k * 0.5, 0.3 * (k % 3 - 1), 0.8)
for k in range(9): gull(SHOT[10] + 0.1 + k * 0.33, -0.8 + 0.2 * k, 1.1)
# plunger push + click
place(sfx, X.hammer_hit(S, big=0.4) * 0.5, PUSH)
# truck: engine rumble while driving, brake hiss at the halt
dr = TRUCK_HALT - TRUCK_IN + 0.6
eng = lp(colored(ns(dr), S, 1.4), 220) * (1 + 0.5 * np.sin(2 * np.pi * 27 * tt(dr))) * np.interp(tt(dr), [0, 0.3, dr - 0.6, dr], [0, 1, 1, 0.2])
place(sfx, pan(eng * 0.9, 0.3), TRUCK_IN)
place(sfx, pan(hp(colored(ns(0.6), S, 0.2), 2500) * np.exp(-tt(0.6) / 0.25) * 0.25, 0.3), TRUCK_HALT)
# whooshes on glides and cuts
for t in GLIDES: place(sfx, X.whoosh(0.7, S, peak=0.5) * 0.35, t - 0.35)
for t in CUTS: place(sfx, X.whoosh(0.45, S, peak=0.3, f_lo=500, f_hi=3000) * 0.25, t - 0.2)
# crowd murmur when everyone backs up
for k in range(8): place(sfx, pan(X.babble(SHOT[7] - SHOT[6], S, S.uniform(110, 230), S.uniform(0.95, 1.2)) * 0.05, -0.8 + 0.22 * k), SHOT[6])
# THE BLAST: sub drop + boom + debris rumble
n = ns(4.0); t = tt(4.0)
boom = np.sin(2 * np.pi * (38 + 60 * np.exp(-t / 0.08)) * t) * np.exp(-t / 0.9)
boom += lp(colored(n, S, 1.0), 400) * np.exp(-t / 0.6) * 0.8 + hp(colored(n, S, 0.0), 1500) * np.exp(-t / 0.12) * 0.5
place(sfx, st(boom) * 1.4, BLAST)
place(sfx, X.wood_crack(S) * 0.5, BLAST + 0.02)
# raining blubber: wet splats around the crowd + gasps
def splat(t, p, g=1.0):
    d = 0.35; x = tt(d)
    y = bp(colored(ns(d), S, 0.3), 200, 2200) * np.exp(-x / 0.06) + np.sin(2 * np.pi * 95 * x) * np.exp(-x / 0.05) * 0.6
    place(sfx, pan(y * 0.55 * g, p), t)
for k in range(16): splat(RAIN + 0.5 + k * 0.22 + S.uniform(0, 0.15), S.uniform(-0.8, 0.8), S.uniform(0.5, 1.0))
for k in range(5): place(sfx, pan(X.whoa(S) * 0.35, -0.6 + 0.3 * k), RAIN + 0.1 + k * 0.12)
for k in range(3): place(sfx, pan(X.oof(S, kind="ugh") * 0.3, -0.4 + 0.4 * k), RAIN + 1.3 + k * 0.4)
# the falling chunk: whistle down, crunch of metal, glass tinkle
fd = 0.85; x = tt(fd)
place(sfx, pan(np.sin(2 * np.pi * np.cumsum(1500 - 900 * x / fd) / SR) * np.interp(x, [0, 0.1, fd], [0, 0.18, 0.25]), 0), CRUSH - fd)
n = ns(1.2); x = tt(1.2)
crunch = bp(colored(n, S, 0.4), 150, 4000) * np.exp(-x / 0.18) + np.sin(2 * np.pi * 60 * x) * np.exp(-x / 0.25) * 0.9
place(sfx, st(crunch) * 1.1, CRUSH)
for k in range(10): place(sfx, pan(I.triangle(vel=0.15, r=S, dur=0.4, f=S.uniform(2800, 5200)), S.uniform(-0.6, 0.6)), CRUSH + 0.1 + k * 0.06)
# jelly: wet slap + wobble
n = ns(1.0); x = tt(1.0)
place(sfx, st(bp(colored(n, S, 0.2), 300, 3000) * np.exp(-x / 0.04) * 0.9 + np.sin(2 * np.pi * (140 + 30 * np.sin(2 * np.pi * 9 * x)) * x) * np.exp(-x / 0.35) * 0.35), SLAP)
# the dealer's lot: distant traffic + a car horn honk at the end
place(sfx, pan(np.sign(np.sin(2 * np.pi * 415 * tt(0.35))) * np.exp(-tt(0.35) / 0.3) * 0.04 + np.sign(np.sin(2 * np.pi * 523 * tt(0.35))) * np.exp(-tt(0.35) / 0.3) * 0.04, 0.5), sec(F(16, 0.3)))
# white flashes: a soft impact on the hook flash
place(sfx, st(np.sin(2 * np.pi * 55 * tt(0.6)) * np.exp(-tt(0.6) / 0.2) * 0.6), SHOT[1])

# ---------------- mix ----------------
def spans(words, merge=0.3):
    out = []
    for w in words:
        if out and w["s"] - out[-1][1] < merge: out[-1][1] = w["e"]
        else: out.append([w["s"], w["e"]])
    return out
duck = np.zeros(N)
for a, b in spans(words):
    duck[ns(max(0, a - 0.08)):ns(b + 0.12)] = 1.0
k = int(0.12 * SR); duck = np.convolve(duck, np.ones(k) / k, mode="same")
music *= 10 ** (-3.0 * duck / 20)  # -3 dB under the voice
# stop-time silence at the blast (music only), back in for "Luckily"
gate = np.ones(N); gate[ns(BLAST - 0.05):ns(sec(F(9)) - 0.05)] = 0.0
music *= np.convolve(gate, np.ones(int(0.04 * SR)) / int(0.04 * SR), mode="same")

LV = integrated(voice)
def at(x, target):
    L = integrated(x)
    return x * 10 ** ((target - L) / 20) if np.isfinite(L) else x
# levels relative to the voice; the house rule then adds +3 dB music and -6 dB effects
music = at(music, LV - 13.0) * 10 ** (3 / 20)
sfx = at(sfx, LV - 9.0) * 10 ** (-6 / 20)
y = voice + music + sfx
g = 10 ** ((-15.0 - integrated(y)) / 20)
y, v_, m_, s_ = y * g, voice * g, music * g, sfx * g
CEIL = 10 ** (-1.5 / 20)  # soft limiter: unity gain for quiet signals, peaks approach -1.5 dBFS and never pass it
y = CEIL * np.tanh(y / CEIL)
write_wav(os.path.join(out_dir, "mix.wav"), y)
for name, x in (("stem_voice", v_), ("stem_music", m_), ("stem_sfx", s_)):
    write_wav(os.path.join(out_dir, name + ".wav"), x)
print(f"duration {DUR:.3f} s ({TOTAL} frames), mix {integrated(y):.1f} LUFS, voice {integrated(v_):.1f}, music {integrated(m_):.1f}, sfx {integrated(s_):.1f}")
print("events:", {k2: round(v2, 2) for k2, v2 in dict(PUSH=PUSH, TRUCK=TRUCK_IN, BLAST=BLAST, RAIN=RAIN, CRUSH=CRUSH, SLAP=SLAP).items()})
