# Procedural sound effects for "Chicago Lifts a Hotel" (1861) (own numpy synthesis, no samples): a creaking timber-and-brick
# groan for the rising hook hotel, a swamp (frogs, plops, lapping), mud slurps + a boot 'schlorp', a burping puddle, a dog
# snort, coughs / sneezes / a doctor's tut, a gavel, a council gasp, shovels + a gravel dump, a head bonk, carriages and a
# flag, paper unrolling, handshakes, an iron jackscrew clunk + marching boots, a pea whistle, ratchet clicks + timber
# creaks, a board-flag tick + chime, a sign flip, a lift hum, soup slurp / snore / desk bell, a glass tap, a steam hiss,
# a spinning coin, rails clatter, a soft train whistle. Helpers from sfx_gen / sfx_emu / sfx_bat / sfx_marathon.
# Every generator returns mono (n,) or stereo (2, n) float arrays.
import numpy as np
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, reson, resbank, peq, colored, smooth_noise, fades, phase, modal, pan,
                 st, widen, place, shape)
import sfx_gen as G
import sfx_emu as E
import sfx_bat as Bt
import sfx_marathon as M


def _env(n, att, tau):
    t = np.arange(n) / SR
    return (1 - np.exp(-t / max(att, 1e-4))) * np.exp(-t / tau)


def _pm(buf, x, t):
    G._place_mono(buf, x, t)


# ================================================================ ambiences (stereo)
def murmur(dur, r, people=10, level=1.0, dark=1500):
    return M.stadium_crowd(dur, r, people, level, dark)


def hooves(dur, r, rate=2.2, level=1.0, width=0.8, p0=None):
    """a horse-drawn cart / carriage on cobbles: steady clip-clop (two beats, four hooves), wheels rumbling; dark"""
    n = ns(dur)
    out = np.zeros((2, n))
    tm = r.uniform(0, 0.3)
    k = 0
    p = r.uniform(-width, width) if p0 is None else p0
    while tm < dur - 0.2:
        for j, dt in enumerate((0.0, 0.11)):
            c = modal(0.14, [(r.uniform(380, 460), 0.8, 0.012), (r.uniform(900, 1100), 0.35, 0.008), (r.uniform(1800, 2300), 0.12, 0.004)], r)
            c += hp(r.standard_normal(ns(0.14)), 1500) * np.exp(-tt(0.14) / 0.0015) * 0.25
            c += np.sin(phase(r.uniform(95, 130) * (1 + 0.3 * np.exp(-tt(0.14) / 0.01)))) * _env(ns(0.14), 0.001, 0.03) * 0.6
            place(out, pan(lp(c, 2600, 1) * (0.85 if j else 1.0) * r.uniform(0.8, 1.0), p), tm + dt)
        tm += (1 / rate) * r.uniform(0.96, 1.04)
        p += r.normal(0, 0.03)
        k += 1
    rum = lp(colored(n, r, 1.8), 220, 2) * (0.55 + 0.45 * smooth_noise(n, r, 0.6)) * 0.6
    rat = G.rattle(dur, r, 16.0) * 0.035
    rat = np.pad(rat, (0, max(0, n - len(rat))))[:n]
    out += pan(rum + lp(rat, 2200, 1), p)
    return out * level


def street(dur, r, level=1.0, crowd=9, birds=0.5, wind=0.5):
    """a bright 1861 street: a far crowd murmur, a breeze, sparrows, a far cart"""
    out = G.breeze(dur, r, 0.5 * wind, 0.15, 650)
    out += murmur(dur, r, crowd, 0.6, 1300)
    out += widen(G.bird_chirps(dur, r, birds, "sparrow") * 0.04, r, 9, 1.0)
    out += hooves(dur, r, 1.9, 0.12, 0.8)
    return out * level


def frogs(dur, r, voices=3, level=1.0):
    """swamp frogs: slow pulsed croaks (a 'rr-rrup' of a 300-600 Hz buzz) at different pitches, spread across the field"""
    n = ns(dur)
    out = np.zeros((2, n))
    for v in range(voices):
        y = np.zeros(n)
        tm = r.uniform(0.2, 1.6)
        f0 = r.uniform(280, 520)
        while tm < dur - 0.5:
            L = r.uniform(0.18, 0.34)
            tl = tt(L)
            f = f0 * (1 + 0.25 * np.sin(np.pi * tl / L))
            pulse = 0.55 + 0.45 * np.sign(np.sin(TAU * r.uniform(48, 62) * tl)) * 0.5 + 0.0
            c = (np.sin(phase(f)) + 0.5 * np.sin(2 * phase(f)) + 0.2 * np.sin(3 * phase(f))) * np.sin(np.pi * tl / L) ** 1.5 * pulse
            _pm(y, lp(c, 1500, 1) * r.uniform(0.5, 1.0), tm)
            tm += L + r.exponential(1.7) + 0.5
        out += pan(y, r.uniform(-0.9, 0.9)) * 0.7
    return out * level / np.sqrt(voices)


def swamp(dur, r, level=1.0, frog=3):
    """swamp-edge streets under overcast: soft lake lapping, cattails hissing in a breeze, far frogs, flies"""
    out = G.water_bed(dur, r, 0.3, 0.5) * 0.35
    out += G.breeze(dur, r, 0.6, 0.2, 500)
    out += frogs(dur, r, frog, 0.5)
    out += E.flies(dur, r, 2, 0.05)
    return lp(out, 3500, 1) * level


def mud_street(dur, r, level=1.0):
    """the muddy street: soft squelchy drizzle-slop, flies, a faint far crowd"""
    out = G.water_bed(dur, r, 0.4, 0.7) * 0.3
    out += E.flies(dur, r, 3, 0.1)
    out += G.breeze(dur, r, 0.4, 0.2, 500)
    return lp(out, 2500, 1) * level


def sickroom(dur, r, level=1.0):
    """a gloomy sickroom: dark room tone, a slow wall clock, far street murmur, now and then a creaking chair"""
    out = Bt.room(dur, r, 450, 1.0) * 0.8
    out += Bt.wall_clock(dur, r, 0.9, 0.06, -0.4)
    out += murmur(dur, r, 6, 0.3, 1000)
    return out * level


def council_hall(dur, r, level=1.0):
    """the council hall: warm room tone with a lived-in murmur and the odd chair / floorboard creak"""
    n = ns(dur)
    out = Bt.room(dur, r, 600, 1.0) * 0.8
    out += murmur(dur, r, 8, 0.7, 1100)
    for tm in r.uniform(0.3, dur - 0.5, int(dur / 1.8)):
        _pm_st(out, pan(G.creak(0.3, r, 60, 95, G.WOOD, [(0, 0), (0.3, 1), (1, 0)], 0.2, 0.01, 0.9) * 0.06, r.uniform(-0.7, 0.7)), tm)
    return lp(out, 3500, 1) * level


def _pm_st(buf, x, t):
    place(buf, x, t)


def dig(dur, r, level=1.0):
    """the street raising: a breeze, sparrows, far wagon wheels + a far mallet, workers murmuring"""
    out = G.breeze(dur, r, 0.5, 0.15, 650)
    out += murmur(dur, r, 7, 0.5, 1200)
    out += widen(G.bird_chirps(dur, r, 0.4, "sparrow") * 0.03, r, 9, 1.0)
    out += hooves(dur, r, 1.6, 0.1, 0.7)
    return out * level


def office(dur, r, level=1.0):
    """the contractors' office: quiet room tone, a wall clock, a far street, a pen scratching a little"""
    out = Bt.room(dur, r, 700, 1.0) * 0.8
    out += Bt.wall_clock(dur, r, 1.0, 0.07, 0.5)
    out += pan(lp(E.pen_scratch(dur, r, 4.5), 4000, 1) * 0.03, -0.4)
    out += G.breeze(dur, r, 0.2, 0.15, 500)
    return out * level


def yard(dur, r, level=1.0):
    """under the hotel, daylight: a breeze, far street, a cart, flags, a far bird; dark and open"""
    out = G.breeze(dur, r, 0.6, 0.15, 700)
    out += murmur(dur, r, 8, 0.5, 1200)
    out += pan(G.flag_flutter(dur, r) * 0.04, 0.5)
    out += widen(G.bird_chirps(dur, r, 0.3, "sparrow") * 0.025, r, 9, 1.0)
    return out * level


def lobby(dur, r, level=1.0):
    """the hotel cutaway: a warm lobby / dining room murmur, a clock ticking, cutlery tinks, faint lift hum is a separate bed"""
    n = ns(dur)
    out = Bt.room(dur, r, 700, 1.0) * 0.7
    out += murmur(dur, r, 12, 0.7, 1200)
    out += Bt.wall_clock(dur, r, 1.0, 0.05, -0.5)
    cl = np.zeros(n)
    for tm in r.uniform(0.3, dur - 0.3, int(dur / 1.3)):
        _pm(cl, lp(G.clink(r, r.uniform(2200, 3800), 0.1), 4500, 1) * r.uniform(0.2, 0.5), tm)
    out += pan(cl * 0.15, 0.3)
    return out * level


def platform(dur, r, level=1.0):
    """a steam-train platform at golden dusk: an idling locomotive (soft chuffs, steam), a far station crowd, a breeze, a bell"""
    n = ns(dur)
    t = np.arange(n) / SR
    out = murmur(dur, r, 9, 0.5, 1300)
    out += G.breeze(dur, r, 0.3, 0.2, 600)
    chuff = (0.5 + 0.5 * np.sin(TAU * 1.5 * t)) ** 6
    out += pan(lp(colored(n, r, 1.0), 700, 2) * (0.25 + 0.75 * chuff) * 0.35, -0.3)
    out += pan(lp(colored(n, r, 0.2), 2500, 1) * 0.04, 0.0)
    return out * level


def sleeper_bed(dur, r, level=1.0, cycle=0.75):
    """inside the sleeping car: rails clatter 'ta-dak ta-dak' soft and lulling, a low carriage rumble, wood panels creaking, a sway"""
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    tm = r.uniform(0, 0.05)
    while tm < dur - 0.3:
        for j, dt in enumerate((0.0, 0.17)):
            L = 0.22
            tl = tt(L)
            c = np.sin(phase(r.uniform(70, 85) * (1 + 0.4 * np.exp(-tl / 0.01)))) * _env(ns(L), 0.001, 0.045) * (1.0 if j == 0 else 0.7)
            c += modal(L, [(r.uniform(300, 380), 0.45, 0.03), (r.uniform(780, 900), 0.2, 0.015)], r) * 0.5
            c += bp(r.standard_normal(ns(L)), 700, 3000, 1) * np.exp(-tl / 0.012) * 0.25
            place(out, pan(lp(c, 1800, 1), 0.0 + (0.15 if j else -0.15)), tm + dt)
        tm += cycle * r.uniform(0.995, 1.005)
    rum = lp(colored(n, r, 1.6), 160, 2) * (0.6 + 0.4 * np.sin(TAU * t / (2 * cycle))) * 0.8
    out += pan(rum, 0.0)
    sw = G.creak(dur, r, 14, 22, G.WOOD, [(0, 0), (0.1, 0.6), (0.5, 1), (0.9, 0.6), (1, 0)], 0.3, 0.005, 0.8)
    out += pan(lp(sw, 900, 2) * 0.12, -0.3)
    out += pan(lp(colored(n, r, 0.3), 3000, 1) * 0.02, 0.0)
    return out * level


# ================================================================ the hook: a hotel rising
def timber_groan(dur, r, level=1.0):
    """a whole hotel creaking up on its jackscrews: a deep slow timber groan rising in rate, brick / mortar grit, a few
    beam cracks; dark (everything below ~1.1 kHz). Stereo."""
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for ch, (a, b) in enumerate(((16, 46), (19, 52))):
        c = G.creak(dur, r, a, b, G.TIMBER, [(0, 0), (0.25, 0.7), (0.7, 1.0), (1, 0.9)], 0.3, 0.02, 0.8)
        out[ch] += lp(c, 1100, 2)
    grit = lp(colored(n, r, 0.8), 1400, 2) * (t / dur) ** 1.5 * (0.5 + 0.5 * smooth_noise(n, r, 0.8)) * 0.25
    out += widen(grit, r, 9, 1.0)
    out += pan(lp(colored(n, r, 2.0), 120, 2) * (0.3 + 0.7 * (t / dur)) * 1.2, 0.0)
    tm = 0.4
    while tm < dur - 0.3:                                      # beams taking up the load: soft cracks
        k = G.wood_crack(r)[: ns(0.35)] * r.uniform(0.15, 0.35)
        place(out, pan(lp(k, 900, 2), r.uniform(-0.6, 0.6)), tm)
        tm += r.uniform(0.7, 1.5)
    return out * level


# ================================================================ swamp + mud
def frog_plop(r):
    """a frog dropping from a puddle: a soft dark 'bloop' (falling blob) + a tiny water slap, no bright part"""
    d = 0.35
    t = tt(d)
    y = np.sin(phase(380 * np.exp(-t / 0.05) + 140)) * _env(len(t), 0.002, 0.07) * 0.9
    y += bp(colored(len(t), r, 0.5), 300, 1200, 1) * _env(len(t), 0.003, 0.03) * 0.3
    return fades(lp(y, 900, 2), 0.0, 0.05)


def droplet_ring(r):
    """the ripple droplets after the plop: three tiny rising 'plip's, bright but small (placed in the gap)"""
    d = 0.7
    y = np.zeros(ns(d))
    for k, (tm, f) in enumerate(((0.0, 1500.0), (0.13, 1900.0), (0.27, 1250.0))):
        tl = tt(0.18)
        _pm(y, np.exp(-tl / 0.025) * np.sin(phase(f * (1 + 6 * tl))) * (1 - np.exp(-tl / 0.0008)) * [1.0, 0.6, 0.35][k], tm)
    return fades(y, 0.0, 0.1)


def mud_slurp(r, size=1.0, dark=900):
    """boots / hooves pulling free of thick mud: a wet suction 'shlupp' (a band of noise sweeping up) + sticky bubbles"""
    d = 0.4 * size + 0.1
    n = ns(d)
    t = np.arange(n) / SR
    nz = colored(n, r, 0.7)
    fc = 250 + 1100 * (t / d) ** 1.5
    y = shape(nz, lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / np.interp(T, t, fc)[None, :]) / 0.6) ** 2), 1024, 256)
    y *= np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.2
    y += G.bubbles(d, r, 40, 200, 900, (0.01, 0.04), np.sin(np.pi * np.clip(t / d, 0, 1))) * 0.5
    return fades(lp(y, dark, 2), 0.01, 0.06)


def schlorp(r):
    """a big cartoon boot-pull: a long wet suction slide up, then a bright 'pop' as the boot (not the man) comes out"""
    d = 0.7
    n = ns(d)
    t = np.arange(n) / SR
    y = mud_slurp(r, 1.3, 900)[:n]
    y = np.pad(y, (0, n - len(y)))
    pop = np.sin(phase(450 + 900 * (t - 0.42).clip(0) * 1.5 * (t > 0.42))) * np.exp(-np.clip(t - 0.42, 0, None) / 0.03) * (t > 0.42) * 1.1
    pop += bp(r.standard_normal(n), 500, 2500, 1) * np.exp(-np.clip(t - 0.42, 0, None) / 0.015) * (t > 0.42) * 0.4
    y += pop
    return fades(y, 0.005, 0.08)


def puddle_bubbling(dur, r, level=1.0):
    """a puddle bubbling and burping: big slow low bubbles ('bloop') with a few small ones; dark"""
    n = ns(dur)
    y = G.bubbles(dur, r, 3.2, 90, 360, (0.03, 0.09), None, (2, 5)) * 1.2
    y += G.bubbles(dur, r, 9, 300, 900, (0.012, 0.03), None, (4, 9)) * 0.5
    return fades(lp(y, 900, 2), 0.1, 0.1) * level


def burp(r):
    """one big green burp bubble popping: a low wobbling 'bloorp'"""
    d = 0.4
    t = tt(d)
    f = 110 * (1 + 1.4 * (t / d)) * (1 + 0.15 * np.sin(TAU * 22 * t))
    y = np.sin(phase(f)) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.8
    y += 0.4 * np.sin(2 * phase(f)) * np.sin(np.pi * np.clip(t / d, 0, 1))
    y += bp(r.standard_normal(len(t)), 150, 800, 1) * np.exp(-np.clip(t - 0.3, 0, None) / 0.02) * (t > 0.3) * 0.2
    return fades(lp(y, 700, 2), 0.01, 0.06)


def dog_snort(r):
    """a dog snorting at the stink: two short wet nose blasts, 'pfft-pfft'"""
    d = 0.6
    y = np.zeros(ns(d))
    for k, tm in enumerate((0.0, 0.2)):
        L = ns(0.11)
        tl = np.arange(L) / SR
        e = np.clip(tl / 0.008, 0, 1) * np.exp(-tl / 0.04)
        x = bp(colored(L, r, 0.2), 700, 4500, 1) * e + bp(colored(L, r, 0.8), 250, 700, 1) * e * 0.6
        _pm(y, x * (1.0 if k == 0 else 0.7), tm)
    return fades(y, 0.002, 0.05)


# ================================================================ the sick
def sneeze(r, base=None):
    """a comic 'ah-ah-CHOO': a quick breathy inhale, then a burst of noise + a falling vowel"""
    base = base or r.uniform(110, 150)
    d = 0.75
    y = np.zeros(ns(d))
    n1 = ns(0.3)
    t1 = np.arange(n1) / SR
    f0 = base * (1.0 + 0.55 * (t1 / 0.3))
    forms = G.vowel_track(n1, [(0, "a"), (0.3, "e")])
    y1 = G.vox(f0, forms, np.sin(np.pi * np.clip(t1 / 0.3, 0, 1)) ** 0.8, r, 1.0, tilt=1.2, breath=1.0, fmax=3500)
    _pm(y, y1 * 0.5, 0.0)
    n2 = ns(0.3)
    t2 = np.arange(n2) / SR
    burst = bp(colored(n2, r, 0.3), 600, 4500, 1) * np.exp(-t2 / 0.05) * np.clip(t2 / 0.004, 0, 1) * 1.4
    forms2 = G.vowel_track(n2, [(0, "u"), (0.3, "o")])
    vv = G.vox(base * (1.2 - 0.35 * t2 / 0.3), forms2, np.exp(-t2 / 0.12) * np.clip(t2 / 0.01, 0, 1), r, 1.0, tilt=1.1, breath=0.4, fmax=3500)
    _pm(y, burst + 0.5 * vv, 0.32)
    return fades(y, 0.003, 0.05)


def tut(r):
    """the doctor's disapproving 'tsk, tsk': two dry tongue clicks"""
    y = np.zeros(ns(0.4))
    for k, tm in enumerate((0.0, 0.17)):
        L = ns(0.08)
        tl = np.arange(L) / SR
        c = modal(0.08, [(r.uniform(1100, 1300), 1.0, 0.007), (r.uniform(2300, 2700), 0.5, 0.004)], r)
        c += bp(r.standard_normal(L), 900, 4500, 1) * np.exp(-tl / 0.004) * 0.8
        _pm(y, c * (1.0 if k == 0 else 0.8), tm)
    return fades(y, 0.0, 0.04)


def thermo_tink(r):
    """a thermometer tinking on a teacup / the sick folks' glass: one tiny glass tink, 4 kHz"""
    return M.glass_tink(r, 4200.0, 0.3) * 0.7


# ================================================================ the council + the street dig
def gavel(r):
    """a wooden gavel on the council table: a crisp dry 'tok' (block modes 700 / 1600 / 3100 Hz) + a table thump"""
    d = 0.7
    t = tt(d)
    y = modal(d, [(r.uniform(680, 740), 0.9, 0.04), (r.uniform(1550, 1700), 0.6, 0.025), (r.uniform(3000, 3300), 0.35, 0.012),
                  (r.uniform(5200, 5600), 0.12, 0.006)], r)
    y += bp(r.standard_normal(len(t)), 800, 5000, 1) * np.exp(-t / 0.003) * 1.0
    y += np.sin(phase(105 * (1 + 0.3 * np.exp(-t / 0.01)))) * _env(len(t), 0.0008, 0.09) * 1.1        # the oak table
    y += modal(d, [(r.uniform(240, 280), 0.5, 0.15)], r) * 0.3
    return fades(y, 0.0, 0.1)


def gasp(r, people=5, base=None):
    """a roomful of gentlemen gasping 'ooooh!': breathy sharp inhales through an 'o' vowel, a little spread"""
    d = 0.55
    n = ns(d)
    y = np.zeros(n)
    t = np.arange(n) / SR
    for p in range(people):
        b = r.uniform(95, 140) if p % 3 else r.uniform(170, 215)
        f0 = b * (0.9 + 0.3 * np.clip(t / 0.35, 0, 1))
        forms = G.vowel_track(n, [(0, "o"), (d, "u")])
        env = np.clip(t / (0.1 + 0.02 * p), 0, 1) ** 1.5 * np.exp(-np.clip(t - 0.28, 0, None) / 0.16)
        v = G.vox(f0, forms, env, r, 1.0, tilt=1.3, breath=1.4, fmax=3500)
        _pm(y, v * r.uniform(0.5, 1.0), r.uniform(0, 0.07))
    return fades(lp(y, 3000, 2), 0.01, 0.1)


def shovel(r, dur=0.5):
    """a spade biting into earth and scraping: a gritty scrape (band noise, pitch rising) + a dull thud; dark"""
    n = ns(dur)
    t = np.arange(n) / SR
    e = np.clip(t / 0.05, 0, 1) * np.exp(-t / (dur * 0.45))
    fc = 500 + 1200 * (t / dur)
    y = shape(colored(n, r, 0.3), lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / np.interp(T, t, fc)[None, :]) / 0.9) ** 2), 1024, 256) * e
    gr = lp(np.abs(r.standard_normal(n)) ** 5, 700, 1)
    y += bp(r.standard_normal(n), 800, 3500, 1) * gr / (np.std(gr) + 1e-9) * e * 0.3
    y += np.sin(phase(r.uniform(85, 110) * (1 + 0.3 * np.exp(-t / 0.01)))) * _env(n, 0.002, 0.05) * 0.8
    y += modal(dur, [(r.uniform(320, 380), 0.3, 0.05)], r) * 0.3
    return fades(lp(y, 1500, 2), 0.004, 0.05)


def gravel_dump(r, dur=1.1):
    """a wagon tipping a load of gravel / soil: a big pouring rush, stones tumbling and clattering, a deep thump; dark"""
    n = ns(dur)
    t = np.arange(n) / SR
    e = np.clip(t / 0.08, 0, 1) * np.exp(-t / 0.5)
    y = lp(colored(n, r, 0.6), 2500, 2) * e * 0.8
    st_ = np.zeros(n)
    for tm in np.sort(r.exponential(0.3, int(90 * dur))):
        if tm < dur - 0.1:
            c = modal(0.06, [(r.uniform(400, 1600), 1.0, 0.006), (r.uniform(1800, 3500), 0.4, 0.003)], r)
            _pm(st_, c * r.uniform(0.2, 1.0) * np.exp(-tm / 0.5), tm)
    y += lp(st_, 3000, 1) * 0.5
    y += np.sin(phase(70 * (1 + 0.4 * np.exp(-t / 0.03)))) * _env(n, 0.004, 0.18) * 1.2
    return fades(y, 0.005, 0.2)


def bonk(r):
    """a man bonking his head on a low window frame: a hollow wooden 'bonk' (dark knock), and a thunk of the lintel"""
    d = 0.5
    t = tt(d)
    y = modal(d, [(r.uniform(260, 300), 1.0, 0.05), (r.uniform(560, 640), 0.5, 0.03), (r.uniform(1000, 1200), 0.25, 0.015)], r)
    y += np.sin(phase(95 * (1 + 0.5 * np.exp(-t / 0.015)))) * _env(len(t), 0.001, 0.07) * 1.1
    y += bp(r.standard_normal(len(t)), 300, 1500, 1) * np.exp(-t / 0.005) * 0.6
    return fades(lp(y, 900, 2), 0.0, 0.08)


def bonk_stars(r):
    """the little wobbling 'bwoi-oi-oing' of seeing stars after the bonk (a soft spring-ish wobble) + two high twinkles"""
    d = 0.9
    t = tt(d)
    f = 520 * (1 + 0.28 * np.sin(TAU * 7.0 * t) * np.exp(-t / 0.4)) * (1 - 0.15 * t / d)
    y = (np.sin(phase(f)) + 0.3 * np.sin(2.76 * phase(f))) * _env(len(t), 0.004, 0.22)
    for k, (tm, fq) in enumerate(((0.2, 2600.0), (0.36, 3300.0))):
        tl = tt(0.4)
        _pm(y, np.sin(TAU * fq * tl) * np.exp(-tl / 0.1) * 0.25, tm)
    return fades(lp(y, 4000, 1) * 0.6, 0.002, 0.15)


# ================================================================ the hotel front, the office
def flag(dur, r):
    """a flag flapping in the breeze over the hotel, dark and quiet"""
    return fades(lp(G.flag_flutter(dur, r), 1600, 1), 0.05, 0.15)


def paper_unroll(r, dur=0.62):
    """a big blueprint paper unrolling across a table: crackly curl noise bursts, the end flopping flat"""
    n = ns(dur)
    t = np.arange(n) / SR
    e = np.clip(t / 0.03, 0, 1) * np.exp(-(t / dur) ** 2 * 1.5)
    crk = np.abs(r.standard_normal(n)) ** 3
    crk = lp(crk, 800, 1) / (np.std(lp(crk, 800, 1)) + 1e-9)
    y = bp(r.standard_normal(n), 1500, 7000, 1) * (0.2 + 0.4 * np.clip(crk, 0, 3)) * e
    y += bp(colored(n, r, 0.5), 300, 1500, 1) * e * 0.3 * (0.5 + 0.5 * smooth_noise(n, r, 6))
    fl = ns(0.1)
    _pm(y, bp(r.standard_normal(fl), 300, 2000, 1) * np.exp(-tt(0.1) / 0.03) * 0.6, dur - 0.18)
    return fades(y, 0.005, 0.06)


def hand_pat(r):
    """a firm, friendly handshake: two palms meeting (a soft 'pap') + a cloth rustle"""
    d = 0.3
    t = tt(d)
    y = modal(d, [(r.uniform(170, 210), 1.0, 0.035), (r.uniform(480, 560), 0.5, 0.02), (r.uniform(950, 1100), 0.2, 0.01)], r)
    y += bp(r.standard_normal(len(t)), 600, 3000, 1) * np.exp(-t / 0.007) * 0.7
    y += bp(r.standard_normal(len(t)), 800, 3500, 1) * np.clip(t / 0.05, 0, 1) * np.exp(-t / 0.08) * 0.12
    return fades(lp(y, 2500, 1), 0.0, 0.05)


def iron_clunk(r):
    """a heavy iron jackscrew set down on a timber sill: a low 'CLUNK' (iron thud + wood + short dull ring), dark"""
    d = 0.8
    t = tt(d)
    y = np.sin(phase(78 * (1 + 0.5 * np.exp(-t / 0.012)))) * _env(len(t), 0.001, 0.12) * 1.4
    y += modal(d, [(r.uniform(185, 205), 0.9, 0.09), (r.uniform(405, 440), 0.7, 0.07), (r.uniform(760, 820), 0.4, 0.04)], r)
    y += bp(r.standard_normal(len(t)), 300, 2500, 1) * np.exp(-t / 0.006) * 0.8
    return fades(lp(y, 1000, 2), 0.0, 0.1)


def iron_ring(r):
    """the jackscrew's iron ringing on after the clunk: bright inharmonic bar modes, ~0.7 s (placed in the gap)"""
    d = 0.9
    y = modal(d, [(r.uniform(1650, 1750), 0.6, 0.25), (r.uniform(2850, 3050), 0.45, 0.16), (r.uniform(4300, 4600), 0.3, 0.09), (r.uniform(6100, 6500), 0.15, 0.05)], r)
    return fades(y, 0.001, 0.2)


def marching(dur, r, rate=1.9, men=26, level=1.0, build=(0.0, 1.0)):
    """hundreds of workers' boots marching in step on packed earth, soft and dark; the step count builds from build[0] to build[1]"""
    out = np.zeros((2, ns(dur)))
    k = 0
    tm = 0.0
    while tm < dur - 0.3:
        a = build[0] + (build[1] - build[0]) * min(1.0, tm / dur)
        x, pre = E.parade_step(r, max(4, int(men * (0.3 + 0.7 * a))), 0.014, 0.8)
        place(out, lp(x, 1000, 2) * (0.4 + 0.6 * a) * (1.0 if k % 2 == 0 else 0.85), tm - pre)
        tm += (1 / rate) * (1 + r.normal(0, 0.008))
        k += 1
    out += pan(lp(colored(ns(dur), r, 1.6), 220, 2) * 0.1 * np.linspace(0.2, 1.0, ns(dur)), 0.0)
    return out * level


# ================================================================ the signal
def pea_whistle(r, f0=2900.0, dur=0.32, soft=1.0):
    """the foreman's pea whistle: a pure tone with the rolling-pea warble (~35 Hz) and breath; a short 'tweeet'"""
    n = ns(dur)
    t = np.arange(n) / SR
    f = f0 * (1 + 0.012 * np.sin(TAU * 5 * t)) * (1 + 0.03 * np.exp(-t / 0.02))
    ph = phase(f)
    pea = 0.65 + 0.35 * np.sin(TAU * 36 * t)
    y = (np.sin(ph) + 0.18 * np.sin(2 * ph)) * pea
    y += bp(r.standard_normal(n), 2500, 5500, 1) * 0.2
    e = np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.06, 0, 1)
    return fades(y * e * soft, 0.002, 0.04)


def ratchet(r, k=12, span=0.42, dark=2200, level=1.0):
    """a ripple of ratchet clicks: k small wooden / iron 'tk's as each man's jackscrew pawl drops, running across the line left to right"""
    L = ns(span + 0.15)
    out = np.zeros((2, L))
    for i in range(k):
        tm = span * (i / max(1, k - 1)) ** 0.9 + r.normal(0, 0.004)
        tm = max(0.0, tm)
        tl = tt(0.05)
        f = r.uniform(1500, 2400)
        c = modal(0.05, [(f, 1.0, 0.004), (f * 2.3, 0.4, 0.002), (r.uniform(600, 800), 0.5, 0.008)], r)
        c += bp(r.standard_normal(ns(0.05)), 1500, 6000, 1) * np.exp(-tl / 0.0012) * 0.8
        place(out, pan(lp(c, dark, 1), -0.8 + 1.6 * i / max(1, k - 1)) * r.uniform(0.6, 1.0) * (0.7 + 0.3 * np.sin(np.pi * i / k)), tm)
    return fades(out * level, 0.0, 0.05)


def timber_creak(r, dur=0.5, low=True):
    """a small timber creak as the beam takes the load: a short dark stick-slip groan"""
    c = G.creak(dur, r, 55, 90, G.TIMBER if low else G.WOOD, [(0, 0), (0.25, 1), (0.6, 0.8), (1, 0)], 0.2, 0.01, 1.0)
    return fades(lp(c, 800, 2), 0.02, 0.1)


def board_tick(r):
    """the climbing flag's cleat clicking up one mark on the measuring board: a dry wooden 'tok' + a tiny pole ring"""
    d = 0.2
    t = tt(d)
    y = modal(d, [(r.uniform(1100, 1250), 1.0, 0.012), (r.uniform(2500, 2800), 0.4, 0.006), (r.uniform(380, 440), 0.5, 0.02)], r)
    y += bp(r.standard_normal(len(t)), 1000, 5000, 1) * np.exp(-t / 0.002) * 0.6
    return fades(lp(y, 3500, 1), 0.0, 0.05)


def chime_fanfare(r):
    """a small three-note bell fanfare (G5 C6 E6 + a high B6 sparkle), warm, short"""
    d = 1.5
    y = np.zeros(ns(d))
    for k, (tm, f, a) in enumerate(((0.0, 784.0, 1.0), (0.12, 1047.0, 0.9), (0.26, 1319.0, 0.9), (0.42, 1976.0, 0.6))):
        _pm(y, modal(d - tm, [(f, a, 0.55), (f * 2.76, 0.18 * a, 0.2), (f * 5.4, 0.05 * a, 0.08), (f * 2.0, 0.2 * a, 0.3)], r), tm)
    return fades(y * 0.6, 0.0005, 0.25)


# ================================================================ the hotel interior
def sign_flip(r):
    """the bellhop flipping the little door-key sign: a wooden 'clack-clack' + a chain jingle settling"""
    d = 0.7
    y = np.zeros(ns(d))
    for k, (tm, a) in enumerate(((0.0, 1.0), (0.09, 0.7))):
        L = 0.12
        tl = tt(L)
        c = modal(L, [(r.uniform(900, 1000), 1.0, 0.012), (r.uniform(2200, 2500), 0.5, 0.006)], r)
        c += bp(r.standard_normal(ns(L)), 700, 4500, 1) * np.exp(-tl / 0.003) * 0.7
        _pm(y, c * a, tm)
    _pm(y, G.rattle(0.35, r, 18, np.exp(-tt(0.35) / 0.1), True) * 0.25, 0.12)
    return fades(lp(y, 3800, 1), 0.0, 0.1)


def lift_hum(dur, r, level=1.0):
    """the gentle hum of the whole building rising: low drones (55 / 82 / 110 Hz) that beat softly, a faint gear tick; dark"""
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    sl = 1 + 0.05 * t / dur
    for ch in range(2):
        y = np.zeros(n)
        for f, a in ((54.0, 1.0), (81.5, 0.6), (108.5, 0.35), (163.0, 0.15)):
            y += a * np.sin(phase(f * sl * (1 + 0.003 * (ch * 2 - 1)))) * (0.8 + 0.2 * np.sin(TAU * (0.21 + 0.07 * ch) * t + ch))
        out[ch] = lp(y, 300, 2)
    out += pan(lp(G.creak(dur, r, 8, 12, G.TIMBER, [(0, 0), (0.1, 0.7), (0.6, 1), (1, 0.7)], 0.3, 0.0, 1.0), 600, 2) * 0.06, 0.0)
    return out * level


def soup_slurp(r):
    """a diner's gentle spoon slurp: a soft rising 'shhlrp' of wet air + a little bubble; dark"""
    d = 0.55
    n = ns(d)
    t = np.arange(n) / SR
    fc = 350 + 900 * (t / d) ** 1.2
    y = shape(colored(n, r, 0.5), lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / np.interp(T, t, fc)[None, :]) / 0.7) ** 2), 1024, 256)
    y *= np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.0
    y += G.bubbles(d, r, 25, 250, 700, (0.01, 0.025), np.sin(np.pi * np.clip(t / d, 0, 1))) * 0.4
    return fades(lp(y, 800, 2), 0.02, 0.08)


def desk_bell(r):
    """a brass desk bell: one bright 'ding' (partials 1 : 2.4 : 4.2), a short ring"""
    d = 1.2
    t = tt(d)
    f = 2850.0
    y = modal(d, [(f, 1.0, 0.28), (f * 2.4, 0.45, 0.14), (f * 4.2, 0.2, 0.07), (f * 0.5, 0.3, 0.35)], r)
    y += hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.002) * 0.3
    return fades(y * 0.6, 0.0004, 0.2)


def glass_tap(r):
    """a knuckle tapping a pane: a small dry 'tok' with a high glassy ring (2.9 / 5 kHz), short, no body"""
    d = 0.3
    t = tt(d)
    y = modal(d, [(r.uniform(2800, 3000), 0.7, 0.03), (r.uniform(4900, 5300), 0.4, 0.015), (r.uniform(1200, 1400), 0.5, 0.01)], r)
    y += bp(r.standard_normal(len(t)), 1200, 6000, 1) * np.exp(-t / 0.002) * 0.7
    return fades(y, 0.0, 0.06)


# ================================================================ the railway
def steam_hiss(dur, r, level=1.0, dark=1800):
    """a locomotive letting off steam: a soft 'pssshh' swelling and fading, dark (hiss band pulled below ~2 kHz) + a soft pipe thump"""
    n = ns(dur)
    t = np.arange(n) / SR
    e = np.clip(t / (dur * 0.12), 0, 1) ** 0.8 * np.exp(-np.clip(t - dur * 0.12, 0, None) / (dur * 0.38))
    y = lp(colored(n, r, 0.2), dark, 2) * e
    y += np.sin(phase(np.full(n, 55.0))) * e * 0.3
    return fades(pan(y, 0.0), 0.01, 0.15)


def coin_spin(r, dur=1.1):
    """a gold coin spinning on a platform: a bright ring with a quickening wobble (8 -> 70 Hz) settling with a rattle"""
    n = ns(dur)
    t = np.arange(n) / SR
    rate = 7 + 70 * (t / dur) ** 3
    f = 3900.0
    wob = 0.55 + 0.45 * np.sin(phase(rate))
    y = (np.sin(TAU * f * t) + 0.35 * np.sin(TAU * f * 2.7 * t) + 0.12 * np.sin(TAU * f * 4.9 * t)) * wob * np.exp(-t / 0.7) * np.clip(t / 0.005, 0, 1)
    tail = np.clip((t - dur * 0.82) / 0.1, 0, 1)
    y += bp(r.standard_normal(n), 1500, 5000, 1) * tail * np.exp(-(t - dur * 0.82).clip(0) / 0.05) * 0.2
    return fades(y * 0.6, 0.002, 0.15)


def train_whistle(r, dur=1.5, soft=1.0):
    """a distant steam-train whistle: a three-note chord (G4 B-flat4 D5-ish) with breath, a slow swell, a slow fall in pitch, far and soft"""
    n = ns(dur)
    t = np.arange(n) / SR
    e = np.clip(t / 0.25, 0, 1) ** 1.5 * np.exp(-np.clip(t - 0.35, 0, None) / 0.45)
    y = np.zeros(n)
    for f, a in ((392.0, 1.0), (494.0, 0.8), (587.0, 0.7)):
        fm = f * (1 + 0.004 * np.sin(TAU * 5.2 * t)) * (1 - 0.012 * np.clip((t - 0.4) / dur, 0, 1))
        ph = phase(fm)
        y += a * (np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph))
    y = y / 3 + bp(r.standard_normal(n), 400, 2500, 1) * 0.06
    y = lp(y * e, 2200, 2)
    return fades(widen(y, r, 13, 0.7) * soft, 0.01, 0.3)
