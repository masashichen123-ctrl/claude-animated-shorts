# Every sound effect + ambience bed of "The Exploding Whale" as a cue list locked to the picture (timeline.py),
# rendered into one stereo SFX stem. Level convention (same as the emu and bat shorts): each EVENT has a "naive"
# level (LU relative to the voice stem's integrated loudness, measured as the event's max momentary loudness) and
# is placed SFX_DB = -8 dB under it, plus per-cue offsets; ambience BEDS are integrated loudness and not reduced.
# Lesson from the bat short ('car' heard as 'cause'): an SFX on a key word must stay >= 12 dB under the voice in the
# speech band, be dark (low-passed), or move into a gap. So the hits that land under words here are built low and
# round (rope snap, plop, splats, car crunch, face-palm, bulldozer live below ~1-2 kHz), the BOOM is split into a
# short sub-only transient @960 under 'whale exploded' and the big tail after 'exploded' ends (32.75 s), and the
# bright details (tumble, doors, fork clinks, glass, hubcap, gull calls, shovels) are placed inside measured gaps.
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated)
import sfx_gen as G
import sfx_emu as E
import sfx_bat as B
import sfx_whale as W
import timeline as T

N = ns(T.DUR)
SFX_DB = -8.0                      # chill style: SFX tamed; key hits get their level back via `naive`
fr = T.fr
BOOM_TAIL_T = 32.76                # 'exploded' ends at 32.75 s (measured on voice.wav), 'Unluckily' starts at 33.06


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


def surf(close=1.0, level=1.0):
    return lambda d, r: W.surf(d, r, close) * level


def wind(level=1.0, bright=700):
    return lambda d, r: W.beach_wind(d, r, level, bright)


def grass(level=1.0):
    return lambda d, r: W.grass_rustle(d, r, level)


def smoke(level=0.3):
    return lambda d, r: widen(B.crackle(d, r, 8, 0.25, 0.5), r, 9, 1.0) * level + lp(B.fire_bed(d, r, 0.5, 4), 500, 2) * level * 0.5


def chatter(people=14, level=1.0):
    return lambda d, r: W.crowd(d, r, people, level)


def park():
    return lambda d, r: W.park_bed(d, r)


def cues():
    C = []
    R = rng(1970)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append

    # ------------------------------------------------ ambience beds (integrated loudness vs the voice stem)
    beds = [
        (0.0, 4.52, "amb_beach_overcast", "Oregon beach, overcast: Pacific surf + a steady sea wind (shot 1)", [surf(1.0), wind(0.8)], -40),
        (4.40, 6.66, "amb_beach_after", "the same beach after the flash: surf, wind, the whale smoking (soft sizzle) (shot 2)", [surf(0.9), wind(0.7), smoke(0.25)], -41),
        (6.55, 11.20, "amb_coast_wide", "the coast wide: bigger grey-green surf, wind over the dunes and beach grass (shot 3)", [surf(1.2), wind(0.9), grass(0.6)], -38),
        (11.10, 14.12, "amb_beach_rope", "on the beach by the tail: surf, wind (shot 4)", [surf(1.0), wind(0.8)], -40),
        (14.02, 16.58, "amb_car_park", "beach car park: wind, the surf further off (shot 5)", [surf(0.5, 0.7), wind(0.9, 600)], -42),
        (16.48, 21.65, "amb_beach_plan", "beach: surf + wind (shot 6)", [surf(1.0), wind(0.8)], -41),
        (21.55, 25.65, "amb_beach_easel", "beach: surf + wind (shot 7)", [surf(0.9), wind(0.8)], -41),
        (25.55, 29.75, "amb_dunes", "dune top: wind in the beach grass, the surf below (shot 8)", [surf(0.6, 0.8), wind(0.9), grass(1.0)], -40),
        (29.65, 31.32, "amb_plunger_hush", "plunger close-up: a hushed wind, the sea far off - the held breath (shot 9)", [surf(0.4, 0.6), wind(0.5, 500)], -46),
        (31.22, 33.05, "amb_beach_wide", "beach wide before the blast: surf, wind (shot 10)", [surf(0.9), wind(0.7)], -43),
        (32.95, 35.40, "amb_dunes_panic", "dunes: wind, grass (shot 11)", [wind(0.9), grass(0.8), surf(0.5, 0.6)], -42),
        (35.30, 38.05, "amb_dunes_reporter", "dunes: wind (shot 12)", [wind(0.9), grass(0.7)], -43),
        (37.95, 40.98, "amb_far_lot", "the distant parking lot: open wind, a faint far sea (shot 13)", [wind(1.0, 600), surf(0.3, 0.5)], -43),
        (40.88, 44.12, "amb_beach_smoke", "beach, smoke clearing: surf, wind, a little smoulder (shot 14)", [surf(1.0), wind(0.8), smoke(0.2)], -40),
        (44.02, 48.68, "amb_beach_buried", "beach: surf + wind (shot 15)", [surf(1.0), wind(0.8)], -41),
        (48.50, T.DUR, "amb_park_sunny", "the sunny beach park today: birds, soft breeze, far surf, kids playing far off (shot 16)", [park()], -38),
        (fr(T.CROWD) - 0.3, fr(T.HOLD[0]) + 0.05, "crowd_chatter", "@790 a cheerful crowd chatting on the dune top (far, dark); hushes for the hold @898", [chatter(14, 1.0)], -39),
    ]
    for i, (a, b, name, desc, parts, lvl) in enumerate(beds):
        fo = 0.35 if name == "crowd_chatter" else (0.12 if b < T.DUR - 0.01 else 0.8)
        g = _bed(b - a, 0.6 if name == "crowd_chatter" else (0.08 if a > 0 else 0.4), fo, parts)
        add(Cue(a, name, desc, (lambda g=g, sd=100 + i: g(sd)), lvl, "bed", send=0.0))

    # ------------------------------------------------ picture kicks: soft round low thumps (nothing to mask a word)
    for f in T.KICKS:
        add(Cue(fr(f), "kick", f"KICK @{f}: soft round low thump under the picture kick", (lambda r=rr(): (B.kick_thump(r), 0.0)),
                -2 if f != T.BOOM else -6, send=0.02, frame=f))

    # ------------------------------------------------ XF air swells
    for f in T.XF:
        add(Cue(fr(f), "xf_air", f"soft sea-air swell through the dissolve @{f}",
                (lambda r=rr(): (G.whoosh(0.7, r, 0.3, 300, 1500, 0.9, 0.2, 0.08), 0.3)), -18, send=0.15, frame=f))

    # ------------------------------------------------ far gull calls (subtle), each inside a narration gap
    for k, f in enumerate(T.GULL_CALLS):
        add(Cue(fr(f), "gull_far", f"a far seagull call in the gap (@{f})", (lambda r=rr(), k=k: (W.gull(r, k=[2, 1, 3, 2][k], far=0.35), 0.0)),
                -15, p=[-0.6, 0.5, -0.3, 0.6][k], send=0.3, frame=f))

    # ------------------------------------------------ shot 1: the hook
    td = fr(T.DYNAMITE)
    add(Cue(td, "dynamite_pops", "@114 sticks of dynamite pop up along the whale's back (five soft cork 'thup's, L to R)",
            lambda: (widen(W.stick_pops(rng(114), 5, 0.055), rng(1140), 7, 1.0), 0.0),
            -13, lpf=1500, send=0.1, frame=T.DYNAMITE))
    add(Cue(td + 0.05, "fuse_sparkle", "the lit fuses fizz and sparkle until the flash (kept low under 'dynamite')",
            lambda: (W.fuse_sparkle(fr(T.FLASH) - td - 0.05, rng(115), 5, 0.7), 0.0), -23, frame=T.DYNAMITE))
    add(Cue(fr(T.FLASH), "flash_swell", "reverse air swell into the white FLASH @134 (peaks on the frame, in the gap)",
            lambda: (G.whoosh(0.5, rng(134), 0.42, 500, 3500, 0.9, 0.04, 0.3), 0.42), -9, frame=T.FLASH))
    add(Cue(fr(T.FLASH) + 0.02, "flash_pff", "on the flash: a soft muffled 'pfoomf' (sub + dark air), not a bang",
            lambda: (np.pad(B.kick_thump(rng(135), 1.0), (0, ns(0.2))) + lp(B.poof(rng(136)), 900, 2) * 0.5, 0.0), -6, frame=T.FLASH))

    # ------------------------------------------------ shot 2: after
    add(Cue(fr(T.PLOP), "blubber_plop", "@169 a blubber chunk plops onto the Engineer's hat (wet round 'blop', dark - under 'whale.')",
            lambda: (W.plop(rng(169)), 0.0), -9, p=0.05, lpf=1200, send=0.1, frame=T.PLOP))
    add(Cue(6.10, "hat_crack", "the cracked hard hat gives a little creak in the gap after 'whale.'",
            lambda: (G.creak(0.18, rng(183), 260, 180, G.WOOD, None, 0.1, 0.02, 1.6) * 0.5, 0.0), -16, p=0.05, frame=183))

    # ------------------------------------------------ shot 4: the rope, the smell
    add(Cue(fr(T.ROPE_SNAP), "rope_snap", "@366 the rope strains and SNAPS (dark thwack + whip; the strain creak leads in) - under 'move'",
            lambda: W.rope_snap(rng(366)), -11, p=0.15, lpf=1300, send=0.12, frame=T.ROPE_SNAP))
    for k, f in enumerate(T.TUMBLE):
        add(Cue(fr(f), "tumble", f"the locals tumble onto the sand ({k + 1}/3, gap after 'move it,')", (lambda r=rr(): (W.sand_thud(r, 1.0), 0.0)),
                -9 if k < 2 else -14, p=[-0.4, 0.3, -0.1][k], lpf=1800, frame=f))
    add(Cue(fr(T.SMELL), "stink_wobble", "@403 green stink lines rise: a queasy low 'wah-wah' wobble (dark, under 'smell')",
            lambda: (W.stink_wobble(rng(403), 1.1), 0.0), -14, p=0.0, send=0.15, frame=T.SMELL))
    add(Cue(13.84, "gull_faint", "a seagull faints off its post: weak falling 'kyo-oww' + feathers (gap after 'smell.')",
            lambda: (W.gull_faint(rng(404)), 0.0), -13, p=0.45, send=0.2, frame=T.SMELL))
    add(Cue(fr(T.FAINT_THUD), "gull_thud", "...and lands softly on the sand", lambda: (W.sand_thud(rng(419), 0.6), 0.0),
            -15, p=0.45, lpf=1500, frame=T.FAINT_THUD))

    # ------------------------------------------------ shot 5: the highway truck
    add(Cue(fr(T.TRUCK) - 0.8, "truck_arrive", "@440 the orange 1970s highway truck pulls up: V8 coming down, brakes + gravel at the stop, idle (dark)",
            lambda: (W.truck_arrive(rng(440), 0.8, fr(T.TRUCK_DOORS[-1]) - fr(T.TRUCK) + 0.15), 0.0), -10, lpf=2000, send=0.1, frame=T.TRUCK))
    for k, f in enumerate(T.TRUCK_DOORS):
        add(Cue(fr(f), "truck_door", f"the crew hop out: truck door slams ({k + 1}/2, gap after 'Department.')", (lambda r=rr(): (W.door_slam(r), 0.0)),
                -10 if k == 0 else -13, p=[0.35, -0.25][k], send=0.12, frame=f))

    # ------------------------------------------------ shot 6: the plan, the crates
    add(Cue(fr(T.BLOOP), "bubble_bloop", "@558 the thought bubble appears: a short round 'bloop'", lambda: (W.bloop(rng(558)), 0.0),
            -16, p=0.3, send=0.15, frame=T.BLOOP))
    add(Cue(19.08, "boulder_clonk", "the whale in the bubble turns to stone: a dry stone 'clonk' (gap after 'boulder')",
            lambda: (W.stone_clonk(rng(572)), 0.0), -11, p=0.3, send=0.1, frame=572))
    for k, f in enumerate(T.CRATE_TIMES):
        in_gap = k == 0
        add(Cue(fr(f), "crate", f"a dynamite crate stacked on the pile ({k + 1}/{len(T.CRATE_TIMES)}, @580-625)", (lambda r=rr(), k=k: (W.crate_stack(r, 1.0), 0.0)),
                -11 if in_gap else -17, p=[-0.3, 0.2, -0.1, 0.3, -0.25, 0.1, 0.0][k], lpf=1500, send=0.08, frame=f))

    # ------------------------------------------------ shot 7: easel + bibbed gulls
    add(Cue(fr(T.EASEL), "easel_tap", "@655 the Engineer taps the easel (dry wooden tok-tok, dark, the 2nd one after 'plan?')",
            lambda: (W.easel_tap(rng(655)), 0.0), -20, p=-0.15, lpf=1200, frame=T.EASEL))
    add(Cue(fr(T.GULL_LICK), "beak_lick", "@744 the gulls in bibs lick their beaks (tiny wet smacks, kept low under 'seagulls')",
            lambda: (ssum(pan(W.beak_lick(rng(744), 3), -0.3), pan(W.beak_lick(rng(745), 2), 0.35) * 0.7), 0.0), -19, lpf=2200, frame=T.GULL_LICK))
    add(Cue(25.86, "fork_clink", "forks tapped on the log, eager (gap after 'rest.')", lambda: (ssum(pan(W.fork_clink(rng(776)), 0.3), pan(W.fork_clink(rng(777)), -0.4) * 0.7), 0.0),
            -15, send=0.15, frame=776))

    # ------------------------------------------------ shot 8: the TV crew
    add(Cue(fr(T.CAMERA), "film_camera", "@845 the 16 mm news camera starts whirring (motor + 24 fps claw), runs through the hold until the BOOM",
            lambda: (W.film_camera(fr(T.BOOM) - fr(T.CAMERA), rng(845)), 0.0), -25, p=0.35, lpf=2500, frame=T.CAMERA))
    add(Cue(fr(T.CAMERA) + 0.35, "lens_glint", "the camera lens catches a glint (tiny high shimmer)", lambda: (lp(W.wink_ting(rng(856)), 9000, 1) * 0.3, 0.0),
            -24, p=0.35, frame=856))

    # ------------------------------------------------ shot 9: the plunger
    add(Cue(fr(T.PLUNGER), "plunger", "@914 the plunger is pushed down: short rod slide into a solid box clunk (dark)",
            lambda: W.plunger(rng(914)), -14, p=0.0, lpf=1600, send=0.1, frame=T.PLUNGER))

    # ------------------------------------------------ shot 10: the BOOM
    add(Cue(fr(T.BOOM), "boom_hit", "@960 BOOM transient: a short low-passed sub punch only (under 'whale exploded')",
            lambda: (W.boom_hit(rng(960)), 0.0), -4, send=0.05, frame=T.BOOM))
    add(Cue(BOOM_TAIL_T, "boom_tail", "...the big BOOM body after 'exploded' ends (32.75 s): blast 'whoomph', sand + debris roar, rolling rumble decaying dark",
            lambda: (W.boom_tail(rng(961), 3.4), 0.0), +6, send=0.2, frame=int(round(BOOM_TAIL_T * 30))))

    # ------------------------------------------------ shot 11: falling blubber, panic
    tw = fr(T.WHISTLE_DOWN)
    for k, (dt, f0, f1, p) in enumerate([(0.0, 1500, 700, -0.3), (0.12, 1350, 620, 0.35), (0.25, 1650, 760, 0.0)]):
        add(Cue(tw + dt - 0.9, "fall_whistle", f"@1020 blubber chunks whistle down ({k + 1}/3)", (lambda r=rr(), a=f0, b=f1: (W.fall_whistle(r, 0.95, a, b), 0.0)),
                -19, p=p, lpf=2000, send=0.15, frame=T.WHISTLE_DOWN))
    tp = fr(T.PANIC)
    add(Cue(tp, "panic_scatter", "@1034 the crowd scatters in panic: running feet in soft sand in all directions (dark)",
            lambda: (W.scatter(1.9, rng(1034), 8, 0.9), 0.0), -17, lpf=2000, frame=T.PANIC))
    for k, dt in enumerate([0.02, 0.52, 0.64]):
        add(Cue(tp + dt, "umbrella_pop", f"an umbrella pops open ({k + 1}/3; the 2nd and 3rd in the gap after 'everyone.')", (lambda r=rr(): (W.umbrella_pop(r), 0.0)), [-19, -14, -15][k], p=[-0.5, 0.45, 0.1][k],
                lpf=2500, frame=int(round((tp + dt) * 30))))
    add(Cue(35.05, "whoa_far", "a couple of far 'whoa!'s from the fleeing crowd (gap after 'everyone.')",
            lambda: (ssum(pan(lp(G.whoa(rng(1051), 140, 0.4), 2200, 2), -0.6), pan(lp(G.whoa(rng(1052), 210, 0.35), 2200, 2), 0.55) * 0.8), 0.0),
            -19, send=0.2, frame=1051))
    add(Cue(35.22, "basket_splat", "the picnic basket gets splatted (gap after 'everyone.')", lambda: (W.basket_crunch(rng(1057)), 0.0),
            -8, p=0.25, send=0.12, frame=1057))

    # ------------------------------------------------ shot 12: splats around the reporter
    for k, f in enumerate(T.SPLATS):
        dark = [700, 500, 800][k]
        add(Cue(fr(f), "splat", f"@{f} a blubber chunk splats {['beside the reporter', 'behind him', 'on his head'][k]} (dark, under the words)",
                (lambda r=rr(), d=dark: (W.splat(r, 1.0, d), 0.0)), [-9, -15, -12][k], p=[-0.45, 0.4, 0.0][k], send=0.1, frame=f))
    add(Cue(37.72, "head_squish", "the chunk on the reporter's head settles: a slow wet squish (gap after 'crowd.')",
            lambda: (lp(W.splat(rng(1132), 0.5, 1600), 1600, 2), 0.0), -14, p=0.0, frame=1132))

    # ------------------------------------------------ shot 13: the car
    add(Cue(fr(T.CAR_CRUNCH), "car_crunch", "@1158 the sedan is flattened: deep dark body crunch (lp 700 Hz) - kept low under 'car'",
            lambda: (W.car_crunch(rng(1158)), 0.0), -11, p=0.1, send=0.12, frame=T.CAR_CRUNCH))
    add(Cue(fr(T.HUBCAP[0]) - 0.03, "glass_tinkle", "a little glass tinkles down (gap after 'away.')", lambda: (W.glass_tinkle(rng(1215), 0.3), 0.0),
            -24, p=0.2, send=0.15, frame=T.HUBCAP[0]))
    add(Cue(fr(T.HUBCAP[0]), "hubcap_roll", "@1216 a hubcap rolls away wobbling and settles (gap after 'away.')", lambda: (W.hubcap_roll(rng(1216), 0.45), 0.0),
            -19, p=-0.2, send=0.15, frame=T.HUBCAP[0]))

    # ------------------------------------------------ shot 14: still there
    add(Cue(fr(T.GULLS_FLEE) - 0.1, "gulls_flee", "@1255 the seagulls flee in the background (heavy wingbeats, dark, far)",
            lambda: (W.wings_flee(1.4, rng(1255), 6), 0.0), -16, lpf=2000, send=0.2, frame=T.GULLS_FLEE))
    add(Cue(fr(T.BLINK), "blink", "@1300 the sooty Engineer blinks (tiny plip-plip)", lambda: (E.blink(rng(1300)) * 0.5, 0.0), -22, p=0.1, lpf=4000, frame=T.BLINK))

    # ------------------------------------------------ shot 15: buried
    add(Cue(fr(T.FACEPALM), "face_palm", "@1406 the Engineer face-palms (soft dark slap, under 'avoid')", lambda: (W.face_palm(rng(1406)), 0.0),
            -12, p=0.05, send=0.1, frame=T.FACEPALM))
    add(Cue(fr(T.DOZER[0]) - 0.12, "bulldozer", "@1424-1444 a bulldozer pushes sand over the whale (low diesel chug, track clank; dark under 'buried')",
            lambda: (W.bulldozer(fr(T.DOZER[1]) - fr(T.DOZER[0]) + 0.85, rng(1424)), 0.0), -13, lpf=1200, send=0.08, frame=T.DOZER[0]))
    for k, tm in enumerate([47.33, 48.42, 48.66]):
        add(Cue(tm, "shovel", f"a shovel of sand thrown on the mound ({k + 1}/3, in the gaps)", (lambda r=rr(): (W.shovel_scrape(r, 0.3), 0.0)),
                -14, p=[-0.4, 0.35, -0.2][k], lpf=3500, frame=int(round(tm * 30))))
    add(Cue(fr(T.DOZER[1]) + 0.25, "flag_pop", "the little sand-castle flag pops up on the mound (tiny fwip)",
            lambda: (G.whoosh(0.2, rng(1444), 0.05, 900, 3000, 0.7, 0.05, 0.2), 0.0), -18, p=0.2, lpf=4000, frame=1451))

    # ------------------------------------------------ shot 16: the park and the wink
    add(Cue(fr(T.GULL_LAND), "gull_land", "@1547 a seagull lands on the park sign (wingbeats braking + claw tap, dark)",
            lambda: (W.gull_land(rng(1547)), 0.0), -20, p=0.3, lpf=1500, frame=T.GULL_LAND))
    add(Cue(fr(T.WINK), "wink_ting", "@1556 the seagull WINKS: a small, very high 'ting' (E8 over a soft E7: above the speech band, it sits on the final Gmaj9 as the 13th)", lambda: (W.wink_ting(rng(1556)), 0.0),
            -6, p=0.3, send=0.25, frame=T.WINK))
    add(Cue(52.35, "gull_happy", "a happy little gull 'kyow' after the wink", lambda: (W.gull(rng(1571), 900, 1, far=0.5), 0.0),
            -17, p=0.35, send=0.25, frame=1571))
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
