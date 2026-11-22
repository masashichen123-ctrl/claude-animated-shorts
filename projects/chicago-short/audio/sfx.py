# Every sound effect + ambience bed of "The 1904 Olympic Marathon" as a cue list locked to the picture (timeline.py),
# rendered into one stereo SFX stem. Level convention (same as the emu, bat and whale shorts): each EVENT has a "naive"
# level (LU relative to the voice stem's integrated loudness, measured as the event's max momentary loudness) and
# is placed SFX_DB = -8 dB under it, plus per-cue offsets; ambience BEDS are integrated loudness and not reduced.
# Rule from the bat / whale shorts: an SFX under a spoken word stays >= 12 dB under the voice in the speech band, is
# dark (low-passed), or moves into a narration gap. So the hits that land on words here are built low and round (the
# gulp, the car putter, the honk @162, the pistol pop, the tape snaps, the apple crunch, the egg, the glug, the lift)
# or above the band (the bottle tinks), and the voice-like or bright details (the swirl boing, coughs, the drip, the
# boater fwips, the record scratch, the 'blergh', the snore exhale, the clear bark volley, the medal, sighs, the
# splash, the final honk and the wink) sit inside measured gaps (timeline.py lists them).
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated)
import sfx_gen as G
import sfx_emu as E
import sfx_bat as B
import sfx_marathon as M
import timeline as T

N = ns(T.DUR)
SFX_DB = -8.0                      # chill style: SFX tamed; key hits get their level back via `naive`
fr = T.fr


class Cue:
    def __init__(self, t, name, desc, gen, naive, kind="event", p=0.0, extra=0.0, lpf=None, send=0.1, frame=None):
        self.t, self.name, self.desc, self.gen, self.naive = t, name, desc, gen, naive
        self.kind, self.p, self.extra, self.lpf, self.send = kind, p, extra, lpf, send
        self.applied = naive + (SFX_DB if kind == "event" else 0.0) + extra
        self.measured = None
        self.frame = frame


def ssum(*xs):
    """sum stereo/mono clips of different lengths (zero-padded to the longest)"""
    xs = [st(x) for x in xs]
    n = max(x.shape[1] for x in xs)
    return sum(np.pad(x, ((0, 0), (0, n - x.shape[1]))) for x in xs)


def _bed(dur, fin, fout, parts, env_pts=None):
    """parts = list of callables(dur, r) -> stereo or mono; summed, faded; env_pts = [(t, gain)] automation"""
    def g(seed):
        r = rng(seed)
        out = np.zeros((2, ns(dur)))
        for fn in parts:
            x = fn(dur, r)
            out += st(x)[:, : out.shape[1]]
        if env_pts:
            out *= np.interp(np.arange(out.shape[1]) / SR, [a for a, _ in env_pts], [v for _, v in env_pts])[None, :]
        return fades(out, fin, fout), 0.0
    return g


def road(level=1.0, buzz=1.0):
    return lambda d, r: M.heat_road(d, r, level, buzz)


def breeze(level=1.0, bright=600):
    return lambda d, r: M.dry_breeze(d, r, level, bright)


def murmur(people=18, level=1.0, dark=1800):
    return lambda d, r: M.stadium_crowd(d, r, people, level, dark)


def cheer(level=1.0, dark=1600, env=None, people=16):
    return lambda d, r: M.cheer(d, r, people, level, dark, env)


def shuffle(level=1.0, rate=1.6):
    return lambda d, r: pan(M.shuffle_feet(d, r, rate), 0.1) * level


def cues():
    C = []
    R = rng(1904)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append
    s = lambda i: T.shot_t(i)[0]
    D = T.DUR

    # ------------------------------------------------ ambience beds (integrated loudness vs the voice stem)
    beds = [
        (0.0, 4.48, "amb_road_hook", "dusty country road, hot: a dry breeze, Hicks' exhausted shuffle, a faint far heat buzz (shot 1)", [road(1.0, 0.35), shuffle(0.6)], -40, None),
        (4.38, 6.86, "amb_road_car", "the same road after the flash: dry breeze, faint heat buzz (shot 2)", [road(1.0, 0.35)], -42, None),
        (6.76, 8.78, "amb_stadium_start", "1904 stadium at the start: a crowd murmuring in the stands (dark), a breeze in the bunting (shot 3a)", [murmur(18, 1.0, 1500)], -40, None),
        (8.69, 11.38, "amb_heat", "@262 the blazing road: HEAT BUZZ - cicada choruses swelling (above the speech band), a dry breeze (shot 3b)", [road(1.0, 1.6)], -37, None),
        (11.28, 15.01, "amb_road_cars", "dirt road: breeze, cicadas (shot 4)", [road(1.0, 1.1)], -40, None),
        (14.92, 18.48, "amb_well", "the roadside well: cicadas, a dry breeze (shot 5)", [road(1.0, 1.2)], -40, None),
        (18.38, 22.10, "amb_stadium_finish", "stadium finish: the crowd murmuring, expectant (dark) (shot 6)", [murmur(20, 1.0, 1500)], -39, None),
        (22.80, 25.64, "amb_road_flash", "flashback road: breeze, cicadas (shot 7, under the cheer)", [road(0.9, 1.0)], -43, None),
        (25.55, 29.58, "amb_orchard", "apple orchard: leaves rustling, softer cicadas, a far bird (shot 8)", [lambda d, r: M.orchard_bed(d, r)], -40, None),
        (29.48, 31.60, "amb_orchard_nap", "orchard, the nap: leaves, soft cicadas (shot 9a)", [lambda d, r: M.orchard_bed(d, r)], -42, None),
        (31.52, 32.98, "amb_finish4", "@947 the finish: a small crowd murmur (shot 9b)", [murmur(14, 1.0, 1500)], -42, None),
        (32.88, 35.98, "amb_cornfield", "cornfield: dry stalks rustling in gusts, cicadas (shot 10)", [lambda d, r: M.corn_bed(d, r)], -40, None),
        (35.88, 42.48, "amb_road_hicks", "the road with the trainers' car: breeze, cicadas, the car idling along beside him (dark), Hicks' shuffle (shot 11)",
         [road(1.0, 1.0), lambda d, r: pan(M.old_car(d, r, 6.5, 0.35, 0.4), 0.45) * 0.5, shuffle(0.5, 1.3)], -38, None),
        (42.38, 44.42, "amb_stadium_hush", "stadium, long lens: the crowd murmur thins and goes quiet for the held breath @1304 (shot 12)",
         [murmur(20, 1.0, 1400), breeze(0.25)], -40, [(0, 1.0), (fr(T.HELD_BREATH) - 42.38 - 0.45, 0.8), (fr(T.HELD_BREATH) - 42.38, 0.08), (2.04, 0.1)]),
        (44.32, 47.22, "amb_stadium_carry", "stadium: the crowd murmur creeps back, anxious (shot 13)", [murmur(18, 1.0, 1400)], -42, [(0, 0.4), (1.0, 1.0), (2.9, 1.0)]),
        (47.12, 50.28, "amb_course_high", "high over the course: breeze, cicadas, a far crowd (shot 14)", [road(1.0, 0.9), murmur(10, 0.3, 1200)], -40, None),
        (50.15, D, "amb_boston_spring", "@1507 Boston, spring 1905: sparrows + blackbirds, a soft breeze, a far street crowd (shot 15)", [lambda d, r: M.spring_bed(d, r)], -37, None),
        # crowd cheers as beds (dark: they run under words; they bloom in the gaps through the music's gap logic)
        (fr(T.PISTOL), 8.74, "cheer_start", "@210 the crowd cheers the start (dark, under 'race was in Saint Louis'), cut with the picture @262",
         [cheer(1.0, 1300)], -37, [(0, 0.3), (0.4, 1.0), (1.2, 0.8), (1.74, 0.7)]),
        (fr(T.HATS) - 0.05, fr(T.STOP_DEAD), "cheer_finish", "@661 the crowd leaps up and CHEERS (dark under 'cheered, then they found out...'), and STOPS DEAD @752",
         [cheer(1.0, 1300, people=22)], -36, [(0, 0.4), (0.3, 1.0), (0.6, 1.0), (0.82, 0.45), (3.0, 0.45)]),
        (32.58, 33.12, "cheer_fourth", "the small finish crowd cheers him in after 'fourth.' (gap 32.65-33.10)", [cheer(1.0, 1800, people=10)], -39, [(0, 0), (0.1, 1.0), (0.54, 0.6)]),
        (46.90, 47.40, "cheer_carried", "the crowd cheers as he's carried through @1399 - held for the gap after 'it.' (46.90-47.40)", [cheer(1.0, 1400)], -38, [(0, 0.3), (0.12, 1.0), (0.5, 0.5)]),
        (fr(T.TAPE3), 55.0, "cheer_boston", "@1604 the Boston street crowd cheers Lorz in (dark under 'Boston Marathon')", [cheer(1.0, 1300, people=14)], -39, [(0, 0.3), (0.5, 1.0), (1.2, 0.9), (1.53, 0.4)]),
    ]
    for i, (a, b, name, desc, parts, lvl, env) in enumerate(beds):
        cut = name == "cheer_finish"
        fo = 0.03 if cut else (0.12 if b < D - 0.01 else 0.8)
        fi = 0.4 if a == 0 else (0.05 if name.startswith("cheer") else 0.08)
        g = _bed(b - a, fi, fo, parts, env)
        add(Cue(a, name, desc, (lambda g=g, sd=200 + i: g(sd)), lvl, "bed", send=0.0 if not name.startswith("cheer") else 0.08))

    # ------------------------------------------------ XF air swells
    for f in T.XF:
        add(Cue(fr(f), "xf_air", f"soft warm-air swell through the dissolve @{f}",
                (lambda r=rr(): (G.whoosh(0.6, r, 0.3, 300, 1500, 0.9, 0.2, 0.06), 0.3)), -20, lpf=2000, send=0.15, frame=f))

    # ------------------------------------------------ shot 1: the hook
    add(Cue(fr(T.BOTTLE), "bottle_tink", "@99 the skull bottle held up: a tiny high glass 'tink' (6 kHz, above the speech band)",
            lambda: (M.glass_tink(rng(99)), 0.0), -12, p=0.25, send=0.2, frame=T.BOTTLE))
    add(Cue(fr(T.GULP), "gulp", "@110 Hicks gulps it: a low round 'glunk' (dark, under 'poison')",
            lambda: (M.gulp(rng(110)), 0.0), -14, p=0.0, send=0.05, frame=T.GULP))
    add(Cue(T.SWIRL, "swirl_boing", "the swirly-eyes 'boing' (wobbly spring sliding down) in the gap after 'poison.' (4.17-4.50)",
            lambda: (M.swirl_boing(rng(123), 0.3), 0.0), -9, p=-0.1, send=0.15, frame=int(round(T.SWIRL * 30))))
    add(Cue(fr(T.FLASH), "flash_pff", "@131 the white FLASH: a soft muffled 'pfoomf' (sub + dark air), not a bang (in the gap)",
            lambda: (M.flash_pff(rng(131)), 0.0), -8, send=0.1, frame=T.FLASH))

    # ------------------------------------------------ shot 2: the car
    add(Cue(fr(T.CAR1), "car_putter", "@133+ the open 1904 car putters past the runners (one-cylinder putt-putt, body rattle; dark, L to R, closest @162)",
            lambda: (M.car_pass(6.85 - fr(T.CAR1), rng(133), 8.5, (fr(T.WAVE) - fr(T.CAR1)) / (6.85 - fr(T.CAR1)), 1.2), 0.0), -13, send=0.08, frame=T.CAR1))
    add(Cue(fr(T.WAVE) - 0.06, "honk_soft", "near @162 Lorz waves: a soft rubber-bulb 'parp-parp' (low B-flat, dark: under 'strangest')",
            lambda: (M.bulb_horn(rng(162), 233.0, 0.13, 2, 0.05), 0.0), -15, p=0.1, lpf=900, send=0.1, frame=T.WAVE))

    # ------------------------------------------------ shot 3: the start, the heat
    add(Cue(fr(T.PISTOL), "pistol_pop", "@210 the starter's pistol, softened: a dark 'pok' + smoke puff (under 'race')",
            lambda: (M.pistol_pop(rng(210)), 0.0), -10, p=-0.3, send=0.2, frame=T.PISTOL))
    add(Cue(fr(T.PISTOL) + 0.25, "start_feet", "32 runners set off: a soft patter of feet on the cinder track (dark)",
            lambda: (lp(B.running(1.7, rng(211), 8, 3.0, 0.9), 1200, 2), 0.0), -22, send=0.05, frame=218))

    # ------------------------------------------------ shot 4: cars + dust, coughs
    add(Cue(fr(T.CARS) - 0.3, "cars_ahead", "@344 two open cars drive ahead of the runners (two putters, dark), into the dust",
            lambda: (ssum(M.car_pass(3.4, rng(344), 9.5, 0.35, 0.6), M.car_pass(3.4, rng(345), 10.5, 0.5, -0.6) * 0.8), 0.0), -14, send=0.08, frame=T.CARS))
    add(Cue(fr(T.DUST[0]) - 0.45, "dust_roll", "@398-427 huge brown dust clouds roll back over the runners (dark swell of grit and air)",
            lambda: (M.dust_roll(1.65, rng(398)), 0.0), -15, lpf=900, frame=T.DUST[0]))
    for k, tm in enumerate(T.COUGHS):
        add(Cue(tm, "cough", f"a runner coughs in the dust ({k + 1}/{len(T.COUGHS)}, in the gaps 12.62-12.90 / 14.58-14.75)",
                (lambda r=rr(), k=k: (M.cough(r, [2, 2][k], [120, 140][k]), 0.0)), [-16, -12][k],
                p=[-0.5, 0.35][k], lpf=3000, send=0.12, frame=int(round(tm * 30))))

    # ------------------------------------------------ shot 5: the well
    add(Cue(16.95, "well_winch", "the bucket is wound up: the well's wooden winch + rope creak (dark, low)",
            lambda: (M.winch_creak(0.75, rng(509)), 0.0), -16, p=-0.2, send=0.08, frame=509))
    add(Cue(T.DRIP_LAND, "drip", "@529 the bucket comes up with a single drop - it lands in the tin with a tiny 'plip' (gap after 'course.' 18.12-18.70)",
            lambda: (M.drip(rng(529)), 0.0), -12, p=-0.15, send=0.3, frame=int(round(T.DRIP_LAND * 30))))

    # ------------------------------------------------ shot 6: the finish, the cheer, the hats
    add(Cue(fr(T.TAPE1), "tape_snap", "@607 Lorz breaks the tape: a soft dark 'thwip' (under 'line was')",
            lambda: (M.tape_snap(rng(607), 1500), 0.0), -12, p=0.0, send=0.1, frame=T.TAPE1))
    for k, tm in enumerate(T.HATS_FWIP):
        add(Cue(tm, "hat_fwip", f"straw boaters fly into the air ({k + 1}/3, gap after 'cheered,' 22.55-22.87)",
                (lambda r=rr(): (M.hat_fwip(r), 0.0)), -15, p=[-0.5, 0.4, -0.05][k], send=0.1, frame=int(round(tm * 30))))

    # ------------------------------------------------ shot 7: the car passes, the cheering stops dead
    add(Cue(23.95, "car_pass", "@740-750 flashback: Lorz's car putters past (dark, R to L)",
            lambda: (M.car_pass(1.6, rng(740), 9.0, 0.55, -1.2), 0.0), -15, send=0.08, frame=T.CAR_PASS[0]))
    add(Cue(T.SCRATCH, "record_scratch", "@752 the cheer stops dead (the crowd bed is cut on the frame); the soft record-scratch 'zzwip' lands in the gap after 'car.' (25.26-25.69)",
            lambda: (M.record_scratch(rng(752)), 0.0), -12, p=0.0, send=0.08, frame=int(round(T.SCRATCH * 30))))

    # ------------------------------------------------ shot 8: the orchard
    add(Cue(fr(T.APPLE_PICK), "apple_pick", "@822 he picks a shiny apple: twig snap + leaf rustle (dark)",
            lambda: (M.twig_pick(rng(822)), 0.0), -16, p=0.3, send=0.08, frame=T.APPLE_PICK))
    add(Cue(fr(T.APPLE_BITE), "apple_crunch", "@830 he bites it: a crunchy bite kept below 1.8 kHz (under 'apples')",
            lambda: (M.apple_crunch(rng(830)), 0.0), -13, p=0.1, send=0.05, frame=T.APPLE_BITE))
    add(Cue(T.BLERGH, "blergh", "@867-871 his face turns green; the sour 'bleh-uh' lands in the gap after 'rotten,' (29.50-29.82)",
            lambda: (M.blergh(rng(867)), 0.0), -11, p=0.1, send=0.1, frame=int(round(T.BLERGH * 30))))

    # ------------------------------------------------ shot 9: the nap, the cheerful finish
    add(Cue(fr(T.SNORE), "snore_in", "@926 Z bubbles: a dark fluttering snore inhale (lp 600 Hz, under 'a nap')",
            lambda: (M.snore(rng(926), 0.36, 0.0, 550), 0.0), -18, p=-0.1, send=0.05, frame=T.SNORE))
    add(Cue(T.SNORE_OUT, "snore_out", "...and the snore proper with a whistly exhale in the gap after 'nap.' (31.28-31.58)",
            lambda: (M.snore(rng(927), 0.11, 0.07, 800), 0.0), -12, p=-0.1, send=0.08, frame=int(round(T.SNORE_OUT * 30))))

    # ------------------------------------------------ shot 10: the dogs
    add(Cue(fr(T.DOGS[0]), "frantic_feet", "@1013 the runner sprints flat out (quick scuffy steps on dirt, dark) through the cornfield",
            lambda: (pan(M.frantic_feet(36.05 - fr(T.DOGS[0]), rng(1013)), 0.15), 0.0), -16, send=0.05, frame=T.DOGS[0]))
    add(Cue(fr(T.DOGS[0]) + 0.1, "barks_far", "@1013-1055 the dogs barking at his heels, far and dark (lp 900 Hz) under the words",
            lambda: (M.bark_volley(35.62 - fr(T.DOGS[0]) - 0.1, rng(1014), 3, 2.2, 900, 0.8), 0.0), -18, send=0.12, frame=T.DOGS[0]))
    add(Cue(T.BARKS_GAP[0], "barks", "@1055 the bark volley: 3 scrappy dogs, clear, in the gap after 'dogs.' (35.66-36.07)",
            lambda: (ssum(*[pan(M.bark(rng(1055 + k), [420, 330, 520, 400][k], [1.35, 1.2, 1.55, 1.35][k]), [-0.4, 0.45, 0.0, -0.3][k]) for k in range(1)],
                          *[np.pad(pan(M.bark(rng(1060 + k), [330, 520, 420][k], [1.2, 1.55, 1.35][k]), [0.45, 0.0, -0.3][k]), ((0, 0), (ns(T.BARKS_GAP[k + 1] - T.BARKS_GAP[0]), 0))) for k in range(3)]), 0.0),
            -11, send=0.05, frame=int(round(T.BARKS_GAP[0] * 30))))

    # ------------------------------------------------ shot 11: Hicks' hand-offs
    add(Cue(fr(T.EGG), "egg_crack", "@1204 an egg cracked into a cup: small dull crack + the white slipping in (dark, under 'egg')",
            lambda: (M.egg_crack(rng(1204)), 0.0), -18, p=0.3, send=0.06, frame=T.EGG))
    add(Cue(fr(T.FLASK), "flask_glug", "@1235 the brandy flask: three low hollow glugs (dark, under 'brandy')",
            lambda: (M.glug(rng(1235), 3), 0.0), -16, p=0.25, send=0.06, frame=T.FLASK))
    add(Cue(fr(T.BOTTLE2), "bottle_tok", "@1246 the little skull bottle handed over: a dull glass 'tok' in the palm (dark, under 'strychnine')",
            lambda: (M.glass_tok(rng(1246)), 0.0),
            -20, p=0.3, send=0.05, frame=T.BOTTLE2))
    add(Cue(T.BOTTLE2_TINK, "bottle_clink", "...and its bright glass 'tink' (6.6 kHz) in the gap after 'strychnine.' (it would sit on the word's 's')",
            lambda: (M.glass_tink(rng(1249), 6600.0), 0.0), -14, p=0.3, send=0.2, frame=int(round(T.BOTTLE2_TINK * 30))))

    # ------------------------------------------------ shot 12-13: the held breath, the lift, the tape, the medal
    add(Cue(fr(T.HELD_BREATH) - 0.42, "held_breath", "@1304 the crowd's collective sharp intake of breath (far, dark), then hush",
            lambda: (M.held_breath(rng(1304), 0.45), 0.0), -20, lpf=1500, send=0.15, frame=T.HELD_BREATH))
    add(Cue(fr(T.LIFT), "lift", "@1378 two trainers hoist him: a dark cloth swish + shoe scuff (under 'to carry')",
            lambda: (M.cloth_lift(rng(1378), 0.3), 0.0), -20, lpf=900, p=0.0, send=0.05, frame=T.LIFT))
    add(Cue(fr(T.TAPE2), "tape_snap", "@1399 carried through the tape: a soft dark 'thwip' (end of 'across')",
            lambda: (M.tape_snap(rng(1399), 900), 0.0), -19, p=0.1, send=0.1, frame=T.TAPE2))
    add(Cue(T.MEDAL, "medal_plonk", "the gold medal 'plonks' onto his limp neck (gap after 'it.' 46.86-47.42)",
            lambda: (M.medal_plonk(rng(1408)), 0.0), -10, p=0.05, send=0.15, frame=int(round(T.MEDAL * 30))))

    # ------------------------------------------------ shot 14: the drop-outs
    add(Cue(fr(1440), "flop", "@1440 a runner flops into the shade (soft dark thud)", lambda: (M.flop_thud(rng(1440), 1.0), 0.0),
            -12, p=-0.4, send=0.05, frame=1440))
    add(Cue(T.SIGHS[0], "sigh", "an exhausted 'haaah' as he lies there (gap after 'runners,' 48.45-48.62)", lambda: (M.sigh(rng(1452), 0.14, 110), 0.0),
            -18, p=-0.4, send=0.1, frame=int(round(T.SIGHS[0] * 30))))
    add(Cue(fr(1455), "wagon_creak", "@1455 a runner rides off on a hay wagon: wooden axle creaks + clops far off (dark)",
            lambda: (M.wagon_creak(1.0, rng(1455)), 0.0), -17, p=0.45, send=0.08, frame=1455))
    add(Cue(fr(1468), "flop", "@1468 another drops onto a fence rail to sleep (soft dark thud)", lambda: (M.flop_thud(rng(1468), 0.8, 800), 0.0),
            -15, p=0.25, send=0.05, frame=1468))
    add(Cue(T.SPLASH, "creek_splash", "a runner sits down in the creek: a small round splash (gap after 'finished.' 49.77-50.41)",
            lambda: (M.creek_splash(rng(1477)), 0.0), -12, p=-0.3, send=0.12, frame=int(round(T.SPLASH * 30))))
    add(Cue(T.SIGHS[1], "sigh", "...and a contented sigh from the creek (same gap, dark)", lambda: (M.sigh(rng(1501), 0.26, 100), 0.0),
            -20, p=-0.3, lpf=1800, send=0.1, frame=int(round(T.SIGHS[1] * 30))))

    # ------------------------------------------------ shot 15: Boston, the honk, the wink
    add(Cue(fr(T.TAPE3), "tape_snap", "@1604 Lorz breaks the Boston tape: a soft dark 'thwip' (under 'Boston')",
            lambda: (M.tape_snap(rng(1604), 1300), 0.0), -14, p=0.0, send=0.1, frame=T.TAPE3))
    add(Cue(T.HONK_T, "honk", "@1650 the old car behind him honks: one rubber-bulb 'parp' (B-flat), right after 'foot.' ends",
            lambda: (M.bulb_horn(rng(1650), 233.0, 0.2, 1), 0.0), -9, p=0.4, send=0.15, frame=T.HONK))
    add(Cue(fr(T.WINK), "wink_ting", "@1660 the WINK: a small bright 'ting' on A7 (the 3rd of the final F6/9)",
            lambda: (M.wink_ting(rng(1660)), 0.0), -9, p=0.25, send=0.25, frame=T.WINK))
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
        if c.lpf:
            x = lp(x, c.lpf, 2)
        tgt = v_ref + c.applied
        cur = momentary_max(x) if c.kind == "event" else integrated(x)
        if np.isfinite(cur):
            x = x * dbg(tgt - cur)
        c.measured = momentary_max(x) - v_ref if c.kind == "event" else integrated(x) - v_ref
        t0 = c.t - anchor
        place(out, x, t0)
        if on_event:
            on_event(c, x, t0)
        if c.send > 0:
            G._place_mono(send, c.send * x.mean(0), t0)
    outback = make_ir(1.2, 77, pre=0.015, hf=1.8, early=[(0.09, 0.3, -0.5), (0.17, 0.2, 0.6)])
    out += 0.45 * convolve_st(send, outback)
    out = hp(out, 28, 2)
    end = ns(T.DUR - 0.15)
    out[:, end:] *= np.linspace(1, 0, N - end)[None, :] ** 2
    return out, C
