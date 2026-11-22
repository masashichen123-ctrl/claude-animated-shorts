# Chill score for "The Time Lock" (the 1870s invention of the bank vault time lock). Same approved chill style as the
# other shorts' re-scores, new material, new key and feel: a laid-back, warm, sparse acoustic bed at 96 bpm (beat 0.625 s)
# with a light heist-comedy and Wild-West tinge. Fingerpicked nylon guitar, round upright bass (boom-chick two-beat, walking
# for the marches), brushes + shaker + a soft kick, a light banjo plink, a muted staccato pizzicato "tiptoe" motif (a creeping
# chromatic D-D#-D / A-A#-A) for the robbers, a soft woodblock / clave "tick-tock" on every beat of the clock sections, a soft
# upright piano, vibes and celesta for the warm resolves. D minor / Dorian by night, D major by day (D6, G6, A7, Bm7, Em7).
# All composed here (no existing melodies). Comedy beats are soft: a pizz toss + clank answer, a rising scoop run, three
# shaking-knee clave knocks, a golden D6/9 bloom as the vault door opens (the band holds / stops just before), a rising
# vibes "spark", falling pizz "wah-wah" for the failed turns and the face-palm, an accelerating woodblock run for the
# time-lapse and a tiny smug tick, a pizz stiff-legged guard march, and a warm D6/9 resolve with a "ting" on the wink.
import numpy as np
from dsp import SR, TAU, ns, tt, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp, fades
import instruments as I
import timeline as T

N = ns(T.DUR)
BPM = T.BPM
B = 60.0 / BPM            # one beat = 0.625 s
SW = 0.58                 # lightly swung eighth (fraction of a beat)
F = I.m2f
fr = T.fr

_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "Bb": 10, "B": 11, "F#": 6}
_Q = {"M6": [0, 4, 7, 9], "m7": [0, 3, 7, 10], "7": [0, 4, 7, 10], "M69": [0, 4, 7, 9, 14], "maj7": [0, 4, 7, 11],
      "m": [0, 3, 7, 12], "m9": [0, 3, 7, 10, 14], "dim7": [0, 3, 6, 9], "sus": [0, 5, 7, 10], "M": [0, 4, 7, 12],
      "6": [0, 4, 7, 9], "m6": [0, 3, 7, 9]}
NAMES = {"Dm": ("D", "m"), "Dm7": ("D", "m7"), "Dm9": ("D", "m9"), "D6": ("D", "M6"), "D69": ("D", "M69"), "D": ("D", "M"),
         "G6": ("G", "M6"), "Gm": ("G", "m"), "Gm7": ("G", "m7"), "G7": ("G", "7"), "A7": ("A", "7"), "Asus": ("A", "sus"),
         "Bb": ("Bb", "maj7"), "Bm7": ("B", "m7"), "Em7": ("E", "m7"), "C6": ("C", "M6"), "A": ("A", "M"), "Cdim7": ("C", "dim7"),
         "Bdim7": ("B", "dim7"), "F#7": ("F#", "7"), "Gmaj7": ("G", "maj7"), "G69": ("G", "M69"), "Dm6": ("D", "m6"), "Am7": ("A", "m7")}


def chord(name):
    r, q = NAMES[name]
    pc, iv = _PC[r], _Q[q]
    bass = 36 + pc
    g_root = bass + 12 if bass < 40 else bass
    up = sorted(52 + ((pc + i - 52) % 12) for i in iv[1:])
    fing = [m + 12 if m < 55 else m for m in up]
    return bass, up, [g_root, g_root + 7 if g_root + 7 < 57 else g_root - 5, fing[0], fing[1 % len(fing)], fing[-1]]


R = rng(1874)


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
        self.tr, self.cues, self.cuts = {}, [], []

    def add(self, name, x, t, p=0.0, g=1.0):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
        place(self.tr[name], pan(x, p) if np.ndim(x) == 1 else x, t, g)

    def cue(self, t, d):
        self.cues.append((t, d))




def groove(b, t0, t1, chords, layers=("gtr", "bass", "brush", "shaker"), vel=1.0, honky=7.0, half=False, walk=False, tick=False,
           rise=0.0):
    """lay the band from t0 to t1 on the 0.625 s beat grid anchored at t0; chords = names (4 beats each, looped) or (name, beats)
    pairs. gtr: fingerpicked (thumb on the beats, fingers on the off-eighths); bass: boom-chick in two (root, fifth), `walk` walks
    the quarters; brush on 2 and 4; shaker on the eighths; kick on 1 (and 3); piano comps soft after-beats; banjo plinks the
    off-eighths of 2 and 4; `tick` = soft woodblock / clave tick-tock on every beat (alternating pitch)"""
    seq = [(c, 4) if isinstance(c, str) else c for c in chords]
    tb, i, k = t0, 0, 0
    while tb < t1 - 0.05:
        name, nb = seq[i % len(seq)]
        root, pv, gt = chord(name)
        nxt = chord(seq[(i + 1) % len(seq)][0])[0]
        beat = 0
        while beat < nb:
            t = tb + beat * B
            if t >= t1 - 0.02:
                break
            v = vel * (1 + rise * (t - t0) / max(t1 - t0, 1e-6))
            off = t + SW * B
            if "gtr" in layers and (not half or beat % 2 == 0):
                b.add("gtr", I.pluck(F(gt[0] if beat % 2 == 0 else gt[1]), 0.55 * v * R.uniform(0.9, 1.05), _r(), dur=1.2, bright=0.25, pos=0.22), t + R.normal(0, 0.005), -0.3)
                if off < t1 - 0.02:
                    b.add("gtr", I.pluck(F(gt[2 + (beat % 3)]), 0.38 * v * R.uniform(0.85, 1.05), _r(), dur=0.9, bright=0.3, pos=0.2), off + R.normal(0, 0.007), -0.35)
            if "piano" in layers and beat in (1, 3) and (not half or beat == 1):
                for j, m in enumerate(pv[:4]):
                    b.add("piano", piano(F(m), 0.28 * v * R.uniform(0.85, 1.0), _r(), 0.3 if not half else 0.9, honky),
                          t + 0.03 + 0.008 * j + R.normal(0, 0.004), 0.3 - 0.12 * j)
            if "bass" in layers:
                if walk:
                    m = [root, root + 7, root + 12 if root + 12 < 48 else root, nxt - 1 if nxt - 1 > root else nxt + 1][beat % 4]
                    hit = True
                else:
                    m = root if beat == 0 else root + 7
                    hit = beat in ((0,) if half else (0, 2))
                if hit:
                    m = m - 12 if m > 47 else m
                    b.add("bass", lp(I.pluck(F(m), 0.8 * v, _r(), dur=1.1 if not half else 1.8, bright=0.05, pos=0.35), 900, 2), t + 0.01, 0.0)
            if "banjo" in layers and beat in (1, 3):
                b.add("banjo", I.banjo(F(gt[2 + (beat // 2)] + 12), 0.32 * v * R.uniform(0.85, 1.05), _r(), 0.5, 0.5), off + 0.01, 0.35)
            if "kick" in layers and beat in ((0,) if half else (0, 2)):
                b.add("kick", I.soft_kick(0.5 * v, _r()), t)
            if "brush" in layers and beat in (1, 3):
                b.add("brush", I.brush(0.4 * v, _r(), dur=0.4 if not half else 0.7, swish=True), t - 0.08, 0.15)
            if "shaker" in layers:
                b.add("shaker", I.shaker(0.3 * v, _r()), t, 0.4)
                if off < t1 - 0.02:
                    b.add("shaker", I.shaker(0.18 * v, _r()), off, 0.4)
            if "wood" in layers:
                b.add("wood", I.woodblock(0.5 * v * (1.0 if k % 2 == 0 else 0.8), _r(), 1150.0 if k % 2 == 0 else 880.0, 0.12), t, 0.1 if k % 2 == 0 else -0.1)
            beat += 1
            k += 1
        tb += nb * B
        i += 1


def line(b, t0, notes, vel=0.42, beat=None, p=0.1, honky=7.0, track="lead"):
    """the piano right hand: notes = [(offset beats, length beats, midi)]"""
    bt = beat or B
    for e, d, m in notes:
        b.add(track, piano(F(m), vel * R.uniform(0.92, 1.03), _r(), d * bt, honky), t0 + e * bt + R.normal(0, 0.004), p)


def sparkle(b, t, notes, vel=0.25, p=0.3, gap=0.09, inst="celesta", dur=0.8):
    for k, m in enumerate(notes):
        x = I.celesta(F(m), vel, _r(), dur) if inst == "celesta" else I.vibes(F(m), vel, _r(), dur=dur, trem_depth=0.12)
        b.add(inst, x, t + k * gap, p)


def pizz_run(b, t0, notes, gap=0.1, vel=0.4, p=0.1, dur=0.45):
    for k, m in enumerate(notes):
        b.add("pizz", I.pizz(F(m), vel * R.uniform(0.92, 1.05), _r(), dur), t0 + k * gap, p)


def cut(b, t, fade=0.06):
    """fade every track out at t (only what is already written: later material is added after the cut)"""
    b.cuts.append(t)
    g = np.ones(N)
    a = ns(t)
    g[a:a + ns(fade)] = np.linspace(1, 0, ns(fade)) ** 1.5
    g[a + ns(fade):] = 0
    for k in b.tr:
        b.tr[k] *= g[None, :]


def chord_hit(b, t, name, vel=0.4, strum=0.05, bass=True, dur=1.8, honky=7.0, vibes=False):
    """a warm sustained chord: rolled guitar, piano, low bass (optionally vibes on top)"""
    root, pv, gt = chord(name)
    for k, m in enumerate(gt):
        b.add("gtr", I.pluck(F(m), 0.45 * vel / 0.4, _r(), dur=dur, bright=0.25), t + strum * k, -0.3)
    for k, m in enumerate(pv[:4]):
        b.add("piano", piano(F(m), vel, _r(), dur * 0.9, honky), t + 0.012 * k, 0.3 - 0.12 * k)
    if bass:
        b.add("bass", lp(I.pluck(F(root if root <= 47 else root - 12), 0.8, _r(), dur=dur, bright=0.05, pos=0.35), 900, 2), t, 0.0)
    if vibes:
        for k, m in enumerate(pv[1:3]):
            b.add("vibes", I.vibes(F(m + 12), vel * 0.5, _r(), dur=min(dur, 1.0) if dur < 2 else dur, trem_depth=0.1), t + 0.02 * k, 0.25)


def bass_note(b, t, m, vel=0.7, dur=1.0):
    b.add("bass", lp(I.pluck(F(m), vel, _r(), dur=dur, bright=0.05, pos=0.35), 900, 2), t, 0.0)


TIPTOE = [(0.0, 62), (0.5, 63), (1.0, 62), (2.0, 57), (2.5, 58), (3.0, 57)]       # the robbers' creeping chromatic motif (beats, midi)


def tiptoe(b, t0, beat, n=6, vel=0.34, octave=0, p0=-0.35):
    for k, (e, m) in enumerate(TIPTOE[:n]):
        b.add("pizz", I.pizz(F(m + octave), vel * (1.0 if k % 3 == 0 else 0.8), _r(), 0.16), t0 + e * beat, p0 + 0.7 * (k % 2))


def build():
    b = Band()
    s = lambda i: T.shot_t(i)[0]
    tfl = fr(T.FLASH)

    # 1 HOOK 0 - 6.10: moonlit street, then the bedroom. Dm / Bb: fingerpicked guitar + upright bass, no drums
    groove(b, 0.3, 4.18, [("Dm9", 4), ("Bb", 4)], layers=("gtr", "bass"), vel=0.6)
    b.cue(0.0, "NIGHT STREET: moonlit and sparse - fingerpicked nylon guitar + upright bass (Dm9 Bb), no drums; crickets and a far owl in the SFX")
    sparkle(b, 1.0, [86], 0.09, 0.3, 0.1, "vibes")
    b.add("pizz", I.pizz(F(50), 0.3, _r(), 0.3), fr(T.CROWBAR) + 0.03, -0.2)
    b.add("pizz", I.pizz(F(43), 0.28, _r(), 0.3), T.CLANK_T + 0.02, 0.2)
    b.cue(fr(T.CROWBAR), "CROWBAR @126: a soft falling pizz 'toss' (D3), answered by a low pizz (G2) on the clank in the gap after 'vaults.' (4.67-4.96)")
    tiptoe(b, fr(T.TIPTOE[0]) + 0.31, 0.3125, 6, 0.26)
    groove(b, fr(T.CROWBAR), fr(T.CUT_BED) - 0.03, [("Dm", 4)], layers=("gtr", "bass"), vel=0.42)
    b.cue(fr(T.TIPTOE[0]) + 0.31, "TIPTOE @126-150: the robbers' muted pizzicato motif (D D# D - A A# A, staccato, wandering L / R) over a hushed guitar")
    groove(b, fr(T.CUT_BED), tfl - 0.04, [("Dm9", 8)], layers=("gtr", "bass"), vel=0.36, half=True)
    for k, m in enumerate([81, 74]):
        b.add("celesta", I.celesta(F(m), 0.13, _r(), 1.0), fr(T.CUT_BED) + 0.5 + 0.55 * k, 0.3)
    b.cue(fr(T.CUT_BED), "BEDROOM @150: slow half-time Dm9, a candle-flicker celesta glint (A5 D5); the banker snores")
    for m in [86, 90, 93, 98]:
        x = I.vibes(F(m), 0.22, _r(), dur=0.5, trem_depth=0.1)[::-1]
        b.add("vibes", fades(x, 0.15, 0.02), tfl - len(x) / SR, 0.2)
    cut(b, tfl, 0.04)
    b.cue(tfl, "FLASH @183: a soft reversed-vibes shimmer swells into the frame; the band stops on it")

    # 2 PLAN 6.10 - 9.17: a conspiratorial skip: D Dorian, pizz motif, scoop
    groove(b, 6.18, 7.64, [("Dm7", 4), ("G6", 4)], layers=("gtr", "bass", "brush", "shaker"), vel=0.7)
    b.cue(6.18, "THE PLAN: a conspiratorial little skip - guitar, bass, brushes, shaker (Dm7 G6), light and sneaky")
    pizz_run(b, T.SCOOP_T, [62, 66, 69, 74], 0.075, 0.3, 0.2)
    b.add("pizz", I.pizz(F(38), 0.36, _r(), 0.3), fr(T.SCOOP) + 0.03, -0.1)
    b.cue(T.SCOOP_T, "SCOOP @239: a quick rising pizz run (D F# A D) in the gap before 'Grab' (7.66-7.97) and a low pizz 'flop' (D2) on the frame")
    # 3 MARCH 7.97 - 12.17: a creeping walk, in step with the boots
    groove(b, fr(T.SCOOP) + 0.05, 10.28, [("Dm", 4), ("A7", 4)], layers=("gtr", "bass", "brush", "shaker", "kick"), vel=0.75, walk=True)
    tiptoe(b, 9.17, B, 6, 0.22, -12)
    b.cue(fr(T.MARCH[0]), "NIGHT MARCH @275-330: a steady walking bass, soft kick and brushes on every beat at 96 bpm in step with the boots (Dm A7), the tiptoe motif an octave down")
    groove(b, 10.62, 11.74, [("Gm", 2), ("A7", 2)], layers=("gtr", "bass", "brush"), vel=0.6, walk=True)
    chord_hit(b, 11.80, "A7", 0.24, 0.04, dur=1.0)
    b.cue(11.80, "ARRIVAL @330: a held A7 in the gap after 'door.' (11.73-12.18)")

    # 4 VAULT 12.17 - 14.6: hushed, huge: a low drone, a few high glints, no rhythm
    root, pv, gt = chord("Dm9")
    bass_note(b, 12.2, 26, 0.7, 2.4)
    b.add("piano", piano(F(38), 0.3, _r(), 1.6, 6.0) + piano(F(45), 0.22, _r(), 1.6, 6.0), 12.2, 0.0)
    for tm, m, p in ((12.9, 93, 0.3), (13.45, 88, -0.2), (13.95, 91, 0.2)):
        b.add("celesta", I.celesta(F(m), 0.12, _r(), 1.4), tm, p)
    b.add("gtr", I.pluck(F(62 + 12), 0.2, _r(), dur=1.6, bright=0.1), 13.2, -0.3)
    b.cue(fr(T.VAULT[0]), "THE VAULT @365-374: hushed and huge - a low D / A piano drone and bass, three high celesta glints, no rhythm (the door's groan is the SFX)")

    # 5 KEY 14.6 - 17.4: trembling, the hold, the golden bloom
    tk = fr(T.KEYJ[0])
    for k in range(4):
        b.add("pizz", I.pizz(F(69 + (k % 2) * 1), 0.2, _r(), 0.08), 14.84 + k * 0.07, 0.1)
    b.cue(14.84, "KEY @438-462: a trembling pizz shiver (A4 A#4 alternating 16ths) in the gap after 'key,' (14.79-15.23)")
    for k, (tm, f_) in enumerate(((15.45, 1150.0), (15.62, 880.0), (15.85, 1150.0), (16.02, 880.0))):
        b.add("wood", I.woodblock(0.42, _r(), f_, 0.1), tm, -0.2 + 0.4 * (k % 2))
    b.cue(15.45, "KNEES @462: four soft clave knocks (the banker's knees knocking) under 'scared banker'")
    bass_note(b, 15.1, 33, 0.5, 1.6)
    cut(b, 16.05, 0.08)
    b.add("bass", lp(I.pluck(F(38), 0.2, _r(), dur=1.0, bright=0.03, pos=0.4), 700, 2), 16.12, 0.0)
    b.add("pad", I.pad([F(50), F(57), F(62)], 0.9, 0.04, _r(), att=0.35, rel=0.4, warm=700), 16.1, 0.0)
    b.cue(16.05, "HOLD @484-493: the band stops dead before the wheel turns; only a quiet low D and a thin pad hold under the groan and the door's creak")
    chord_hit(b, T.OPEN_T, "D69", 0.34, 0.045, dur=0.5, vibes=True)
    sparkle(b, T.OPEN_T + 0.04, [81, 86, 90, 93], 0.16, 0.3, 0.08, "celesta", 0.45)
    b.cue(T.OPEN_T, "DOOR OPENS @493 (golden light): a warm D6/9 blooms in the gap after 'anything.' (16.90-17.49), rolled guitar + piano + vibes + a rising celesta run")

    # 6 WORKSHOP 17.4 - 24.73: warm, clinking, G major
    groove(b, 17.5, 20.45, [("G6", 4), ("Em7", 4)], layers=("gtr", "bass", "brush", "shaker", "piano"), vel=0.45, rise=1.0)
    b.cue(17.5, "SARGENT'S WORKSHOP (XF @522): warm and busy - guitar, bass, brushes, shaker, soft piano after-beats (G6 Em7), vibes 'gear' plinks")
    for tm, m in ((18.2, 91), (18.82, 88), (19.45, 86)):
        b.add("vibes", I.vibes(F(m), 0.14, _r(), dur=0.5, trem_depth=0.05), tm, 0.25)
    sparkle(b, T.SPARK_T, [81, 86, 90, 93], 0.26, 0.3, 0.07, "vibes", 0.45)
    b.cue(T.SPARK_T, "SPARK @594: a rising vibes 'ting' arpeggio (A5 D6 F#6 A6) in the gap after 'idea.' (20.50-20.84)")
    groove(b, 20.86, 22.80, [("C6", 4), ("D", 4)], layers=("gtr", "bass", "shaker"), vel=0.6)
    for k in range(6):
        b.add("pizz", I.pizz(F(79 + [0, 2, 4, 5, 7, 5][k]), 0.1, _r(), 0.1), 21.7 + k * 0.17, 0.2)
    b.cue(21.7, "SCRIBBLE @625-658: a soft light pizz run (G5 up and down) like a pencil racing")
    pizz_run(b, 22.86, [57, 52], 0.18, 0.3, -0.1, 0.5)
    b.cue(22.86, "KEYHOLE @676: a rueful two-note pizz (A3 E3) in the gap after 'open.' (22.84-23.25)")
    groove(b, 23.28, 24.06, [("G6", 4)], layers=("gtr", "bass", "shaker"), vel=0.6)
    rs = rng(722)
    for k in range(10):
        b.add("celesta", I.celesta(F(int(rs.choice([79, 83, 86, 88, 91, 95]))), 0.1, _r(), 0.6), fr(T.SCREW) + 0.02 + k * 0.045 + rs.uniform(0, 0.02), rs.uniform(-0.5, 0.5))
    b.cue(fr(T.SCREW), "SPRINGS @722: a spill of random tiny celesta notes (the springs and gears falling)")
    pizz_run(b, fr(T.ASSEMBLE[0]) - 0.1, [50, 54, 57, 62, 66], 0.07, 0.18, 0.1)
    b.cue(fr(T.ASSEMBLE[0]) - 0.1, "ASSEMBLE @742-750: a quick rising pizz run (D3 F#3 A3 D4 F#4) that lands on the first tick")

    # 7 CLOCK 25.0 - 31.17: the tick-tock groove (96 bpm grid anchored at 25.0, the SFX ticks sit on the same beats)
    g0 = T.GRID0
    groove(b, g0, 31.14, [("Dm7", 4), ("G6", 4), ("Dm7", 4), ("Asus", 4)], layers=("gtr", "bass", "brush", "wood", "piano"), vel=0.7, half=False)
    b.cue(g0, "THE CLOCK GROOVE @750-935: a soft woodblock / clave tick-tock on every beat (96 bpm, alternating pitch), bass in two, muted guitar, brush after-beats, a few piano chords (Dm7 G6 Dm7 Asus); the SFX ticks sit on the same beats")
    b.add("wood", I.woodblock(0.6, _r(), 1500.0, 0.08), fr(T.BOLT) + 0.0, 0.2)
    b.cue(fr(T.BOLT), "BOLT @798: a tiny extra clave 'tok' (the bolt locks)")
    for tm, base in ((fr(T.FAIL1) + 0.04, 50), (fr(T.FAIL2) - 0.04, 48)):
        pizz_run(b, tm, [base, base - 1, base - 2], 0.12, 0.3, -0.1, 0.4)
    b.cue(fr(T.FAIL1) + 0.04, "FAILED TURNS @840 / @887: a soft falling pizz 'wah-wah' (D3 C#3 C3 / C3 B2 Bb2) under the clacks")
    pizz_run(b, T.SIGH_T, [78, 74, 71], 0.2, 0.28, 0.2, 0.7)
    for k, m in enumerate([66, 62]):
        b.add("vibes", I.vibes(F(m), 0.14, _r(), dur=0.8, trem_depth=0.05), T.SIGH_T + 0.7 + 0.2 * k, 0.2)
    b.cue(T.SIGH_T, "SIGH @910: a falling pizz sigh (F#5 D5 B4) in the gap after 'asking.' (30.76-31.20), the ticking carries on")

    # 8 MORRISON 31.17 - 37.12: bright prairie day, D major, banjo, boom-chick
    t8 = fr(935)
    chord_hit(b, t8 + 0.05, "D6", 0.3, 0.045, dur=1.6)
    groove(b, t8 + 0.7, 33.0, [("D6", 4), ("G6", 4)], layers=("gtr", "bass", "brush", "shaker", "banjo", "kick"), vel=0.85)
    b.cue(t8, "MORRISON, ILLINOIS (XF @935): a warm D6 chord, then a bright prairie boom-chick - guitar, upright bass, brushes, shaker, soft kick, light banjo plinks (D6 G6)")
    line(b, 33.04, [(0, 0.4, 66), (0.5, 0.4, 69), (1.0, 0.4, 74), (1.6, 0.8, 71)], 0.3, beat=0.2, track="lead")
    b.cue(33.04, "a little prairie tune (F# A D B) in the gap after '1874,' (33.00-33.37)")
    groove(b, 33.40, fr(T.BOLTON) + 0.02, [("A7", 4), ("D6", 4)], layers=("gtr", "bass", "brush", "shaker", "banjo", "kick"), vel=0.85)
    bass_note(b, fr(T.BOLTON) + 0.02, 38, 0.7, 1.0)
    b.cue(fr(T.BOLTON), "BOLTING ON @1034: a low D bass accent")
    groove(b, 34.60, 36.07, [("G6", 4), ("A7", 4)], layers=("gtr", "bass", "brush", "shaker", "banjo"), vel=0.8)
    b.add("vibes", I.vibes(F(98), 0.2, _r(), dur=0.5, trem_depth=0.05), T.SNIP_T + 0.04, 0.3)
    b.cue(T.SNIP_T, "RIBBON SNIP @1087: a tiny bright vibes 'ting' (G7) on the snip in the micro-gap before 'Illinois'")
    line(b, 36.68, [(0, 0.3, 74), (0.5, 0.3, 78), (1.0, 0.3, 81), (1.5, 0.9, 86)], 0.3, beat=0.15, track="lead")
    chord_hit(b, 36.72, "D6", 0.26, 0.04, dur=1.2, bass=False)
    b.cue(36.68, "RESOLVE: a rising D F# A D run + a D6 chord in the gap after 'Illinois.' (36.62-37.08)")

    # 9 RETURN 37.12 - 41.4: night again, the tiptoe motif returns; the failed turn; the face-palm
    t9 = 37.14
    groove(b, t9, 38.72, [("Dm", 4), ("A7", 4)], layers=("gtr", "bass", "brush", "kick"), vel=0.65, walk=True)
    tiptoe(b, t9 + 0.05, B, 6, 0.24, -12)
    b.cue(t9, "NIGHT RETURN @1114-1151: a creeping walk again, the tiptoe motif (D D# D A A# A) an octave down under 'kidnapping no longer worked' (Dm A7)")
    pizz_run(b, 38.83, [45, 44, 43], 0.065, 0.32, -0.1, 0.4)
    b.cue(38.83, "FAILED TURN @1172: a low falling pizz (A2 G#2 G2) in the gap before 'Unluckily'")
    groove(b, 39.12, 40.12, [("Dm", 4)], layers=("gtr", "bass"), vel=0.4, half=True)
    pizz_run(b, T.PALM_T + 0.03, [57, 50], 0.14, 0.34, 0.1, 0.4)
    b.cue(T.PALM_T, "FACE-PALM @1210: a short pizz 'bonk' (A3 D3) in the micro-gap before 'neither'")
    for k, m in enumerate([65, 64, 63, 62]):
        b.add("vibes", I.vibes(F(m), 0.22, _r(), dur=0.5 if k < 3 else 1.0, trem_depth=0.05), 40.95 + k * 0.13 + (0.05 if k == 3 else 0), 0.15)
    b.cue(40.95, "SAD TROMBONE: soft vibes 'wah-wah-wah-wahhh' (F E Eb D) in the gap after 'he.' (40.91-41.46)")
    # 10 WAIT 41.4 - 45.08
    groove(b, 41.50, 42.20, [("Dm7", 4)], layers=("gtr", "bass", "brush", "wood"), vel=0.45)
    b.cue(41.50, "THE WAITING (@1241): the clock groove returns, quieter - guitar, bass, brush, soft clave (Dm7)")
    b.add("timp", I.timpani(F(38), 0.4, _r(), 0.6), fr(T.FIST) + 0.0, 0.0)
    b.cue(fr(T.FIST), "FIST @1260: a soft low timpani 'dum' (D2)")
    
    pizz_run(b, fr(T.ROPE) + 0.0, [45, 50], 0.12, 0.3, 0.2, 0.3)
    b.cue(fr(T.ROPE), "ROPE @1283: a 'bloop-bloop' pizz tie (A2 D3)")
    acc = T.acc_times()
    for k, tm in enumerate(acc):
        b.add("wood", I.woodblock(0.26 + 0.015 * k, _r(), 1150.0 if k % 2 == 0 else 880.0, 0.1), tm, 0.2 * (1 if k % 2 else -1))
    for k in range(len(acc) + 2):
        b.add("vibes", I.vibes(F(62 + 2 * k + (1 if k > 4 else 0)), 0.09, _r(), dur=0.4, trem_depth=0.05), fr(T.LAPSE[0]) + 0.05 + k * 0.125, 0.3)
    b.cue(fr(T.LAPSE[0]), "TIME-LAPSE @1303-1325: accelerating woodblock ticks (0.20 s -> 0.04 s apart) with a rising vibes run (D up in tones) - cards, knitting, cobwebs, a bird")
    b.add("wood", I.woodblock(0.3, _r(), 1300.0, 0.09), fr(T.SMUG), 0.1)
    b.cue(fr(T.SMUG), "SMUG TICK @1342: one tiny woodblock tick on 'care'")
    b.add("vibes", I.vibes(F(86), 0.16, _r(), dur=0.9, trem_depth=0.05), T.SMUG_T2 + 0.03, 0.25)
    b.add("wood", I.woodblock(0.3, _r(), 1300.0, 0.09), T.SMUG_T2, 0.1)
    b.cue(T.SMUG_T2, "a second, smugger tick + a vibes D6 in the gap after 'care.' (45.08-45.66)")

    # 11 QUEUE 45.66 - 47.67: cheerful bustle
    groove(b, 45.68, 47.10, [("D6", 4), ("A7", 4)], layers=("gtr", "bass", "brush", "shaker", "banjo", "kick"), vel=0.85, walk=True)
    b.cue(45.68, "THE QUEUE @1373: a cheerful bustle - walking bass, guitar, banjo, brushes, shaker, soft kick (D6 A7)")
    sparkle(b, 47.27, [74, 78, 81, 86], 0.2, 0.3, 0.07, "vibes", 0.3)
    chord_hit(b, 47.50, "D69", 0.22, 0.02, dur=0.2, bass=False)
    b.cue(47.27, "COINS @1403: a rising vibes run (D F# A D) + a D6/9 chord in the gap after 'one.' (47.12-47.70)")

    # 12 MODERN VAULT 47.67 - 53.0: calm bright clock groove, the guard clock, the wink, the warm resolve
    t12 = fr(1430)
    groove(b, t12 + 0.02, 49.52, [("D69", 4), ("G6", 4)], layers=("gtr", "bass", "brush", "wood", "piano"), vel=0.35, rise=1.6)
    b.cue(t12, "MODERN VAULT (XF @1430): the tick-tock groove returns, brighter - clave, guitar, bass, brush, soft piano (D6/9 G6)")
    groove(b, 49.90, fr(T.STEPS) - 0.05, [("Bm7", 4), ("Em7", 4)], layers=("gtr", "bass", "brush", "wood"), vel=0.7)
    sparkle(b, 49.58, [86, 90, 93], 0.14, 0.3, 0.1, "vibes", 0.3)
    b.cue(49.58, "a vibes glint (D6 F#6 A6) in the gap after 'locks.' (49.55-49.86)")
    tg = fr(T.STEPS)
    for k in range(6):
        b.add("pizz", I.pizz(F(50 if k % 2 == 0 else 57), 0.26, _r(), 0.13), tg + 0.02 + k * B / 2, -0.15 + 0.3 * (k % 2))
    groove(b, tg + 3 * B / 1, T.WINK_T - 0.05, [("G6", 4)], layers=("gtr", "bass"), vel=0.45, half=True)
    b.cue(tg, "GUARD CLOCK @1504: stiff little pizz steps (D3 A3, eighths) under 'security guard', then a hushed G6 hold for the stare")
    chord_hit(b, T.WINK_T - 0.03, "D69", 0.34, 0.05, dur=2.6, vibes=True)
    b.add("vibes", I.vibes(F(93), 0.3, _r(), dur=2.0, trem_depth=0.1), T.WINK_T, 0.25)
    sparkle(b, T.WINK_T + 0.2, [86, 90, 93, 98], 0.14, 0.3, 0.12, "celesta")
    bass_note(b, T.WINK_T - 0.03, 38, 0.6, 2.4)
    b.cue(T.WINK_T, "WINK @1551: a warm D6/9 resolve (rolled guitar, piano, vibes, low D) right after 'clock.', a vibes 'ting' on A6 over the SFX wink, a last celesta run, ringing out to the end")
    end = np.ones(N)
    a = ns(52.3)
    end[a:] = np.linspace(1, 0, N - a) ** 1.4
    for k in b.tr:
        b.tr[k] *= end[None, :]
    return b


TARGET = {"gtr": 0.0, "piano": -3.0, "lead": -4.0, "bass": -2.0, "kick": -9.0, "brush": -14.0, "shaker": -16.0, "pizz": -5.0,
          "celesta": -8.0, "vibes": -8.0, "banjo": -9.0, "wood": -12.0, "pad": -9.0, "timp": -15.0}
SEND = {"gtr": 0.12, "piano": 0.18, "lead": 0.2, "bass": 0.05, "kick": 0.03, "brush": 0.1, "shaker": 0.1, "pizz": 0.15,
        "celesta": 0.3, "vibes": 0.25, "banjo": 0.15, "wood": 0.08, "pad": 0.3, "timp": 0.2}


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
    ("night", 0.0, fr(T.FLASH)), ("plan", fr(T.FLASH), 9.17), ("march", 9.17, fr(365)), ("vault", fr(365), 14.6),
    ("key", 14.6, 16.05), ("hold", 16.05, 16.9), ("bloom", 16.9, fr(522)), ("shop", fr(522), 24.7), ("clock", 24.7, fr(935)), ("morrison", fr(935), 37.12),
    ("return", 37.12, 41.4), ("wait", 41.4, 45.1), ("queue", 45.1, fr(1430)), ("modern", fr(1430), T.WINK_T), ("end", T.WINK_T, T.DUR),
]
