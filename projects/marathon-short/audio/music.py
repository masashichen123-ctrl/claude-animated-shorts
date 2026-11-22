# Chill score for "The Exploding Whale" (same approved chill style as the emu and bat re-scores, new material).
# A laid-back seaside acoustic bed at 84 bpm with swung eighths: fingerpicked nylon guitar, warm Rhodes, round
# upright bass, brushes + shaker + a soft kick (no snare cracks, no crashes, no rolls), the odd vibes sparkle, and a
# seaside colour: a light ukulele chopping the offbeats and a soft whistled WHALE motif (only in narration gaps).
# G major day loop (Gmaj7 Em9 Cmaj9 D9sus), a softer A-minor loop for the smelly / sooty bits. All composed here
# (no existing melodies). Comedy beats are soft: little vibes pops as the dynamite pops up @114, a shimmer into the
# flash @134, a deflated two-note pizz after the soot gag, a pizz tumble on the rope snap @366, a wobbly Rhodes bend
# on 'smell' @403, a vibes bubble on the thought bubble @558, pizz steps climbing with the crates @580-625, a ukulele
# lick for the bib-wearing gulls @744; the band thins and STOPS for the tense hold @898 (silent through the plunger
# and the BOOM @960), a gentle vibes 'oops' after 'everyone.', a pizz 'deflate' after the car, and a warm resolve on
# Gmaj9 with a celesta 'ting' on the wink @1556.
import numpy as np
from dsp import SR, ns, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp, fades
import instruments as I
import timeline as T

N = ns(T.DUR)
BPM = 84.0
B = 60.0 / BPM            # one beat = 0.714 s
SW = 2 / 3                # swung eighth: the "&" lands 2/3 through the beat
F = I.m2f
fr = T.fr

# chord: (bass root, Rhodes voicing, guitar picking notes [thumb, thumb 2, finger, finger])
CH = {
    "Gmaj7": (43, [59, 62, 66, 69], [43, 50, 59, 66]),
    "Em9": (40, [55, 59, 62, 66], [40, 52, 59, 66]),
    "Cmaj9": (36, [52, 55, 59, 62], [48, 55, 64, 67]),
    "D9sus": (38, [55, 60, 64, 69], [50, 57, 60, 64]),
    "D7": (38, [54, 57, 60, 64], [50, 57, 60, 66]),
    "Am7": (45, [55, 60, 64, 67], [45, 52, 60, 64]),
    "Bm7": (47, [57, 62, 66, 69], [47, 54, 62, 66]),
    "Fmaj7": (41, [57, 60, 64, 67], [41, 53, 60, 64]),
    "Gmaj9": (43, [57, 59, 62, 66], [43, 50, 59, 62]),
    "Cadd9": (36, [55, 62, 64, 67], [48, 55, 62, 64]),
}
DAY = ["Gmaj7", "Em9", "Cmaj9", "D9sus"]
SOFT = ["Am7", "Fmaj7", "Cmaj9", "D9sus"]
DUNE = ["Cmaj9", "Bm7", "Em9", "D9sus"]

# the WHALE motif (whistled): a lazy rising sixth and a sigh back down, G major pentatonic
# (offset in beats, length in beats, midi)
MOTIF = [(0.0, 0.5, 74), (SW, 0.3, 76), (1.0, 0.9, 81), (2.0, 0.45, 79), (2 + SW, 0.3, 76), (3.0, 1.2, 74)]

R = rng(1970)


def _r():
    return rng(int(R.integers(1 << 30)))


def uke(f, vel=0.4, r=None, dur=0.35):
    """ukulele: a bright short nylon pluck (soprano, plucked near the soundhole), small body"""
    y = I.pluck(f, vel, r, dur=dur, bright=0.55, pos=0.12)
    return lp(y, 6500, 2)


class Band:
    def __init__(self):
        self.tr, self.cues = {}, []

    def add(self, name, x, t, p=0.0, g=1.0):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
        place(self.tr[name], pan(x, p) if np.ndim(x) == 1 else x, t, g)

    def cue(self, t, d):
        self.cues.append((t, d))


def groove(b, t0, t1, chords, layers=("gtr", "bass", "rhodes", "brush", "shaker", "kick", "uke"), vel=1.0):
    """lay the band from t0 to t1; chords = names (one bar of 4 beats each, looped) or (name, beats) pairs"""
    seq = [(c, 4) if isinstance(c, str) else c for c in chords]
    tb, i = t0, 0
    while tb < t1 - 0.05:
        name, nb = seq[i % len(seq)]
        root, rh, gt = CH[name]
        dur = min(nb * B, t1 - tb)
        if "rhodes" in layers:
            for k, m in enumerate(rh):
                b.add("rhodes", I.rhodes(F(m), dur * 0.95, 0.33 * vel * R.uniform(0.9, 1.05), _r(), trem=0.12), tb + 0.012 * k + 0.02, 0.25 - 0.15 * k)
        ukv = sorted({(m % 12) + 60 for m in rh})
        beat = 0
        while beat < nb:
            t = tb + beat * B
            if t >= t1 - 0.02:
                break
            if "gtr" in layers:     # thumb on the beat, a finger on the swung &
                b.add("gtr", I.pluck(F(gt[0] if beat % 2 == 0 else gt[1]), 0.55 * vel * R.uniform(0.9, 1.05), _r(), dur=1.2, bright=0.25, pos=0.22), t + R.normal(0, 0.006), -0.3)
                if t + SW * B < t1 - 0.02:
                    b.add("gtr", I.pluck(F(gt[2 + (beat % 2)]), 0.38 * vel * R.uniform(0.85, 1.05), _r(), dur=0.9, bright=0.3, pos=0.2), t + SW * B + R.normal(0, 0.008), -0.35)
            if "uke" in layers and beat in (1, 3) and t + SW * B < t1 - 0.05:   # a soft chop on the & of 2 and 4
                for k, m in enumerate(ukv):
                    b.add("uke", uke(F(m), 0.3 * vel * R.uniform(0.85, 1.05), _r(), 0.22), t + SW * B + 0.012 * k + R.normal(0, 0.004), 0.45)
            if "bass" in layers and beat in (0, 2):
                m = root if beat == 0 else root + 7
                if m > 47:
                    m -= 12
                b.add("bass", lp(I.pluck(F(m), 0.8 * vel, _r(), dur=1.1, bright=0.05, pos=0.35), 900, 2), t + 0.01, 0.0)
            if "kick" in layers and beat in (0, 2):
                b.add("kick", I.soft_kick(0.5 * vel, _r()), t)
            if "brush" in layers and beat in (1, 3):
                b.add("brush", I.brush(0.4 * vel, _r(), dur=0.4, swish=True), t - 0.08, 0.15)
            if "shaker" in layers:
                b.add("shaker", I.shaker(0.3 * vel, _r()), t, 0.4)
                if t + SW * B < t1 - 0.02:
                    b.add("shaker", I.shaker(0.18 * vel, _r()), t + SW * B, 0.4)
            beat += 1
        tb += nb * B
        i += 1


def whistle_motif(b, t0, notes=None, vel=0.5, transpose=0, beat=None, p=-0.15):
    """the WHALE motif whistled (soft, a touch of vibrato); placed only inside narration gaps"""
    bt = beat or B
    fig = MOTIF[:notes] if notes else MOTIF
    ns_ = [(t0 + e * bt, d * bt, m + transpose, vel) for e, d, m in fig]
    ts, y = I.whistle(ns_, _r(), vib_depth=12.0, breath=0.04)
    b.add("whistle", lp(y, 5000, 2), ts, p)


def sparkle(b, t, notes, vel=0.25, p=0.3, gap=0.09, damp=None):
    for k, m in enumerate(notes):
        b.add("vibes", I.vibes(F(m), vel, _r(), dur=1.6, trem_depth=0.15, damp=damp), t + k * gap, p)


def pizz_run(b, t0, notes, gap=0.1, vel=0.4, p=0.1):
    for k, m in enumerate(notes):
        b.add("pizz", I.pizz(F(m), vel * R.uniform(0.92, 1.05), _r(), 0.45), t0 + k * gap, p)


def cut(b, t, fade=0.06):
    """fade every track out at t (only what is already written: later material is added after the cut)"""
    g = np.ones(N)
    a = ns(t)
    g[a:a + ns(fade)] = np.linspace(1, 0, ns(fade))
    g[a + ns(fade):] = 0
    for k in b.tr:
        b.tr[k] *= g[None, :]


def chord_hit(b, t, name, vel=0.4, strum=0.05, bass=True, dur=1.8):
    """a warm sustained chord: rolled guitar, Rhodes, low bass"""
    root, rh, gt = CH[name]
    for k, m in enumerate(gt):
        b.add("gtr", I.pluck(F(m), 0.45 * vel / 0.4, _r(), dur=dur, bright=0.25), t + strum * k, -0.3)
    for k, m in enumerate(rh):
        b.add("rhodes", I.rhodes(F(m), dur * 0.9, vel, _r(), trem=0.1), t + 0.01 * k, 0.25 - 0.15 * k)
    if bass:
        b.add("bass", lp(I.pluck(F(root if root <= 47 else root - 12), 0.8, _r(), dur=dur, bright=0.05, pos=0.35), 900, 2), t, 0.0)


def build():
    b = Band()
    s = lambda i: T.shot_t(i)[0]

    # 1 HOOK 0 - 4.47: guitar + Rhodes + a soft uke, no drums; the whistle answers '1970,' in the first gap
    groove(b, 0.0, 3.75, [("Gmaj7", 4), ("Cmaj9", 2)], layers=("gtr", "rhodes", "uke"), vel=0.8)
    b.cue(0.0, "HOOK: fingerpicked nylon guitar + Rhodes + a soft ukulele chop (Gmaj7 - Cmaj9), no drums")
    td = fr(T.DYNAMITE)
    for k, m in enumerate([79, 83, 86, 91]):
        b.add("vibes", I.vibes(F(m), 0.13, _r(), dur=0.9, trem_depth=0.1, damp=0.25), td + 0.07 * k, -0.4 + 0.27 * k)
    b.cue(td, "DYNAMITE POPS UP @114: four short damped vibes pops climbing left to right, one per stick")
    tf = fr(T.FLASH)
    for m in [74, 78, 81, 86]:
        x = I.vibes(F(m), 0.26, _r(), dur=0.6, trem_depth=0.1)[::-1]
        b.add("vibes", fades(x, 0.15, 0.004), tf - len(x) / SR, 0.2)
    cut(b, tf, 0.03)
    b.cue(tf, "FLASH @134: a soft reversed-vibes shimmer swells into the frame; the band stops on it")

    # 2 AFTER 4.47 - 6.6: smoking silence, a held soft Rhodes chord, a deflated two-note pizz after 'whale.'
    for k, m in enumerate([57, 60, 64]):
        b.add("rhodes", I.rhodes(F(m), 1.4, 0.24, _r(), trem=0.15), 4.70 + 0.02 * k, 0.2 - 0.2 * k)
    b.add("bass", lp(I.pluck(F(45), 0.6, _r(), dur=1.4, bright=0.05, pos=0.35), 900, 2), 4.70, 0.0)
    pizz_run(b, 6.08, [55, 54], 0.2, 0.42, -0.1)
    b.cue(4.70, "AFTER: a soft held Am7 colour on 'It did not' (the Engineer, soot-black)")
    b.cue(6.08, "a flat two-note pizz 'hmph' (G - F#) in the gap after 'whale.'")

    # 3 COAST 6.6 - 11.13 (XF 198): the groove starts on the day loop
    groove(b, s(3), s(4), DAY)
    b.cue(s(3), "COAST (XF @198): the groove starts - guitar, upright bass, Rhodes, brushes + shaker + soft kick, uke offbeats (Gmaj7 Em9 Cmaj9 D9sus)")

    # 4 ROPE 11.13 - 14.07: lighter (no kick), pizz tumble on the snap, wobbly Rhodes on 'smell', drums drop out
    groove(b, s(4), fr(T.SMELL) - 0.05, [("Gmaj7", 4), ("Em9", 2)], layers=("gtr", "bass", "rhodes", "brush", "shaker", "uke"), vel=0.9)
    pizz_run(b, fr(T.ROPE_SNAP) + 0.32, [62, 59, 55, 50, 43], 0.065, 0.38, 0.15)
    b.cue(fr(T.ROPE_SNAP), "ROPE SNAP @366: a pizz tumble down (D B G D G) in the gap after 'move it,'")
    tsm = fr(T.SMELL)
    for k, m in enumerate([56, 60, 63]):        # Ab minor-ish smear, detuned wobble
        x = I.rhodes(F(m), 1.0, 0.25, _r(), trem=0.0)
        tt_ = np.arange(len(x)) / SR
        x = x * (1 - 0.35 * (0.5 + 0.5 * np.sin(2 * np.pi * 6.5 * tt_)))
        b.add("rhodes", x, tsm + 0.03 * k, 0.1)
    groove(b, tsm + 0.05, s(5), [("Am7", 2)], layers=("bass", "rhodes"), vel=0.75)
    b.cue(tsm, "SMELL @403: a queasy wobbling Rhodes cluster, the band thins to bass + Rhodes (Am7)")

    # 5 HIGHWAY 14.07 - 16.53: the groove comes back in with the truck
    groove(b, s(5), s(6), [("Cmaj9", 4), ("D9sus", 4)], vel=0.95)
    b.cue(s(5), "HIGHWAY DEPARTMENT: full groove again (Cmaj9 - D9sus) as the truck pulls up")
    whistle_motif(b, 16.08, notes=3, vel=0.36, beat=0.2)
    b.cue(16.08, "whistled D-E-A in the gap after 'Department.' (the Engineer steps forward)")

    # 6 THE PLAN 16.53 - 21.6: day loop without kick; vibes bubble on the thought bubble; pizz steps up with the crates
    groove(b, s(6), s(7), DAY, layers=("gtr", "bass", "rhodes", "brush", "shaker", "uke"), vel=0.9)
    sparkle(b, fr(T.BLOOP), [83, 90], 0.14, 0.3, 0.06)
    b.cue(fr(T.BLOOP), "THOUGHT BUBBLE @558: a soft two-note vibes bubble (B - F#)")
    for k, f in enumerate(T.CRATE_TIMES):
        b.add("pizz", I.pizz(F([43, 47, 50, 55, 59, 62, 67][k]), 0.3, _r(), 0.35), fr(f) + 0.02, 0.2)
    b.cue(fr(T.CRATES[0]), "CRATES @580-625: a soft pizz note climbs the G major arpeggio with each crate stacked")

    # 7 EASEL + GULLS 21.6 - 25.6: lighter, the uke lick for the bibbed gulls
    groove(b, 22.27, s(8), [("Cmaj9", 4), ("D9sus", 4), ("Bm7", 4), ("Em9", 4)],     # restarts in the gap after 'The plan?' so the short 'The' stays clear
           layers=("gtr", "bass", "rhodes", "shaker", "uke"), vel=0.9)
    sparkle(b, fr(T.EASEL) + 0.35, [86], 0.13, 0.35)
    b.cue(22.27, "THE PLAN: the previous groove rings out under 'The plan?', the band comes back in the gap after it - guitar, bass, Rhodes, shaker, uke (no drums) - Cmaj9 D9sus Bm7 Em9")
    b.cue(fr(T.EASEL), "EASEL TAP @655: one high vibes glint just after 'plan?'")
    for k, (dt, m) in enumerate([(0.0, 74), (0.1, 76), (0.2, 79), (0.42, 76), (0.52, 79)]):
        b.add("uke", uke(F(m), 0.32, _r(), 0.3), 25.82 + dt, 0.45)
    b.cue(25.82, "GULLS IN BIBS: a cheeky little ukulele lick (D E G . E G) in the gap after 'rest.'")

    # 8 DUNES 25.6 - 29.67: full groove on the dune loop; it thins on 'filming.'
    groove(b, s(8), 29.30, DUNE, vel=0.95)
    b.cue(s(8), "DUNES: full groove (Cmaj9 Bm7 Em9 D9sus) under the gathering crowd")

    # 9 PLUNGER 29.3 - 31.27: thin to bass + Rhodes, then the tense hold: the music STOPS @898
    groove(b, 29.30, fr(T.HOLD[0]) - 0.04, [("D7", 4)], layers=("bass", "rhodes"), vel=0.7)
    cut(b, fr(T.HOLD[0]) - 0.04, 0.12)
    b.cue(29.30, "the band thins to bass + Rhodes (D7) after 'filming.'")
    b.cue(fr(T.HOLD[0]), "TENSE HOLD @898: the music stops (120 ms fade) and stays silent through the plunger @914 and the BOOM @960")

    # 10-11 'oops' after 'everyone.', then the groove creeps back in, unbothered
    to = fr(T.OOPS)
    b.add("vibes", I.vibes(F(76), 0.3, _r(), 1.0, damp=0.16), to, 0.15)
    b.add("vibes", I.vibes(F(72), 0.28, _r(), 1.0, damp=0.3), to + 0.18, -0.15)
    b.add("pizz", I.pizz(F(42), 0.4, _r(), 0.35), to + 0.18, 0.0)
    b.cue(to, "OOPS: soft vibes E - C falling third + a low pizz F#, in the gap after 'everyone.' (34.96-35.51)")
    groove(b, 35.45, s(13), [("Am7", 4), ("D9sus", 4)], layers=("gtr", "bass", "rhodes", "shaker", "uke"), vel=0.8)
    b.cue(35.45, "BLUBBER RAIN: the groove creeps back in on 'Huge' - guitar, bass, Rhodes, shaker, uke (Am7 - D9sus), no drums")

    # 13 CAR 38.0 - 40.93: day groove with brushes; pizz 'deflate' after 'away.'
    groove(b, s(13), 40.45, [("Cmaj9", 4), ("D9sus", 4)], layers=("gtr", "bass", "rhodes", "brush", "shaker"), vel=0.85)
    pizz_run(b, 40.50, [62, 61, 60, 59, 43], 0.075, 0.3, 0.1)
    b.cue(s(13), "CAR: Cmaj9 - D9sus with brushes; the band lifts off at 40.45 for...")
    b.cue(40.52, "...a little descending pizz 'deflate' (D C# C B, low G) in the gap after 'away.'")

    # 14 STILL THERE 40.93 - 44.07: the groove returns, deadpan
    groove(b, 40.95, s(15), DAY, layers=("gtr", "bass", "rhodes", "brush", "shaker", "kick", "uke"), vel=0.9)
    b.cue(40.95, "STILL THERE: the day groove returns, faded up under 'most' (it stays out of the soft 'And'), unbothered")

    # 15 BURIED 44.07 - 48.6: no drums, softer loop; a low pizz plunk after the face-palm
    groove(b, s(15), s(16) - 0.1, [("Am7", 4), ("Fmaj7", 4), ("Cadd9", 4)], layers=("gtr", "bass", "rhodes"), vel=0.8)
    b.add("pizz", I.pizz(F(40), 0.45, _r(), 0.6), 47.30, 0.0)
    b.cue(s(15), "BURIED: guitar, bass, Rhodes, no drums (Am7 Fmaj7 Cadd9)")
    b.cue(47.30, "FACE-PALM: a low pizz 'plunk' in the gap after 'avoid.'")

    # 16 PARK 48.6 - 53.0 (XF 1458): sunny, full and warm; resolve on the wink; the whistle sings the motif at the end
    tw = fr(T.WINK)
    whistle_motif(b, 48.33, notes=3, vel=0.34, beat=0.2)
    b.cue(48.33, "whistled D-E-A through the dissolve to the park, in the gap after 'buried it.' (48.30-48.93)")
    groove(b, s(16) - 0.1, tw - 0.03, [("Cmaj9", 4), ("D9sus", 4), ("Em9", 2), ("D9sus", 2)], vel=0.95)
    chord_hit(b, tw, "Gmaj9", 0.36, 0.04, dur=2.0)
    b.add("bass", lp(I.pluck(F(31), 0.6, _r(), dur=1.6, bright=0.05, pos=0.35), 900, 2), tw, 0.0)
    for k, m in enumerate([86, 91]):
        b.add("celesta", I.celesta(F(m), 0.3, _r(), 1.6), tw + 0.12 + 0.09 * k, 0.15)    # just after 'whale.' ends
    whistle_motif(b, 52.02, vel=0.4, beat=0.2)
    b.cue(s(16), "PARK (XF @1458): bright, full groove (Cmaj9 D9sus Em9 D9sus), uke and shaker sunny")
    b.cue(tw, "WINK @1556: warm resolve on Gmaj9 (rolled guitar, Rhodes, low G) with a celesta 'ting' (D7 - G7)")
    b.cue(52.02, "the whole WHALE motif, whistled softly over the resolve after the last word; rings out to 53.0")
    end = np.ones(N)
    a = ns(52.6)
    end[a:] = np.linspace(1, 0, N - a) ** 1.5
    for k in b.tr:
        b.tr[k] *= end[None, :]
    return b


TARGET = {"gtr": 0.0, "rhodes": -3.0, "bass": -2.0, "kick": -9.0, "brush": -14.0, "shaker": -16.0, "pizz": -4.0,
          "celesta": -7.0, "vibes": -8.0, "uke": -7.0, "whistle": -9.0}
SEND = {"gtr": 0.12, "rhodes": 0.15, "bass": 0.05, "kick": 0.03, "brush": 0.1, "shaker": 0.1, "pizz": 0.15, "celesta": 0.3,
        "vibes": 0.25, "uke": 0.12, "whistle": 0.3}


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
    out = lp(hp(out, 35, 2), 9000, 1)          # soft, lo-fi top
    return out, levels


SECTIONS = [  # (name, start, end) for the level automation in mix.py
    ("hook", 0.0, fr(T.FLASH)), ("after", fr(T.FLASH), fr(198)), ("coast", fr(198), fr(334)), ("rope", fr(334), fr(422)),
    ("highway", fr(422), fr(496)), ("plan", fr(496), fr(648)), ("easel", fr(648), fr(768)), ("dunes", fr(768), 29.30),
    ("thin", 29.30, fr(T.HOLD[0])), ("hold", fr(T.HOLD[0]), fr(T.OOPS)), ("rain", fr(T.OOPS), fr(1140)),
    ("car", fr(1140), 41.0), ("still", 41.0, fr(1322)), ("buried", fr(1322), fr(1458) - 0.1), ("park", fr(1458) - 0.1, T.DUR),
]
