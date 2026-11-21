# Chill score for "The Bat Bomb" (same approved style as the emu re-score: the brass march, kept in
# music_march.py for reference, was overpowering). A laid-back acoustic / lo-fi bed at 88 bpm with swung eighths:
# fingerpicked nylon guitar, warm Rhodes, round upright bass, brushes + shaker + a soft kick (no snare cracks, no
# crashes, no rolls), the odd vibes sparkle. The bats get a slightly mysterious-playful night colour: a light
# pizzicato BAT figure in D dorian, doubled or answered by a soft celesta, over a night loop (Dm9 Bbmaj7 Gm9 A7b9);
# daytime scenes move to a warm F major loop (Fmaj7 Am7 Bbmaj7 C9). All composed here (no existing melodies).
# Comedy beats are soft: a celesta spiral as the casing pops @80, a shimmer into the flash @112, the band holding
# its breath before the stamp @711, a short stop under the WHOOMP @1186 with a gentle vibes 'oops' after
# 'perfectly.', a little pizz 'deflate' on the car @1394, and a warm resolve on Fmaj9 with a celesta 'ting' on the
# wink @1610.
import numpy as np
from dsp import SR, ns, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp, fades
import instruments as I
import timeline as T

N = ns(T.DUR)
BPM = 88.0
B = 60.0 / BPM            # one beat = 0.682 s
SW = 2 / 3                # swung eighth: the "&" lands 2/3 through the beat
F = I.m2f
fr = T.fr

# chord: (bass root, Rhodes voicing, guitar picking notes [thumb, fingers...])
CH = {
    "Dm9": (38, [57, 60, 64, 65], [50, 57, 60, 64]),
    "Bbmaj7": (46, [57, 62, 65, 69], [46, 57, 62, 65]),
    "Gm9": (43, [58, 62, 65, 69], [55, 62, 65, 69]),
    "A7b9": (45, [55, 58, 61, 64], [45, 55, 61, 64]),
    "Fmaj7": (41, [57, 60, 64, 67], [53, 60, 64, 69]),
    "Am7": (45, [55, 60, 64, 67], [45, 55, 60, 64]),
    "C9": (36, [58, 62, 64, 67], [48, 58, 62, 64]),
    "C9sus": (36, [58, 62, 65, 67], [48, 58, 65, 67]),
    "Fmaj9": (41, [57, 60, 64, 67], [53, 60, 64, 67]),
}
NIGHT = ["Dm9", "Bbmaj7", "Gm9", "A7b9"]
DAY = ["Fmaj7", "Am7", "Bbmaj7", "C9"]
LAB = ["Gm9", "C9", "Fmaj7", "Dm9"]

# BAT figure (offset in eighths - swung -, length in beats, midi): a little flit up, a peek down, the dorian B natural
BAT = [(0, .25, 74), (1, .25, 77), (2, .25, 76), (3, .3, 74), (4, .5, 69), (6, .25, 71), (7, .6, 72)]

R = rng(1943)


def _r():
    return rng(int(R.integers(1 << 30)))


def sw(beat):
    """beat position with swung eighths (x.5 -> x + 2/3)"""
    fl = np.floor(beat)
    return fl + (SW if abs(beat - fl - 0.5) < 1e-6 else beat - fl)


class Band:
    def __init__(self):
        self.tr, self.cues = {}, []

    def add(self, name, x, t, p=0.0, g=1.0):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
        place(self.tr[name], pan(x, p) if np.ndim(x) == 1 else x, t, g)

    def cue(self, t, d):
        self.cues.append((t, d))


def groove(b, t0, t1, chords, layers=("gtr", "bass", "rhodes", "brush", "shaker", "kick"), vel=1.0):
    """lay the band from t0 to t1; chords = names (one bar of 4 beats each, looped) or (name, beats) pairs"""
    seq = [(c, 4) if isinstance(c, str) else c for c in chords]
    tb, i = t0, 0
    while tb < t1 - 0.05:
        name, nb = seq[i % len(seq)]
        root, rh, gt = CH[name]
        dur = min(nb * B, t1 - tb)
        if "rhodes" in layers:
            for k, m in enumerate(rh):
                b.add("rhodes", I.rhodes(F(m), dur * 0.95, 0.35 * vel * R.uniform(0.9, 1.05), _r(), trem=0.12), tb + 0.012 * k + 0.02, 0.25 - 0.15 * k)
        beat = 0
        while beat < nb:
            t = tb + beat * B
            if t >= t1 - 0.02:
                break
            if "gtr" in layers:     # thumb on the beat, a finger on the swung &
                b.add("gtr", I.pluck(F(gt[0] if beat % 2 == 0 else gt[1]), 0.55 * vel * R.uniform(0.9, 1.05), _r(), dur=1.2, bright=0.25, pos=0.22), t + R.normal(0, 0.006), -0.3)
                if t + SW * B < t1 - 0.02:
                    b.add("gtr", I.pluck(F(gt[2 + (beat % 2)]), 0.38 * vel * R.uniform(0.85, 1.05), _r(), dur=0.9, bright=0.3, pos=0.2), t + SW * B + R.normal(0, 0.008), -0.35)
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


def bat_fig(b, t0, vel=0.45, transpose=0, p=0.3, notes=None, cel=True):
    """the BAT figure on pizzicato; the celesta doubles its last two notes an octave up (soft)"""
    fig = BAT[:notes] if notes else BAT
    for j, (e, d, m) in enumerate(fig):
        t = t0 + sw(e / 2) * B
        b.add("pizz", I.pizz(F(m + transpose - 12), vel * R.uniform(0.9, 1.05), _r(), dur=0.45), t, p)
        if cel and j >= len(fig) - 2:
            b.add("celesta", I.celesta(F(m + transpose + 12), 0.3, _r(), 1.2), t + 0.01, -p)


def celesta_run(b, t0, notes, gap=0.07, vel=0.32, p0=-0.5, p1=0.5):
    for k, m in enumerate(notes):
        b.add("celesta", I.celesta(F(m), vel * R.uniform(0.9, 1.05), _r(), 1.3), t0 + k * gap, p0 + (p1 - p0) * k / max(1, len(notes) - 1))


def sparkle(b, t, notes, vel=0.25, p=0.3, gap=0.09):
    for k, m in enumerate(notes):
        b.add("vibes", I.vibes(F(m), vel, _r(), dur=1.6, trem_depth=0.15), t + k * gap, p)


def cut(b, t, fade=0.06):
    """fade every track out at t (only what is already written: later material is added after the cut)"""
    g = np.ones(N)
    a = ns(t)
    g[a:a + ns(fade)] = np.linspace(1, 0, ns(fade))
    g[a + ns(fade):] = 0
    for k in b.tr:
        b.tr[k] *= g[None, :]


def chord_hit(b, t, name, vel=0.4, strum=0.05, bass=True):
    """a warm sustained chord: rolled guitar, Rhodes, low bass"""
    root, rh, gt = CH[name]
    for k, m in enumerate(gt):
        b.add("gtr", I.pluck(F(m), 0.45 * vel / 0.4, _r(), dur=1.8, bright=0.25), t + strum * k, -0.3)
    for k, m in enumerate(rh):
        b.add("rhodes", I.rhodes(F(m), 1.6, vel, _r(), trem=0.1), t + 0.01 * k, 0.25 - 0.15 * k)
    if bass:
        b.add("bass", lp(I.pluck(F(root if root <= 47 else root - 12), 0.8, _r(), dur=1.6, bright=0.05, pos=0.35), 900, 2), t, 0.0)


def build():
    b = Band()
    s = lambda i: T.shot_t(i)[0]

    # 1 HOOK 0 - 3.80: night. Rhodes + guitar only, the BAT figure on pizzicato; celesta spiral on the casing pop
    groove(b, 0.0, 3.70, [("Dm9", 4), ("Bbmaj7", 2)], layers=("gtr", "rhodes"), vel=0.85)
    bat_fig(b, 0.45, 0.4, notes=5, cel=False)
    b.cue(0.0, "HOOK: night colour - fingerpicked nylon guitar + Rhodes (Dm9 - Bbmaj7), no drums; the pizzicato BAT figure peeks in")
    tp = fr(T.CASING_POP)
    celesta_run(b, tp + 0.03, [62, 65, 69, 72, 74, 77, 81, 84], 0.055, 0.3, -0.7, 0.7)
    b.cue(tp, "CASING POPS @80: soft celesta spiral up D dorian (left to right) with the swarm")
    tf = fr(T.FLASH)
    for m in [69, 72, 76, 81]:
        x = I.vibes(F(m), 0.28, _r(), dur=0.8, trem_depth=0.1)[::-1]
        b.add("vibes", fades(x, 0.2, 0.004), tf - len(x) / SR, 0.2)
    for k, m in enumerate([81, 86, 88]):
        b.add("vibes", I.vibes(F(m), 0.13, _r(), dur=1.0, trem_depth=0.15, damp=0.35), tf + 0.04 * k, 0.25)
    b.cue(tf, "FLASH @112: soft shimmer - reversed vibes swell into the frame, a light high vibes chord on it")

    # 2 AIR BASE 3.80 - 5.70: bass + Rhodes + shaker, a pizz dive figure, a soft low accent on the kick @139
    groove(b, fr(T.DIVE), s(3), [("Gm9", 4)], layers=("bass", "rhodes", "shaker"), vel=0.8)
    for k, m in enumerate([81, 77, 74, 69, 65]):
        b.add("pizz", I.pizz(F(m - 12), 0.4, _r()), fr(T.DIVE) + 0.07 * k, 0.4 - 0.2 * k)
    b.add("vibes", I.vibes(F(57), 0.3, _r(), 1.2), fr(139), 0.0)
    b.add("vibes", I.vibes(F(61), 0.22, _r(), 1.2), fr(139) + 0.02, 0.2)
    b.cue(fr(T.DIVE), "AIR BASE: bass + Rhodes + shaker (Gm9) enter on 'bats' @121, after the short 'Then'; pizz notes dive with the swarm @121; a soft low vibes dyad on the kick @139")

    # 3 CAVE 5.70 - 10.93 (XF 171): the laid-back groove starts on the night loop
    groove(b, s(3), s(4), NIGHT)
    celesta_run(b, fr(T.COLUMN) - 0.05, [62, 65, 69, 72, 76, 77, 81], 0.085, 0.24, 0.6, -0.6)
    b.cue(s(3), "CAVE (XF @171): the groove starts - guitar, upright bass, Rhodes, brushes + shaker + soft kick on the night loop (Dm9 Bbmaj7 Gm9 A7b9)")
    b.cue(fr(T.COLUMN), "BAT COLUMN @290: celesta arpeggio climbing with the column")

    # 4 WORKSHOP 10.93 - 18.23: warm day loop; the idea; the unimpressed bat; toy bats
    groove(b, s(4), s(5), DAY)
    sparkle(b, fr(T.BULB) + 0.05, [88], 0.16, 0.2)
    for k, m in enumerate([57, 56]):
        b.add("pizz", I.pizz(F(m), 0.45, _r(), 0.4), fr(422) + 0.18 * k, -0.2)
    celesta_run(b, 15.55, [84, 81, 79, 76], 0.08, 0.2, 0.4, -0.2)
    b.cue(s(4), "WORKSHOP: warm day loop (Fmaj7 Am7 Bbmaj7 C9); one high vibes note answers the bulb @331")
    b.cue(fr(422), "the bat is unimpressed (@413): a flat little two-note pizz 'hmph' (A - G#)")
    b.cue(15.55, "toy bats sprinkle on the diorama: four falling celesta notes")

    # 5 ATTIC 18.23 - 21.77: night, no drums; the band thins to bass + Rhodes for the ticking timer, poof sparkle
    groove(b, s(5), fr(T.TICK[0]) - 0.05, NIGHT, layers=("gtr", "bass", "rhodes"), vel=0.85)
    bat_fig(b, fr(T.ATTIC) + 0.02, 0.38, notes=4, cel=False)
    groove(b, fr(T.TICK[0]) - 0.05, s(6), [("A7b9", 4)], layers=("bass", "rhodes"), vel=0.75)
    celesta_run(b, fr(T.POOF) + 0.02, [81, 86, 89, 93], 0.04, 0.2, -0.3, 0.3)
    b.cue(s(5), "ATTIC: night loop, no drums - guitar, bass, Rhodes; the BAT figure flutters in with the bat @553")
    b.cue(fr(T.TICK[0]), "TIMER @607: the band thins to bass + Rhodes (A7b9, held) so the ticking reads; a celesta pop-sparkle on the POOF @628")

    # 6 PRESIDENT 21.77 - 24.43: day groove; the band holds its breath before the stamp, lands warmly on it
    groove(b, s(6), fr(T.STAMP) - 0.28, [("Fmaj7", 4), ("C9sus", 4)], layers=("gtr", "bass", "rhodes", "brush", "shaker"))
    cut(b, fr(T.STAMP) - 0.28, 0.12)
    chord_hit(b, fr(T.STAMP), "Fmaj9", 0.38)
    sparkle(b, fr(T.STAMP) + 0.02, [76, 81], 0.15, 0.3, 0.06)
    groove(b, fr(T.STAMP) + 2 * B, s(7), [("Bbmaj7", 2)], layers=("gtr", "bass", "rhodes", "shaker"), vel=0.85)
    b.cue(s(6), "PRESIDENT: warm groove (Fmaj7 - C9sus)")
    b.cue(fr(T.STAMP) - 0.28, "the President pauses: the band holds its breath (120 ms fade, ~0.28 s of near silence)...")
    b.cue(fr(T.STAMP), "STAMP @711: ...and lands on a warm Fmaj9 (rolled guitar, Rhodes, low F) with a soft vibes glint")

    # 7 LAB 24.43 - 28.43: lab loop, brushes + shaker, no kick; glint on the tweezers, a little 'ta-da' on the flex
    groove(b, s(7), s(8), LAB, layers=("gtr", "bass", "rhodes", "brush", "shaker"), vel=0.9)
    b.add("celesta", I.celesta(F(93), 0.25, _r(), 1.2), fr(T.TWEEZERS) + 0.03, -0.2)
    sparkle(b, fr(T.FLEX) + 0.02, [72, 77], 0.2, 0.2, 0.16)
    b.cue(s(7), "LAB: Gm9 C9 Fmaj7 Dm9, guitar, bass, Rhodes, brushes + shaker; a high celesta glint on the tweezers @800")
    b.cue(fr(T.FLEX), "FLEX @845: a small vibes 'ta-da' (C - F)")

    # 8 TEST BASE 28.43 - 32.27 (XF 853): bright day groove; the BAT figure escapes with the bats
    groove(b, s(8), s(9), DAY)
    bat_fig(b, fr(T.ESCAPE) + 0.05, 0.42, 0, 0.35)
    b.cue(s(8), "TEST BASE (XF @853): full day groove")
    b.cue(fr(T.ESCAPE), "ESCAPE @947: the BAT figure (pizz + celesta) flits out with the bats")

    # 9 SEARCH 32.27 - 37.0: sneaky night loop, no kick / brushes; the figure peeks around
    groove(b, s(9), s(10), NIGHT, layers=("gtr", "bass", "rhodes", "shaker"), vel=0.9)
    bat_fig(b, 32.2, 0.3, 0, -0.4, notes=4, cel=False)
    b.cue(s(9), "SEARCH: night loop again, lighter (no kick, no brushes) - the bat looking for a dark place")

    # 10 TANK 37.0 - 38.33: held tension (A7b9, Rhodes + bass only); celesta grin
    groove(b, s(10), s(11), [("A7b9", 4)], layers=("bass", "rhodes"), vel=0.8)
    celesta_run(b, 38.15, [76, 79, 82], 0.06, 0.22, -0.4, 0.4)
    b.cue(s(10), "UNDER THE TANK: held A7b9 (bass + Rhodes) under the five ticking timers; a little celesta grin after 'tank.'")

    # 11 WHOOMP 38.33 - 40.5: 'Luckily' groove, STOP just before the WHOOMP, then a gentle 'oops'
    groove(b, s(11), fr(T.WHOOMP) - 0.06, [("Fmaj7", 2), ("C9", 2)], layers=("gtr", "bass", "rhodes", "brush", "shaker", "kick"))
    cut(b, fr(T.WHOOMP) - 0.06, 0.06)
    to = 40.34
    b.add("vibes", I.vibes(F(72), 0.3, _r(), 1.0, damp=0.14), to, 0.15)
    b.add("vibes", I.vibes(F(69), 0.28, _r(), 1.0, damp=0.22), to + 0.17, -0.15)
    b.add("pizz", I.pizz(F(44), 0.4, _r(), 0.35), to + 0.17, 0.0)
    b.cue(s(11), "LUCKILY: day groove (Fmaj7 - C9)")
    b.cue(fr(T.WHOOMP) - 0.06, "WHOOMP @1186: the music simply stops (60 ms fade) for the fireball")
    b.cue(to, "'oops' after 'perfectly.': soft vibes C - A falling third + a low pizz G#, damped before 'Unluckily'")

    # 12 BUCKETS 40.5 - 43.4: the groove creeps back in, unbothered
    groove(b, 41.12, s(13), [("Dm9", 4), ("Gm9", 2)], layers=("gtr", "bass", "rhodes", "shaker"), vel=0.8)
    b.cue(41.12, "BUCKETS: the groove creeps back in after 'Unluckily,' - guitar, bass, Rhodes, shaker (Dm9 - Gm9), unbothered")

    # 13 SMOKE / CAR 43.4 - 47.27: day groove with brushes; a little pizz 'deflate' on the car
    groove(b, s(13), s(14), [("Bbmaj7", 4), ("Am7", 4), ("Gm9", 4)], layers=("gtr", "bass", "rhodes", "brush", "shaker"), vel=0.9)
    for k, m in enumerate([65, 64, 63, 62, 50]):
        b.add("pizz", I.pizz(F(m), 0.4 if k < 4 else 0.5, _r(), 0.5), fr(T.CAR_PUFF) + 0.05 + 0.11 * k, 0.1)
    b.cue(s(13), "SMOKE: Bbmaj7 Am7 Gm9, brushes + shaker, no kick")
    b.cue(fr(T.CAR_PUFF), "CAR PUFF @1394: a little descending pizz 'deflate' (F E Eb D, low D)")

    # 14 OFFICE 47.27 - 50.5 (XF 1418): no drums, slower feel; a low pizz plunk on the folder
    groove(b, s(14), s(15), [("Gm9", 4), ("C9", 4)], layers=("gtr", "bass", "rhodes"), vel=0.8)
    b.add("pizz", I.pizz(F(38), 0.5, _r(), 0.7), fr(T.FOLDER) + 0.03, 0.0)
    b.cue(s(14), "OFFICE (XF @1418): guitar, bass, Rhodes, no drums (Gm9 - C9); a low pizz 'plunk' on the folder @1489")

    # 15 NIGHT CAVE 50.5 - 55.0 (XF 1515): night colour, the BAT figure, rubato approach, warm resolve on the wink
    tw = fr(T.WINK)
    groove(b, s(15), tw - 0.02, [("Bbmaj7", 2.4), ("Gm9", 1.4), ("C9sus", 0.85)], layers=("gtr", "bass", "rhodes"), vel=0.8)
    bat_fig(b, s(15) + 0.05, 0.3, 0, 0.3, notes=5, cel=False)
    chord_hit(b, tw, "Fmaj9", 0.36, 0.04)
    b.add("bass", lp(I.pluck(F(29), 0.6, _r(), dur=1.6, bright=0.05, pos=0.35), 900, 2), tw, 0.0)
    for k, m in enumerate([88, 93]):
        b.add("celesta", I.celesta(F(m), 0.3, _r(), 1.6), tw + 0.03 + 0.09 * k, 0.15)
    b.cue(s(15), "NIGHT CAVE (XF @1515): night again - guitar, bass, Rhodes, rubato (Bbmaj7 - Gm9 - C9sus), the BAT figure once more")
    b.cue(tw, "WINK @1610: warm resolve on Fmaj9 (rolled guitar, Rhodes, low F) with a celesta 'ting' (E7 - A7); rings out to 55.0")
    end = np.ones(N)
    a = ns(54.3)
    end[a:] = np.linspace(1, 0, N - a) ** 1.5
    for k in b.tr:
        b.tr[k] *= end[None, :]
    return b


TARGET = {"gtr": 0.0, "rhodes": -3.0, "bass": -2.0, "kick": -9.0, "brush": -14.0, "shaker": -16.0, "pizz": -4.0,
          "celesta": -7.0, "vibes": -8.0}
SEND = {"gtr": 0.12, "rhodes": 0.15, "bass": 0.05, "kick": 0.03, "brush": 0.1, "shaker": 0.1, "pizz": 0.15, "celesta": 0.3, "vibes": 0.25}


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
    ("hook", 0.0, fr(T.FLASH)), ("base", fr(T.FLASH), fr(171)), ("cave", fr(171), fr(328)), ("workshop", fr(328), fr(547)),
    ("attic", fr(547), fr(653)), ("president", fr(653), fr(733)), ("lab", fr(733), fr(853)), ("escape", fr(853), fr(968)),
    ("search", fr(968), fr(1110)), ("tank", fr(1110), fr(1150)), ("luckily", fr(1150), fr(T.WHOOMP)),
    ("oops", fr(T.WHOOMP), fr(1215)), ("buckets", fr(1215), fr(1302)), ("smoke", fr(1302), fr(1418)),
    ("office", fr(1418), fr(1515)), ("ending", fr(1515), T.DUR),
]
