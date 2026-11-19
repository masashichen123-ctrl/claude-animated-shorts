# Every sound effect + ambience bed of "The Great Emu War" as a cue list locked to the picture (timeline.py),
# rendered into one stereo SFX stem. Level convention (same as the earlier short): each EVENT has a "naive" level
# (LU relative to the voice stem, measured as the event's max momentary loudness) and is placed SFX_DB = -6 dB under
# it, plus per-cue offsets; ambience BEDS are integrated loudness and are not reduced. Loud hits sit in the gaps of
# the narration (gaps measured on voice.wav, listed in cues.md); anything that has to sit under a word is kept low,
# short, and where it would compete with consonants, low-passed.
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, peq, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated, smooth_noise, modal)
import sfx_gen as G
import sfx_emu as E
import timeline as T

N = ns(T.DUR)
SFX_DB = -6.0
fr = T.fr


class Cue:
    def __init__(self, t, name, desc, gen, naive, kind="event", p=0.0, extra=0.0, lpf=None, send=0.1, frame=None):
        self.t, self.name, self.desc, self.gen, self.naive = t, name, desc, gen, naive
        self.kind, self.p, self.extra, self.lpf, self.send = kind, p, extra, lpf, send
        self.applied = naive + (SFX_DB if kind == "event" else 0.0) + extra
        self.measured = None
        self.frame = frame


def _bed(dur, fin, fout, parts):
    """parts = list of callables(dur, r) -> stereo or mono; summed, faded"""
    def g(seed):
        r = rng(seed)
        out = np.zeros((2, ns(dur)))
        for fn in parts:
            x = fn(dur, r)
            out += st(x)[:, : out.shape[1]]
        return fades(out, fin, fout), 0.0
    return g


def breeze(level=1.0, bright=900):
    return lambda d, r: G.breeze(d, r, level, 0.15, bright)


def wheat(level=0.35):
    return lambda d, r: E.wheat_rustle(d, r, level)


def flies(level=0.06, count=2):
    return lambda d, r: E.flies(d, r, count, level)


def birds(level=0.05, density=0.22):
    return lambda d, r: lp(E.magpies(d, r, density), 6000, 1) * level


def windmill(level=0.25):
    def f(d, r):
        y = np.zeros(ns(d))
        tm = r.uniform(0.3, 0.9)
        while tm < d - 0.6:
            c = G.creak(0.5, r, 140, 210, G.SMALLMETAL, [(0, 0), (0.3, 1), (0.7, 0.8), (1, 0)], 0.1, 0.02, scale=0.6)
            G._place_mono(y, c * level, tm)
            tm += 2.4 + r.uniform(-0.1, 0.1)
        return pan(y, 0.45)
    return f


def crickets(level=0.01):
    return lambda d, r: widen(G.crickets(d, r, 4) * level, r, 9, 1.0)


def lamp(level=0.012):
    return lambda d, r: pan(E.lamp_hiss(d, r) * level, -0.25)


def water(level=0.35):
    return lambda d, r: G.water_bed(d, r, 0.35, 0.5) * level


def yard_emus(level=0.25):
    return lambda d, r: E.herd(d, r, 3.0, None, 0.7, boom_rate=0.0, grunt_rate=0.6, run=False) * level


def cues():
    C = []
    R = rng(1932)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append

    # ------------------------------------------------ ambience beds (integrated loudness vs the voice stem)
    beds = [
        (0.0, 5.32, "amb_morning", "stubble field, morning: breeze, wheat rustle, flies round the sweating soldier, magpies far off (shots 1-2)",
         [breeze(1.0, 800), wheat(0.3), flies(0.09, 2), birds(0.05)], -28),
        (5.15, 13.0, "amb_farm", "farm, day: wheat swaying in the wind, windmill squeak every 2.4 s, magpies carolling, a fly (shots 3-4)",
         [breeze(1.0, 1000), wheat(0.5), windmill(0.3), birds(0.08, 0.3), flies(0.03, 1)], -27),
        (12.93, 15.06, "amb_verandah", "verandah: breeze, flies, emus pecking and grunting in the yard (shot 5)",
         [breeze(0.8, 900), flies(0.06, 2), yard_emus(0.3)], -30),
        (15.0, 20.1, "amb_road", "red dirt road: hot breeze, a far magpie (shot 6)", [breeze(1.0, 900), birds(0.03, 0.15)], -31),
        (20.03, 23.25, "amb_paddock", "open paddock: wind (shot 7)", [breeze(1.1, 1100), wheat(0.15)], -31),
        (23.1, 27.55, "amb_dam", "farm dam, golden afternoon: water lapping, emus drinking and grunting, magpies (shot 8)",
         [breeze(0.7, 800), water(0.5), yard_emus(0.25), birds(0.05, 0.25)], -28),
        (27.45, 31.3, "amb_paddock2", "paddock: wind (shot 9)", [breeze(1.1, 1100)], -32),
        (31.15, 37.9, "amb_dusk", "army camp at dusk: crickets, the oil lamp's hiss, a soft breeze (shot 10)",
         [breeze(0.5, 600), crickets(0.012), lamp(0.02)], -30),
        (37.8, 40.08, "amb_dump", "supply dump, day: breeze, magpie (shot 11)", [breeze(0.9, 900), birds(0.05, 0.4)], -32),
        (40.0, 42.4, "amb_paddock3", "paddock: breeze, flies (shot 12)", [breeze(0.9, 900), flies(0.04, 1)], -32),
        (42.3, 46.1, "amb_parade", "flat parade ground: light breeze (shot 13)", [breeze(0.8, 900)], -35),
        (46.03, 50.2, "amb_paddock4", "paddock: wind (shot 14)", [breeze(1.0, 1100)], -33),
        (50.08, 55.25, "amb_golden", "golden parade ground: soft breeze, far magpie (shot 15)", [breeze(0.7, 700), birds(0.04, 0.2)], -32),
        (55.17, 56.5, "amb_sunset", "sunset road: breeze (shot 16)", [breeze(0.8, 700)], -32),
        (56.43, 59.0, "amb_wheat", "golden wheat: rustle, breeze, a magpie, a fly (shot 17)",
         [breeze(0.8, 800), wheat(0.45), birds(0.06, 0.4), flies(0.02, 1)], -29),
    ]
    for i, (a, b, name, desc, parts, lvl) in enumerate(beds):
        g = _bed(b - a, 0.08 if a > 0 else 0.3, 0.1 if b < T.DUR - 0.01 else 0.6, parts)
        add(Cue(a, name, desc, (lambda g=g, s=100 + i: g(s)), lvl, "bed", send=0.0))

    # ------------------------------------------------ shot 1-2: the hook
    for k, f in enumerate(T.EMU_STEPS_1):
        add(Cue(fr(f), "emu_step", f"the big emu steps out of the wheat ({k + 1}/3)",
                (lambda r=rr(): (E.emu_step(r, 1.3), 0.0)), -11, p=0.15, lpf=5000, frame=f))
    add(Cue(fr(20), "wheat_part", "wheat stalks pushed aside as the emu steps out", lambda: (E.feathers(rng(20), 0.9) * 0.8, 0.0), -16, p=0.15, frame=20))
    add(Cue(3.30, "emu_boom", "emu leans in on 'emus' @98: low drumming boom from its chest (stare-down)",
            lambda: (E.emu_boom(rng(98), 4, 62, 3.6), 0.0), -10, p=0.1, lpf=900, frame=99))
    add(Cue(fr(T.FLASH), "flash_swell", "reverse swell into the white FLASH @119 (peaks on the frame)",
            lambda: (G.whoosh(0.58, rng(119), 0.55, 500, 4000, 0.9, 0.04, 0.4), 0.55), -9, frame=T.FLASH))
    add(Cue(fr(T.KICK), "kick_impact", "KICK @126: the Lewis gun goes over - dull thump + metal clatter in the stubble",
            lambda: (E.crate_thud(rng(126), 1.0) + np.pad(lp(G.rattle(0.35, rng(127), 60, np.exp(-np.linspace(0, 1, ns(0.35)) * 3), heavy=True), 3500, 1), (0, ns(0.25))), 0.0),
            -11, p=-0.2, frame=T.KICK))
    add(Cue(4.80, "emu_boom", "the emu on the crate puffs its chest: short proud boom after 'lost.'",
            lambda: (E.emu_boom(rng(144), 3, 70, 4.0), 0.0), -10, p=0.2, lpf=900, frame=144))

    # ------------------------------------------------ XF whooshes
    for f in T.XF:
        add(Cue(fr(f), "xf_whoosh", f"soft air swell through the dissolve @{f}",
                (lambda r=rr(): (G.whoosh(0.7, r, 0.3, 300, 1500, 0.9, 0.2, 0.08), 0.3)), -16, send=0.15, frame=f))

    # ------------------------------------------------ shot 4: twenty thousand emus
    a4, b4 = T.shot_t(4)
    d4 = b4 - a4
    add(Cue(a4, "emu_herd", "100+ emus pour over the hill into the wheat: running feet thunder (swells in), booms and grunts",
            lambda: (E.herd(d4 + 0.05, rng(305), 55, [(0, 0.15), (1.0, 0.8), (d4 - 0.4, 1.0), (d4, 0.6)], 0.9, 0.7, 1.6), 0.0),
            -10, lpf=4500, send=0.15, frame=305))
    def pecks(r):
        y = np.zeros((2, ns(0.8)))
        for k in range(16):
            tm = r.uniform(0, 0.62)
            place(y, pan(E.peck(r) * r.uniform(0.3, 1.0) * (0.3 if tm < 0.38 else 1.0), r.uniform(-0.6, 0.6)), tm)
        place(y, E.wheat_rustle(0.7, r, 0.25) * np.interp(tt(0.7), [0, 0.35, 0.45, 0.7], [0.3, 0.3, 1, 1])[None, :], 0.0)
        return y
    add(Cue(fr(368), "pecking", "close emus peck the wheat away ('ate' @370): beak pecks + stalks crunching",
            lambda: (pecks(rng(370)), 0.0), -12, frame=368))

    # ------------------------------------------------ shot 5: wall telephone
    for k, (fa, fb) in enumerate(T.CRANK):
        add(Cue(fr(fa), "phone_crank", f"wall telephone: magneto crank + generator whine + bells ringing (burst {k + 1}/2)",
                (lambda r=rr(), d=fr(fb - fa): (E.phone_crank(r, d), 0.0)), -8 if k else -9, p=-0.3, send=0.12, frame=fa))

    # ------------------------------------------------ shot 6: the army arrives
    ts = fr(T.TRUCK_STOP)
    add(Cue(14.55, "truck_arrive", "army truck rushing in (1930s 4-cylinder, off the throttle) into the stop @456",
            lambda: (fades(E.engine(ts - 14.55 + 0.05, rng(450), np.linspace(1900, 900, 8), 0.8), 0.1, 0.03), 0.0), -12, p=-0.3, frame=436))
    add(Cue(ts - 0.56, "truck_skid", "SKID to a stop in red dust, ending exactly on @456 (dirt crunch + scrub, body rock)",
            lambda: (E.skid(rng(456), 0.6), 0.0), -6, p=-0.2, frame=T.TRUCK_STOP))
    add(Cue(ts, "truck_idle", "engine idling (low putter, under the line) until the cut @527",
            lambda: (fades(E.engine(fr(527) - ts, rng(457), 620, 0.4), 0.05, 0.15), 0.0), -14, p=-0.3, lpf=2500, frame=T.TRUCK_STOP))
    add(Cue(fr(T.SALUTE), "salute", "two soldiers salute @502: heel clicks + hand swish", lambda: (E.salute(rng(502)), 0.0), -12, p=0.2, frame=T.SALUTE))
    add(Cue(fr(T.GUNS), "gun_cock", "Lewis gun on its tripod cocked @543", lambda: (E.cock(rng(543)), 0.0), -13, p=0.1, frame=T.GUNS))
    add(Cue(fr(T.CRATE), "crate_thud", "one more ammo crate on the stack @582: box thud + rounds rattling inside",
            lambda: (E.crate_thud(rng(582), 1.0), 0.0), -7, p=0.15, lpf=4000, frame=T.CRATE))

    # ------------------------------------------------ shot 7: the first day (bursts in the narration gaps, a soft one under it)
    bursts = [(20.075, 2, 0, None), (20.92, 3, 0, None), (21.58, 5, -9, 2500), (22.93, 3, 0, None)]
    for k, (tb, nr, ex, lpf) in enumerate(bursts):
        add(Cue(tb, "lewis_burst", f"Lewis gun burst, {nr} rounds at 9.4/s (cracks + drum rattle + casings){' - soft, under the line' if ex else ''}",
                (lambda r=rr(), nr=nr: (E.lewis_burst(r, nr), 0.005)), -4, p=-0.1, extra=ex, lpf=lpf, send=0.2, frame=int(round(tb * 30))))
        for j in range(nr):
            tp = tb + j / 9.4 + 0.28
            add(Cue(tp, "dust_puff_far", "dust puff falling short, far out in the paddock",
                    (lambda r=rr(): (lp(E.dust_puff(r, 1.0), 2500, 1), 0.0)), -16 + ex, p=float(R.uniform(-0.5, 0.5)), send=0.3, frame=int(round(tp * 30))))
    add(Cue(20.4, "emus_trot_far", "the emus trot calmly away over the rise (far, fading)",
            lambda: (E.herd(2.6, rng(674), 18, [(0, 1.0), (2.6, 0.2)], 0.4, 0.0, 0.3, run=False), 0.0), -16, lpf=3000, send=0.3, frame=612))

    # ------------------------------------------------ shot 8: the dam and the jam
    tj = fr(T.JAM)
    add(Cue(tj, "jam_clack", "the gun JAMS @801: bolt slams and stops dead (clack) + thunk + smoke puff",
            lambda: (E.jam_clack(rng(801)), 0.0), -4, p=0.0, send=0.08, frame=T.JAM))
    add(Cue(tj + 0.02, "spring_boing", "the drum spring pops out @801: 'sproing' + wobbling twang",
            lambda: (E.spring_boing(rng(802)), 0.0), -9, p=0.15, send=0.1, frame=T.JAM))

    # ------------------------------------------------ shot 9: hammer + the truck chase
    for k, f in enumerate(T.HAMMER):
        add(Cue(fr(f), "hammer_metal", f"Meredith hammers the gun mount onto the truck tray ({k + 1}/4)",
                (lambda r=rr(), k=k: (E.hammer_metal(r, 1.0 if k < 3 else 1.15), 0.0)), -9, p=0.25, send=0.12, frame=f))
    tc = fr(T.TRUCK_CUT)
    add(Cue(tc + 0.02, "gear_crunch", "crash gearbox: teeth grind then the gear clunks in @875", lambda: (E.gear_crunch(rng(875), 0.3), 0.0),
            -6, p=-0.1, frame=T.TRUCK_CUT))
    dch = fr(937) - tc
    add(Cue(tc + 0.15, "truck_engine", "truck engine flat out across the paddock (revs climbing)",
            lambda: (fades(E.engine(dch - 0.1, rng(876), np.linspace(1100, 2300, 10), 1.0), 0.15, 0.1), 0.0), -10, p=-0.1, frame=880))
    rb = rng(890)
    tb = tc + 0.25
    k = 0
    while tb < fr(937) - 0.15:
        add(Cue(tb, "truck_bounce", "truck bounces on the rough paddock (suspension thud, leaf-spring creak, tray + gun rattle)",
                (lambda r=rr(): (E.truck_bounce(r, 1.0), 0.0)), -13 + float(rb.uniform(-2, 1)), p=-0.1, lpf=5000, frame=int(round(tb * 30))))
        tb += float(rb.uniform(0.26, 0.4))
        k += 1
    add(Cue(tc + 0.1, "emu_herd_run", "the emus sprint ahead and pull away by 'outran' @902",
            lambda: (E.herd(dch, rng(902), 40, [(0, 1.0), (0.9, 1.0), (dch, 0.2)], 0.6, 0.0, 0.8), 0.0), -12, p=0.3, lpf=5000, frame=878))
    add(Cue(30.93, "lewis_wild", "the bouncing gunner lets off a wild burst (into the sky)",
            lambda: (E.lewis_burst(rng(928), 2, casings=False), 0.005), -9, p=-0.1, send=0.2, frame=928))

    # ------------------------------------------------ shot 10: the report and the casings
    add(Cue(31.55, "pen_scratch", "Meredith writing the report: nib scratching", lambda: (E.pen_scratch(0.48, rng(946), 7.0), 0.0), -16, p=0.2, frame=946))
    add(Cue(fr(T.PEN) - 0.05, "pen_flourish", "the proud pen FLOURISH @963 ending in a full stop",
            lambda: (E.pen_flourish(rng(963), 0.45), 0.05), -11, p=0.2, frame=T.PEN))
    add(Cue(32.75, "pen_tally", "tally marks: five quick strokes", lambda: (E.pen_scratch(0.9, rng(983), 5.5), 0.0), -19, p=0.2, frame=982))
    ca, cb = fr(T.CASINGS[0]), fr(T.CASINGS[1])
    add(Cue(ca, "casings", "pull-back reveals the MOUNTAIN of brass casings @1040-1087: casings trickling and glinting, sliding hiss",
            lambda: (E.casings_cascade(cb - ca + 1.4, rng(1040), [(0, 0.15), (0.35, 0.6), (1.2, 0.5), (cb - ca, 1.0), (cb - ca + 0.5, 0.5), (cb - ca + 1.4, 0.0)], 70), 0.0),
            -11, p=0.3, send=0.2, frame=T.CASINGS[0]))
    add(Cue(37.5, "casings_slide", "a little avalanche of casings after 'bullets.'", lambda: (E.casings_cascade(0.5, rng(1125), [(0, 1), (0.5, 0)], 120), 0.0),
            -12, p=0.4, send=0.2, frame=1125))

    # ------------------------------------------------ shot 11: pats
    for k, f in enumerate(T.PATS):
        add(Cue(fr(f), "crate_pat", f"soldier proudly pats the crate wall ({k + 1}/2)", (lambda r=rr(): (E.pat(r), 0.0)), -12, p=0.25, frame=f))

    # ------------------------------------------------ shot 12: ten puffs around one calm emu
    for k, f in enumerate(T.PUFFS):
        under = k < 4                                    # 'Unluckily,' (40.20-40.64): keep these low and dull
        add(Cue(fr(f), "dust_puff", f"bullet dust puff {k + 1}/10 popping round the emu's feet (every 4 f from @1205)",
                (lambda r=rr(): (E.dust_puff(r, 1.0), 0.0)), -14 if under else -10, p=-0.5 + 0.1 * k, lpf=1600 if under else 3500, frame=f))
    add(Cue(fr(1203), "lewis_far", "the gun chattering away off screen (distant, low)", lambda: (lp(E.lewis_burst(rng(1203), 10, casings=False), 1500, 2), 0.005),
            -16, p=-0.6, send=0.3, frame=1203))
    for k in range(4):
        tm = 40.15 + k * 0.45
        add(Cue(tm, "emu_step", "the emu strolls on, unbothered", (lambda r=rr(): (E.emu_step(r, 0.9), 0.0)), -15, p=-0.3 + 0.2 * k, lpf=3000,
                frame=int(round(tm * 30))))
    add(Cue(fr(1259), "emu_peck", "the emu pecks once (after 'ten.')", lambda: (E.peck(rng(1259)) + np.pad(E.emu_grunt(rng(1260), 0.12) * 0.5, (0, 0))[: ns(0.12)], 0.0), -9, p=0.3, frame=1259))

    # ------------------------------------------------ shot 13: toy soldiers marching in step (on the music's beat)
    for k, f in enumerate(T.MARCH13):
        add(Cue(fr(f), "boots_step", f"enemy line marching in step: boots on hard ground, all together ({k + 1}/8)",
                (lambda r=rr(), k=k: E.parade_step(r, 14, 0.005, 0.8, toy=0.25)), -9, p=0.0, extra=-2.0 if k % 2 else 0.0, lpf=7000, send=0.12, frame=f))

    # ------------------------------------------------ shot 14: the scatter
    t14 = fr(T.SCATTER)
    add(Cue(t14, "scatter_whoosh", "SCATTER @1382: big outward whoosh as 60+ emus burst from the centre",
            lambda: (widen(G.whoosh(0.8, rng(1382), 0.12, 300, 3000, 0.9, 0.3, 0.3), rng(1383), 14, 1.0), 0.12), -4, send=0.15, frame=T.SCATTER))
    d14 = fr(1504) - t14
    add(Cue(t14, "emu_stampede", "running thunder of the herd radiating in every direction (wide stereo)",
            lambda: (E.herd(d14, rng(1384), 80, [(0, 1.0), (0.6, 0.85), (2.2, 0.55), (d14 - 0.3, 0.4), (d14, 0.0)], 1.0, 0.3, 1.2), 0.0),
            -8, lpf=6000, send=0.12, frame=T.SCATTER))
    for k, tm in enumerate([fr(T.SPIN_CUT), fr(T.SPIN_CUT) + 0.42, fr(T.SPIN_CUT) + 0.84, fr(T.SPIN_CUT) + 1.26]):
        add(Cue(tm, "spin_whoosh", f"the gunner spins on the spot (whoosh {k + 1}/4, panning round)",
                (lambda r=rr(), k=k: (pan(G.whoosh(0.42, r, 0.2, 500, 2500, 0.8, 0.12, 0.15), [-0.7, 0.7, -0.7, 0.7][k]), 0.2)),
                -10 if k == 0 else -15, send=0.1, frame=int(round(tm * 30))))

    # ------------------------------------------------ shot 15: the emu army booms
    for tm, pls, lvl in [(fr(1506), 4, -14), (52.1, 3, -16), (53.12, 3, -15)]:
        add(Cue(tm, "emu_boom", "helmeted emus in formation boom, low", (lambda r=rr(), pls=pls: (E.emu_boom(r, pls), 0.0)), lvl, p=float(R.uniform(-0.5, 0.5)),
                lpf=800, send=0.2, frame=int(round(tm * 30))))
    def chorus(r):
        y = np.zeros((2, ns(1.4)))
        for k in range(9):
            place(y, pan(E.emu_boom(r, int(r.integers(3, 6)), r.uniform(55, 85)) * r.uniform(0.4, 1.0), r.uniform(-0.8, 0.8)), r.uniform(0, 0.25))
        return y
    add(Cue(54.70, "emu_boom_chorus", "the whole emu army booms back after 'world.' (a chorus of drumming)", lambda: (chorus(rng(1641)), 0.0),
            -8, lpf=1200, send=0.25, frame=1641))

    # ------------------------------------------------ shot 16: the army goes home
    t16 = fr(1656)
    add(Cue(t16 + 0.02, "gear_crunch", "gear crunch as the truck pulls away", lambda: (E.gear_crunch(rng(1656), 0.2), 0.0), -12, p=0.1, frame=1657))
    add(Cue(t16 + 0.1, "truck_away", "truck driving away down the road into the sunset (engine receding, getting duller)",
            lambda: (E.engine(1.7, rng(1660), np.linspace(1500, 1300, 6), 0.7) * np.interp(tt(1.7), [0, 0.3, 1.7], [1.0, 0.8, 0.12]), 0.0),
            -10, p=0.1, lpf=1800, frame=1659))
    add(Cue(56.33, "gun_sag", "the gun on the back sags: slow metal creak (in the gap before 'The emus...')",
            lambda: (G.creak(0.32, rng(1689), 60, 35, G.CHAIN[:5], [(0, 0), (0.2, 1), (0.8, 0.6), (1, 0)], 0.12, 0.02), 0.0), -14, p=0.1, lpf=4000, frame=1690))

    # ------------------------------------------------ shot 17: head turn + blink
    add(Cue(fr(T.TURN[0]), "head_turn", "the foreground emu slowly turns its head to camera: feather rustle",
            lambda: (E.feathers(rng(1736), fr(T.TURN[1] - T.TURN[0]) + 0.1), 0.0), -14, p=0.05, frame=T.TURN[0]))
    add(Cue(fr(T.BLINK), "blink", "...and BLINKS @1756: tiny soft double plip", lambda: (E.blink(rng(1756)), 0.0), -12, p=0.05, send=0.15, frame=T.BLINK))
    add(Cue(58.2, "emu_grunt", "a contented little grunt", lambda: (E.emu_grunt(rng(1746), 0.2), 0.0), -16, p=0.05, lpf=2000, frame=1746))
    return C


# ================================================================ render
def render(v_ref, on_event=None):
    """v_ref = integrated loudness of the voice stem (stereo). Returns (stereo stem, cue list with measured levels)."""
    C = cues()
    out = np.zeros((2, N))
    send = np.zeros(N)
    for c in C:
        x, anchor = c.gen()
        x = np.asarray(x, float)
        x = pan(x, c.p) if x.ndim == 1 else x
        x = fades(x, 0.0005, 0.01)              # never start or stop on a non-zero sample
        tgt = v_ref + c.applied
        cur = momentary_max(x) if c.kind == "event" else integrated(x)
        if np.isfinite(cur):
            x = x * dbg(tgt - cur)
        if c.lpf:
            x = lp(x, c.lpf, 1)
        c.measured = momentary_max(x) - v_ref if c.kind == "event" else integrated(x) - v_ref
        t0 = c.t - anchor
        place(out, x, t0)
        if on_event:
            on_event(c, x, t0)
        if c.send > 0:
            G._place_mono(send, c.send * x.mean(0), t0)
    outback = make_ir(0.9, 77, pre=0.012, hf=1.8, early=[(0.08, 0.35, -0.5), (0.15, 0.25, 0.6)])
    out += 0.5 * convolve_st(send, outback)
    out = hp(out, 28, 2)
    end = ns(T.DUR - 0.15)
    out[:, end:] *= np.linspace(1, 0, N - end)[None, :] ** 2
    return out, C
