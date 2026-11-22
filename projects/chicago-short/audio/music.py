# Chill score for "Chicago Lifts a Hotel" (1861) (same approved chill style as the marathon / emu / bat / whale re-scores, new
# material, new key and feel). A laid-back, warm, sparse acoustic bed at 88 bpm with swung eighths and a light 1860s parlour
# flavour: a soft honky-tonk upright piano (two slightly detuned strings per note, felt-soft hammers) playing lazy offbeat
# comping and a little syncopated tune, fingerpicked nylon guitar, round upright bass (two-beat, walking for the work shots),
# brushes + shaker + a soft kick (no snare cracks, no crashes, no rolls) and a light banjo plink. G major, parlour loops
# (G6 E7 A7 D7, G6 C6 G6 D7, G6 Em7 Am7 D9sus ...), and a rocking 6/8 (80 dotted-quarter bpm, one bar = 1.5 s, the rails'
# "ta-dak" every 0.75 s) for the sleeping car. All composed here (no existing melodies).
# Comedy beats are soft: a rising 3-note lift in the hook gap and a reversed vibes shimmer into the flash @196, a frog-plop pizz and
# a banjo 'plink-plink' @250, pizz bloops for the puddle, a sad 3-note pizz for the doctor @427, a low piano 'dun' for the gavel @496
# and the gasp @541, a dull low piano 'plonk' for the head bonk @685, an ascending pizz chain for the handshakes, a low bass
# accent for the jackscrew @974, three rising piano steps (one per turn) in the gaps @1142 / 1168 / 1194, a fanfare chord + celesta
# run @1276, a celesta lullaby for the sleeper @1385, a bright chord at the desk bell @1409, a pizz 'ting' for the wink @1550, a
# rocking 6/8 for the sleeping car and a warm resolve on G6/9 after 'them.'
import numpy as np
from dsp import SR, TAU, ns, tt, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp, fades
import instruments as I
import timeline as T

N = ns(T.DUR)
BPM = 88.0
B = 60.0 / BPM            # one beat = 0.682 s
SW = 2 / 3                # swung eighth
F = I.m2f
fr = T.fr

# chord: (bass root, piano comp voicing, guitar picking notes [thumb, thumb 2, finger, finger]); defined in F then moved up a tone to G
_F = {
    "6": (41, [57, 60, 62, 65], [41, 48, 57, 62]),        # F6
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
}
_MAP = {"G6": "6", "E7": "D7", "A7": "G7", "D7": "C7", "C6": "Bb6", "Cdim7": "Bdim7", "Em7": "Dm7", "Am7": "Gm7",
        "D9sus": "C9sus", "Bm7": "Am7", "G69": "F69", "Gmaj9": "Fmaj9"}
CH = {k: (v[0] + 2, [m + 2 for m in v[1]], [m + 2 for m in v[2]]) for k, v in ((nm, _F[src]) for nm, src in _MAP.items())}
CH["B7"] = (47, [54, 57, 59, 63], [47, 54, 57, 63])
CH["Cmaj7"] = (36, [55, 59, 62, 64], [48, 55, 59, 64])

RAG = ["G6", "E7", "A7", "D7"]                 # the parlour circle I - VI7 - II7 - V7
LAZY = ["G6", "C6", "G6", "D7"]
SUN = ["G6", "Em7", "Am7", "D9sus"]
SWAMP = ["Em7", "Am7", "B7", "Em7"]
WOOZY = ["Am7", "D7", "G6", "Cdim7"]

# the TUNE (piano right hand): a lazy syncopated 'G A B . D . C B A' (offset beats, length, midi)
MOTIF = [(0.0, 0.4, 67), (SW, 0.3, 69), (1.0, 0.4, 71), (2.0, 0.9, 74), (3 + SW, 0.3, 72), (4.0, 0.3, 71), (4 + SW, 1.2, 69)]
ANSWER = [(0.0, 0.3, 79), (SW, 0.3, 76), (1.0, 0.9, 74)]

R = rng(1861)


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
            if "banjo" in layers and beat in (1, 3):
                b.add("banjo", I.banjo(F(gt[2 + (beat // 2)] + 12), 0.34 * vel * R.uniform(0.85, 1.05), _r(), 0.5, 0.5), t + SW * B + 0.01, 0.35)
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
    b.cuts.append(t)
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




B68 = 0.75                # one dotted-quarter beat of the 6/8 (bar = 1.5 s)


def groove68(b, t0, t1, chords, layers=("gtr", "bass", "piano", "brush", "shaker"), vel=1.0, honky=6.0):
    """the rocking 6/8 of the railway: one chord per bar (1.5 s), fingerpicked arpeggio in eighths (0.25 s), bass on 1 and 4
    ('da-dum' = the rails' 'ta-dak', 0.75 s), brushes on 1 and 4, a soft shaker on the eighths, piano sustaining the chord"""
    seq = [(c, 1) if isinstance(c, str) else c for c in chords]
    tb, i = t0, 0
    E8 = B68 / 3
    while tb < t1 - 0.05:
        name = seq[i % len(seq)][0]
        root, pv, gt = CH[name]
        pat = [gt[0], gt[2], gt[3], gt[1], gt[2], gt[3]]
        for k in range(6):
            t = tb + k * E8
            if t >= t1 - 0.02:
                break
            if "gtr" in layers:
                b.add("gtr", I.pluck(F(pat[k]), (0.5 if k in (0, 3) else 0.36) * vel * R.uniform(0.9, 1.05), _r(), dur=0.9, bright=0.22, pos=0.22),
                      t + R.normal(0, 0.005), -0.3)
            if "bass" in layers and k in (0, 3):
                m = root if k == 0 else root + 7
                m = m - 12 if m > 47 else m
                b.add("bass", lp(I.pluck(F(m), 0.75 * vel, _r(), dur=1.0, bright=0.05, pos=0.35), 900, 2), t + 0.01, 0.0)
            if "brush" in layers and k in (0, 3):
                b.add("brush", I.brush(0.36 * vel, _r(), dur=0.45, swish=True), t - 0.05, 0.15)
            if "shaker" in layers:
                b.add("shaker", I.shaker((0.2 if k in (0, 3) else 0.12) * vel, _r()), t, 0.4)
            if "piano" in layers and k == 3:
                for j, m in enumerate(pv):
                    b.add("piano", piano(F(m), 0.2 * vel * R.uniform(0.85, 1.0), _r(), 1.0, honky), t + 0.02 + 0.01 * j, 0.3 - 0.12 * j)
        tb += 2 * B68
        i += 1


def bass_note(b, t, m, vel=0.7, dur=1.0):
    b.add("bass", lp(I.pluck(F(m), vel, _r(), dur=dur, bright=0.05, pos=0.35), 900, 2), t, 0.0)


def build():
    b = Band()
    s = lambda i: T.shot_t(i)[0]
    tf = fr(T.FLASH)

    # 1 HOOK 0 - 6.53: guitar + soft piano after-beats + bass, no drums; a rising 3-note lift, a tiny answer, a shimmer into the flash
    groove(b, 0.0, tf - 0.03, [("G6", 4), ("E7", 2), ("C6", 2)], layers=("gtr", "piano", "bass"), vel=0.72)
    b.cue(0.0, "HOOK: fingerpicked guitar + soft upright piano after-beats + upright bass (G6 - E7 - C6), no drums; the hotel starts to rise @100")
    line(b, 2.02, ANSWER, 0.34, beat=0.12)
    b.cue(2.02, "a tiny 3-note piano answer (G E D) in the gap after '1861,' (1.99-2.37)")
    line(b, 5.04, [(0, 0.3, 67), (0.5, 0.3, 71), (1.0, 0.5, 74)], 0.3, beat=0.14)
    b.cue(5.04, "a rising 3-note lift (G B D) in the gap after 'air,' (5.01-5.35): the building goes up")
    for m in [79, 83, 86, 91]:
        x = I.vibes(F(m), 0.22, _r(), dur=0.5, trem_depth=0.1)[::-1]
        b.add("vibes", fades(x, 0.15, 0.02), tf - len(x) / SR, 0.2)
    cut(b, tf, 0.04)
    b.cue(tf, "FLASH @196: a soft reversed-vibes shimmer swells into the frame; the band stops on it")

    # 2 SWAMP 6.6 - 10.0: half-time, a little woozy; the frog plop + a banjo plink-plink
    groove(b, s(2) + 0.04, s(3), SWAMP, layers=("gtr", "bass", "piano", "shaker"), vel=0.7, honky=12.0, wobble=8.0, half=True)
    b.cue(s(2), "SWAMP-EDGE STREETS: a half-time, slightly woozy loop - guitar, bass, piano, shaker (Em7 Am7 B7 Em7)")
    line(b, 6.66, ANSWER, 0.3, beat=0.15)
    b.cue(6.66, "the 3-note piano answer in the gap after 'inside.' (6.59-7.23)")
    b.add("pizz", I.pizz(F(55), 0.34, _r(), 0.4), fr(T.FROG) + 0.02, -0.2)
    for k, m in enumerate([86, 83]):
        b.add("banjo", I.banjo(F(m), 0.3, _r(), 0.45, 0.4), T.FROG_RING + 0.02 + 0.15 * k, 0.35)
    b.cue(fr(T.FROG), "FROG @250: a soft low pizz 'bloop' (G3); a banjo 'plink-plink' (D6 B5) in the gap after 'swamp.' (8.73-9.04)")

    # 3 MUD 10.0 - 12.97: a slouching walk (walking bass, brushes), blips for the burps and a pizz 'uh-oh' for the snort
    groove(b, s(3), s(4), [("Em7", 4), ("B7", 4)], layers=("gtr", "bass", "piano", "brush"), vel=0.72, honky=14.0, wobble=12.0, walk=True)
    b.cue(s(3), "MUDDY STREET: a slouching walk - the bass walks, brushes, woozy piano after-beats (Em7 - B7)")
    for tm, m in ((10.99, 52), (11.56, 55), (12.06, 50)):
        b.add("pizz", I.pizz(F(m), 0.3, _r(), 0.35), tm + 0.02, 0.2)
    b.cue(10.99, "@328 the puddle bubbles: three soft low pizz 'bloops' (E3 G3 D3) with the burps (11.0, 11.56, 12.06)")
    pizz_run(b, 12.32, [64, 62], 0.14, 0.34, -0.1)
    b.cue(12.32, "@358 the dog snorts: a two-note pizz 'uh-oh' (E4 D4) in the gap after 'go.' (12.26-12.66)")

    # 4 SICKROOM 12.97 - 15.63: woozy half-time, detuned piano; a sad 3-note pizz for the doctor
    groove(b, s(4), s(5) - 0.02, WOOZY, layers=("gtr", "bass", "piano", "brush"), vel=0.8, honky=18.0, wobble=24.0, half=True)
    b.cue(s(4), "SICKROOM: woozy half-time - piano out of tune with a slow pitch sway (Am7 D7 G6 Cdim7)")
    pizz_run(b, 14.62, [64, 62, 59], 0.14, 0.34, -0.1)
    b.cue(14.62, "@427 the doctor shakes his head: a falling 3-note pizz (E D B) in the gap after 'out,' (14.55-14.96)")

    # 5 COUNCIL 15.63 - 20.6: parlour dignity: a stately loop, a low 'dun' for the gavel and the gasp, a resolve in the gap
    groove(b, s(5), 16.50, [("G6", 2), ("D7", 2)], layers=("gtr", "bass", "piano"), vel=0.7)
    chord_hit(b, 16.58, "D7", 0.3, 0.03, dur=1.0)
    b.add("piano", piano(F(38), 0.4, _r(), 0.8, 6.0) + piano(F(50), 0.3, _r(), 0.8, 6.0), 16.58, 0.0)
    groove(b, 16.88, 18.30, [("C6", 2), ("D7", 2)], layers=("gtr", "bass", "piano", "brush"), vel=0.75)
    b.add("piano", piano(F(38), 0.5, _r(), 0.9, 6.0) + piano(F(50), 0.35, _r(), 0.9, 6.0), T.GASP_T, 0.0)
    groove(b, 18.70, 20.08, [("Em7", 2), ("A7", 2)], layers=("gtr", "bass", "piano"), vel=0.6, half=True)
    chord_hit(b, T.GASP2_T + 0.02, "G69", 0.26, 0.04, dur=1.3)
    b.cue(s(5), "COUNCIL HALL: a stately loop under 'so the city made a wild decision' (G6 D7), guitar + bass + piano")
    b.cue(16.58, "GAVEL @496: a soft D7 stab with a low D 'dun' (D2 + D3) in the gap after 'decision,' (16.55-16.86)")
    b.cue(T.GASP_T, "THE EASEL @541: a low piano octave 'dun' (D2 + D3) as the council gasps (gap after 'feet,' 18.35-18.66)")
    b.cue(T.GASP2_T + 0.02, "a warm resolve on G6/9 (rolled guitar, piano, low G) in the gap after 'underneath.' (20.09-20.69)")

    # 6 DIG 20.6 - 23.83: the work groove (banjo plinks), a dull 'plonk' for the bonk
    groove(b, s(6), s(7), RAG, layers=("gtr", "bass", "piano", "brush", "shaker", "kick", "banjo"), vel=0.95)
    b.add("piano", piano(F(40), 0.42, _r(), 0.7, 6.0) + piano(F(52), 0.3, _r(), 0.7, 6.0), fr(T.BONK) + 0.01, 0.0)
    b.add("pizz", I.pizz(F(46), 0.3, _r(), 0.3), fr(T.BONK) + 0.2, -0.2)
    line(b, 23.50, ANSWER, 0.3, beat=0.11)
    b.cue(s(6), "RAISING THE STREET: the work groove - guitar, bass, piano after-beats, brushes, shaker, soft kick + a light banjo plink (G6 E7 A7 D7)")
    b.cue(fr(T.BONK), "BONK @685: a dull low piano 'plonk' (E2 + E3) and a falling pizz")
    b.cue(23.50, "the 3-note answer (G E D) in the gap after 'up too.' (23.46-23.86)")

    # 7 HOTEL FRONT 23.83 - 27.23: bright, grand but soft: full groove, a carriage-trot feel
    groove(b, s(7), s(8), [("G6", 2), ("C6", 2), ("G6", 2), ("D7", 2)], vel=1.0)
    line(b, 26.80, MOTIF[:4], 0.34, beat=0.1)
    b.cue(s(7), "THE TREMONT HOUSE (XF @715): the full groove brightens - guitar, bass, piano, brushes, shaker, soft kick (G6 C6 G6 D7)")
    b.cue(26.80, "the TUNE's opening (G A B D) in the gap after 'hotel.' (26.77-27.17)")

    # 8 OFFICE 27.23 - 31.23: plucky: walking bass, banjo, a pizz handshake chain
    groove(b, s(8), 30.70, RAG, layers=("gtr", "bass", "piano", "brush", "shaker", "banjo"), vel=0.85, walk=True)
    for k, (tm, m) in enumerate(((29.73, 67), (29.94, 71), (30.15, 74), (30.35, 79))):
        b.add("pizz", I.pizz(F(m), 0.3, _r(), 0.35), tm + 0.02, 0.25)
    chord_hit(b, 30.78, "G6", 0.26, 0.03, dur=1.0, bass=False)
    b.cue(s(8), "THE CONTRACTORS' OFFICE: a plucky walk with a light banjo (G6 E7 A7 D7)")
    b.cue(29.73, "HANDSHAKES @890-912: a rising pizz chain (G B D G) as the partners shake hands, then a soft G6 in the gap after 'job.' (30.72-31.23)")

    # 9 JACKSCREWS 31.23 - 35.9: purposeful; a low accent on the clunk; the march from @1033
    groove(b, s(9), fr(T.MARCH), [("C6", 4), ("D7", 4)], layers=("gtr", "bass", "piano", "brush"), vel=0.85)
    bass_note(b, fr(T.CLUNK) + 0.01, 31, 0.8, 1.2)
    b.add("piano", piano(F(43), 0.4, _r(), 0.8, 6.0), fr(T.CLUNK) + 0.01, 0.0)
    b.cue(s(9), "UNDER THE HOTEL: a purposeful loop (C6 D7), guitar + bass + piano + brushes")
    b.cue(fr(T.CLUNK), "CLUNK @974: a low G bass accent + a low piano G")
    groove(b, fr(T.MARCH), s(10), [("G6", 4), ("D7", 4)], layers=("gtr", "bass", "piano", "brush", "shaker", "kick"), vel=1.0, walk=True)
    b.cue(fr(T.MARCH), "MARCH @1033: the workers march in - a steady walking bass, soft kick and brushes on every beat at 88 bpm, in step with the boots (G6 D7)")

    # 10 SIGNAL 35.9 - 40.77: sparse and tense; three rising piano steps, one per turn, in the gaps
    groove(b, s(10), s(11) - 0.05, [("Em7", 4), ("A7", 4), ("Em7", 4), ("D7", 4)], layers=("gtr", "bass"), vel=0.5, half=True)
    for tm, ms in ((38.47, [71]), (39.47, [74]), (40.30, [79, 83])):
        for k, m in enumerate(ms):
            b.add("piano", piano(F(m), 0.34, _r(), 0.5, 5.0), tm + 0.18 * k, 0.2)
    b.cue(s(10), "THE SIGNAL: sparse and a little tense - half-time guitar + bass (Em7 A7 Em7 D7)")
    b.cue(38.47, "@1142 / 1168 / 1194 each turn lifts the music a step: piano B4, D5, then G5 + B5 in the gaps after 'turn.' / 'another,' / 'another.'")

    # 11 THE BOARD 40.77 - 43.37: the groove builds, a fanfare resolve in the gap
    groove(b, s(11), 41.55, [("G6", 4)], layers=("gtr", "bass"), vel=0.65)
    groove(b, 41.55, 42.85, [("G6", 4)], layers=("gtr", "bass", "piano", "brush"), vel=0.85)
    tc = T.CHIME_T - 0.02
    chord_hit(b, tc, "G69", 0.34, 0.035, dur=1.8)
    sparkle(b, tc + 0.03, [91, 95, 98], 0.2, 0.3, 0.08)
    b.cue(s(11), "HOTEL WIDE: the groove builds as the board flag climbs - guitar + bass, then piano + brushes")
    b.cue(tc, "FANFARE @1276: a warm G6/9 chord with a rising celesta run (G B D) in the gap after 'six feet,' (42.88-43.46)")

    # 12 HOTEL INTERIOR 43.37 - 49.63: warm lazy loop, a lullaby for the sleeper, a bright chord at the bell, a rise to the pull-back
    groove(b, 43.50, fr(T.SNORE) - 0.02, LAZY, layers=("gtr", "bass", "piano", "brush", "shaker"), vel=0.8)
    groove(b, fr(T.SNORE), fr(T.BELL) - 0.02, [("G6", 2), ("C6", 2)], layers=("gtr", "bass"), vel=0.5, half=True)
    for k, m in enumerate([86, 83, 79]):
        b.add("celesta", I.celesta(F(m), 0.14, _r(), 1.0), fr(T.SNORE) + 0.1 + 0.35 * k, 0.3 - 0.2 * k)
    groove(b, fr(T.BELL), fr(1442), [("G6", 2), ("D7", 2)], vel=0.85)
    chord_hit(b, fr(T.BELL), "G69", 0.22, 0.03, dur=1.2, bass=False)
    groove(b, fr(1442), 49.0, [("C6", 4), ("D7", 4)], vel=0.95)
    chord_hit(b, 49.05, "G69", 0.3, 0.035, dur=1.6)
    sparkle(b, 49.08, [79, 83, 86, 91], 0.18, 0.3, 0.09)
    b.cue(43.50, "THE HOTEL NEVER CLOSED: a warm lazy loop (G6 C6 G6 D7) - guitar, bass, piano after-beats, brushes, shaker")
    b.cue(fr(T.SNORE), "SLEEPER @1385: a half-time lullaby (guitar + bass, G6 C6) with three falling celesta 'Z's (G5 B... D G)")
    b.cue(fr(T.BELL), "CLERK @1409: the groove pops back, a warm G6/9 chord on the bell frame (G6 D7)")
    b.cue(fr(1442), "PULL BACK @1442: all three scenes rising together - fuller groove (C6 D7)")
    b.cue(49.05, "G6/9 + a rising celesta run (G B D G) in the gap after 'them.' (49.03-49.61)")

    # 13 WINDOW 49.63 - 52.33: delicate; the wink gets a pizz 'ting' and a G6/9
    groove(b, s(13), T.WINK_T - 0.04, [("G69", 4), ("Cmaj7", 4)], layers=("gtr", "bass"), vel=0.5, half=True)
    sparkle(b, 50.30, [86, 91], 0.12, 0.3, 0.12)
    b.add("pizz", I.pizz(F(91), 0.26, _r(), 0.3), fr(T.TAP) + 0.02, 0.3)
    chord_hit(b, T.WINK_T - 0.02, "G69", 0.3, 0.04, dur=1.4)
    b.add("pizz", I.pizz(F(86), 0.3, _r(), 0.4), T.WINK_T + 0.0, 0.25)
    b.cue(s(13), "THE WINDOW: delicate - half-time guitar + bass (G6/9 Cmaj7), a celesta glint")
    b.cue(fr(T.TAP), "TAP @1526: a tiny high pizz 'tick' (G6)")
    b.cue(T.WINK_T - 0.02, "WINK @1550: a warm G6/9 chord with a pizz 'ting' (D6), in the gap after 'broke.' (51.59-52.18)")

    # 14 THE TRAIN 52.33 - 59.0: rocking 6/8 (bar 1.5 s), settling down to a lullaby; a warm resolve after 'them.'
    groove68(b, s(14), fr(T.RAILS), ["G6", "Em7", "C6", "D7"], layers=("gtr", "bass", "piano"), vel=0.8)
    groove68(b, fr(T.RAILS), 55.9, ["G6", "C6", "G6", "D7", "Em7", "C6", "G6", "D7"], vel=0.7)
    groove68(b, 55.9, T.TWHISTLE_T - 0.06, ["Em7", "C6", "G6", "D9sus"], layers=("gtr", "bass", "piano", "brush", "shaker"), vel=0.55)
    sparkle(b, 54.95, [79, 83, 86], 0.14, 0.3, 0.1)
    sparkle(b, 56.22, [86, 83, 79], 0.13, 0.3, 0.1)
    tw = 57.9
    chord_hit(b, tw, "G69", 0.3, 0.045, dur=1.7)
    bass_note(b, tw, 31, 0.6, 1.4)
    for k, m in enumerate([91, 95]):
        b.add("celesta", I.celesta(F(m), 0.26, _r(), 1.6), tw + 0.04 + 0.1 * k, 0.25)
    b.cue(s(14), "THE PLATFORM (XF @1570): the 6/8 begins - a rocking fingerpicked arpeggio, bass on 1 and 4, soft piano chords (G6 Em7 C6 D7), 80 dotted-quarter bpm")
    b.cue(fr(T.RAILS), "SLEEPING CAR @1619: the rails' 'ta-dak' joins - brushes + shaker on the 0.75 s pulse; the loop lulls (G6 C6 G6 D7 Em7 C6 G6 D7), lowering with every bar")
    b.cue(54.95, "celesta lullaby glints (G5 B5 D6) / (D6 B5 G5) in the gaps after 'cars,' (54.91-55.22) and 'sleep,' (56.19-56.49)")
    b.cue(tw, "RESOLVE: a warm G6/9 (rolled guitar, piano, low G) with a celesta 'ting' (G7 B7) after 'them.' (57.89), under the far train whistle")
    end = np.ones(N)
    a = ns(58.0)
    end[a:] = np.linspace(1, 0, N - a) ** 1.3
    for k in b.tr:
        b.tr[k] *= end[None, :]
    return b


TARGET = {"gtr": 0.0, "piano": -3.0, "lead": -4.0, "bass": -2.0, "kick": -9.0, "brush": -14.0, "shaker": -16.0, "pizz": -5.0,
          "celesta": -8.0, "vibes": -8.0, "banjo": -9.0}
SEND = {"gtr": 0.12, "piano": 0.18, "lead": 0.2, "bass": 0.05, "kick": 0.03, "brush": 0.1, "shaker": 0.1, "pizz": 0.15,
        "celesta": 0.3, "vibes": 0.25, "banjo": 0.15}


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
    ("hook", 0.0, fr(T.FLASH)), ("swamp", fr(T.FLASH), fr(300)), ("mud", fr(300), fr(389)), ("sick", fr(389), fr(469)),
    ("council", fr(469), fr(618)), ("dig", fr(618), fr(715)), ("hotel", fr(715), fr(817)), ("office", fr(817), fr(937)),
    ("jack", fr(937), fr(1072)), ("signal", fr(1072), fr(1223)), ("board", fr(1223), fr(1301)), ("lobby", fr(1301), fr(1489)),
    ("window", fr(1489), fr(1570)), ("train", fr(1570), fr(1619)), ("sleeper", fr(1619), 57.88), ("end", 57.88, T.DUR),
]
