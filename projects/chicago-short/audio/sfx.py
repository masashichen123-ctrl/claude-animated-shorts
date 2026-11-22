# Every sound effect + ambience bed of "Chicago Lifts a Hotel" (1861) as a cue list locked to the picture (timeline.py),
# rendered into one stereo SFX stem. Level convention (same as the marathon / emu / bat shorts): each EVENT has a "naive"
# level (LU relative to the voice stem's integrated loudness, measured as the event's max momentary loudness) and is
# placed SFX_DB under it, plus per-cue offsets; ambience BEDS are integrated loudness and not reduced.
# Rule: an SFX under a spoken word stays >= 12 dB under the voice in the speech band (300-5000 Hz), is dark (low-passed),
# or moves into a narration gap. So the hits that land on words here are built low and round (the frog plop, slurps, the
# clunk, the bonk, the shovels, the creaks) or are tiny dry transients (ratchet clicks, board ticks, the tap), and the
# bright or sustained details (the droplet ring, the schlorp pop, the tut, the gavel, the gasps, the gravel dump, the iron
# ring, the whistle, the chime, the desk bell, the wink, the train whistle) sit inside measured gaps (timeline.py lists them).
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated)
import sfx_gen as G
import sfx_emu as E
import sfx_bat as B
import sfx_marathon as M
import sfx_chicago as C
import timeline as T

N = ns(T.DUR)
SFX_DB = -4.0                      # SFX are supportive; key hits get their level through `naive`
fr = T.fr


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
    R = rng(1861)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = Cs.append
    D = T.DUR
    f30 = lambda t: int(round(t * 30))

    # ------------------------------------------------ ambience beds (integrated loudness vs the voice stem)
    beds = [
        (0.0, 6.75, "amb_street_hook", "Chicago street, bright day: a far crowd murmur, a breeze, sparrows, a far cart (shot 1)", [lambda d, r: C.street(d, r, 1.0, 12)], -37, None),
        (3.30, 6.65, "groan_hook", "@100-198 the whole hotel creaking up on its jackscrews: a slow, deep timber + brick groan rising in rate and weight (dark, below ~1.1 kHz, under 'lifted a giant brick hotel into the air ... guests still inside')",
         [lambda d, r: C.timber_groan(d, r)], -30, [(0, 0.0), (0.7, 0.55), (3.0, 1.0), (3.35, 0.7)]),
        (3.25, 6.62, "cheer_hook", "@100-198 the workers cheer below (dark crowd cheer swelling as the hotel rises; under the narration, blooms in the flash gap)",
         [lambda d, r: M.cheer(d, r, 18, 1.0, 1200)], -34, [(0, 0.0), (0.6, 0.6), (1.6, 1.0), (3.1, 1.0), (3.37, 0.8)]),
        (6.55, 10.1, "amb_swamp", "swamp-edge streets, overcast: soft lake lapping, cattails hissing in a breeze, far frogs, flies (shot 2)", [lambda d, r: C.swamp(d, r, 1.0, 3)], -36, None),
        (9.95, 13.0, "amb_mud", "the muddy street: sticky slop, flies, a faint far crowd (shot 3)", [lambda d, r: C.mud_street(d, r)], -38, None),
        (10.85, 13.0, "puddle_bubbling", "@328 the puddle bubbling and burping (dark slow green bubbles; under 'sewage had nowhere to go')", [lambda d, r: C.puddle_bubbling(d, r)], -34, [(0, 0.0), (0.2, 1.0), (1.9, 1.0), (2.15, 0.0)]),
        (12.92, 15.75, "amb_sickroom", "sickroom and street, overcast: dark room tone, a slow wall clock, a far murmur (shot 4)", [lambda d, r: C.sickroom(d, r)], -38, None),
        (15.6, 20.75, "amb_council", "the council hall, warm interior: room tone, a murmuring council, creaking floorboards (shot 5)", [lambda d, r: C.council_hall(d, r)], -37, None),
        (20.55, 23.95, "amb_dig", "the street being raised: a breeze, sparrows, workers murmuring, a far wagon (shot 6)", [lambda d, r: C.dig(d, r)], -38, None),
        (23.78, 27.3, "amb_hotel_front", "the grand hotel front: a bright street, a carriage on cobbles (clip-clop + wheels), a far crowd (shot 7)",
         [lambda d, r: C.street(d, r, 0.8, 8), lambda d, r: C.hooves(d, r, 2.0, 1.0, 0.7, -0.35)], -35, None),
        (26.0, 27.3, "flag_hotel", "@788 the flag on the roof fluttering (dark, quiet)", [lambda d, r: pan(C.flag(d, r), 0.45) * 0.8], -41, [(0, 0.0), (0.5, 1.0), (1.3, 1.0)]),
        (27.18, 31.3, "amb_office", "the contractors' office: quiet room tone, a wall clock, a pen scratching, a far street (shot 8)", [lambda d, r: C.office(d, r)], -38, None),
        (31.18, 36.0, "amb_yard", "under the hotel, daylight: a breeze, a far street, flags, a far bird (shot 9)", [lambda d, r: C.yard(d, r)], -38, None),
        (34.3, 36.0, "marching", "@1033 hundreds of workers march in and take their positions (a growing column of boots on packed earth, soft and dark)",
         [lambda d, r: C.marching(d, r, 1.9, 26, 1.0, (0.2, 1.0))], -33, [(0, 0.0), (0.3, 0.7), (1.0, 1.0), (1.55, 0.8), (1.7, 0.0)]),
        (35.9, 40.85, "amb_yard2", "the signal and the turns: a breeze, a hush over the yard, flags (shot 10)", [lambda d, r: C.yard(d, r, 0.8)], -39, None),
        (40.7, 43.45, "amb_yard3", "hotel wide: breeze, far street (shot 11)", [lambda d, r: C.yard(d, r, 0.9)], -38, None),
        (40.8, 43.4, "groan_wide", "@1223-1301 the whole hotel creaking slowly up, inch by inch (dark timber groan)",
         [lambda d, r: C.timber_groan(d, r, 0.8)], -36, [(0, 0.0), (0.5, 0.8), (2.0, 1.0), (2.6, 0.0)]),
        (43.3, 49.75, "amb_lobby", "hotel cutaway interior, warm: a lobby and dining-room murmur, a clock, cutlery tinks (shot 12)", [lambda d, r: C.lobby(d, r)], -37, None),
        (43.35, 52.45, "lift_hum", "@1301-1570 the gentle hum of the whole building rising (low drones 54 / 82 / 108 Hz beating softly, a faint timber creak)",
         [lambda d, r: C.lift_hum(d, r)], -34, [(0, 0.0), (0.6, 1.0), (6.3, 1.0), (7.5, 0.55), (9.1, 0.0)]),
        (49.6, 52.45, "amb_window", "window close-up, bright day: a light breeze and a far street (shot 13)", [lambda d, r: C.street(d, r, 0.7, 5, 0.3, 0.6)], -39, None),
        (52.28, 54.15, "amb_platform", "the platform at golden dusk: an idling steam engine (soft chuffs), a far station crowd, a breeze (shot 14a)", [lambda d, r: C.platform(d, r)], -36, None),
        (53.9, D, "amb_sleeper", "@1619+ inside the sleeping car: rails clatter 'ta-dak ta-dak' soft and lulling at a slow 0.75 s cycle (the music rocks with it), a low carriage rumble, panels creaking",
         [lambda d, r: C.sleeper_bed(d, r, 1.0, 0.75)], -33, [(0, 0.0), (0.35, 1.0), (3.5, 1.0), (5.0, 0.8)]),
    ]
    for i, (a, b, name, desc, parts, lvl, env) in enumerate(beds):
        fo = 0.12 if b < D - 0.01 else 0.8
        fi = 0.4 if a == 0 else 0.1
        g = _bed(b - a, fi, fo, parts, env)
        add(Cue(a, name, desc, (lambda g=g, sd=300 + i: g(sd)), lvl, "bed", send=0.0))

    # ------------------------------------------------ XF air swells
    for f in T.XF:
        add(Cue(fr(f), "xf_air", f"soft warm-air swell through the dissolve @{f}",
                (lambda r=rr(): (G.whoosh(0.6, r, 0.3, 300, 1500, 0.9, 0.2, 0.06), 0.3)), -26, lpf=1800, send=0.15, frame=f))

    # ------------------------------------------------ shot 1: the hook
    add(Cue(T.FLASH_T, "flash_pff", "@196 the white FLASH: a soft muffled 'pfoomf' (sub + dark air), not a bang (in the gap after 'inside.' 6.59-7.23)",
            lambda: (M.flash_pff(rng(196)), 0.0), -8, send=0.1, frame=T.FLASH))

    # ------------------------------------------------ shot 2: swamp, frog, mud
    add(Cue(fr(T.FROG), "frog_plop", "@250 a frog plops from the puddle: a soft dark 'bloop' (below 900 Hz, under 'swamp')",
            lambda: (C.frog_plop(rng(250)), 0.0), -14, p=-0.3, send=0.1, frame=T.FROG))
    add(Cue(T.FROG_RING, "droplets", "...and its three tiny droplet 'plip's in the gap after 'swamp.' (8.73-9.04)",
            lambda: (C.droplet_ring(rng(251)), 0.0), -17, p=-0.3, send=0.25, frame=f30(T.FROG_RING)))
    for k, (tm, sz, pp) in enumerate(((9.36, 1.0, -0.4), (9.72, 0.8, 0.35), (10.0, 1.2, -0.1))):
        add(Cue(tm, "mud_slurp", f"the street is a river of mud: a sticky wet suction 'shlupp' ({k + 1}/3, dark, under 'streets were rivers')",
                (lambda r=rr(), sz=sz: (C.mud_slurp(r, sz, 800), 0.0)), -15, p=pp, send=0.06, frame=f30(tm)))
    add(Cue(T.SCHLORP, "boot_schlorp", "@303 the man loses his boot: a long wet suction + the bright 'schlorp' pop lands in the gap after 'mud,' (10.43-10.73)",
            lambda: (C.schlorp(rng(303)), 0.42), -9, p=0.3, send=0.1, frame=f30(T.SCHLORP)))

    # ------------------------------------------------ shot 3: the puddle, the dog
    for k, tm in enumerate((10.98, 11.55, 12.05)):
        add(Cue(tm, "puddle_burp", f"a green burp-bubble pops in the puddle ({k + 1}/3, dark)",
                (lambda r=rr(): (C.burp(r), 0.0)), -17, p=[0.2, -0.3, 0.1][k], send=0.1, frame=f30(tm)))
    add(Cue(T.SNORT_T, "dog_snort", "@358 the passing dog holds its nose and snorts 'pfft-pfft' (gap after 'go.' 12.26-12.66)",
            lambda: (C.dog_snort(rng(358)), 0.0), -13, p=0.35, send=0.08, frame=f30(T.SNORT_T)))

    # ------------------------------------------------ shot 4: the sick
    add(Cue(13.0, "sneeze_soft", "@389 a green-faced townsman sneezes 'ah-ah-choo' (muffled, dark: it sits under 'Diseases like cholera')",
            lambda: (C.sneeze(rng(389)), 0.0), -15, lpf=700, p=-0.5, send=0.1, frame=389))
    add(Cue(13.62, "cough_soft", "a 'COUGH' puff, muffled and dark (under 'kept breaking')",
            lambda: (M.cough(rng(405), 2, 125), 0.0), -15, lpf=700, p=0.45, send=0.1, frame=f30(13.62)))
    add(Cue(13.95, "thermo_tink", "a thermometer tinks on a cup (tiny, bright, sparse)",
            lambda: (C.thermo_tink(rng(414)), 0.0), -20, p=0.5, send=0.2, frame=f30(13.95)))
    add(Cue(T.TUT_T, "doctor_tut", "@427 the doctor shakes his head: a dry 'tsk, tsk' (in the gap after 'out,' 14.55-14.96)",
            lambda: (C.tut(rng(427)), 0.0), -11, p=-0.15, send=0.08, frame=T.TUT))
    add(Cue(T.SNEEZE_T + 0.06, "cough_last", "one last small cough from the back of the row (same gap, soft)",
            lambda: (M.cough(rng(428), 1, 130), 0.0), -17, lpf=2500, p=0.5, send=0.1, frame=f30(T.SNEEZE_T + 0.06)))

    # ------------------------------------------------ shot 5: the council
    add(Cue(T.GAVEL_T, "gavel", "@496 the mayor bangs the gavel: a crisp dry 'tok' + the oak table (in the gap after 'decision,' 16.55-16.86; the frame is 16.53)",
            lambda: (C.gavel(rng(496)), 0.0), -7, p=0.0, send=0.15, frame=T.GAVEL))
    add(Cue(T.GASP_T, "council_gasp", "@541-585 the councilmen gasp 'ooooh' at the easel picture (gap after 'feet,' 18.35-18.66)",
            lambda: (C.gasp(rng(541), 5), 0.0), -12, p=0.0, send=0.15, frame=f30(T.GASP_T)))
    add(Cue(fr(555), "gasp_soft", "@555 a murmuring 'ooh' under 'build the sewers' (dark, quiet)",
            lambda: (C.gasp(rng(555), 3), 0.0), -18, lpf=700, p=-0.2, send=0.1, frame=555))
    add(Cue(T.GASP2_T, "council_gasp2", "...and a second, smaller 'oooh' after 'underneath.' (gap 20.09-20.69)",
            lambda: (C.gasp(rng(585), 4), 0.0), -15, p=0.15, send=0.15, frame=f30(T.GASP2_T)))

    # ------------------------------------------------ shot 6: the street dig, the bonk
    for k, (tm, pp) in enumerate(((fr(623) + 0.05, -0.4), (21.12, 0.3), (21.4, -0.2))):
        add(Cue(tm, "shovel", f"@623-650 a shovel bites into earth and scrapes ({k + 1}/3; dark, under 'streets were easy')",
                (lambda r=rr(): (C.shovel(r), 0.0)), -17, p=pp, send=0.06, frame=f30(tm)))
    add(Cue(T.GRAVEL_T, "gravel_dump", "@650 the wagon dumps its load: a pouring rush, tumbling stones, a deep thump (gap after 'easy,' 21.71-22.01; the frame is 21.67)",
            lambda: (C.gravel_dump(rng(650)), 0.0), -12, p=0.2, send=0.08, frame=T.SHOVEL[1]))
    add(Cue(fr(T.BONK), "head_bonk", "@685 the man bonks his head on the low window: a hollow wooden 'bonk' (dark, under 'go up')",
            lambda: (C.bonk(rng(685)), 0.0), -12, p=-0.2, send=0.08, frame=T.BONK))
    add(Cue(T.BONK_STARS, "bonk_stars", "...and the little wobbling 'bwoi-oi-oing' of seeing stars in the gap after 'too.' (23.46-23.86)",
            lambda: (C.bonk_stars(rng(686)), 0.0), -14, p=-0.2, send=0.2, frame=f30(T.BONK_STARS)))

    # ------------------------------------------------ shot 7-8: the hotel, the office
    add(Cue(fr(T.HOTEL[0]) + 0.1, "doorman", "@715 a carriage pulls up at the hotel: a leather-and-brass jingle of harness (dark, quiet)",
            lambda: (lp(G.rattle(0.8, rng(716), 20, np.exp(-tt(0.8) / 0.3), True), 2200, 1), 0.0), -26, p=-0.4, send=0.1, frame=T.HOTEL[0]))
    add(Cue(26.80, "blueprint_unroll", "@823 Pullman unrolls the blueprint on the table: a crackly paper curl, its end flopping flat on the frame (starts in the gap 26.77-27.17)",
            lambda: (C.paper_unroll(rng(823), 0.62), 0.0), -14, p=0.25, send=0.1, frame=T.BLUEPRINT))
    for k, (tm, a) in enumerate(((29.70, 0.8), (29.91, 0.9), (30.12, 1.0), (30.32, 0.9))):
        add(Cue(tm, "handshake", f"@890-912 the partners shake hands in a chain ({k + 1}/4): a firm 'pap' of palms + cloth",
                (lambda r=rr(), a=a: (C.hand_pat(r) * a, 0.0)), -16, p=-0.5 + 0.35 * k, send=0.08, frame=f30(tm)))

    # ------------------------------------------------ shot 9: the jackscrews
    add(Cue(fr(T.CLUNK), "jackscrew_clunk", "@974 the worker sets the big iron jackscrew under the beam: a heavy low 'CLUNK' (dark; on 'jackscrews')",
            lambda: (C.iron_clunk(rng(974)), 0.0), -10, p=0.0, send=0.08, frame=T.CLUNK))
    add(Cue(T.RING_T, "iron_ring", "...and the iron ringing on a moment, bright, in the gap after 'building,' (33.65-34.00)",
            lambda: (C.iron_ring(rng(975)), 0.0), -18, p=0.15, send=0.2, frame=f30(T.RING_T)))

    # ------------------------------------------------ shot 10: the signal
    add(Cue(T.WHISTLE_T, "whistle", "@1079 the foreman blows his pea whistle: a short 'tweeet' (in the narrow gap after 'signal,' 36.29-36.52; the frame is 35.97)",
            lambda: (C.pea_whistle(rng(1079), 2900.0, 0.23), 0.0), -9, p=-0.3, send=0.15, frame=T.WHISTLE))
    ripples = [(fr(T.CLICKS[0]), 12, 0.40, "@1130-1142"), (fr(T.CLICK2), 11, 0.36, "@1168"), (fr(T.CLICK3), 11, 0.36, "@1194")]
    for k, (tm, kk, sp, lab) in enumerate(ripples):
        add(Cue(tm, "ratchet_ripple", f"{lab} the ripple of ratchet 'clicks' running down the line ({k + 1}/3: tiny dry transients)",
                (lambda r=rr(), kk=kk, sp=sp: (C.ratchet(r, kk, sp, 2200), 0.0)), [-12, -11, -10][k], send=0.1, frame=f30(tm)))
        add(Cue(tm + 0.05, "timber_creak", f"...each with a small timber creak as the beam takes the turn ({k + 1}/3, dark)",
                (lambda r=rr(): (C.timber_creak(r, 0.55), 0.0)), [-17, -16, -15][k], p=0.0, send=0.08, frame=f30(tm + 0.05)))

    # ------------------------------------------------ shot 11: the rising board
    for k, f in enumerate(T.TICKS):
        add(Cue(fr(f), "board_tick", f"@{f} the board flag clicks up one mark (a dry wooden 'tok', tiny)",
                (lambda r=rr(): (C.board_tick(r), 0.0)), [-13, -12, -11][k], p=0.4, send=0.1, frame=f))
    add(Cue(T.CHIME_T, "fanfare_chime", "@1276 the flag tops six marks: a little three-note fanfare chime (G C E + sparkle) in the gap after 'six feet,' (42.88-43.46)",
            lambda: (C.chime_fanfare(rng(1276)), 0.0), -9, p=0.2, send=0.25, frame=f30(T.CHIME_T)))

    # ------------------------------------------------ shot 12: the hotel keeps open
    add(Cue(fr(T.SIGN), "sign_flip", "@1309 the bellhop flips the little key sign: a wooden 'clack-clack' + a settling jingle",
            lambda: (C.sign_flip(rng(1309)), 0.0), -13, lpf=3200, p=-0.3, send=0.1, frame=T.SIGN))
    add(Cue(fr(T.SOUP), "soup_slurp", "@1360 the diner slurps his soup (a soft 'shlrp', dark; under 'Guests kept')",
            lambda: (C.soup_slurp(rng(1360)), 0.0), -16, p=0.3, send=0.08, frame=T.SOUP))
    add(Cue(fr(T.SNORE), "snore", "@1385 the sleeper snores in his nightcap: a fluttering dark inhale (under 'sleeping')",
            lambda: (M.snore(rng(1385), 0.55, 0.0, 480), 0.0), -15, p=-0.2, send=0.06, frame=T.SNORE))
    add(Cue(46.72, "snore_out", "...and the whistly exhale (dark, quiet, under 'checking in')",
            lambda: (M.snore(rng(1386), 0.01, 0.3, 700), 0.0), -19, p=-0.2, send=0.06, frame=f30(46.72)))
    add(Cue(T.DING_T, "desk_bell", "@1409 the clerk rings the desk bell: one bright 'ding' (in the gap after 'in,' 47.21-47.56; the frame is 46.97)",
            lambda: (C.desk_bell(rng(1409)), 0.0), -10, p=0.3, send=0.2, frame=T.BELL))

    # ------------------------------------------------ shot 13: the window
    add(Cue(fr(T.TAP), "glass_tap", "@1526 the inspector taps the glass with a knuckle: a small dry 'tok' + a glassy ring (tiny, on 'window')",
            lambda: (C.glass_tap(rng(1526)), 0.0), -14, p=0.1, send=0.1, frame=T.TAP))
    add(Cue(T.WINK_T, "wink_ting", "@1550 the inspector winks: a small bright 'ting' on A7 (gap after 'broke.' 51.59-52.18)",
            lambda: (M.wink_ting(rng(1550)), 0.0), -9, p=0.25, send=0.25, frame=T.WINK))

    # ------------------------------------------------ shot 14: the railway
    add(Cue(fr(T.STEAM), "steam_hiss", "@1588 the locomotive lets off steam beside rich Pullman: a soft dark 'pssshh' (below ~1.8 kHz, under 'rich')",
            lambda: (C.steam_hiss(1.7, rng(1588), 1.0, 1700), 0.0), -15, p=-0.2, send=0.1, frame=T.STEAM))
    add(Cue(fr(T.COIN), "coin_spin", "@1596 a gold coin spins on the platform: a bright quickening ring + a rattle as it settles (under 'building')",
            lambda: (C.coin_spin(rng(1596)), 0.0), -17, p=0.35, send=0.2, frame=T.COIN))
    add(Cue(fr(T.SNORE2), "snore2", "@1676 push in on a sleeper: a soft, slow snore (dark)",
            lambda: (M.snore(rng(1676), 0.6, 0.12, 450), 0.0), -17, p=0.3, send=0.06, frame=T.SNORE2))
    add(Cue(T.TWHISTLE_T, "train_whistle", "@1727 a soft far train whistle at the very end (after 'them.' 57.89; the frame is 57.57)",
            lambda: (C.train_whistle(rng(1727), 1.07), 0.0), -12, p=0.1, send=0.3, frame=T.TRAIN_WHISTLE))
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
