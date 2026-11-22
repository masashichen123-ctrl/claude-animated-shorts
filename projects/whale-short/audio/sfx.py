# Every sound effect + ambience bed of "The Bat Bomb" as a cue list locked to the picture (timeline.py), rendered
# into one stereo SFX stem. Level convention (same as the emu short): each EVENT has a "naive" level (LU relative
# to the voice stem's integrated loudness, measured as the event's max momentary loudness) and is placed
# SFX_DB = -8 dB under it, plus per-cue offsets; ambience BEDS are integrated loudness and are not reduced.
# Almost every picture event of this short lands under a word, so the hits are built low and round (kick thumps,
# the WHOOMP, the stamp and the folder live mostly below 1.5 kHz) and the bright ones (plink, ticks, squeaks,
# ting) are short; anything sitting on a consonant is low-passed.
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, peq, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated, smooth_noise, modal)
import sfx_gen as G
import sfx_emu as E
import sfx_bat as B
import timeline as T

N = ns(T.DUR)
SFX_DB = -8.0                      # chill style: SFX tamed; key hits get their level back via `extra`
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


def night(wind=1.0, crick=0.012):
    return lambda d, r: B.night_desert(d, r, wind, crick)


def breeze(level=1.0, bright=900):
    return lambda d, r: G.breeze(d, r, level, 0.15, bright)


def base():
    return lambda d, r: B.base_dusk(d, r)


def room(warm=500, level=1.0):
    return lambda d, r: B.room(d, r, warm, level)


def clock(level=0.15, rate=1.0, p=0.5):
    return lambda d, r: B.wall_clock(d, r, rate, level, p)


def bubbles(level=0.3):
    return lambda d, r: pan(B.bubbling(d, r), -0.3) * level


def fire(size=1.0, level=1.0, density=26.0):
    return lambda d, r: B.fire_bed(d, r, size, density) * level


def flag(level=0.1):
    return lambda d, r: pan(G.flag_flutter(d, r), 0.45) * level


def cues():
    C = []
    R = rng(1943)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append
    s = lambda i: T.shot_t(i)[0]

    # ------------------------------------------------ ambience beds (integrated loudness vs the voice stem)
    beds = [
        (0.0, 3.85, "amb_night_sky", "moonlit desert sky: soft high wind, faint crickets far below (shot 1)", [night(1.0, 0.008)], -39),
        (3.72, 5.80, "amb_base_dusk", "army air base at dusk: breeze, flag lines on the pole, far generator hum (shot 2)", [base()], -39),
        (4.25, 5.80, "fire_rooftops", "little rooftop fires crackling (after the pops @128-139)", [fire(0.6, 1.0, 20)], -38),
        (5.62, 11.0, "amb_cave_dusk", "desert cave mouth at sunset: warm breeze over the rocks, first crickets (shot 3)", [night(0.9, 0.006)], -39),
        (10.9, 18.3, "amb_workshop", "Adams' workshop: warm room tone, a slow wall clock (shot 4)", [room(500, 1.0), clock(0.05, 1.0, 0.5)], -42),
        (18.18, 21.82, "amb_attic", "cutaway model house: dark attic hush (shot 5)", [room(350, 1.0)], -44),
        (21.72, 24.48, "amb_office", "presidential office: quiet room, a stately clock (shot 6)", [room(450, 1.0), clock(0.06, 1.0, -0.5)], -42),
        (24.38, 28.48, "amb_lab", "chemistry lab: flasks bubbling softly, a gas-burner hiss (shot 7)", [room(600, 0.6), bubbles(0.35)], -39),
        (28.38, 37.05, "amb_desert_day", "test base, bright desert day: dry wind, a flag flapping on the pole (shots 8-9)", [breeze(1.0, 1000), flag(0.08)], -40),
        (36.95, 39.6, "amb_tank_shade", "under the fuel tank: hollow shade, wind outside (shots 10-11)", [breeze(0.7, 700), room(250, 0.5)], -41),
        (39.55, 43.45, "fire_base", "the base burning after the WHOOMP: fire roar + crackle (shots 11-12)", [fire(1.0, 1.0, 30), breeze(0.4, 700)], -37),
        (43.35, 47.32, "fire_smoke", "smoky glide past the burnt hangar: dying fire, crackle, wind (shot 13)", [fire(0.6, 1.0, 16), breeze(0.7, 800)], -39),
        (47.22, 50.55, "amb_war_office", "War Department office at dusk: dull room tone, a wall clock (shot 14)", [room(400, 1.0), clock(0.05, 1.0, 0.4)], -43),
        (50.45, T.DUR, "amb_night_cave", "moonlit cave mouth: night crickets, soft wind (shot 15)", [night(0.8, 0.02)], -37),
    ]
    for i, (a, b, name, desc, parts, lvl) in enumerate(beds):
        g = _bed(b - a, 0.08 if a > 0 else 0.4, 0.12 if b < T.DUR - 0.01 else 0.8, parts)
        add(Cue(a, name, desc, (lambda g=g, sd=100 + i: g(sd)), lvl, "bed", send=0.0))

    # ------------------------------------------------ kicks (picture camera kicks): soft low thumps, nothing to mask a word
    for f in T.KICKS:
        add(Cue(fr(f), "kick", f"KICK @{f}: soft round low thump under the picture kick", (lambda r=rr(): (B.kick_thump(r), 0.0)),
                0 if f != T.WHOOMP else -3, send=0.02, frame=f))

    # ------------------------------------------------ XF air swells
    for f in T.XF:
        add(Cue(fr(f), "xf_air", f"soft air swell through the dissolve @{f}",
                (lambda r=rr(): (G.whoosh(0.7, r, 0.3, 300, 1500, 0.9, 0.2, 0.08), 0.3)), -18, send=0.15, frame=f))

    # ------------------------------------------------ shot 1: the hook
    add(Cue(1.15, "bomb_fall", "the olive-drab bomb casing falls past the camera (air whoosh, peaks @60)",
            lambda: (G.whoosh(1.3, rng(35), 0.85, 250, 1300, 0.9, 0.2, 0.05), 0.0), -14, p=-0.2, lpf=3000, frame=35))
    add(Cue(fr(T.CASING_POP), "casing_pop", "CASING POPS OPEN @80: latch 'tchk', hollow metal bonk, four panels springing out",
            lambda: (B.casing_pop(rng(80)), 0.0), -2, p=-0.1, send=0.15, frame=T.CASING_POP))
    add(Cue(fr(T.CASING_POP) + 0.02, "swarm_burst", "hundreds of bats burst out in a spiral: airy whoosh opening into wings + cute squeaks",
            lambda: (B.swarm_whoosh(rng(81), 1.9, 0.3), 0.0), -10, lpf=4500, send=0.15, frame=T.CASING_POP))
    add(Cue(3.44, "bat_grin_eek", "the bat at the lens (grin @95) gives a tiny 'eek-eek' as 'bats.' ends",
            lambda: (B.squeaks(rng(95), 2, 0.08), 0.0), -13, p=0.1, frame=103))
    add(Cue(fr(T.FLASH), "flash_swell", "reverse air swell into the white FLASH @112 (peaks on the frame)",
            lambda: (G.whoosh(0.5, rng(112), 0.47, 500, 4000, 0.9, 0.04, 0.4), 0.47), -13, frame=T.FLASH))

    # ------------------------------------------------ shot 2: the bats bomb America
    add(Cue(fr(T.DIVE) - 0.1, "swarm_dive", "the swarm dives on the air base @121 (wings + squeaks swooping in; kept low under 'Then the bats')",
            lambda: (B.swarm_whoosh(rng(121), 1.2, 0.2), 0.0), -16, lpf=2500, send=0.12, frame=T.DIVE))
    for k, f in enumerate([128, 131, 135, 139]):
        add(Cue(fr(f), "fire_pop", f"little rooftop fire pops on ({k + 1}/4, @128-139)", (lambda r=rr(): (B.fire_pop(r, 1.0), 0.0)),
                -13, p=[-0.5, 0.4, -0.15, 0.25][k], lpf=2500, send=0.15, frame=f))
    add(Cue(fr(140), "cap_flies", "the soldier's cap flies off as his jaw drops (little fwip)",
            lambda: (G.whoosh(0.25, rng(140), 0.07, 900, 3500, 0.7, 0.06, 0.2), 0.0), -17, p=0.3, lpf=4000, frame=140))

    # ------------------------------------------------ shot 3: the cave
    tc = fr(T.COLUMN)
    add(Cue(tc - 0.25, "bat_column", "@290 a vast column of bats spirals out of the cave: rushing wing-roar + far squeaks, swelling in",
            lambda: (B.swarm(1.6 + 0.4, rng(290), [(0, 0), (0.45, 1.0), (1.4, 0.8), (2.0, 0)], 1.5, 0.9, 10.0), 0.0), -12, lpf=3500, send=0.2, frame=T.COLUMN))

    # ------------------------------------------------ shot 4: the idea
    add(Cue(fr(T.BULB), "bulb_plink", "@331 the idea light bulb pops on: glassy plink + filament buzz",
            lambda: (B.bulb_plink(rng(331)), 0.0), -6, p=0.1, send=0.15, frame=T.BULB))
    add(Cue(fr(T.STRAP) - 0.2, "strap_buckle", "@367 the harness strap pulled snug and buckled on the bat (creak + two clinks)",
            lambda: (B.strap_buckle(rng(367)), 0.2), -11, p=-0.1, frame=T.STRAP))
    add(Cue(fr(422), "bat_hmph", "the bat looks at its bomb, unimpressed (@413): one flat little squeak after 'bat'",
            lambda: (B.squeak(rng(413), 1800, 0.09, False), 0.0), -16, p=-0.1, frame=422))
    for k, (tm, pk) in enumerate([(14.55, 0.25), (15.75, 0.3)]):
        add(Cue(tm, "toy_swoosh", f"Adams 'flies' the toy bomber on its stick over the diorama ({k + 1}/2)",
                (lambda r=rr(), pk=pk: (G.whoosh(0.6, r, pk, 300, 1500, 0.9, 0.15, 0.05), 0.0)), -17, p=[-0.4, 0.4][k], lpf=3000,
                frame=int(round(tm * 30))))

    def sprinkle(r):
        y = np.zeros(ns(0.45))
        for k in range(9):
            G._place_mono(y, E.pat(r)[: ns(0.08)] * r.uniform(0.3, 1.0) * 0.6, r.uniform(0, 0.35))
        return y
    add(Cue(15.52, "toy_bats_sprinkle", "toy bats sprinkle down on the paper houses (tiny wooden pitter-patter after 'Japan,')",
            lambda: (pan(sprinkle(rng(465)), 0.2), 0.0), -15, frame=466))

    # ------------------------------------------------ shot 5: the attic and the timer
    add(Cue(fr(T.ATTIC), "attic_flutter", "@553 a bat flutters into the dark attic", lambda: (B.flutter(0.75, rng(553), 1, 0.4, 12.0), 0.0),
            -13, lpf=4000, frame=T.ATTIC))
    add(Cue(fr(T.HANG), "hang_settle", "@565 it hangs upside down, cosy: wings folding", lambda: (B.flaps(0.25, rng(565), 14, 1.2) * 0.6, 0.0),
            -18, p=0.1, frame=T.HANG))
    add(Cue(19.80, "bat_content", "a contented little squeak in the gap after 'attics.'", lambda: (B.squeak(rng(595), 2200, 0.09, True), 0.0),
            -19, p=0.1, frame=594))
    add(Cue(fr(T.TICK[0]), "timer_tick", "push-in on the belly timer ticking @607-628", lambda: (B.ticking(fr(T.TICK[1] - T.TICK[0]), rng(607), 6.0, 1), 0.0),
            -13, p=0.05, frame=T.TICK[0]))
    add(Cue(fr(T.POOF), "poof", "@628 'off': cartoon POOF spark puff (soft pff + pop + sparkle fizz)", lambda: (B.poof(rng(628)), 0.0),
            -3, p=0.0, send=0.15, frame=T.POOF))
    add(Cue(21.36, "bat_eek", "the bat's eyes pop: surprised 'eek!' in the gap after 'off.'", lambda: (B.squeak(rng(641), 3000, 0.08, True), 0.0),
            -13, p=0.05, frame=641))

    # ------------------------------------------------ shot 6: the President
    add(Cue(22.3, "paper_rustle", "the President picks up the bat drawing (paper rustle, gap after 'Incredibly,')",
            lambda: (E.feathers(rng(669), 0.4) * 0.8, 0.0), -17, p=0.2, frame=669))
    add(Cue(fr(T.STAMP), "stamp", "@711 the big approval stamp slams down (desk thunk, paper slap, ink squish)", lambda: (B.stamp(rng(711)), 0.0),
            +1, p=0.0, send=0.15, frame=T.STAMP))

    # ------------------------------------------------ shot 7: the lab
    add(Cue(fr(T.TWEEZERS), "tweezers", "@800 the chemist holds up the tiny capsule in tweezers (delicate clinks)",
            lambda: (B.tweezers_clink(rng(800)), 0.0), -12, p=-0.2, send=0.15, frame=T.TWEEZERS))
    add(Cue(27.62, "capsule_click", "the bat clicks a capsule onto its belly", lambda: (lp(G.clink(rng(829), 2600, 0.1, 0.5), 6000, 1), 0.0),
            -17, p=0.2, frame=829))
    add(Cue(fr(T.FLEX), "flex", "@845 the bat flexes a tiny bicep (cute rising rubbery squeak)", lambda: (B.flex(rng(845)), 0.0),
            -10, p=0.2, send=0.1, frame=T.FLEX))
    add(Cue(28.62, "wing_thumbsup", "thumbs-up wing (a single soft flap)", lambda: (B.flaps(0.12, rng(859), 10, 1.1), 0.0), -17, p=0.25, frame=859))

    # ------------------------------------------------ shot 8: the escape
    add(Cue(fr(T.CRATE_CARRY), "crate_carry", "@880 soldiers carry the bat crate (wood creak + rope, a few steps on dirt)",
            lambda: (np.concatenate([G.creak(0.5, rng(880), 90, 140, G.WOOD, None, 0.15, 0.05, 1.0), np.zeros(ns(0.2))]) * 0.5, 0.0),
            -17, p=-0.2, lpf=4000, frame=T.CRATE_CARRY))
    add(Cue(fr(T.CRATE_POP), "crate_lid_pop", "@940 the crate lid pops (nail squeak, thock, lid clattering down)", lambda: (B.crate_lid_pop(rng(940)), 0.11),
            -2, p=0.1, send=0.12, frame=T.CRATE_POP))
    add(Cue(fr(T.ESCAPE) - 0.1, "bats_escape", "@947 a handful of armed bats flutter out (wings + cute squeaks)",
            lambda: (B.flutter(1.6, rng(947), 6, 0.9, 12.0, 3.5), 0.0), -10, lpf=4500, send=0.1, frame=T.ESCAPE))
    add(Cue(32.15, "grab_air", "a soldier grabs at the air (swish)", lambda: (G.whoosh(0.25, rng(964), 0.08, 700, 3000, 0.7, 0.07, 0.15), 0.0),
            -15, p=-0.3, frame=964))

    # ------------------------------------------------ shot 9: looking for a dark place
    add(Cue(32.4, "bat_cruise", "one bat cruising over the base, peeking into shadows (soft wingbeats panning across)",
            lambda: (B.flutter(4.5, rng(972), 1, 0.7, 10.0), 0.0), -18, lpf=3500, frame=972))
    for k, f in enumerate(T.SNIFFS):
        add(Cue(fr(f), "sniff", f"the bat sniffs at a shadow ({k + 1}/{len(T.SNIFFS)})", (lambda r=rr(), k=k: (B.sniff(r, 1 if k == 0 else 2), 0.0)),
                -17 if k == 0 else -12, p=[-0.2, 0.15, 0.3][k], frame=f))
    add(Cue(fr(T.SHAKE), "head_shake", "shakes its head: nope (ears flapping)", lambda: (B.head_shake(rng(1053)), 0.0), -16, p=0.15, frame=T.SHAKE))

    # ------------------------------------------------ shot 10: five timers under the fuel tank
    add(Cue(fr(T.TANK[0]) + 0.05, "five_timers", "five bats in a row under the tank, five timers ticking out of phase (L to R)",
            lambda: (B.ticking(fr(T.TANK[1] - T.TANK[0]) - 0.05, rng(1110), 5.5, 5, 0.037), 0.0), -12, send=0.05, frame=T.TANK[0]))
    add(Cue(38.12, "bats_giggle", "they all grin: a tiny chorus of squeaks after 'tank.'",
            lambda: (pan(B.squeaks(rng(1144), 3, 0.06), -0.4) + pan(B.squeaks(rng(1145), 2, 0.07), 0.4), 0.0), -13, frame=1144))

    # ------------------------------------------------ shot 11: WHOOMP
    add(Cue(fr(T.WHOOMP), "whoomp", "@1186 the fuel tank goes WHOOMP: suck-in, round low boom, fireball roar, crackle (built under 1.5 kHz)",
            lambda: B.whoomp(rng(1186)), 2, p=0.0, send=0.2, frame=T.WHOOMP))
    add(Cue(39.75, "bats_flutter_out", "the bats flutter out of the smoke unharmed", lambda: (B.flutter(0.8, rng(1199), 5, 0.9, 13.0), 0.0),
            -15, lpf=4000, frame=1199))
    add(Cue(40.0, "bats_cheer", "...and cheer: a happy squeak chorus under 'perfectly' (clear of 'Unluckily')",
            lambda: (pan(B.squeaks(rng(1212), 4, 0.06), -0.3) + pan(B.squeaks(rng(1213), 3, 0.07), 0.35), 0.0), -15, lpf=4500, frame=1200))

    # ------------------------------------------------ shot 12: buckets and running
    add(Cue(40.9, "running", "soldiers run in a bucket line (quick steps on dirt, across the stereo field)",
            lambda: (B.running(2.45, rng(1218), 5, 3.3, 0.8) * np.interp(tt(2.45), [0, 0.4, 2.1, 2.45], [0, 1, 1, 0])[None, :], 0.0),
            -15, lpf=3000, frame=1227))
    for k, f in enumerate(T.BUCKETS):
        empty = k == len(T.BUCKETS) - 1
        add(Cue(fr(f), "bucket" if not empty else "bucket_empty", "tin bucket clank + slosh" if not empty else "the empty bucket: hollow clonk, no water",
                (lambda r=rr(), e=empty: (B.bucket(r, not e), 0.0)), -14, p=[-0.5, 0.2, -0.2, 0.45][k], lpf=4500, frame=f))
    for k, f in enumerate([1236, 1268]):
        add(Cue(fr(f), "roof_catches", "fire spreads to a roof (soft fwump)", (lambda r=rr(): (B.fire_pop(r, 1.0), 0.0)), -16,
                p=[0.5, -0.5][k], lpf=1800, send=0.2, frame=f))

    # ------------------------------------------------ shot 13: the general's car
    add(Cue(44.0, "hangar_creak", "the burnt hangar frame groans as the camera glides past", lambda: (G.creak(0.7, rng(1320), 45, 30, G.TIMBER, None, 0.15, 0.02), 0.0),
            -18, p=-0.3, lpf=2500, send=0.2, frame=1320))
    for k, tm in enumerate([45.33, 45.55, 45.9]):   # no squeak under "general's car"
        add(Cue(tm, "polish_squeak", f"the General polishes his shiny car ({k + 1}/4)", (lambda r=rr(): (B.polish_squeak(r), 0.0)),
                -15 if tm < 45.65 else -19, p=0.2, lpf=4000, frame=int(round(tm * 30))))
    add(Cue(fr(T.CAR_PUFF), "car_puff", "@1394 'puff': the car becomes a charred shell (soft pfoomf, body sag creak, tyres hissing flat)",
            lambda: (B.car_puff(rng(1394)), 0.0), -20, p=0.1, lpf=1500,   # quieter + darker so it doesn't mask 'car'
            send=0.15, frame=T.CAR_PUFF))
    add(Cue(46.95, "moustache_sizzle", "the General's singed moustache smoking (tiny sizzle)", lambda: (B.crackle(0.4, rng(1409), 40, 0.5, 1.0), 0.0),
            -20, p=0.1, frame=1409))

    # ------------------------------------------------ shot 14: cancelled
    add(Cue(fr(1432), "money_bags", "the officer weighs the folder on the money bags (soft cloth bags + a coin chink)",
            lambda: (E.pat(rng(1433)) + lp(G.rattle(0.25, rng(1434), 40, None), 5000, 1) * 0.3, 0.0), -17, p=-0.2, frame=1432))
    add(Cue(48.25, "money_settle", "the bags settle (gap after 'million,')", lambda: (E.pat(rng(1448)) * 0.8 + lp(G.rattle(0.25, rng(1449), 30, None), 5000, 1) * 0.25, 0.0),
            -15, p=-0.2, frame=1448))
    add(Cue(fr(T.FOLDER), "folder_thunk", "@1489 the folder drops into the wastebasket (paper thunk + tin bin ring)", lambda: (B.folder_thunk(rng(1489)), 0.0),
            -1, p=0.15, lpf=3000, send=0.15, frame=T.FOLDER))
    add(Cue(50.28, "bat_snore", "the bat asleep in the filing tray: a tiny whistling snore", lambda: (B.squeak(rng(1508), 1500, 0.22, True) * 0.5, 0.0),
            -19, p=-0.35, lpf=3000, frame=1508))

    # ------------------------------------------------ shot 15: the bat ribbon and the wink
    d15 = T.DUR - fr(T.XF[-1])
    add(Cue(fr(T.XF[-1]), "bat_ribbon", "bats streaming out in a ribbon across the moon (far, soft wing-roar + distant squeaks)",
            lambda: (B.swarm(d15, rng(1515), [(0, 0), (1.0, 0.8), (3.0, 1.0), (d15 - 0.5, 0.5), (d15, 0)], 1.2, 1.0, 4.0), 0.0),
            -19, lpf=2800, send=0.25, frame=T.XF[-1]))
    add(Cue(fr(T.WINK_TURN), "medal_turn", "@1600 the bat with the tiny medal turns to camera (wing rustle + medal clink)",
            lambda: (B.flaps(0.15, rng(1600), 12, 1.2) * 0.5 + np.pad(lp(G.clink(rng(1601), 3300, 0.1, 0.4), 6000, 1) * 0.4, (0, ns(0.05)))[: ns(0.15)], 0.0),
            -17, p=0.1, frame=T.WINK_TURN))
    add(Cue(fr(T.WINK), "wink_ting", "@1610 the WINK: a small bright 'ting'", lambda: (B.wink_ting(rng(1610)), 0.0), 0, p=0.1, send=0.25, frame=T.WINK))
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
