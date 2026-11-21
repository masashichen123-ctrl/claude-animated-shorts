# Chill score for "The Great Emu War" (re-score after review: the brass march, kept in music_march.py, was too much).
# A laid-back acoustic / lo-fi bed, F major, 88 bpm with swung eighths: fingerpicked nylon guitar, warm Rhodes,
# round upright bass, brushes + shaker + soft kick (no snare cracks, no crashes, no rolls), the odd vibes / glock
# sparkle, and a small playful EMU figure on a mellow muted banjo. All of it composed here (no existing melodies).
# Sections follow SHOTS.md; the comedy beats are soft: a shimmer on the flash @119, a muted-trombone 'wah' on
# "And lost.", the band simply stops on the jam @801 and comes back @825, a mellow chord change for the casings
# reveal @1040, and a warm resolve on the final blink @1756.
import numpy as np
from dsp import SR, ns, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp, fades, shape
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
    "Fmaj7": (41, [57, 60, 64, 67], [53, 60, 64, 69]),
    "Dm7": (38, [57, 60, 62, 65], [50, 57, 60, 65]),
    "Gm7": (43, [58, 62, 65, 69], [55, 62, 65, 70]),
    "C9": (36, [58, 62, 64, 67], [48, 58, 62, 64]),
    "Bbmaj7": (46, [57, 62, 65, 69], [46, 57, 62, 65]),
    "Dbmaj7": (37, [56, 60, 65, 68], [49, 56, 60, 65]),
    "Am7": (45, [55, 60, 64, 67], [45, 55, 60, 64]),
}
LOOP_A = ["Fmaj7", "Dm7", "Gm7", "C9"]
LOOP_B = ["Dm7", "Bbmaj7", "Gm7", "C9"]

# EMU figure (beat offset in swung eighths, length in beats, midi): a small curious hop, D dorian
EMU = [(0, .4, 69), (1, .3, 74), (1.5, .3, 72), (2, .5, 69), (3.5, .3, 67), (4, .7, 69)]

R = rng(2026)


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
    """lay the band from t0 to t1 (cut softly at t1), one chord per bar, bars of 4 beats from t0"""
    bar = 0
    while True:
        tb = t0 + bar * 4 * B
        if tb >= t1 - 0.05:
            break
        name = chords[bar % len(chords)]
        root, rh, gt = CH[name]
        if "rhodes" in layers:
            for k, m in enumerate(rh):
                b.add("rhodes", I.rhodes(F(m), 4 * B * 0.95, 0.35 * vel * R.uniform(0.9, 1.05), _r(), trem=0.12), tb + 0.012 * k + 0.02, 0.25 - 0.15 * k)
        for beat in range(4):
            t = tb + beat * B
            if t >= t1 - 0.02:
                break
            if "gtr" in layers:     # thumb on the beat, a finger on the swung &
                b.add("gtr", I.pluck(F(gt[0] if beat % 2 == 0 else gt[1]), 0.55 * vel * R.uniform(0.9, 1.05), _r(), dur=1.2, bright=0.25, pos=0.22), t + R.normal(0, 0.006), -0.3)
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
                b.add("shaker", I.shaker(0.18 * vel, _r()), t + SW * B, 0.4)
        bar += 1


def emu_fig(b, t0, vel=0.45, transpose=0, p=0.35):
    for (e, d, m) in EMU:
        t = t0 + sw(e / 2) * B
        b.add("emu", I.banjo(F(m + transpose), vel * R.uniform(0.9, 1.05), _r(), dur=0.6, mute=0.7), t, p)


def sparkle(b, t, notes, vel=0.25, p=0.3, gap=0.09):
    for k, m in enumerate(notes):
        b.add("vibes", I.vibes(F(m), vel, _r(), dur=1.6, trem_depth=0.15), t + k * gap, p)


def cut(b, t, fade=0.06):
    g = np.ones(N)
    a = ns(t)
    g[a:a + ns(fade)] = np.linspace(1, 0, ns(fade))
    g[a + ns(fade):] = 0
    for k in b.tr:
        b.tr[k] *= g[None, :]


def build():
    b = Band()
    s = lambda i: T.shot_t(i)[0]

    # 1 HOOK 0 - 3.97: just guitar + Rhodes, a calm curious opening; the emu figure answers on 'emus'
    groove(b, 0.0, 3.95, ["Fmaj7", "Dm7"], layers=("gtr", "rhodes"), vel=0.85)
    emu_fig(b, 3.30, 0.35)
    b.cue(0.0, "HOOK: fingerpicked nylon guitar + warm Rhodes (Fmaj7 - Dm7), no drums; the emu figure peeks in on 'emus'")
    # FLASH @119: soft shimmer - reversed vibes swell into the frame + a light bell chord on it
    tf = fr(T.FLASH)
    for m in [69, 72, 76, 79]:
        x = I.vibes(F(m), 0.3, _r(), dur=0.9, trem_depth=0.1)[::-1]
        b.add("vibes", fades(x, 0.2, 0.004), tf - len(x) / SR, 0.2)
    sparkle(b, tf, [81, 84, 88], 0.22, 0.25, 0.04)
    b.cue(tf, "FLASH @119: soft shimmer - reversed vibes swell into the frame, a light high vibes chord on it")

    # 2 'And lost.' @128: a soft muted-trombone 'wah' sliding down
    tl = fr(T.LOST) + 0.05
    dl = 0.85
    x = I.brass(F(58), dl, 0.4, _r(), "bone", scoop=-30, bend=lambda t: -500 * np.clip((t - 0.15) / 0.7, 0, 1) ** 1.3, rel=0.15)
    x = shape(x, lambda Tt, Ff: 0.2 + np.exp(-0.5 * (np.log2(np.maximum(Ff[:, None], 20) / (450 + 550 * (0.5 + 0.5 * np.cos(2 * np.pi * 1.8 * Tt[None, :])))) / 0.8) ** 2), 1024, 256)
    b.add("bone", lp(x, 2500, 2), tl, -0.15)
    b.cue(tl, "'And lost.' @128: one soft muted-trombone 'wah' sliding down a tritone")

    # 3 FARM 5.23 - 10.17 (XF 157): the groove settles in (guitar, bass, Rhodes, brushes, shaker, soft kick)
    groove(b, s(3), 10.17, LOOP_A)
    sparkle(b, fr(229), [76, 81], 0.18)
    b.cue(s(3), "FARM (XF @157): the laid-back groove starts - guitar, upright bass, Rhodes, brushes + shaker + soft kick (Fmaj7 Dm7 Gm7 C9)")

    # 4-5 EMUS / PHONE 10.17 - 15.0: same groove on the minor loop, the emu figure hops on top
    groove(b, s(4), 15.0, LOOP_B, vel=0.95)
    for t in (10.3, 12.75):
        emu_fig(b, t, 0.42)
    b.cue(s(4), "EMUS ARRIVE: groove moves to Dm7 Bbmaj7 Gm7 C9, the little muted-banjo emu figure hops in (and again after 'ate it.')")

    # 6-7 ARMY / FIRST DAY 15.0 - 23.17: back to loop A, a bit lighter under the gunfire
    groove(b, s(6), 23.17, LOOP_A, vel=0.9)
    emu_fig(b, 22.78, 0.4)
    b.cue(s(6), "ARMY ARRIVES / FIRST DAY: loop A, unhurried - no fanfare; emu figure after 'range.' as they trot off")

    # 8 DAM 23.17 - 26.70: thinner (no kick), emu figure; the band simply STOPS on the jam @801
    groove(b, s(8), fr(T.JAM), LOOP_B, layers=("gtr", "bass", "rhodes", "shaker"), vel=0.85)
    emu_fig(b, 23.4, 0.35)
    cut(b, fr(T.JAM), 0.03)
    b.cue(s(8), "DAM (XF @695): thinner - guitar, bass, Rhodes, shaker; emu figure")
    b.cue(fr(T.JAM), "JAM @801: the music simply stops (30 ms fade) - silence for the clack, the spring and 'jammed.'")

    # 9 TRUCK 27.5 - 31.23: resumes on the shot change @825
    groove(b, s(9), 31.23, LOOP_A)
    emu_fig(b, fr(T.OUTRAN) + 0.05, 0.4, 0)
    b.cue(s(9), "TRUCK @825: the groove comes back as if nothing happened; emu figure on 'outran'")

    # 10 CAMP 31.23 - 37.83 (XF 937): dusk, no drums; mellow change to Dbmaj7 on the casings reveal @1040
    groove(b, s(10), fr(T.CASINGS[0]), ["Fmaj7", "Bbmaj7"], layers=("gtr", "bass", "rhodes"), vel=0.8)
    sparkle(b, fr(T.PEN), [77, 81, 84], 0.18, 0.3, 0.06)
    ca = fr(T.CASINGS[0])
    groove(b, ca, 37.83, ["Dbmaj7", "C9"], layers=("gtr", "bass", "rhodes"), vel=0.85)
    for k in range(6):
        sparkle(b, ca + 0.3 + k * 0.45, [[84], [89], [87], [92], [84], [89]][k], 0.15, [-0.5, 0.4, -0.2, 0.6, -0.4, 0.2][k])
    b.cue(s(10), "CAMP (XF @937): dusk, no drums - guitar, bass, Rhodes (Fmaj7 Bbmaj7); vibes sparkle on the pen flourish @963")
    b.cue(ca, "CASINGS reveal @1040: mellow chord change to Dbmaj7 -> C9, vibes glints across the stereo field")

    # 11-13 DUMP / UNLUCKILY / TOY 37.83 - 46.07: groove; very thin under 'Unluckily'
    groove(b, s(11), s(12), LOOP_A)
    groove(b, s(12), s(13), ["Dm7", "C9"], layers=("bass", "rhodes"), vel=0.7)
    emu_fig(b, 41.9, 0.4)
    groove(b, s(13), s(14), LOOP_A)
    b.cue(s(11), "DUMP: groove (loop A)")
    b.cue(s(12), "UNLUCKILY: only bass + Rhodes under the line; the emu figure after 'ten.'")
    b.cue(s(13), "TOY MARCH: groove back; the toy soldiers' boots fall on 42.5 + k/2 (SFX), the music stays relaxed underneath")

    # 14 SCATTER 46.07 - 50.13: emu figure tossed around the stereo field over the groove
    groove(b, s(14), s(15), LOOP_B, layers=("gtr", "bass", "rhodes", "shaker", "kick"))
    for k, (t, p) in enumerate([(46.1, -0.7), (47.95, 0.7), (49.7, -0.4)]):
        emu_fig(b, t, 0.38, [0, 5, -2][k], p)
    b.cue(s(14), "SCATTER: emu figure flung left / right / centre (transposed) over the minor loop")

    # 15 PARADE 50.13 - 55.20 (XF 1504): warm, slow - pad-like Rhodes + guitar, no drums; a sparkle after 'world'
    groove(b, s(15), s(16), ["Bbmaj7", "Am7"], layers=("gtr", "bass", "rhodes"), vel=0.85)
    sparkle(b, 54.68, [77, 81, 84, 89], 0.2)
    b.cue(s(15), "PARADE (XF @1504): no drums, Bbmaj7 - Am7, warm; vibes sparkle as 'world.' ends")

    # 16-17 HOME / ENDING 55.20 - 59.0: guitar alone, then the warm resolve on F on the blink
    groove(b, s(16), 57.9, ["Gm7", "C9"], layers=("gtr", "rhodes"), vel=0.75)
    tb_ = fr(T.BLINK)
    for k, m in enumerate([41, 53, 60, 64, 69]):
        b.add("gtr", I.pluck(F(m), 0.45, _r(), dur=1.6, bright=0.25), tb_ - 0.6 + 0.06 * k, -0.3)
    for k, m in enumerate([57, 60, 64, 67]):
        b.add("rhodes", I.rhodes(F(m), 0.9, 0.35, _r(), trem=0.1), tb_ - 0.6 + 0.01 * k, 0.2)
    b.add("bass", lp(I.pluck(F(29), 0.8, _r(), dur=1.4, bright=0.05, pos=0.35), 900, 2), tb_ - 0.6, 0.0)
    sparkle(b, tb_, [81, 84, 88], 0.2, 0.2, 0.05)
    b.cue(s(16), "HOME: guitar + Rhodes only (Gm7 - C9), unresolved")
    b.cue(tb_ - 0.6, "ENDING: warm resolve on Fmaj9 (guitar strum, Rhodes, low F) landing with the blink @1756, vibes chime on the blink; fade to 59.0")
    end = np.ones(N)
    a = ns(58.4)
    end[a:] = np.linspace(1, 0, N - a) ** 1.6
    for k in b.tr:
        b.tr[k] *= end[None, :]
    return b


TARGET = {"gtr": 0.0, "rhodes": -3.0, "bass": -2.0, "kick": -9.0, "brush": -14.0, "shaker": -16.0, "emu": -3.0,
          "vibes": -8.0, "bone": -2.0}
SEND = {"gtr": 0.12, "rhodes": 0.15, "bass": 0.05, "kick": 0.03, "brush": 0.1, "shaker": 0.1, "emu": 0.12, "vibes": 0.25, "bone": 0.15}


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
    ("hook", 0.0, fr(T.FLASH)), ("lost", fr(T.FLASH), fr(157)), ("farm", fr(157), fr(305)), ("emus", fr(305), fr(389)),
    ("phone", fr(389), fr(450)), ("army", fr(450), fr(602)), ("firstday", fr(602), fr(695)), ("dam", fr(695), fr(T.JAM)),
    ("jam", fr(T.JAM), fr(825)), ("truck", fr(825), fr(937)), ("camp", fr(937), fr(1135)), ("dump", fr(1135), fr(1201)),
    ("unlucky", fr(1201), fr(1270)), ("toy", fr(1270), fr(1382)), ("scatter", fr(1382), fr(1504)),
    ("parade", fr(1504), fr(1656)), ("home", fr(1656), fr(1694)), ("ending", fr(1694), T.DUR),
]
