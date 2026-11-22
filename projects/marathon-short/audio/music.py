# Chill score for "The 1904 Olympic Marathon" (same approved chill style as the emu, bat and whale re-scores, new
# material). A laid-back, warm, sparse acoustic bed at 92 bpm with swung eighths and a light ragtime-period wink:
# a soft honky-tonk upright piano (two slightly detuned strings per note, felt-soft hammers) playing lazy offbeat
# comping and a little syncopated 'RAG' motif, fingerpicked steel-less nylon guitar, round upright bass (two-beat),
# brushes + shaker + a soft kick (no snare cracks, no crashes, no rolls). F major, ragtime circle loops
# (F6 D7 G7 C7, F6 Bb6 F6 C7 ...). All composed here (no existing melodies: no Maple Leaf Rag, no Entertainer).
# Comedy beats are soft: an 'uh-oh' two-note piano at the bottle @99, a reversed shimmer into the flash @131, a lone
# piano plink after the single drop @529, a little piano 'ta-da' after 'cheered', a soft drop-out where the cheering
# stops dead @752, a soured detuned piano at the rotten apple @867, a celesta lullaby for the nap @926, a cheerful
# chord @965, a skittering (still soft) feel for the dogs, a woozy detuned half-time for Hicks with little blips on
# each hand-off, a held breath @1304, a warm chord on the tape @1399 + low piano 'plonk' for the medal, a deflating
# chromatic line for the drop-outs, a bright Boston groove and a warm resolve on F6/9 with a celesta 'ting' @1660.
import numpy as np
from dsp import SR, TAU, ns, tt, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp, fades
import instruments as I
import timeline as T

N = ns(T.DUR)
BPM = 92.0
B = 60.0 / BPM            # one beat = 0.652 s
SW = 2 / 3                # swung eighth
F = I.m2f
fr = T.fr

# chord: (bass root, piano comp voicing, guitar picking notes [thumb, thumb 2, finger, finger])
CH = {
    "F6": (41, [57, 60, 62, 65], [41, 48, 57, 62]),
    "D7": (38, [54, 57, 60, 62], [38, 45, 54, 60]),
    "G7": (43, [53, 55, 59, 62], [43, 50, 53, 59]),
    "C7": (36, [52, 55, 58, 62], [48, 55, 58, 64]),
    "Bb6": (46, [53, 55, 58, 62], [46, 53, 58, 62]),
    "Bdim7": (47, [53, 56, 59, 62], [47, 53, 56, 62]),
    "Dm7": (38, [53, 57, 60, 64], [38, 45, 53, 60]),
    "Gm7": (43, [53, 58, 62, 65], [43, 50, 58, 65]),
    "C9sus": (36, [53, 58, 62, 67], [48, 55, 58, 65]),
    "Am7": (45, [55, 57, 60, 64], [45, 52, 55, 60]),
    "F69": (41, [57, 62, 65, 67], [41, 48, 57, 67]),
    "Fmaj9": (41, [57, 60, 64, 67], [41, 48, 57, 64]),
    "Abdim7": (44, [53, 56, 59, 62], [44, 50, 56, 59]),
    "E7": (40, [56, 59, 62, 64], [40, 47, 56, 62]),
    "Bbm6": (46, [53, 55, 58, 61], [46, 53, 58, 61]),
}
RAG = ["F6", "D7", "G7", "C7"]                 # the ragtime circle I - VI7 - II7 - V7
LAZY = ["F6", "Bb6", "F6", "C7"]
SUN = ["F6", "Dm7", "Gm7", "C9sus"]
WOOZY = ["Gm7", "C7", "F6", "Abdim7"]
BOSTON = ["Bb6", "Bdim7", "F6", "D7"]

# the RAG motif (piano right hand): a lazy syncopated 'da-da . DUM . da da-da DUM' in F (offset beats, length, midi)
MOTIF = [(0.0, 0.4, 69), (SW, 0.3, 72), (1 + SW, 0.8, 74), (2 + SW, 0.3, 77), (3.0, 0.3, 76), (3 + SW, 0.3, 74), (4.0, 1.2, 72)]
ANSWER = [(0.0, 0.3, 77), (SW, 0.3, 74), (1.0, 0.9, 72)]

R = rng(1904)


def _r():
    return rng(int(R.integers(1 << 30)))


# ---------------------------------------------------------------- the upright piano (own additive synthesis)
def piano(f, vel=0.5, r=None, dur=1.0, honky=7.0, rel=0.12, wobble=0.0):
    """soft old upright: two strings per note detuned +-honky/2 cents (the honky-tonk beat), slightly stretched
    partials, felt hammer (soft = darker), two-stage decay (prompt + aftersound), damper at `dur`; wobble = slow pitch
    sway in cents (woozy)"""
    r = r or rng(0)
    n = ns(dur + rel)
    t = np.arange(n) / SR
    K = int(max(2, min(14, 5200 / f)))
    tau0 = 2.6 * (220 / f) ** 0.55
    bright = 0.35 + 0.5 * vel
    Bi = 0.00025 * (f / 262) ** 0.5
    sway = 1 + (wobble / 1200 * np.log(2)) * np.sin(TAU * 0.9 * t + r.uniform(0, TAU)) if wobble else 1.0
    y = np.zeros(n)
    for s, c in enumerate((-honky / 2, honky / 2)):
        fs = f * 2 ** (c / 1200)
        for k in range(1, K + 1):
            fk = k * fs * np.sqrt(1 + Bi * k * k)
            if fk > 9000:
                break
            ak = abs(np.sin(np.pi * k / 7.5)) / k ** (1.9 - 1.1 * bright)
            tau = tau0 / (1 + 0.35 * (k - 1))
            e = 0.65 * np.exp(-t / (tau * 0.25)) + 0.35 * np.exp(-t / tau)
            ph = TAU * fk * np.cumsum(np.broadcast_to(sway, t.shape)) / SR if wobble else TAU * fk * t
            y += ak * e * np.sin(ph + r.uniform(0, TAU))
    y *= 0.5
    y += lp(r.standard_normal(n), 900, 2) * np.exp(-t / 0.006) * 0.12 * vel        # felt thump
    y *= 1 - np.exp(-t / 0.0018)
    d = ns(dur)
    if d < n:
        y[d:] *= np.exp(-np.arange(n - d) / SR / 0.05)
    y = lp(y, 1800 + 3500 * vel, 2)
    return fades(y * vel, 0.0005, 0.03)


class Band:
    def __init__(self):
        self.tr, self.cues = {}, []

    def add(self, name, x, t, p=0.0, g=1.0):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
        place(self.tr[name], pan(x, p) if np.ndim(x) == 1 else x, t, g)

    def cue(self, t, d):
        self.cues.append((t, d))


def groove(b, t0, t1, chords, layers=("gtr", "bass", "piano", "brush", "shaker", "kick"), vel=1.0, honky=7.0, wobble=0.0,
           half=False, walk=False):
    """lay the band from t0 to t1; chords = names (one bar of 4 beats each, looped) or (name, beats) pairs.
    piano comps soft chords on beats 2 and 4 (the ragtime after-beat, laid back); half = half-time feel (woozy);
    walk = upright walks quarter notes (the dogs)"""
    seq = [(c, 4) if isinstance(c, str) else c for c in chords]
    tb, i = t0, 0
    while tb < t1 - 0.05:
        name, nb = seq[i % len(seq)]
        root, pv, gt = CH[name]
        nxt = CH[seq[(i + 1) % len(seq)][0]][0]
        beat = 0
        while beat < nb:
            t = tb + beat * B
            if t >= t1 - 0.02:
                break
            if "gtr" in layers and (not half or beat % 2 == 0):
                b.add("gtr", I.pluck(F(gt[0] if beat % 2 == 0 else gt[1]), 0.55 * vel * R.uniform(0.9, 1.05), _r(), dur=1.2, bright=0.25, pos=0.22), t + R.normal(0, 0.006), -0.3)
                if t + SW * B < t1 - 0.02:
                    b.add("gtr", I.pluck(F(gt[2 + (beat % 2)]), 0.38 * vel * R.uniform(0.85, 1.05), _r(), dur=0.9, bright=0.3, pos=0.2), t + SW * B + R.normal(0, 0.008), -0.35)
            if "piano" in layers and beat in (1, 3) and (not half or beat == 1):
                for k, m in enumerate(pv):
                    b.add("piano", piano(F(m), 0.3 * vel * R.uniform(0.85, 1.0), _r(), 0.28 if not half else 0.9, honky, wobble=wobble),
                          t + 0.03 + 0.008 * k + R.normal(0, 0.004), 0.3 - 0.12 * k)
            if "bass" in layers:
                if walk:
                    m = [root, root + 4, root + 7, nxt - 1 if nxt - 1 > root else nxt + 1][beat % 4]
                    hit = True
                else:
                    m = root if beat == 0 else root + 7
                    hit = beat in ((0,) if half else (0, 2))
                if hit:
                    m = m - 12 if m > 47 else m
                    b.add("bass", lp(I.pluck(F(m), 0.8 * vel, _r(), dur=1.1 if not half else 1.8, bright=0.05, pos=0.35), 900, 2), t + 0.01, 0.0)
            if "kick" in layers and beat in ((0,) if half else (0, 2)):
                b.add("kick", I.soft_kick(0.5 * vel, _r()), t)
            if "brush" in layers and beat in (1, 3):
                b.add("brush", I.brush(0.4 * vel, _r(), dur=0.4 if not half else 0.7, swish=True), t - 0.08, 0.15)
            if "shaker" in layers:
                b.add("shaker", I.shaker(0.3 * vel, _r()), t, 0.4)
                if t + SW * B < t1 - 0.02:
                    b.add("shaker", I.shaker(0.18 * vel, _r()), t + SW * B, 0.4)
                if walk and t + B / 3 < t1:
                    b.add("shaker", I.shaker(0.12 * vel, _r()), t + B / 3, 0.4)
            beat += 1
        tb += nb * B
        i += 1


def line(b, t0, notes, vel=0.42, beat=None, p=0.1, honky=7.0, track="lead", wobble=0.0, octave=False):
    """the piano right hand: notes = [(offset beats, length beats, midi)]"""
    bt = beat or B
    for e, d, m in notes:
        x = piano(F(m), vel * R.uniform(0.92, 1.03), _r(), d * bt, honky, wobble=wobble)
        if octave:
            x = x + 0.4 * np.pad(piano(F(m - 12), vel * 0.8, _r(), d * bt, honky), (0, 0))[: len(x)]
        b.add(track, x, t0 + e * bt + R.normal(0, 0.005), p)


def sparkle(b, t, notes, vel=0.25, p=0.3, gap=0.09, inst="celesta"):
    for k, m in enumerate(notes):
        x = I.celesta(F(m), vel, _r(), 1.4) if inst == "celesta" else I.vibes(F(m), vel, _r(), dur=1.4, trem_depth=0.12)
        b.add(inst, x, t + k * gap, p)


def pizz_run(b, t0, notes, gap=0.1, vel=0.4, p=0.1):
    for k, m in enumerate(notes):
        b.add("pizz", I.pizz(F(m), vel * R.uniform(0.92, 1.05), _r(), 0.45), t0 + k * gap, p)


def cut(b, t, fade=0.06):
    """fade every track out at t (only what is already written: later material is added after the cut)"""
    g = np.ones(N)
    a = ns(t)
    g[a:a + ns(fade)] = np.linspace(1, 0, ns(fade)) ** 1.5
    g[a + ns(fade):] = 0
    for k in b.tr:
        b.tr[k] *= g[None, :]


def chord_hit(b, t, name, vel=0.4, strum=0.05, bass=True, dur=1.8, honky=7.0):
    """a warm sustained chord: rolled guitar, piano, low bass"""
    root, pv, gt = CH[name]
    for k, m in enumerate(gt):
        b.add("gtr", I.pluck(F(m), 0.45 * vel / 0.4, _r(), dur=dur, bright=0.25), t + strum * k, -0.3)
    for k, m in enumerate(pv):
        b.add("piano", piano(F(m), vel, _r(), dur * 0.9, honky), t + 0.012 * k, 0.3 - 0.12 * k)
    if bass:
        b.add("bass", lp(I.pluck(F(root if root <= 47 else root - 12), 0.8, _r(), dur=dur, bright=0.05, pos=0.35), 900, 2), t, 0.0)


def build():
    b = Band()
    s = lambda i: T.shot_t(i)[0]

    # 1 HOOK 0 - 4.37: guitar + soft piano comp + bass, no drums; the RAG motif answers 'Olympics,' in the first gap
    groove(b, 0.0, fr(T.FLASH) - 0.02, [("F6", 4), ("D7", 2)], layers=("gtr", "piano", "bass"), vel=0.75)
    line(b, 1.80, ANSWER, 0.36, beat=0.15)
    b.cue(0.0, "HOOK: fingerpicked guitar + soft upright piano after-beats + upright bass (F6 - D7), no drums")
    b.cue(1.80, "a tiny 3-note piano answer (F E-flat... F D C) in the gap after 'Olympics,' (1.77-2.09)")
    line(b, fr(T.BOTTLE), [(0, 0.35, 68), (0.45, 0.8, 67)], 0.3, beat=0.5)
    b.cue(fr(T.BOTTLE), "BOTTLE @99: a soft 'uh-oh' (A-flat - G) on the piano, high and quiet")
    tf = fr(T.FLASH)
    for m in [77, 81, 84, 89]:
        x = I.vibes(F(m), 0.24, _r(), dur=0.55, trem_depth=0.1)[::-1]
        b.add("vibes", fades(x, 0.15, 0.02), tf - len(x) / SR, 0.2)
    cut(b, tf, 0.04)
    b.cue(tf, "FLASH @131: a soft reversed-vibes shimmer swells into the frame; the band stops on it")

    # 2 THE CAR 4.43 - 6.8: a lazy putter of a vamp (bass + guitar + piano), no drums
    groove(b, fr(T.CAR1) + 0.08, s(3) - 0.05, [("F6", 2), ("C7", 2)], layers=("gtr", "bass", "piano"), vel=0.7)
    line(b, 6.38, ANSWER, 0.34, beat=0.16)
    b.cue(fr(T.CAR1), "THE CAR @133: a lazy vamp (F6 - C7) under 'And that wasn't even the strangest part.'")
    b.cue(6.38, "the 3-note piano answer in the gap after 'part.' (6.22-6.89)")

    # 3 START 6.8 - 11.33 (XF 204): the groove starts on the ragtime circle
    groove(b, s(3), s(4), RAG)
    b.cue(s(3), "STADIUM START (XF @204): the groove starts - guitar, upright bass, piano after-beats, brushes + shaker + soft kick (F6 D7 G7 C7)")
    line(b, 10.85, MOTIF[:4], 0.36, beat=0.11)
    b.cue(10.86, "the RAG motif's first half (A C D F) in the gap after 'roads.' (10.84-11.24)")

    # 4 CARS + DUST 11.33 - 14.97: groove continues, lazier loop
    groove(b, s(4), s(5), SUN, vel=0.95)
    b.cue(s(4), "CARS + DUST: the groove carries on (F6 Dm7 Gm7 C9sus)")

    # 5 THE WELL 14.97 - 18.43: thin (guitar, bass, piano), the band waits on the drop
    groove(b, 15.16, fr(T.DRIP), LAZY,                 # enters just after the very soft "And" (15.00-15.08), not on it
            layers=("gtr", "bass", "piano", "shaker"), vel=0.85)
    cut(b, fr(T.DRIP) + 0.02, 0.25)
    b.add("bass", lp(I.pluck(F(36), 0.6, _r(), dur=1.0, bright=0.05, pos=0.35), 900, 2), fr(T.DRIP) + 0.02, 0.0)
    b.cue(fr(T.DRIP), "THE DROP @529: the band lets go (250 ms), one low bass C holds...")
    line(b, T.DRIP_LAND + 0.02, [(0, 0.9, 96)], 0.22, beat=1.0, honky=3.0)
    b.cue(T.DRIP_LAND, "...and a lone high piano plink (C7) after the drop lands (gap after 'course.')")

    # 6 THE FINISH 18.43 - 22.87: full and bright; 'ta-da' after 'cheered,'
    groove(b, s(6), s(7), RAG)
    b.cue(s(6), "FINISH LINE: full groove on the ragtime circle")
    line(b, 20.31, [(0, 0.25, 72), (0.33, 0.25, 77)], 0.3, beat=0.3)
    b.cue(20.31, "TAPE @607: a two-note piano lift (C F) in the small gap after 'line' (20.31-20.50)")
    line(b, 22.55, [(0, 0.3, 72), (0.5, 0.3, 76), (1.0, 1.4, 81)], 0.36, beat=0.1, octave=True)
    b.cue(22.56, "CROWD CHEERS: a little piano 'ta-da' (C E A, octaves) in the gap after 'cheered,' (22.55-22.87)")

    # 7 THE FLASHBACK 22.87 - 25.07: groove carries on - then the soft drop-out where the cheering stops dead @752
    groove(b, s(7), fr(T.STOP_DEAD) + 0.1, LAZY, vel=0.95)
    cut(b, fr(T.STOP_DEAD), 0.15)
    b.cue(fr(T.STOP_DEAD), "CHEERING STOPS DEAD @752: soft drop-out (150 ms fade), silence under the end of 'car.'")
    pizz_run(b, 25.36, [53, 52], 0.14, 0.36, -0.1)
    b.cue(25.36, "a flat two-note pizz 'hmph' (F - E) in the gap after 'car.' (25.26-25.69)")

    # 8 ORCHARD 25.6 - 29.53: gently back in, no drums; the apple sours
    groove(b, s(8) - 0.1, fr(T.SOUR[0]), LAZY, layers=("gtr", "bass", "piano", "shaker"), vel=0.8)
    sparkle(b, fr(T.APPLE_PICK), [84, 88], 0.12, 0.35, 0.07)
    b.cue(s(8), "ORCHARD: the band comes back gently - guitar, bass, piano, shaker (F6 Bb6 F6 C7)")
    b.cue(fr(T.APPLE_PICK), "APPLE PICK @822: a tiny two-note celesta glint")
    ts = fr(T.SOUR[0])
    cut(b, ts, 0.1)
    for k, m in enumerate([56, 59, 62]):
        b.add("piano", piano(F(m), 0.3, _r(), 0.9, honky=28.0, wobble=35.0), ts + 0.03 * k, 0.1)
    b.add("bass", lp(I.pluck(F(40), 0.55, _r(), dur=1.0, bright=0.05, pos=0.35), 900, 2), ts, 0.0)
    b.cue(ts, "ROTTEN @867: the band stops, a soured, badly out-of-tune piano cluster wobbles (E bass)")

    # 9 NAP 29.82 - 31.57: lullaby (half-time guitar + celesta 'Z's), then CUT @947 to the cheerful finish
    groove(b, 29.84, s(9) + fr(947 - 886) - 0.02, [("F6", 2), ("Bb6", 2)], layers=("gtr", "bass"), vel=0.6, half=True)
    for k, m in enumerate([84, 81, 77]):        # the Z bubbles rise @926; their notes wait for the gap after 'nap.' (31.28-31.58)
        b.add("celesta", I.celesta(F(m), 0.2, _r(), 1.0), 31.35 + 0.06 * k, 0.3 - 0.2 * k)
    b.cue(29.84, "NAP: a half-time lullaby - guitar + bass (F6 - Bb6)")
    b.cue(31.35, "Z bubbles (@926): three soft descending celesta notes (C A F) in the gap after 'nap.'")
    t947 = fr(947)
    groove(b, t947, s(10), [("F6", 2), ("C7", 2), ("F6", 4)], vel=0.9)
    chord_hit(b, fr(T.FINISH4), "F69", 0.32, 0.03, bass=False, dur=1.2)
    line(b, 32.67, [(0.0, 0.3, 76), (SW, 0.3, 74), (1.0, 1.0, 72)], 0.34, beat=0.15)
    b.cue(t947, "CUT @947 to the finish: the groove pops back in")
    b.cue(fr(T.FINISH4), "FOURTH @965: a cheerful soft F6/9 chord on the four fingers; the motif's tail (E D C) after 'fourth.'")

    # 10 DOGS 32.93 - 35.93: a skittering feel (walking bass, triplet shaker) but soft
    groove(b, s(10), 35.62, [("D7", 4), ("G7", 4), ("C7", 4)], layers=("gtr", "bass", "piano", "brush", "shaker"), vel=0.85, walk=True)
    cut(b, 35.62, 0.12)
    b.cue(s(10), "DOGS: the bass walks, triplet shaker, piano after-beats - skittering but soft (D7 G7 C7)")
    b.cue(35.62, "the band lets go after 'dogs' so the bark volley has the gap (35.66-36.07)")

    # 11 HICKS 35.93 - 42.43: woozy half-time, detuned piano; blips on each hand-off
    groove(b, 36.25, s(12), WOOZY, layers=("gtr", "bass", "piano", "brush"), vel=0.85, honky=16.0, wobble=18.0, half=True)
    b.cue(36.25, "HICKS: woozy half-time - piano more out of tune with a slow pitch sway, brushes swish (Gm7 C7 F6 Abdim7)")
    for k, (t, m) in enumerate([(fr(T.EGG), 79), (fr(T.FLASK), 81)]):     # (none on the bottle: 'strychnine' stays clear)
        b.add("pizz", I.pizz(F(m - 12), 0.34, _r(), 0.35), t + 0.02, 0.25)
    b.cue(fr(T.EGG), "EGG @1204 / FLASK @1235: a soft pizz blip on each hand-off, climbing (G A); the bottle @1246 gets none (keeps 'strychnine' clear)")
    line(b, 42.09, [(0, 0.3, 77), (0.5, 0.3, 76), (1.0, 0.3, 75), (1.5, 0.6, 74)], 0.3, beat=0.12, wobble=40.0, honky=20.0)
    b.cue(42.09, "a woozy chromatic slide down (F E Eb D) in the gap after 'strychnine.' (42.01-42.41)")

    # 12 HELD BREATH 42.43 - 44.37: thin to a pedal + soft repeated piano; @1304 everything but a held chord stops
    groove(b, s(12), fr(T.HELD_BREATH), [("C7", 4)], layers=("bass",), vel=0.6, half=True)
    for k in range(int((fr(T.HELD_BREATH) - s(12)) / (B / 2))):
        b.add("piano", piano(F(72), 0.12 + 0.02 * k, _r(), 0.18, 5.0), s(12) + k * B / 2, 0.2)
    cut(b, fr(T.HELD_BREATH), 0.2)
    for k, m in enumerate([52, 58, 62]):
        b.add("piano", piano(F(m), 0.16, _r(), 0.85, 5.0), fr(T.HELD_BREATH) + 0.01 * k, 0.2 - 0.15 * k)
    b.cue(s(12), "THE LONG LENS: bass pedal on C + a soft repeated piano C, slowly growing")
    b.cue(fr(T.HELD_BREATH), "HELD BREATH @1304: the band stops, one quiet held C7 shell on the piano, then near-silence to 'Unluckily'")

    # 13 CARRIED 44.37 - 47.17: lumbering half-time back in; warm chord on the tape, low 'plonk' medal
    groove(b, 44.40, fr(T.TAPE2), [("F6", 2), ("C7", 2)], layers=("gtr", "bass", "piano", "brush"), vel=0.8, half=True)
    line(b, fr(T.LIFT), [(0, 0.3, 65), (0.5, 0.3, 69), (1.0, 0.5, 72)], 0.26, beat=0.16)
    chord_hit(b, fr(T.TAPE2), "F69", 0.22, 0.035, dur=1.6)
    b.add("piano", piano(F(36), 0.5, _r(), 0.9, 6.0) + piano(F(48), 0.35, _r(), 0.9, 6.0), T.MEDAL, 0.0)
    b.add("celesta", I.celesta(F(84), 0.2, _r(), 1.2), T.MEDAL + 0.08, 0.3)
    b.cue(44.40, "CARRIED: a lumbering half-time (F6 - C7), guitar, bass, piano, brushes")
    b.cue(fr(T.LIFT), "LIFT @1378: a little piano step up (F A C)")
    b.cue(fr(T.TAPE2), "TAPE @1399: a warm F6/9 chord; MEDAL: a low piano octave 'plonk' (C2+C3) + a celesta glint in the gap after 'it.'")

    # 14 DROP-OUTS 47.17 - 50.23: a deflating chromatic line, thin band
    groove(b, 47.25, s(15) - 0.05, [("F6", 2), ("E7", 2), ("Bbm6", 2), ("F6", 2), ("C7", 4)], layers=("gtr", "bass", "piano", "shaker"), vel=0.8)
    line(b, 48.45, [(0, 0.3, 72), (0.5, 0.3, 71), (1.0, 0.8, 70)], 0.3, beat=0.08)
    line(b, 49.90, [(0, 0.3, 69), (0.5, 0.3, 68), (1.0, 0.4, 67), (1.5, 1.2, 65)], 0.3, beat=0.16)
    b.cue(47.25, "DROP-OUTS: thin band (F6 E7 Bbm6 F6 C7), a deflating line")
    b.cue(48.45, "piano 'deflate' C B Bb (gap after 'runners,'), then A Ab G F after 'finished.' (49.90-50.33)")

    # 15 BOSTON 50.23 - 56.0 (XF 1507): bright, warm; resolve on F6/9 at the wink; motif in the gaps
    tw = fr(T.WINK)
    groove(b, s(15) - 0.05, tw - 0.03, [("Bb6", 4), ("Bdim7", 4), ("F6", 2), ("D7", 2), ("G7", 2), ("C7", 2)], vel=1.0)
    line(b, 51.78, MOTIF[:3], 0.34, beat=0.13)
    line(b, 54.22, ANSWER, 0.32, beat=0.14)
    chord_hit(b, tw, "F69", 0.34, 0.04, dur=2.2)
    b.add("bass", lp(I.pluck(F(29), 0.6, _r(), dur=1.6, bright=0.05, pos=0.35), 900, 2), tw, 0.0)
    for k, m in enumerate([93, 96]):
        b.add("celesta", I.celesta(F(m), 0.3, _r(), 1.6), tw + 0.03 + 0.09 * k, 0.25)
    b.cue(s(15), "BOSTON (XF @1507): bright, full groove (Bb6 Bdim7 F6 D7 G7 C7)")
    b.cue(51.78, "the RAG motif's opening in the gap after 'car?' (51.76-52.15); the answer after 'Marathon.' (54.20-54.58)")
    b.cue(tw, "WINK @1660: warm resolve on F6/9 (rolled guitar, piano, low F) with a celesta 'ting' (A7 - C8)")
    end = np.ones(N)
    a = ns(55.2)
    end[a:] = np.linspace(1, 0, N - a) ** 1.3
    for k in b.tr:
        b.tr[k] *= end[None, :]
    return b


TARGET = {"gtr": 0.0, "piano": -3.0, "lead": -4.0, "bass": -2.0, "kick": -9.0, "brush": -14.0, "shaker": -16.0, "pizz": -5.0,
          "celesta": -8.0, "vibes": -8.0}
SEND = {"gtr": 0.12, "piano": 0.18, "lead": 0.2, "bass": 0.05, "kick": 0.03, "brush": 0.1, "shaker": 0.1, "pizz": 0.15,
        "celesta": 0.3, "vibes": 0.25}


def render(b, ref=-20.0):
    room = make_ir(1.1, 9, pre=0.012, hf=2.0)
    dry = np.zeros((2, N))
    wet = np.zeros(N)
    levels = {}
    for k, x in b.tr.items():
        if not np.any(x):
            continue
        L = integrated(x)
        g = dbg(ref + TARGET.get(k, -6) - L)
        levels[k] = (round(L, 1), round(ref + TARGET.get(k, -6), 1))
        x = x * g
        dry += x
        wet += SEND.get(k, 0.12) * x.mean(0)
    out = dry + 0.6 * convolve_st(wet, room)
    out = lp(hp(out, 35, 2), 9000, 1)          # soft, warm top
    return out, levels


SECTIONS = [  # (name, start, end) for the level automation in mix.py
    ("hook", 0.0, fr(T.FLASH)), ("car", fr(T.FLASH), fr(204)), ("start", fr(204), fr(340)), ("dust", fr(340), fr(449)),
    ("well", fr(449), fr(553)), ("finish", fr(553), fr(686)), ("flashback", fr(686), fr(T.STOP_DEAD)),
    ("dropout", fr(T.STOP_DEAD), fr(768) - 0.1), ("orchard", fr(768) - 0.1, fr(886)), ("nap", fr(886), fr(947)),
    ("fourth", fr(947), fr(988)), ("dogs", fr(988), fr(1078)), ("hicks", fr(1078), fr(1273)), ("breath", fr(1273), 44.40),
    ("carried", 44.40, fr(1415)), ("dropouts", fr(1415), fr(1507)), ("boston", fr(1507), T.DUR),
]
