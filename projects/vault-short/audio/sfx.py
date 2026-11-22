# Every sound effect + ambience bed of "The Time Lock" as a cue list locked to the picture (timeline.py), rendered into one stereo
# SFX stem. Level convention (same as the earlier shorts): each EVENT has a "naive" level (LU relative to the voice stem's
# integrated loudness, measured as the event's max momentary loudness) and is placed SFX_DB under it, plus per-cue offsets;
# ambience BEDS are integrated loudness and not reduced.
# Rule: an SFX under a spoken word stays >= 12 dB under the voice in the speech band (300-5000 Hz), is dark (low-passed), or
# moves into a narration gap. So the hits that land on words here are built low and round (the vault-door groan below 330 Hz,
# the cobble steps, the slipper flops, the bolt clunk, the dull pats, the clacks) or are tiny dry transients (ticks, clicks), and the
# bright or sustained details (the crowbar clank, the gasp, the key jingle, the door's golden shimmer, the spark ping, the bell, the
# snip, the slaps, the coin chinks, the wink 'ting') sit inside measured gaps (timeline.py lists them).
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated)
import sfx_gen as G
import sfx_emu as E
import sfx_bat as B
import sfx_marathon as M
import sfx_chicago as C
import sfx_vault as V
import timeline as T

N = ns(T.DUR)
SFX_DB = -4.0                      # SFX are supportive; key hits get their level through `naive`
fr = T.fr
BEAT = 60.0 / T.BPM
BED_BOOST = 5.0                    # ambience beds sit 32-38 LU under the voice's integrated loudness (subtle, but audible in the gaps)


class Cue:
    def __init__(self, t, name, desc, gen, naive, kind="event", p=0.0, extra=0.0, lpf=None, send=0.1, frame=None):
        self.t, self.name, self.desc, self.gen, self.naive = t, name, desc, gen, naive
        self.kind, self.p, self.extra, self.lpf, self.send = kind, p, extra, lpf, send
        self.applied = naive + (SFX_DB if kind == "event" else 0.0) + extra
        self.measured = None
        self.frame = frame


def ssum(*xs):
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


def cues():
    Cs = []
    R = rng(1874)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = Cs.append
    D = T.DUR
    f30 = lambda t: int(round(t * 30))
    ev = lambda t, name, desc, fn, naive, **kw: add(Cue(t, name, desc, fn, naive, **kw))

    # ------------------------------------------------ ambience beds (integrated loudness vs the voice stem)
    g1 = T.GRID0
    g2 = fr(1430) + 0.02
    beds = [
        (0.0, 12.25, "amb_night_town", "moonlit town at night: soft crickets, a faint breeze (shots 1-2, through the march)", [lambda d, r: V.night_town(d, r)], -38, [(0, 0.9), (6.1, 0.9), (6.5, 0.6), (11.0, 0.6), (12.2, 0.0)]),
        (12.1, 17.5, "amb_vault_room", "bank interior by candlelight: a dark low room tone and a faint candle flicker (shots 3-4)", [lambda d, r: V.vault_room(d, r)], -39, None),
        (17.3, 24.85, "amb_workshop", "Sargent's workshop, warm: room tone, gear whirs, tinkering clinks, a wall clock (shot 5-6)", [lambda d, r: V.workshop(d, r)], -37, [(0, 0.0), (0.5, 0.2), (1.3, 1.0)]),
        (24.95, 31.25, "ticking_1", "@750-935 the steady clockwork ticking beneath, on the music's 96 bpm beat grid (tick / tock alternating, dark)",
         [lambda d, r: V.clock_ticks(d, r, 0.0, BEAT, 1.0, 2400)], -37, [(0, 0.0), (0.12, 1.0), (6.2, 1.0), (6.3, 0.0)]),
        (31.1, 37.2, "amb_prairie", "Morrison, Illinois, bright day: a dry prairie breeze, a far bird phrase, a slow cart, a faint town murmur (shot 8)", [lambda d, r: V.prairie(d, r)], -37, None),
        (37.1, 45.2, "amb_night_vault", "the vault at night again: a dark room tone, a faint candle flicker, far crickets (shots 9-10)", [lambda d, r: V.vault_room(d, r), lambda d, r: V.night_town(d, r, 0.35)], -41, None),
        (45.6, 47.72, "queue_murmur", "@1382-1403 the queue of bankers outside Sargent's shop: a low murmur and shuffling (dark)", [lambda d, r: V.murmur_queue(d, r)], -38, [(0, 0.0), (0.4, 1.0), (1.8, 1.0), (2.1, 0.5)]),
        (45.1, 47.7, "amb_street_banks", "a bright street of banks: a breeze, a far cart (shot 11)", [lambda d, r: C.street(d, r, 0.6, 5, 0.3, 0.6)], -39, None),
        (47.6, D, "hum_modern", "the modern vault: a low mains hum (60 / 120 Hz) and a faint air-handler hiss, calm and bright (shot 12)", [lambda d, r: V.modern_hum(d, r)], -38, [(0, 0.0), (0.4, 1.0), (4.0, 1.0), (5.3, 0.6)]),
        (g2 - 0.02, T.WINK_T - 0.1, "ticking_2", "the guard clock's ticking under 'today, banks still use time locks', on the music's beat grid (tiny, dark)",
         [lambda d, r: V.clock_ticks(d, r, 0.0, BEAT, 0.8, 2200)], -43, [(0, 0.0), (0.2, 1.0), (3.9, 1.0), (4.2, 0.0)]),
    ]
    for i, (a, b, name, desc, parts, lvl, env) in enumerate(beds):
        fo = 0.12 if b < D - 0.01 else 0.8
        fi = 0.4 if a == 0 else 0.1
        g = _bed(b - a, fi, fo, parts, env)
        add(Cue(a, name, desc, (lambda g=g, sd=300 + i: g(sd)), lvl + BED_BOOST, "bed", send=0.0))

    # ------------------------------------------------ XF air swells
    for f in T.XF:
        add(Cue(fr(f), "xf_air", f"soft warm-air swell through the dissolve @{f}",
                (lambda r=rr(): (G.whoosh(0.6, r, 0.3, 300, 1500, 0.9, 0.2, 0.06), 0.3)), -26, lpf=1800, send=0.15, frame=f))

    # ------------------------------------------------ shot 1: the hook, the bedroom
    ev(2.08, "owl", "a far owl hoots 'hoo, hoo-hooo' in the gap after '1860s,' (2.05-2.42)", lambda: (V.owl(rng(2)), 0.0), -15, p=-0.5, send=0.4, frame=f30(2.08))
    ev(fr(T.CROWBAR), "crowbar_toss", "@126 the robber tosses the crowbar over his shoulder: a dark whoosh (under 'vaults')",
       lambda: (V.crowbar_toss(rng(126)), 0.0), -20, p=0.2, send=0.1, frame=T.CROWBAR)
    ev(T.CLANK_T, "crowbar_clank", "...and it clanks onto the cobbles and bounces: iron 'clank-ank-nk' in the gap after 'vaults.' (4.67-4.96)",
       lambda: (V.crowbar_clank(rng(127)), 0.0), -1, p=0.35, send=0.08, frame=f30(T.CLANK_T))
    ev(fr(T.TIPTOE[0]) + 0.28, "tiptoe_steps", "@126-150 the three robbers tiptoe off: soft-soled dark steps (they sit under the music's pizzicato motif)",
       lambda: (V.tiptoe_steps(rng(128), 5, 0.3125), 0.0), -24, send=0.05, frame=f30(fr(T.TIPTOE[0]) + 0.28))
    ev(fr(T.CUT_BED) + 0.02, "snore", "@150 the banker snores in his nightcap: a fluttering dark inhale and a whistly exhale (under 'They just kidnapped the banker')",
       lambda: (M.snore(rng(150), 0.55, 0.3, 330), 0.0), -22, p=-0.2, send=0.06, frame=T.CUT_BED)
    add(Cue(5.02, "candle_flame", "@150-172 a candle flame flutters over the bed (a faint dark flicker, tiny crackles)", (lambda: (V.candle(0.95, rng(129)), 0.0)), -35, "bed", send=0.0, frame=T.CUT_BED))
    ev(fr(T.GASP) + 0.0, "gasp_dark", "@172 the banker's eyes pop: a tiny dark intake on the frame (under 'banker.')",
       lambda: (lp(C.gasp(rng(172), 1), 600, 2), 0.0), -26, p=-0.1, send=0.05, frame=T.GASP)
    ev(T.GASP_T, "gasp", "...and the full startled 'hh-aah!' gasp in the gap after 'banker.' (6.12-6.77)",
       lambda: (C.gasp(rng(173), 2), 0.0), -3, p=0.0, send=0.15, frame=f30(T.GASP_T))
    ev(T.FLASH_T, "flash_pff", "@183 the white FLASH: a soft muffled 'pfoomf' (sub + dark air), not a bang, at the very start of the gap (6.12-6.77)",
       lambda: (M.flash_pff(rng(183)), 0.0), -2, send=0.1, frame=T.FLASH)

    # ------------------------------------------------ shot 2: the plan, the scoop, the march
    ev(6.40, "plan_unroll", "@205 a robber unrolls the plan on the bedpost: a crackly paper curl (starts in the gap 6.12-6.77, its end flops flat on the frame, dark)",
       lambda: (lp(C.paper_unroll(rng(205), 0.45), 3500, 1), 0.0), -15, p=0.25, send=0.1, frame=T.PLAN)
    ev(T.SCOOP_T, "scoop_whoosh", "@239 they scoop the banker up: a cloth-and-arms whoosh in the gap before 'Grab' (7.66-7.97)",
       lambda: (G.whoosh(0.27, rng(239), 0.4, 300, 1600, 0.9, 0.15, 0.1), 0.0), -7, p=-0.1, send=0.1, frame=f30(T.SCOOP_T))
    for k, (tm, sz, pp) in enumerate(((fr(T.SCOOP) + 0.02, 1.0, -0.4), (fr(T.SCOOP) + 0.34, 0.7, 0.3))):
        ev(tm, "slipper_flop", f"@239 the banker's slippers dangle and flop ({k + 1}/2: a soft dark 'fwp', under 'Grab the manager')",
           (lambda r=rr(), sz=sz: (M.flop_thud(r, sz, 600), 0.0)), -23, p=pp, send=0.06, frame=f30(tm))
    ev(fr(T.MARCH[0]), "march_cobbles", "@275-330 the night march on cobbles: two robbers' boots on every beat of the 96 bpm grid, the banker's slippers flopping on the off-beats (dark, in step with the music)",
       lambda: (V.march_cobbles(fr(T.MARCH[1]) - fr(T.MARCH[0]) + 0.1, rng(275), BEAT), 0.0), -27, send=0.06, frame=T.MARCH[0])

    # ------------------------------------------------ shot 3: the vault
    ev(11.80, "vault_creak_gap", "@365 the vault door's upper creak (a metal hinge squeal) in the gap before 'Steel' (11.73-12.18), cut off before the word",
       lambda: (V.creak_bright(0.36, rng(365)), 0.0), -7, p=0.0, send=0.2, frame=f30(11.80))
    add(Cue(11.80, "vault_groan", "@365-374 the huge vault door groans: a very deep, slow creak (below ~330 Hz, a sub swell) under 'Steel vault' and the pull-back",
            (lambda: (V.vault_groan(2.9, rng(366), 330), 0.0)), -1, "event", send=0.05, extra=-4.0, frame=T.VAULT[0]))
    ev(T.KEYJ[0] / 30 + 0.22, "key_jingle", "@438 the banker's key on its string jangles: bright little metal clinks in the gap after 'key,' (14.79-15.23)",
       lambda: (V.key_jingle(rng(438), 0.45), 0.0), -2, p=0.3, send=0.2, frame=f30(T.KEYJ[0] / 30 + 0.22))
    ev(15.42, "key_tremble", "@462 the trembling key, heard dark (small clinks low-passed at 1.6 kHz, under 'scared')",
       lambda: (lp(V.key_jingle(rng(440), 0.5, 0.8), 1600, 2), 0.0), -26, lpf=1600, p=0.3, send=0.1, frame=f30(15.42))
    for k, (tm, pp) in enumerate(((15.45, -0.2), (15.62, 0.2), (15.85, -0.2), (16.02, 0.2))):
        ev(tm, "knee_knock", f"@462 his knees knock ({k + 1}/4, a dark dull 'tup', under 'scared banker')", (lambda r=rr(): (V.knee_knock(r), 0.0)), -22, p=pp, send=0.05, frame=f30(tm))

    # ------------------------------------------------ shot 4: the wheel, the door
    ev(fr(T.WHEEL) - 0.02, "wheel_turn", "@484 he turns the big spoked wheel: a slow iron ratchet 'krk ... krk' (dark, under 'open')",
       lambda: (V.wheel_turn(0.62, rng(484), 6.5, 650), 0.0), -18, send=0.06, frame=T.WHEEL)
    add(Cue(fr(T.DOOR) - 0.05, "door_creak", "@493 the vault door swings open with a deep creak (dark, below ~380 Hz, a sub swell; under 'open anything')",
            (lambda: (V.vault_groan(1.7, rng(493), 380), 0.0)), -3, "event", send=0.05, extra=-4.0, frame=T.DOOR))
    ev(T.OPEN_T - 0.04, "door_creak_tail", "...its hinge squeal rings out in the gap after 'anything.' (16.90-17.49)",
       lambda: (V.creak_bright(0.45, rng(494)), 0.0), -7, p=0.0, send=0.25, frame=f30(T.OPEN_T))
    ev(T.OPEN_T, "golden_shimmer", "@493 golden light spills over the robbers: a soft airy swell with shimmering high partials in the gap after 'anything.'",
       lambda: (V.golden_shimmer(rng(495), 0.45), 0.0), -2, p=0.0, send=0.3, frame=f30(T.OPEN_T))

    # ------------------------------------------------ shot 5: the workshop
    ev(fr(T.SPARK) + 0.0, "pre_spark", "@594 the idea lights up: a tiny dark 'pip' on the frame (under 'clever')",
       lambda: (V.pre_spark(rng(594)), 0.0), -26, p=0.0, send=0.05, frame=T.SPARK)
    ev(T.SPARK_T, "spark_ping", "...and its bright 'ting' with a rising sparkle in the gap after 'idea.' (20.50-20.84)",
       lambda: (V.spark_ping(rng(595)), 0.0), -3, p=0.15, send=0.25, frame=f30(T.SPARK_T))
    ev(fr(T.SCRIBBLE[0]) + 0.0, "pencil", "@625-658 he scribbles on the blueprint: a soft pencil scratching in strokes (quiet, dull, under 'Build a lock that even the banker')",
       lambda: (V.pencil(1.5, rng(625), 6.5), 0.0), -37, p=0.2, send=0.05, frame=T.SCRIBBLE[0])
    ev(22.50, "pencil_x", "@676 two quick pencil strokes cross the banker's face out (tiny)",
       lambda: (V.pencil(0.22, rng(676), 12.0), 0.0), -33, p=0.2, send=0.05, frame=f30(22.50))
    ev(fr(T.SCREW) - 0.02, "screwdriver", "@722 a screwdriver pries a clock open: a tiny metal creak and a woody 'pop' (dark, under 'parts')",
       lambda: (V.screwdriver_pop(rng(722)), 0.0), -25, p=-0.2, send=0.08, frame=T.SCREW)
    ev(fr(T.SCREW) + 0.17, "springs", "@722 clock springs and gears spill and bounce over the bench: soft low 'boing' coils (300-900 Hz) and tiny clinks (under 'parts from two kitchen clocks')",
       lambda: (lp(V.springs(rng(723), 12, 1.5), 1100, 1), 0.0), -28, p=0.0, send=0.1, frame=f30(fr(T.SCREW) + 0.17))
    ev(T.CLATTER_T, "springs_last", "...the last coils roll off the bench in the gap after 'clocks.' (25.51-25.94)",
       lambda: (V.springs(rng(724), 4, 0.5), 0.0), -22, p=0.4, send=0.15, frame=f30(T.CLATTER_T))
    ev(fr(T.ASSEMBLE[0]), "assemble", "@742-750 Sargent fits the gears together: tiny dry clicks climbing in pitch and a soft 'chk' (under 'kitchen')",
       lambda: (V.assemble_clicks(rng(742), 7, 0.25), 0.0), -25, p=0.1, send=0.05, frame=T.ASSEMBLE[0])

    # ------------------------------------------------ shot 7: the lock mechanism
    ev(fr(T.BOLT), "bolt_click", "@798 a clock arm locks the bolt: a short steel 'ka-chk' (dark, on 'bolt')",
       lambda: (V.bolt_click(rng(798)), 0.0), -22, p=0.0, send=0.08, frame=T.BOLT)
    ev(27.30, "wheel_try1", "@840 the banker's hand strains the wheel (the first try): a slow iron ratchet starting in the gap after 'locked,' (27.28-27.59)",
       lambda: (V.wheel_turn(0.25, rng(840), 7.0, 800), 0.0), -17, send=0.06, frame=f30(27.30))
    ev(fr(T.FAIL1), "clack1", "@840 the wheel stops dead: a firm steel 'clack' (dark, on 'release')",
       lambda: (V.lock_clack(rng(841)), 0.0), -24, p=0.0, send=0.08, frame=T.FAIL1)
    ev(fr(T.FAIL1) + 0.07, "rattle1", "...and a tiny shake of the stuck mechanism (dull, quiet)",
       lambda: (V.tiny_rattle(rng(842)), 0.0), -26, lpf=1500, p=0.2, send=0.05, frame=f30(fr(T.FAIL1) + 0.07))
    ev(29.28, "wheel_try2", "@887 the second try: the ratchet strains again in the gap after 'hour,' (29.26-29.59)",
       lambda: (V.wheel_turn(0.22, rng(887), 8.0, 800), 0.0), -17, send=0.06, frame=f30(29.28))
    ev(fr(T.FAIL2) - 0.05, "clack2", "@887 the second 'clack' (the wheel stopping dead, in the last frames of the gap before 'no matter')",
       lambda: (V.lock_clack(rng(888), 0.9), 0.0), -21, p=0.0, send=0.08, frame=T.FAIL2)
    ev(fr(T.FAIL2) + 0.03, "rattle2", "...and another tiny rattle (dull, quiet, under 'no matter')",
       lambda: (V.tiny_rattle(rng(889)), 0.0), -26, lpf=1500, p=-0.2, send=0.05, frame=f30(fr(T.FAIL2) + 0.03))
    ev(T.SIGH_T, "sigh", "@910 the banker sighs, defeated: a breathy falling 'haaah' in the gap after 'asking.' (30.76-31.20)",
       lambda: (M.sigh(rng(910), 0.38, 105), 0.0), -8, p=-0.2, send=0.12, frame=f30(T.SIGH_T))

    # ------------------------------------------------ shot 8: Morrison
    ev(T.BELL_T, "far_bell", "a far church bell tolls in the gap after '1874,' (33.00-33.37) (Morrison)",
       lambda: (V.far_bell(rng(933), 0.5, 392.0, 0.3), 0.0), -10, p=0.5, send=0.4, frame=f30(T.BELL_T))
    ev(32.45, "horse", "a horse nickers somewhere on the main street (soft, dark, under the held '1874,')",
       lambda: (V.horse(rng(934), 0.9), 0.0), -25, lpf=1400, p=-0.5, send=0.15, frame=f30(32.45))
    ev(fr(T.BOLTON), "bolting_clunk", "@1034 Sargent bolts the great door on: a heavy iron 'THUNK' and a wrench ratchet (dark, on 'vault')",
       lambda: (V.bolting_clunk(rng(1034)), 0.0), -15, p=0.0, send=0.08, frame=T.BOLTON)
    ev(fr(T.PAT), "door_pat", "@1040 he pats it proudly: a dull 'pomp' on cold steel (dark, on 'door')",
       lambda: (V.hand_pat_dark(rng(1040)), 0.0), -19, p=0.1, send=0.08, frame=T.PAT)
    ev(T.SNIP_T, "ribbon_snip", "@1087 the ribbon is snipped: a bright steel 'snik' in the micro-gap 36.09-36.22 before 'Illinois' (and a soft cloth fall)",
       lambda: (V.ribbon_snip(rng(1087)), 0.0), -3, p=0.2, send=0.2, frame=T.SNIP)
    ev(36.70, "far_bell2", "...and the town bell answers in the gap after 'Illinois.' (36.62-37.08)",
       lambda: (V.far_bell(rng(1088), 0.4, 440.0, 0.3), 0.0), -12, p=0.5, send=0.4, frame=f30(36.70))
    ev(36.75, "horse2", "...and the horse whinnies back (the same gap, soft)",
       lambda: (V.horse(rng(1089), 0.32), 0.0), -17, lpf=1800, p=-0.5, send=0.15, frame=f30(36.80))

    # ------------------------------------------------ shot 9: the night return
    ev(fr(T.MARCH2[0]), "march_cobbles2", "@1126-1151 the robbers march the nightshirted banker again on cobbles (dark, on the beat grid, under 'kidnapping no longer worked')",
       lambda: (V.march_cobbles(fr(T.MARCH2[1]) - fr(T.MARCH2[0]) + 0.1, rng(1126), BEAT), 0.0), -27, send=0.06, frame=T.MARCH2[0])
    ev(38.82, "wheel_try3", "@1172 the banker turns the new wheel: a short ratchet strain in the gap before 'Unluckily' (38.76-39.07)",
       lambda: (V.wheel_turn(0.15, rng(1172), 8.0, 800), 0.0), -17, send=0.06, frame=f30(38.82))
    ev(38.97, "clack3", "@1172 the wheel does not move: a steel 'clack' (the last 80 ms of the gap before 'Unluckily')",
       lambda: (V.lock_clack(rng(1173), 0.9), 0.0), -21, p=0.0, send=0.08, frame=T.FAIL3)
    ev(T.PALM_T - 0.025, "face_palm", "@1210 the robbers face-palm: three quick 'pap's staggered across the micro-gap before 'neither' (40.16-40.30)",
       lambda: (V.palm_slap(rng(1210), 1.0), 0.0), -5, p=-0.5, send=0.1, frame=T.PALM)
    ev(T.PALM_T + 0.02, "face_palm2", "...second robber", lambda: (V.palm_slap(rng(1211), 0.9), 0.0), -5, p=0.0, send=0.1, frame=T.PALM)
    ev(T.PALM_T + 0.05, "face_palm3", "...third robber", lambda: (V.palm_slap(rng(1212), 0.9), 0.0), -5, p=0.5, send=0.1, frame=T.PALM)
    ev(fr(T.PALM), "face_palm_dull", "...and a dull 'pomp' of palm on the frame (dark, quiet, on 'neither')",
       lambda: (V.palm_dull(rng(1213)), 0.0), -24, p=0.0, send=0.05, frame=T.PALM)

    # ------------------------------------------------ shot 10: the waiting
    ev(fr(T.FIST), "fist_shake", "@1260 a robber shakes his fist at the banker: a cloth swish (dark, on 'threaten')",
       lambda: (V.fist_shake(rng(1260), 0.5), 0.0), -24, p=-0.3, send=0.06, frame=T.FIST)
    ev(42.58, "rope_tie", "@1283 they tie him to the chair: a fibrous rope rustle starting in the gap after 'him,' (42.57-42.84) and a final tug 'thup' under 'tie him up'",
       lambda: (V.rope_tie(0.55, rng(1283)), 0.0), -19, p=0.3, send=0.06, frame=T.ROPE)
    ev(43.40, "knit", "@1303 the knitting needles click (tiny, dull, under 'and wait')",
       lambda: (V.knit_clicks(0.25, rng(1303), 6.0), 0.0), -31, lpf=2500, p=0.4, send=0.05, frame=T.LAPSE[0])
    ev(43.79, "card_shuffle", "@1303-1325 the card players shuffle (a bright riffle) in the gap after 'wait.' (43.68-44.05)",
       lambda: (V.card_shuffle(rng(1304), 0.3), 0.0), -8, p=-0.4, send=0.1, frame=f30(43.79))
    ev(43.86, "bird_chirp", "...and a bird chirps from its nest on a robber's head (the same gap)",
       lambda: (V.bird_chip(rng(1305)), 0.0), -11, p=0.4, send=0.2, frame=f30(43.86))
    for k, tm in enumerate(T.acc_times()):
        ev(tm, "lapse_tick", f"@1303-1325 the accelerating ticks of the time-lapse ({k + 1}/{len(T.acc_times())}: tiny, dark, the first on 'wait', the rest under 'The clock did')",
           (lambda r=rr(): (lp(B.tick(r, False, 0.9), 2200, 2), 0.0)), -33, p=0.2 * (1 if k % 2 else -1), send=0.05, frame=f30(tm))
    ev(fr(T.SMUG), "smug_tick", "@1342 the clock's tiny smug 'tick' (one dark wooden tick on 'care')",
       lambda: (V.smug_tick(rng(1342), 0.9), 0.0), -26, send=0.05, frame=T.SMUG)
    ev(T.SMUG_T2, "smug_tick2", "...and a second, even smugger tick in the gap after 'care.' (45.08-45.66)",
       lambda: (V.smug_tick(rng(1343), 1.0, True), 0.0), -8, p=0.1, send=0.2, frame=f30(T.SMUG_T2))

    # ------------------------------------------------ shot 11: the queue
    for k, tm in enumerate((fr(1383), fr(1392), fr(1401))):
        ev(tm, "coin_bag", f"@1382-1403 a banker plonks a heavy coin bag down ({k + 1}/3: dark thump, under 'every bank wanted one')",
           (lambda r=rr(): (V.coin_bag_thump(r, 1.0), 0.0)), -28, p=[-0.4, 0.2, 0.5][k], send=0.06, frame=f30(tm))
    ev(T.COIN_T, "coin_chinks", "...the coins chink in their bags in the gap after 'one.' (47.12-47.70)",
       lambda: (V.coin_chinks(rng(1403), 0.45), 0.0), -5, p=0.3, send=0.2, frame=f30(T.COIN_T))

    # ------------------------------------------------ shot 12: the modern vault
    ev(fr(T.STEPS) + 0.02, "guard_steps", "@1504 the guard clock marches up on its stiff little legs: tiny hard 'tik' steps (dark-ish, under 'security guard')",
       lambda: (V.guard_steps(rng(1504), 4, BEAT / 2), 0.0), -30, send=0.05, frame=T.STEPS)
    ev(T.WINK_T, "wink_ting", "@1551 the guard clock winks: a small bright 'ting' on A7 (frame 51.70; in the gap right after 'clock.' 51.94-)",
       lambda: (M.wink_ting(rng(1551)), 0.0), 0, p=0.25, send=0.25, frame=T.WINK)
    return Cs


# ================================================================ render
def render(v_ref, on_event=None):
    """v_ref = integrated loudness of the voice stem (stereo). Returns (stereo stem, cue list with measured levels)."""
    Cs = cues()
    out = np.zeros((2, N))
    send = np.zeros(N)
    for c in Cs:
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
    return out, Cs
