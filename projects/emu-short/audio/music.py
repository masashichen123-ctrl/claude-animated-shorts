# Original score for "The Great Emu War": a comic 1930s military march with a bush-band flavour (cornet + trombone +
# tuba + field snare, banjo, accordion, lagerphone), F major, 120 bpm (a quarter note = 15 frames).
# Two original themes, composed here: the ARMY theme (pompous dotted march, cornet) and the EMU motif (sneaky staccato
# bassoon-ish reed + woodblock tiptoes, D minor). Sections follow SHOTS.md; every section starts on its shot's frame.
import numpy as np
from dsp import SR, ns, rng, pan, place, dbg, make_ir, convolve_st, integrated, lp, hp, fades
import instruments as I
import timeline as T

N = ns(T.DUR)
Q = 0.5            # quarter note (s) = 15 frames
F = I.m2f
fr = T.fr

# ARMY theme (bar, beat, length in quarters, midi), cornet register (F4 = 65)
ARMY = [
    (1, 0, .75, 72), (1, .75, .25, 69), (1, 1, .5, 65), (1, 1.5, .5, 69), (1, 2, 1, 72), (1, 3, .5, 77), (1, 3.5, .5, 76),
    (2, 0, .75, 74), (2, .75, .25, 72), (2, 1, .5, 70), (2, 1.5, .5, 74), (2, 2, 1.5, 72), (2, 3.5, .5, 72),
    (3, 0, .75, 70), (3, .75, .25, 69), (3, 1, .5, 67), (3, 1.5, .5, 70), (3, 2, .75, 69), (3, 2.75, .25, 67), (3, 3, .5, 65), (3, 3.5, .5, 69),
    (4, 0, 1, 67), (4, 1, .5, 72), (4, 1.5, .5, 70), (4, 2, 2, 72),
]
ARMY_CH = {1: ["F"] * 4, 2: ["Bb", "Bb", "F", "F"], 3: ["Gm", "Gm", "F", "F"], 4: ["C7"] * 4}

# EMU motif (beat, length, midi): sneaky, staccato, chromatic, D minor
EMU = [(0, .5, 50), (.5, .5, 50), (1, .5, 53), (1.5, .5, 52), (2, .5, 50), (2.5, .25, 49), (2.75, .25, 50), (3, .5, 45),
       (4, .5, 50), (4.5, .5, 50), (5, .5, 53), (5.5, .5, 55), (6, .5, 56), (6.5, .5, 57), (7, .5, 45)]

CH = {  # tuba root / fifth, after-beat (horn/accordion) voicing, banjo roll notes
    "F": dict(oom=(41, 36), pah=[57, 60, 65], bj=[65, 69, 72, 77]),
    "Bb": dict(oom=(46, 41), pah=[58, 62, 65], bj=[65, 70, 74, 77]),
    "C7": dict(oom=(36, 43), pah=[58, 60, 64], bj=[64, 67, 70, 72]),
    "C": dict(oom=(36, 43), pah=[55, 60, 64], bj=[64, 67, 72, 76]),
    "Gm": dict(oom=(43, 38), pah=[58, 62, 67], bj=[62, 67, 70, 74]),
    "Dm": dict(oom=(38, 45), pah=[57, 62, 65], bj=[62, 65, 69, 74]),
    "A7": dict(oom=(45, 40), pah=[55, 61, 64], bj=[61, 64, 67, 69]),
    "Db": dict(oom=(37, 44), pah=[56, 61, 65], bj=[61, 65, 68, 73]),
    "Edim": dict(oom=(40, 40), pah=[55, 58, 61, 64], bj=[58, 61, 64, 67]),
}

R = rng(1932)


def _r():
    return rng(int(R.integers(1 << 30)))


class Band:
    def __init__(self):
        self.tr, self.send, self.cues = {}, {}, []

    def add(self, name, x, t, p=0.0, g=1.0):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
        place(self.tr[name], pan(x, p) if np.ndim(x) == 1 else x, t, g)

    def cue(self, t, d):
        self.cues.append((t, d))


def notes(t0, mel, bars=None, aug=1.0, transpose=0):
    out = []
    for (b, beat, d, m) in mel:
        if bars is not None and b not in bars:
            continue
        b0 = (bars.index(b) if bars is not None else b - 1)
        out.append((t0 + (b0 * 4 + beat) * Q * aug, d * Q * aug, m + transpose))
    return out


def play(b, name, evs, vel, fn, p=0.0, gate=0.92, **kw):
    for (t, d, m) in evs:
        v = vel * R.uniform(0.93, 1.05)
        if fn == "cornet":
            x = I.brass(F(m), d * gate, v, _r(), "cornet", scoop=-18, vib=kw.get("vib", 0.0))
        elif fn == "bone":
            x = I.brass(F(m), d * gate, v, _r(), "bone", scoop=-25, vib=kw.get("vib", 0.0))
        elif fn == "horn":
            x = I.brass(F(m), d * gate, v, _r(), "horn", scoop=-12)
        elif fn == "glock":
            x = I.glock(F(m), v, _r(), dur=1.2)
        elif fn == "fife":
            x = I.fife(F(m), d * gate, v, _r())
        elif fn == "accordion":
            x = I.accordion([F(m)], d * gate, v, _r())
        elif fn == "reed":
            x = I.reed(F(m), d * gate, v, _r(), stacc=kw.get("stacc", False))
        elif fn == "banjo":
            x = I.banjo(F(m), v, _r(), mute=kw.get("mute", 0.0))
        else:
            raise ValueError(fn)
        b.add(name, x, t, p)


def oompah(b, t_bar, chords, vel=0.6, pah_vel=0.4, beats=4, accordion=True, bounce=False):
    """tuba on the beats (root / fifth), after-beats on the &s (horns + accordion)"""
    for beat in range(beats):
        c = CH[chords[beat % len(chords)]]
        t = t_bar + beat * Q
        if bounce:
            lo = c["oom"][0] if c["oom"][0] >= 36 else c["oom"][0] + 12
            b.add("tuba", I.brass(F(lo), 0.18, vel, _r(), "tuba", scoop=-30), t, -0.1)
            b.add("tuba", I.brass(F(lo + 12), 0.14, vel * 0.8, _r(), "tuba", scoop=-40), t + Q / 2, -0.1)
        else:
            b.add("tuba", I.brass(F(c["oom"][beat % 2]), 0.3, vel * (1.0 if beat % 2 == 0 else 0.88), _r(), "tuba"), t, -0.1)
        if pah_vel:
            for k, m in enumerate(c["pah"]):
                b.add("horns", I.brass(F(m), 0.15, pah_vel, _r(), "horn", scoop=-12), t + Q / 2 + 0.004 * k, 0.3 - 0.12 * k)
            if accordion:
                b.add("accordion", I.accordion([F(m) for m in c["pah"]], 0.17, pah_vel * 0.9, _r()), t + Q / 2, 0.35)


SN = {
    "light": [1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 1, 1],
    "march": [3, 0, 1, 1, 2, 0, 1, 0, 3, 0, 1, 1, 2, 0, 1, 0],
    "drive": [2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1],
    "tiptoe": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
}


def snare_bar(b, t_bar, pat, vel, steps=range(16), cres=0.0):
    for s in steps:
        v = SN[pat][s]
        if not v:
            continue
        t = t_bar + s * Q / 4
        vv = vel * (1 + cres * s / 16) * {1: 0.5, 2: 0.9, 3: 0.95}[v] * R.uniform(0.93, 1.05)
        if v == 3:
            b.add("snare", I.snare(vv * 0.4, _r()), t - 0.026, 0.05)
        b.add("snare", I.snare(vv, _r()), t + R.normal(0, 0.002), 0.05)


def roll(b, t0, t1, v0, v1, accent=None, at=None):
    for t, v in I.snare_roll(t0, t1, v0, v1, _r()):
        b.add("snare", I.snare(v, _r(), dur=0.14, buzz=True), t, 0.05)
    if accent:
        at = t1 if at is None else at
        b.add("snare", I.snare(accent, _r()), at, 0.05)


def timp_roll(b, t0, t1, f, v0, v1):
    t = t0
    while t < t1:
        u = (t - t0) / max(t1 - t0, 1e-6)
        b.add("timpani", I.timpani(f, (v0 + (v1 - v0) * u) * R.uniform(0.85, 1.05), _r(), dur=0.7), t, -0.1)
        t += 1 / 14.0


def lager(b, t0, beats, vel=0.5, on=(1, 3)):
    """lagerphone: stamp on beats `on` (0-based in the bar), a light shake on the other &s"""
    for k in range(beats):
        t = t0 + k * Q
        if k % 4 in on:
            b.add("lager", I.lagerphone(vel, _r()), t, 0.45)
        else:
            b.add("lager", I.lagerphone(vel * 0.35, _r(), dur=0.2, stomp=False), t + Q / 2, 0.45)


def banjo_roll(b, t0, chords, beats, vel=0.45, sub=2, mute=0.0, p=-0.4):
    """forward roll on the chord tones, `sub` notes per beat"""
    pat = [0, 2, 1, 3, 2, 1, 3, 2]
    for k in range(beats * sub):
        c = CH[chords[(k // sub) % len(chords)]]
        m = c["bj"][pat[k % len(pat)] % len(c["bj"])]
        b.add("banjo", I.banjo(F(m), vel * (1.0 if k % sub == 0 else 0.75) * R.uniform(0.9, 1.05), _r(), mute=mute), t0 + k * Q / sub, p)


def chord(b, name, t, ms, dur, vel, kind="soft", spread=0.5):
    for k, m in enumerate(ms):
        b.add(name, I.brass(F(m), dur, vel, _r(), kind, scoop=-10), t + 0.003 * k, spread * ((k / max(1, len(ms) - 1)) - 0.5))


def cut(b, t, fade=0.012, keep=()):
    """hard cut-off of every track at t (short fade so it never clicks)"""
    g = np.ones(N)
    a = ns(t)
    g[a:a + ns(fade)] = np.linspace(1, 0, ns(fade))
    g[a + ns(fade):] = 0
    for k in b.tr:
        if k not in keep:
            b.tr[k] *= g[None, :]


def build():
    b = Band()
    s = lambda i: T.shot_t(i)[0]

    # ============ 1 HOOK 0 - 3.97: the army theme, confident and pompous; it loses its nerve on "emus" (3.27):
    # held E-dim tremolo + snare roll crescendo into the white FLASH @119
    h = notes(0.0, ARMY, bars=[1, 2])
    h = [n for n in h if n[0] < 3.2]
    play(b, "cornet", h, 0.72, "cornet", 0.1)
    for bar in (0, 1):
        tb = bar * 2.0
        ch = ARMY_CH[bar + 1]
        oompah(b, tb, ch, 0.62, 0.38, beats=4 if bar == 0 else 3)
        snare_bar(b, tb, "march", 0.55, steps=range(16) if bar == 0 else range(12))
        lager(b, tb, 4 if bar == 0 else 3, 0.45)
    b.add("cymbal", I.cymbal(0.4, _r()), 0.0)
    b.add("bassdrum", I.bass_drum(0.7, _r()), 0.0)
    b.cue(0.0, "HOOK: army theme bars 1-2, cornet + tuba/after-beats + snare + lagerphone, pompous and sure of itself")
    held = [52, 55, 58, 61, 64]
    b.add("accordion", I.accordion([F(m) for m in held[1:]], 3.967 - 3.27, 0.5, _r(), att=0.08,
                                    bellows=lambda t: 0.75 + 0.25 * np.sin(2 * np.pi * 9 * t)), 3.27, 0.3)
    b.add("tuba", I.brass(F(40), 0.66, 0.5, _r(), "soft"), 3.28, -0.1)
    roll(b, 3.27, 3.95, 0.12, 0.8)
    timp_roll(b, 3.3, 3.93, F(40), 0.1, 0.5)
    b.cue(3.27, "on 'emus': the band stops dead, held E-dim tremolo (accordion) + snare and timpani rolls crescendo (the stare-down)")
    cut(b, fr(T.FLASH) - 0.004)
    # STINGER on the flash: Db major brass hit + bass drum + cymbal (in the gap between 'emus.' and 'And lost.')
    tf = fr(T.FLASH)
    chord(b, "stab", tf, [49, 56, 61, 65, 68], 0.16, 0.85, "stab", 0.8)
    b.add("tuba", I.brass(F(37), 0.2, 0.85, _r(), "tuba"), tf, -0.1)
    b.add("bassdrum", I.bass_drum(1.0, _r()), tf)
    b.add("cymbal", I.cymbal(0.55, _r(), dur=1.0), tf)
    b.add("timpani", I.timpani(F(37), 0.8, _r(), dur=1.2), tf, -0.1)
    b.cue(tf, "STINGER on the white flash @119: Db-major brass stab + bass drum + timpani + cymbal")

    # ============ 2 "And lost." DEFLATE: muted trombone slide down a fifth with a wobbling 'wah' end @128
    tl = fr(T.LOST) + 0.03
    dl = fr(157) - tl - 0.05
    bend = lambda t: -700 * np.clip((t - 0.12) / (dl * 0.75), 0, 1) ** 1.3 + 35 * np.clip((t - dl * 0.6) / 0.2, 0, 1) * np.sin(2 * np.pi * 6.5 * t)
    x = I.brass(F(58), dl, 0.75, _r(), "bone", scoop=-30, bend=bend, rel=0.12)
    # plunger-mute 'wah': a band-pass whose centre opens and closes
    from dsp import shape
    x = shape(x, lambda Tt, Ff: 0.25 + np.exp(-0.5 * (np.log2(np.maximum(Ff[:, None], 20) / (500 + 700 * (0.5 + 0.5 * np.cos(2 * np.pi * 2.2 * Tt[None, :])))) / 0.9) ** 2), 1024, 256)
    b.add("bone", x, tl, -0.15)
    b.add("tuba", I.brass(F(34), dl * 0.8, 0.35, _r(), "soft", bend=lambda t: -100 * np.clip(t / dl, 0, 1)), tl + 0.2, -0.1)
    b.cue(tl, "'And lost.' @128: the DEFLATE, a muted trombone sliding down a fifth (Bb -> Eb) with a plunger wah and wobble, soft tuba under it")

    # ============ 3 FARM 5.23 - 10.17 (XF 157): bush-band pastoral, banjo forward roll, accordion tune, lagerphone, soft tuba
    t3 = s(3)
    farm = [(0, 1.5, 69), (1.5, .5, 72), (2, 1, 77), (3, .5, 76), (3.5, .5, 74),
            (4, 1.5, 74), (5.5, .5, 72), (6, 1, 70), (7, 1, 67),
            (8, .5, 69), (8.5, .5, 72), (9, 1.05, 77)]
    farm_ch = ["F", "F", "F", "C", "Bb", "Bb", "Bb", "C7", "F", "F"]
    for (bt, d, m) in farm:
        b.add("accordion", I.accordion([F(m), F(m - 12)] if bt >= 8 else [F(m)], d * Q * 0.95, 0.75, _r(), att=0.05), t3 + bt * Q, 0.2)
    banjo_roll(b, t3, farm_ch, 10, 0.42)
    for k, c in enumerate(farm_ch):
        if k % 2 == 0:
            b.add("tuba", I.brass(F(CH[c]["oom"][0]), 0.35, 0.42, _r(), "soft"), t3 + k * Q, -0.1)
    lager(b, t3, 10, 0.32)
    b.add("triangle", I.triangle(0.25, _r(), dur=1.0), t3 + 9 * Q)
    b.cue(t3, "FARM (XF @157): pastoral bush band in F - banjo forward rolls, accordion tune (original), lagerphone on 2 and 4, soft tuba")

    # ============ 4 EMUS ARRIVE 10.17 - 12.97: the EMU motif (reed + tuba staccato, woodblock), swelling as they pour in
    t4 = s(4)
    emu = [(t4 + bt * Q, d, m) for (bt, d, m) in EMU if t4 + bt * Q < 12.9]
    play(b, "reed", emu, 0.8, "reed", -0.2, gate=0.55, stacc=True)
    for (t, d, m) in emu:
        b.add("tuba", I.brass(F(m - 12), 0.16, 0.45, _r(), "tuba", scoop=-30), t, -0.1)
    for k in range(11):
        b.add("wood", I.woodblock(0.35 + 0.03 * k, _r(), f=900 if k % 2 else 1250), t4 + k * Q / 2 + Q / 4, 0.4)
    timp_roll(b, t4 + 1.0, 11.9, F(38), 0.05, 0.3)
    # 'ate' @370: pecking xylophone-ish glock dabs; farmer's jaw drop @358 gets a low trombone 'bwah'
    for k in range(4):
        b.add("glock", I.glock(F(84 + (k % 2) * 3), 0.3, _r(), dur=0.4), 12.69 + k * 0.07, 0.3)
    b.add("bone", I.brass(F(45), 0.45, 0.55, _r(), "bone", bend=lambda t: -250 * np.clip(t / 0.45, 0, 1) ** 2), fr(358), -0.2)
    b.add("stab", I.brass(F(50), 0.12, 0.6, _r(), "stab"), 12.98)
    b.add("stab", I.brass(F(44), 0.12, 0.6, _r(), "stab"), 12.98)
    b.cue(t4, "EMUS ARRIVE: the EMU motif (original, D minor): staccato bassoon-reed + tuba, woodblock tiptoes, timpani rumble")
    b.cue(fr(358), "cut to the farmer (jaw drop) @358: low trombone 'bwah' bend; glock pecks right after 'ate it.'; low stab on the cut to the verandah")

    # ============ 5 PHONE 12.97 - 15.0: urgent - accordion tremolo Dm -> A7, snare roll; bugle call after 'army.'
    t5 = s(5)
    b.add("accordion", I.accordion([F(m) for m in [62, 65, 69]], 0.85, 0.42, _r(), bellows=lambda t: 0.7 + 0.3 * np.sin(2 * np.pi * 8 * t)), t5, 0.3)
    b.add("accordion", I.accordion([F(m) for m in [61, 64, 67]], 0.65, 0.48, _r(), bellows=lambda t: 0.7 + 0.3 * np.sin(2 * np.pi * 8 * t)), t5 + 0.9, 0.3)
    b.add("tuba", I.brass(F(38), 0.8, 0.4, _r(), "soft"), t5, -0.1)
    b.add("tuba", I.brass(F(45), 0.6, 0.45, _r(), "soft"), t5 + 0.9, -0.1)
    roll(b, t5 + 0.9, 14.5, 0.08, 0.35)
    call = [(14.55, .09, 72), (14.65, .09, 72), (14.75, .2, 77)]
    play(b, "cornet", call, 0.7, "cornet", 0.1, gate=1.0)
    b.cue(t5, "PHONE: accordion bellows-tremolo Dm -> A7, snare roll creeping up; little bugle call (C-C-F) right after 'army.'")

    # ============ 6 ARMY ARRIVES 15.0 - 20.07: full band, army theme bars 1-2 (+3), cymbal on the truck stop @456
    t6 = s(6)
    play(b, "cornet", notes(t6, ARMY, bars=[1, 2, 3]), 0.8, "cornet", 0.1)
    play(b, "bone", notes(t6, ARMY, bars=[1, 2, 3], transpose=-12), 0.45, "bone", -0.25)
    for bar in range(3):
        tb = t6 + bar * 2.0
        oompah(b, tb, ARMY_CH[bar + 1], 0.66, 0.42)
        snare_bar(b, tb, "march", 0.6)
        lager(b, tb, 4, 0.42)
        b.add("bassdrum", I.bass_drum(0.55, _r()), tb)
        b.add("bassdrum", I.bass_drum(0.4, _r()), tb + 2 * Q)
    b.add("cymbal", I.cymbal(0.5, _r()), fr(T.TRUCK_STOP))
    b.add("cymbal", I.cymbal(0.3, _r(), dur=1.2), fr(T.SALUTE))
    b.add("bassdrum", I.bass_drum(0.8, _r()), fr(T.CRATE))
    b.add("cymbal", I.cymbal(0.35, _r(), dur=1.0), fr(T.CRATE))
    b.cue(t6, "ARMY ARRIVES: full band, army theme bars 1-3 (cornet + trombone an octave down), bass drum, lagerphone")
    b.cue(fr(T.TRUCK_STOP), "cymbal crash on the truck stop @456; light crash on the salute @502; bass drum + crash on the crate @582")

    # ============ 7 FIRST DAY 20.07 - 23.17: theme bar 4 then the emus trot off: banjo trot, trombone fall after 'range.'
    t7 = 21.0
    play(b, "cornet", notes(19.0 + 2.0, ARMY, bars=[4]), 0.62, "cornet", 0.1)
    oompah(b, 21.0, ARMY_CH[4], 0.55, 0.3, beats=4)
    snare_bar(b, 21.0, "light", 0.4)
    trot = [(22.0 + k * 0.25, 0.12, m) for k, m in enumerate([62, 65, 69, 65, 62, 65, 69, 74])]
    play(b, "banjo", trot, 0.45, "banjo", -0.4, mute=0.5)
    b.add("bone", I.brass(F(53), 0.5, 0.6, _r(), "bone", bend=lambda t: -500 * np.clip((t - 0.08) / 0.42, 0, 1) ** 1.5, rel=0.1), 22.82, -0.2)
    b.cue(t7, "theme bar 4 sags; muted banjo trot as the emus jog over the rise; trombone fall right after 'range.' @674")

    # ============ 8 DAM 23.17 - 26.70 (XF 695): tiptoe ambush (EMU motif pizz + reed), then the DRAMATIC HOLD from
    # 'and the gun' (26.0) through the gun close-up @797, CUT OFF dead on the jam @801
    t8 = s(8)
    for rep in range(2):
        ev = [(t8 + 0.1 + rep * 4 * Q * 2 + bt * Q, d, m) for (bt, d, m) in EMU]
        ev = [e for e in ev if e[0] < 25.95]
        play(b, "reed", ev, 0.55 + 0.1 * rep, "reed", -0.2, gate=0.4, stacc=True)
        play(b, "banjo", [(t, d, m + 12) for (t, d, m) in ev], 0.32, "banjo", 0.35, mute=0.8)
    for k in range(int((25.95 - t8) / Q)):
        t = t8 + 0.1 + k * Q
        b.add("tuba", I.brass(F(38 if k % 2 == 0 else 45), 0.12, 0.38, _r(), "tuba", scoop=-30), t, -0.1)
        if k % 2:
            b.add("wood", I.woodblock(0.25, _r(), f=1100), t, 0.4)
    timp_roll(b, 24.2, 25.95, F(38), 0.04, 0.22)
    hold0, tj = 25.98, fr(T.JAM)
    bel = lambda t: 0.6 + 0.4 * np.clip(t / (tj - hold0), 0, 1) ** 1.5
    b.add("accordion", I.accordion([F(m) for m in [57, 60, 63, 66]], tj - hold0 + 0.05, 0.6, _r(), att=0.06,
                                    bellows=lambda t: bel(t) * (0.8 + 0.2 * np.sin(2 * np.pi * 10 * t))), hold0, 0.3)
    for m in [45, 51, 57, 60]:
        b.add("horns", I.brass(F(m), tj - hold0 + 0.05, 0.5, _r(), "soft", scoop=-6), hold0, 0.0)
    roll(b, hold0, tj - 0.01, 0.15, 0.9)
    timp_roll(b, hold0, tj - 0.02, F(33), 0.2, 0.9)
    rc = I.cymbal(0.5, _r(), dur=0.9)[::-1]
    b.add("cymbal", rc[-ns(tj - fr(T.GUN_CU) + 0.15):], tj - (tj - fr(T.GUN_CU) + 0.15))
    cut(b, tj)
    b.cue(t8, "DAM (XF @695): tiptoe ambush - EMU motif on reed + muted banjo, tuba pizz, woodblock, timpani rumble")
    b.cue(hold0, "DRAMATIC HOLD: Adim7 tremolo (accordion + low brass) with snare and timpani rolls crescendo, reverse cymbal into the gun close-up @797")
    b.cue(tj, "CUT-OFF dead on the jam @801 - silence for the clack, the spring and 'jammed.'")

    # ============ 9 TRUCK 27.5 - 31.23: determined restart under the hammering, then the chase galop from @875
    t9 = s(9)
    for k in range(3):
        b.add("tuba", I.brass(F([41, 36, 41][k]), 0.2, 0.45, _r(), "tuba"), t9 + 0.05 + k * Q, -0.1)
    snare_bar(b, t9 + 0.05, "light", 0.3, steps=range(12))
    tc = fr(T.TRUCK_CUT)
    roll(b, tc - 0.45, tc - 0.02, 0.1, 0.55, accent=0.6, at=tc)
    chase = notes(tc, ARMY, bars=[1, 2])
    chase = [n for n in chase if n[0] < 30.05]
    play(b, "cornet", chase, 0.72, "cornet", 0.1)
    for bar in range(2):
        tb = tc + bar * 2.0
        nb = 4 if bar == 0 else 2
        oompah(b, tb, ARMY_CH[bar + 1], 0.62, 0.36, beats=nb, bounce=True)
        snare_bar(b, tb, "drive", 0.45, steps=range(16) if bar == 0 else range(8))
        lager(b, tb, nb, 0.45, on=(0, 1, 2, 3))
    banjo_roll(b, tc, ["F", "F", "F", "F", "Bb", "Bb"], 6, 0.38, sub=4)
    # 'outran' @902: the emus pull away - chromatic run up on reed + banjo, then a deflated trombone fall after 'truck.'
    to = fr(T.OUTRAN)
    run = [(to + k * 0.11, 0.1, 50 + k) for k in range(8)]
    play(b, "reed", run, 0.7, "reed", -0.2, gate=0.8)
    play(b, "banjo", [(t, d, m + 24) for (t, d, m) in run], 0.4, "banjo", 0.4)
    for k in range(4):
        b.add("tuba", I.brass(F([45, 43, 41, 40][k]), 0.12, 0.45, _r(), "tuba", scoop=-30), to + 0.9 + k * 0.12, -0.1)
    b.add("bone", I.brass(F(57), 0.32, 0.6, _r(), "bone", bend=lambda t: -600 * np.clip((t - 0.06) / 0.3, 0, 1) ** 1.4, rel=0.1), 30.95, -0.2)
    b.cue(t9, "TRUCK: tuba + light snare restart under the hammering (rests left for the hits)")
    b.cue(tc, "CHASE @875: galop - theme in the cornet, tuba bouncing octave eighths with the truck, banjo 16ths, lagerphone every beat")
    b.cue(to, "'outran' @902: chromatic run up (reed + banjo) as the emus pull away; trombone fall after 'truck.'")

    # ============ 10 CAMP 31.23 - 37.83 (XF 937): dusk, mock-heroic and small - solo cornet, accordion pad, brushes;
    # pen flourish @963 = banjo/glock run up; the casings reveal @1040-1087 swells to a full F chord on 'bullets'
    t10 = s(10)
    camp = notes(t10 + 0.25, ARMY, bars=[1, 2], aug=1.5)
    camp = [n for n in camp if n[0] < 34.6]
    play(b, "cornet", camp, 0.5, "cornet", 0.05, vib=12)
    for (ta, tb_, c) in [(t10, 33.25, "F"), (33.25, 34.67, "Bb")]:
        b.add("accordion", I.accordion([F(m) for m in CH[c]["pah"]], tb_ - ta, 0.3, _r(), att=0.4, rel=0.4), ta, 0.25)
        b.add("tuba", I.brass(F(CH[c]["oom"][0]), tb_ - ta - 0.1, 0.3, _r(), "soft", scoop=-8), ta, -0.1)
    tp = fr(T.PEN)
    for k, m in enumerate([65, 69, 72, 77, 81, 84]):
        b.add("glock", I.glock(F(m + 12), 0.25 + 0.04 * k, _r(), dur=0.8), tp - 0.18 + k * 0.035, 0.3)
    ca, cb = fr(T.CASINGS[0]), fr(T.CASINGS[1])
    sw = [(ca, cb - ca, [57, 60, 65]), (cb, 1.5, [57, 60, 65, 69])]
    b.add("accordion", I.accordion([F(m) for m in [58, 62, 65]], cb - ca, 0.25, _r(), att=1.0,
                                    bellows=lambda t: 0.4 + 0.6 * np.clip(t / 1.5, 0, 1)), ca, 0.25)
    for m in [46, 53, 58, 62]:
        b.add("horns", I.brass(F(m), cb - ca, 0.42, _r(), "soft", scoop=-5), ca + 0.05, 0.0)
    timp_roll(b, ca + 0.4, cb - 0.05, F(36), 0.05, 0.35)
    roll(b, ca + 0.6, cb - 0.03, 0.05, 0.35)
    for k in range(9):
        b.add("glock", I.glock(F([96, 93, 101, 98, 100, 96, 103, 101, 105][k]), 0.18, _r(), dur=0.7), ca + 0.2 + k * 0.17, [-0.6, 0.5, -0.2, 0.7, -0.5, 0.2, 0.6, -0.4, 0.1][k])
    for m in [41, 48, 53, 57, 60, 65, 69]:
        b.add("horns", I.brass(F(m), 1.4, 0.55, _r(), "soft", scoop=-6), cb, 0.4 * ((m - 55) / 14))
    b.add("cymbal", I.cymbal(0.3, _r(), dur=1.0), 37.47)
    b.add("triangle", I.triangle(0.35, _r(), dur=1.2), 37.47)
    b.add("bassdrum", I.bass_drum(0.45, _r()), 37.47)
    b.cue(t10, "CAMP (XF @937): dusk - solo cornet plays the army theme slow and proud (vibrato), accordion pad, soft tuba")
    b.cue(tp, "pen flourish @963: glock run up")
    b.cue(ca, "casings reveal @1040: Bb pad swells, timpani + snare roll, glock glints all over the stereo field")
    b.cue(cb, "@1087 ('bullets'): arrives (soft attack, under the word) on a full F chord in the low brass; cymbal + bass drum + triangle glint right after 'bullets.' (37.47)")

    # ============ 11 DUMP 37.83 - 40.03: pompous again - army theme bar 1 (proud pats), stab on 'plenty'
    t11 = s(11)
    play(b, "cornet", notes(t11 + 0.1, ARMY, bars=[1]), 0.72, "cornet", 0.1)
    oompah(b, t11 + 0.1, ARMY_CH[1], 0.6, 0.38)
    snare_bar(b, t11 + 0.1, "march", 0.5)
    lager(b, t11 + 0.1, 4, 0.4)
    b.add("cymbal", I.cymbal(0.35, _r()), t11 + 0.1)
    chord(b, "stab", 39.86, [53, 60, 65, 69, 72], 0.14, 0.7, "stab", 0.7)
    b.add("bassdrum", I.bass_drum(0.6, _r()), 39.86)
    cut(b, s(12) - 0.01, fade=0.08)
    b.cue(t11, "DUMP: army theme bar 1 again, pompous; F stab + bass drum right after 'bullets.'")

    # ============ 12 UNLUCKILY 40.03 - 42.33: deflated - the band drops out, a lone reed plods the EMU motif
    # (thin and low under 'Unluckily'), muted banjo plunks; two-note brass 'bwah bwah' after 'ten.'
    t12 = s(12)
    plod = [(40.70, .4, 50), (41.0, .4, 49), (41.3, .4, 48), (41.6, .6, 47)]
    play(b, "reed", plod, 0.5, "reed", -0.2, gate=0.7)
    for (t, d, m) in plod:
        b.add("banjo", I.banjo(F(m + 12), 0.3, _r(), mute=0.85), t, 0.35)
    b.add("bone", I.brass(F(50), 0.2, 0.55, _r(), "bone", scoop=-30), 41.88, -0.2)
    b.add("bone", I.brass(F(49), 0.38, 0.55, _r(), "bone", scoop=-30, bend=lambda t: -150 * np.clip((t - 0.1) / 0.28, 0, 1)), 42.1, -0.2)
    b.cue(t12, "UNLUCKILY: band out; a lone reed plods down chromatically (D-C#-C-B) with muted banjo; trombone 'bwah-bwaah' after 'ten.'")

    # ============ 13 TOY MARCH 42.33 - 46.07: explainer - glock + fife play the army theme strictly in time,
    # light oom-pah + snare; the toy soldiers' boots fall on every beat (42.5 + k/2)
    t13 = fr(T.MARCH13[0])
    tm = notes(t13, ARMY, bars=[1, 2])
    tm = [n for n in tm if n[0] < 45.95]
    play(b, "glock", [(t, d, m + 12) for (t, d, m) in tm], 0.45, "glock", -0.3)
    play(b, "fife", [(t, d, m + 12) for (t, d, m) in tm], 0.42, "fife", 0.25)
    for bar in range(2):
        tb = t13 + bar * 2.0
        nb = 4 if bar == 0 else 3
        oompah(b, tb, ARMY_CH[bar + 1], 0.45, 0.28, beats=nb, accordion=False)
        snare_bar(b, tb, "light", 0.4, steps=range(16) if bar == 0 else range(12))
    b.add("triangle", I.triangle(0.3, _r(), dur=0.8), fr(1369))
    b.cue(t13, "TOY MARCH: glock + fife (an octave up) play the army theme strictly in time, light oom-pah + snare; boots on every beat")

    # ============ 14 SCATTER 46.07 - 50.13: chaos - glock and banjo runs flying out in every direction (stereo),
    # tuba chromatic scrambles, snare 16ths; spin cut @1450: slide-whistle swirls; dizzy wobble deflate after 'once.'
    t14 = s(14)
    cut(b, t14 - 0.005, fade=0.01, keep=())
    b.add("cymbal", I.cymbal(0.45, _r(), dur=1.5), t14)
    b.add("bassdrum", I.bass_drum(0.8, _r()), t14)
    rr = rng(1450)
    for k in range(12):
        t = t14 + 0.05 + k * 0.33
        if t > 49.6:
            break
        up = k % 2 == 0
        base = int(rr.integers(72, 84))
        p = float(rr.uniform(-0.9, 0.9))
        for j in range(6):
            m = base + (j * 2 if up else -j * 2)
            b.add("glock" if k % 3 else "banjo", (I.glock(F(m + 12), 0.25, _r(), dur=0.5) if k % 3 else I.banjo(F(m), 0.35, _r())),
                  t + j * 0.035, p)
    for k in range(16):
        t = t14 + k * Q / 2
        b.add("tuba", I.brass(F(41 + [0, 1, 2, 3, 4, 3, 2, 1][k % 8]), 0.12, 0.5, _r(), "tuba", scoop=-30), t, -0.1)
    snare_bar(b, t14, "drive", 0.4)
    snare_bar(b, t14 + 2.0, "drive", 0.35, steps=range(8))
    ts = fr(T.SPIN_CUT)
    swirl = [(0, 79), (0.25, 86), (0.5, 76), (0.75, 84), (1.0, 74), (1.25, 82), (1.5, 72), (1.8, 74)]
    b.add("slide", I.slide_whistle(swirl, 0.5, _r(), vib=0.4), ts, 0.0)
    tw = 49.68
    b.add("bone", I.brass(F(53), 0.42, 0.6, _r(), "bone", bend=lambda t: -400 * np.clip(t / 0.42, 0, 1) + 60 * np.sin(2 * np.pi * 7 * t), rel=0.08), tw, -0.2)
    b.add("accordion", I.accordion([F(m) for m in [56, 59, 62, 65]], 0.42, 0.35, _r(), bellows=lambda t: 0.6 + 0.4 * np.sin(2 * np.pi * 7 * t)), tw, 0.3)
    b.cue(t14, "SCATTER @1382: crash + bass drum, glock/banjo runs flung up and down across the stereo field, tuba chromatic scramble, snare 16ths")
    b.cue(ts, "spin cut @1450: slide-whistle swirls round and round (dizzy); wobbling trombone + accordion deflate after 'once.'")

    # ============ 15 PARADE 50.13 - 55.20 (XF 1504): imagination - solemn mock-heroic brass chorale (army theme bar 1
    # at half speed), snare roll pp, timpani; crescendo with the crane to a grand F chord on 'world' @1633
    t15 = s(15)
    ch_m = notes(t15 + 0.1, ARMY, bars=[1], aug=2.0)
    play(b, "cornet", ch_m, 0.6, "cornet", 0.1, vib=10)
    for (ta, tb_, ms) in [(t15 + 0.1, t15 + 2.1, [41, 53, 57, 60]), (t15 + 2.1, t15 + 3.1, [46, 53, 58, 62]), (t15 + 3.1, 54.66, [36, 52, 55, 58])]:
        for m in ms:
            b.add("horns", I.brass(F(m), tb_ - ta, 0.45, _r(), "soft", scoop=-5), ta, 0.35 * ((m - 52) / 12))
    roll(b, t15 + 0.1, 54.64, 0.04, 0.35)
    timp_roll(b, 53.4, 54.64, F(36), 0.05, 0.5)
    tw = fr(T.WORLD)
    th = 54.66                       # the hit lands as 'world' ends (the word itself stays clear)
    for m in [41, 48, 53, 57, 60, 65, 69, 72]:
        b.add("horns", I.brass(F(m), 0.62, 0.62, _r(), "soft", scoop=-6, fall=0.0), th, 0.4 * ((m - 57) / 15))
    play(b, "cornet", [(th, 0.6, 77)], 0.7, "cornet", 0.1, gate=1.0, vib=12)
    b.add("cymbal", I.cymbal(0.45, _r(), dur=1.4), th + 0.01)
    b.add("timpani", I.timpani(F(41), 0.8, _r(), dur=1.4), th, -0.1)
    b.cue(t15, "PARADE (XF @1504): mock-heroic chorale, the army theme at half speed (cornet, vibrato) over low brass, snare roll pp")
    b.cue(tw, "'world' @1633: the crescendo peaks with the word; the grand F chord (full brass + cymbal + timpani) hits as it ends (54.66, f1640), released before 'The army went home.'")

    # ============ 16 HOME 55.20 - 56.47: the theme's head on a lonely trombone, sagging flat like the gun
    t16 = s(16)
    sag = [(t16 + 0.05, 0.36, 60), (t16 + 0.42, 0.12, 57), (t16 + 0.56, 0.62, 53)]
    for i, (t, d, m) in enumerate(sag):
        bend = (lambda t_: -180 * np.clip((t_ - 0.15) / 0.5, 0, 1) ** 1.5) if i == 2 else None
        b.add("bone", I.brass(F(m), d, 0.5, _r(), "bone", scoop=-25, bend=bend, vib=8 if i == 2 else 0), t, -0.15)
    b.add("tuba", I.brass(F(41), 1.1, 0.3, _r(), "soft", bend=lambda t_: -120 * np.clip((t_ - 0.4) / 0.7, 0, 1)), t16 + 0.05, -0.1)
    b.cue(t16, "HOME: the theme's head (C-A-F) on a lonely trombone, the last note sagging flat like the gun on the truck")

    # ============ 17 ENDING 56.47 - 59.0: warm and golden - accordion + banjo + soft horns; the EMU motif's opening
    # turned major and sweet; Bb -> C7 -> F resolution after 'there.', glock + triangle on the blink
    t17 = s(17)
    sweet = [(t17 + 0.05, 0.45, 69), (t17 + 0.5, 0.25, 72), (t17 + 0.75, 0.25, 70), (t17 + 1.0, 0.5, 67), (t17 + 1.5, 1.0, 64)]
    for (t, d, m) in sweet:
        b.add("accordion", I.accordion([F(m)], d * 0.95, 0.6, _r(), att=0.05), t, 0.15)
    for (ta, tb_, c) in [(t17, t17 + 1.0, "Bb"), (t17 + 1.0, 57.95, "C7")]:
        b.add("horns", I.brass(F(CH[c]["oom"][0] + 12), tb_ - ta, 0.3, _r(), "soft"), ta, -0.1)
        for m in CH[c]["pah"]:
            b.add("horns", I.brass(F(m), tb_ - ta, 0.25, _r(), "soft", scoop=-5), ta, 0.2)
    banjo_roll(b, t17, ["Bb", "Bb", "C7", "C7"], 3, 0.25, sub=2, p=-0.35)
    tf_ = 57.95
    for m in [41, 53, 57, 60, 65]:
        b.add("horns", I.brass(F(m), 0.9, 0.38, _r(), "soft", scoop=-4), tf_, 0.3 * ((m - 55) / 10))
    b.add("accordion", I.accordion([F(m) for m in [57, 60, 65, 69]], 0.95, 0.5, _r(), att=0.12, rel=0.12), tf_, 0.2)
    for k, m in enumerate([65, 69, 72, 77]):
        b.add("banjo", I.banjo(F(m), 0.35, _r()), tf_ + k * 0.07, -0.35)
    b.add("glock", I.glock(F(89), 0.35, _r(), dur=1.0), fr(T.BLINK), 0.25)
    b.add("triangle", I.triangle(0.22, _r(), dur=0.6), fr(T.BLINK) + 0.01)
    b.cue(t17, "ENDING: warm and golden - accordion sings the EMU motif's opening turned major (A-C-Bb-G-E), soft horns Bb -> C7, banjo")
    b.cue(tf_, "resolves on F after 'there.' (57.8): soft brass + accordion + banjo strum; glock + triangle 'ting' on the blink @1756; fade to 59.0")
    end = np.ones(N)
    a = ns(58.55)
    end[a:] = np.linspace(1, 0, N - a) ** 1.6
    for k in b.tr:
        b.tr[k] *= end[None, :]
    return b


TARGET = {  # relative balance inside the band (LU, measured on each track's own active span)
    "cornet": 0.0, "bone": -1.0, "tuba": -3.0, "horns": -6.0, "accordion": -4.0, "banjo": -5.0, "lager": -11.0,
    "snare": -7.0, "bassdrum": -8.0, "cymbal": -13.0, "glock": -7.0, "timpani": -8.0, "reed": -2.0, "wood": -11.0,
    "slide": -4.0, "triangle": -16.0, "fife": -5.0, "stab": -2.0,
}
SEND = {"cornet": 0.14, "bone": 0.12, "tuba": 0.08, "horns": 0.18, "accordion": 0.12, "banjo": 0.10, "lager": 0.10,
        "snare": 0.12, "bassdrum": 0.10, "cymbal": 0.15, "glock": 0.22, "timpani": 0.16, "reed": 0.10, "wood": 0.10,
        "slide": 0.12, "triangle": 0.25, "fife": 0.15, "stab": 0.16}


def render(b, ref=-20.0):
    hall = make_ir(1.3, 7, pre=0.015, hf=1.5)
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
    out = dry + 0.7 * convolve_st(wet, hall)
    out = hp(out, 30, 2)
    return out, levels


SECTIONS = [  # (name, start, end) for the level automation in mix.py
    ("hook", 0.0, fr(T.FLASH)), ("lost", fr(T.FLASH), fr(157)), ("farm", fr(157), fr(305)), ("emus", fr(305), fr(389)),
    ("phone", fr(389), fr(450)), ("army", fr(450), fr(602)), ("firstday", fr(602), fr(695)), ("dam", fr(695), fr(T.JAM)),
    ("jam", fr(T.JAM), fr(825)), ("truck", fr(825), fr(937)), ("camp", fr(937), fr(1135)), ("dump", fr(1135), fr(1201)),
    ("unlucky", fr(1201), fr(1270)), ("toy", fr(1270), fr(1382)), ("scatter", fr(1382), fr(1504)),
    ("parade", fr(1504), fr(1656)), ("home", fr(1656), fr(1694)), ("ending", fr(1694), T.DUR),
]
