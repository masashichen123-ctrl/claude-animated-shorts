# Procedural sound effects for "The 1904 Olympic Marathon" (own numpy synthesis, no samples): a hot dusty country
# road (heat buzz / cicadas, dry breeze, shuffling feet), the skull bottle and the gulp, a swirly cartoon 'boing', a
# 1904 one-cylinder car puttering (and a rubber bulb horn), the starter's pistol (a soft pop), a 1904 stadium crowd
# (murmur, cheers, applause, a collective held breath), dust clouds and coughs, a well winch + a single drip into a
# tin bucket, finish-tape snaps, boaters flying, a soft record-scratch, an apple picked and crunched, a sour
# 'blergh', snores, scrappy farm dogs + frantic feet, an egg crack, a flask glug and a bottle clink, a cloth lift,
# a medal 'plonk', comic drop-out thuds, sighs, a hay-wagon creak and a creek splash, Boston spring birds and the wink
# 'ting'. Every generator returns mono (n,) or stereo (2, n) float arrays.
import numpy as np
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, reson, resbank, peq, colored, smooth_noise, fades, phase, modal, pan,
                 st, widen, place, shape)
import sfx_gen as G
import sfx_emu as E
import sfx_bat as Bt


def _env(n, att, tau):
    t = np.arange(n) / SR
    return (1 - np.exp(-t / max(att, 1e-4))) * np.exp(-t / tau)


def _pm(buf, x, t):
    G._place_mono(buf, x, t)


# ================================================================ ambience (stereo)
def cicadas(dur, r, level=1.0, voices=4):
    """heat buzz: cicada choruses (a ~6 kHz carrier ratcheted at ~110-160 Hz, slow swelling bursts); kept above the
    speech band (high-passed at 4.8 kHz)"""
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for v in range(voices):
        fc = r.uniform(5600, 7200)
        rat = r.uniform(110, 165)
        tick = (0.5 + 0.5 * np.sin(TAU * rat * t + r.uniform(0, TAU))) ** 6
        sw = np.clip(0.55 + 0.6 * smooth_noise(n, r, r.uniform(0.15, 0.35)), 0, 1) ** 1.5
        nz = bp(r.standard_normal(n), fc * 0.85, fc * 1.15, 2)
        y = (nz * 0.6 + np.sin(TAU * fc * t) * 0.4) * tick * sw
        out += pan(y, r.uniform(-0.8, 0.8)) * r.uniform(0.5, 1.0)
    return hp(out, 4800, 3) * level / np.sqrt(voices)


def dry_breeze(dur, r, level=1.0, bright=600):
    return G.breeze(dur, r, level, 0.15, bright)


def heat_road(dur, r, level=1.0, buzz=1.0):
    """hot dusty road: dry breeze, cicadas, a faint far grasshopper tick"""
    out = dry_breeze(dur, r, 0.8 * level, 550)
    out += cicadas(dur, r, 0.9 * buzz * level)
    return out


def stadium_crowd(dur, r, people=18, level=1.0, dark=1800):
    """a 1904 stadium crowd murmuring (formant babble), far and dark, stereo"""
    n = ns(dur)
    out = np.zeros((2, n))
    for p in range(people):
        base = r.uniform(95, 135) if p % 2 else r.uniform(170, 230)
        y = G.babble(dur, r, base, r.uniform(0.95, 1.15), rate=r.uniform(3.6, 4.8), active=r.uniform(0.4, 0.7), fmax=3000)
        out += pan(lp(y, dark, 2), r.uniform(-0.85, 0.85)) * r.uniform(0.5, 1.0)
    out = out / np.sqrt(people) + G.breeze(dur, r, 0.15, 0.2, 500)
    return out * level


def cheer(dur, r, people=16, level=1.0, dark=2200, env_pts=None, clap=0.6):
    """a crowd cheer: overlapping hurrahs + applause, swelling; env_pts = [(t, gain)] over the clip"""
    n = ns(dur)
    out = np.zeros((2, n))
    for p in range(people):
        tm = r.uniform(0.0, max(0.05, dur * 0.35))
        while tm < dur - 0.4:
            base = r.uniform(110, 150) if p % 3 else r.uniform(190, 250)
            h = G.hurrah(r, base, r.uniform(0.95, 1.12))
            place(out, pan(lp(h, dark, 2), r.uniform(-0.85, 0.85)) * r.uniform(0.4, 1.0), tm)
            tm += r.uniform(0.6, 1.6)
    out /= np.sqrt(people)
    out += G.applause(dur, r, 30) * 0.035 * clap
    out = lp(out, dark + 600, 1)
    if env_pts:
        e = np.interp(np.arange(n) / SR, [a for a, _ in env_pts], [g for _, g in env_pts])
        out *= e[None, :]
    return out * level


def spring_bed(dur, r):
    """Boston, spring 1905: sparrows + a fluting blackbird, a soft breeze, a far street crowd (very low)"""
    n = ns(dur)
    out = G.breeze(dur, r, 0.5, 0.2, 700)
    out += widen(G.bird_chirps(dur, r, 0.9, "sparrow") * 0.05, r, 9, 1.0)
    out += pan(G.bird_chirps(dur, r, 0.45, "blackbird") * 0.04, -0.45)
    out += pan(G.bird_chirps(dur, r, 0.35, "blackbird") * 0.03, 0.5)
    out += stadium_crowd(dur, r, 10, 0.25, 1500)
    return out


def orchard_bed(dur, r):
    """apple orchard on a hot day: leaves rustling, cicadas softer, a far bird"""
    n = ns(dur)
    out = heat_road(dur, r, 0.8, 0.6)
    lv = np.zeros((2, n))
    for ch in range(2):
        g = np.clip(0.4 + 0.6 * smooth_noise(n, r, 0.4), 0, 1)
        lv[ch] = bp(colored(n, r, 0.4), 1500, 6000, 1) * g ** 2 * 0.06
    out += lv
    out += pan(G.bird_chirps(dur, r, 0.3, "blackbird") * 0.015, 0.5)
    return out


def corn_bed(dur, r):
    """cornfield: dry stalks rustling in gusts, cicadas"""
    n = ns(dur)
    out = heat_road(dur, r, 0.9, 0.8)
    for ch in range(2):
        g = np.clip(0.3 + 0.7 * smooth_noise(n, r, 0.6), 0, 1)
        out[ch] += bp(colored(n, r, 0.2), 2000, 7000, 1) * g ** 3 * 0.08
    return out


# ================================================================ the bottle, the gulp, the swirl, the flash
def glass_tink(r, f0=6200.0, dur=0.35):
    """a tiny high glass 'tink' (above the speech band: lives at 6 kHz+)"""
    y = modal(dur, [(f0, 1.0, 0.09), (f0 * 1.52, 0.35, 0.05), (f0 * 2.1, 0.15, 0.03)], r)
    t = tt(dur)
    y += hp(r.standard_normal(len(t)), 6000) * np.exp(-t / 0.0007) * 0.2
    return fades(hp(y, 4800, 2), 0.0, 0.03)


def glass_tok(r):
    """a small glass bottle set into a palm: a dull hollow 'tok' (glass body mode muffled by the hand), dark"""
    d = 0.25
    t = tt(d)
    y = modal(d, [(r.uniform(700, 800), 0.8, 0.02), (r.uniform(1500, 1700), 0.3, 0.012)], r)
    y += np.sin(phase(180 * (1 + 0.4 * np.exp(-t / 0.006)))) * _env(len(t), 0.0008, 0.02) * 0.6
    return fades(lp(y, 1200, 2), 0.0, 0.04)


def gulp(r):
    """a cartoon throat gulp: a low round 'glunk' (pitched blob falling) + a little wet click; dark"""
    d = 0.35
    t = tt(d)
    f = 210 * (1 - 0.35 * np.clip(t / 0.12, 0, 1))
    y = np.sin(phase(f)) * _env(len(t), 0.006, 0.05) * 1.0
    y += np.sin(phase(f * 2.1)) * _env(len(t), 0.004, 0.025) * 0.3
    y += lp(r.standard_normal(len(t)), 1200, 2) * np.exp(-t / 0.004) * 0.25
    return fades(lp(y, 900, 2), 0.0, 0.05)


def swirl_boing(r, dur=0.42):
    """the swirly-eyes 'boing': a soft spring twang whose pitch wobbles and slides down (woozy), quick decay"""
    n = ns(dur)
    t = np.arange(n) / SR
    wob = 0.18 * np.sin(TAU * 9.0 * t) * (1 - np.exp(-t / 0.05))
    f = 330 * (1 + 0.6 * np.exp(-t / 0.02)) * (1 - 0.25 * t / dur) * (1 + wob)
    ph = phase(f)
    y = (np.sin(ph) + 0.35 * np.sin(2.76 * ph) + 0.12 * np.sin(5.4 * ph)) * np.exp(-t / 0.12)
    y *= 1 - np.exp(-t / 0.002)
    return fades(lp(y, 2400, 2), 0.0, 0.06)


def flash_pff(r):
    """the white flash: a soft muffled 'pfoomf' (sub + dark air), no bang"""
    k = Bt.kick_thump(r, 1.0)
    p = lp(Bt.poof(r), 900, 2) * 0.5
    n = max(len(k), len(p))
    return np.pad(k, (0, n - len(k))) + np.pad(p, (0, n - len(p)))


# ================================================================ the old car
def old_car(dur, r, rate=9.0, load=0.5, rattle=0.6):
    """a 1904 one-cylinder runabout puttering: slow firing pulses ('putt-putt-putt') through a low exhaust
    resonance, body / fender rattle, wooden-spoke wheels on dirt; dark"""
    rpm = rate * 30.0 * (1 + 0.08 * smooth_noise(ns(dur), r, 0.5))
    y = E.engine(dur, r, rpm[:: 400], load)
    n = len(y)
    rt = G.rattle(dur, r, 22.0) * 0.08 * rattle
    rt = rt[:n] if len(rt) >= n else np.pad(rt, (0, n - len(rt)))
    tyre = lp(colored(n, r, 1.5), 300, 2) * 0.05
    return fades(lp(y + lp(rt, 2500, 1) + tyre, 1600, 2), 0.1, 0.15)


def car_pass(dur, r, rate=9.0, peak=0.5, width=1.4):
    """the car putters past: level + pan + a little Doppler-ish brightness swell, stereo"""
    y = old_car(dur, r, rate)
    n = len(y)
    u = np.linspace(-1, 1, n)
    g = 1 / (1 + (u - (peak * 2 - 1)) ** 2 * 6)
    p = np.clip(u * width, -1, 1)
    th = (p + 1) * np.pi / 4
    y = y * g
    return np.stack([y * np.cos(th), y * np.sin(th)]) * np.sqrt(2)


def bulb_horn(r, f0=233.0, dur=0.32, k=1, gap=0.1):
    """rubber-bulb brass horn: a reedy buzz with a squeeze scoop up and a little fall, through a horn formant; k honks"""
    out = np.zeros(ns(k * (dur + gap) + 0.1))
    for i in range(k):
        n = ns(dur)
        t = np.arange(n) / SR
        f = f0 * (1 + 0.06 * (1 - np.exp(-t / 0.03)) - 0.08 * np.clip((t - dur * 0.7) / (dur * 0.3), 0, 1)) * (1 - 0.03 * np.exp(-t / 0.01))
        ph = phase(f)
        y = np.zeros(n)
        for h in range(1, 16):
            y += np.sin(h * ph) / h ** 0.9
        e = np.clip(t / 0.02, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)
        y = reson(y, 800, 2.0) * 0.6 + reson(y, 1500, 3.0) * 0.3 + y * 0.1
        _pm(out, y * e * (1.0 if i == 0 else 0.85), i * (dur + gap))
    return fades(lp(out, 4000, 2), 0.002, 0.05)


# ================================================================ the start
def pistol_pop(r):
    """the starter's pistol, softened: a short dark 'pok' + a puff of smoke air; no crack"""
    d = 0.6
    t = tt(d)
    y = np.sin(phase(120 * (1 + 1.5 * np.exp(-t / 0.006)))) * _env(len(t), 0.0005, 0.035) * 1.0
    y += bp(r.standard_normal(len(t)), 200, 1500, 1) * np.exp(-t / 0.012) * 0.8
    y += lp(colored(len(t), r, 1.0), 700, 2) * _env(len(t), 0.01, 0.18) * 0.25
    return fades(lp(y, 1500, 2), 0.0, 0.08)


# ================================================================ dust, coughs
def dust_roll(dur, r, level=1.0):
    """a huge dust cloud rolling over: a slow dark swell of grit and air, stereo"""
    n = ns(dur)
    t = np.arange(n) / SR
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.4
    out = np.zeros((2, n))
    for ch in range(2):
        a = lp(colored(n, r, 1.2), 700, 2) * (0.7 + 0.3 * smooth_noise(n, r, 1.5))
        g = bp(r.standard_normal(n), 1500, 4000, 1) * (r.uniform(size=n) < 0.02) * 0.6
        out[ch] = (a + lp(g, 3000, 1)) * e
    return out * level


def cough(r, k=2, base=None):
    """one runner's dry dusty cough: k short bursts (glottal 'kh' + a breathy 'uh' vowel), falling"""
    base = base or r.uniform(100, 150)
    y = np.zeros(ns(0.25 * k + 0.2))
    for i in range(k):
        d = r.uniform(0.12, 0.17)
        n = ns(d)
        t = np.arange(n) / SR
        f0 = base * (1.2 - 0.3 * t / d)
        forms = G.vowel_track(n, [(0, "A"), (d, "er")])
        amp = np.clip(t / 0.006, 0, 1) * np.exp(-t / (d * 0.45))
        v = G.vox(f0, forms, amp, r, 1.0, tilt=1.1, breath=0.9)
        burst = bp(r.standard_normal(n), 600, 3500, 1) * np.exp(-t / 0.02) * 1.5
        _pm(y, (v * 0.5 + burst) * (1 - 0.2 * i), i * r.uniform(0.2, 0.26))
    return fades(y, 0.002, 0.03)


# ================================================================ the well
def winch_creak(dur, r):
    """the well's wooden winch turning + rope creak, low"""
    y = G.creak(dur, r, 30, 55, G.WOOD, [(0, 0), (0.1, 0.8), (0.5, 1.0), (0.9, 0.7), (1, 0)], 0.2, 0.03, 0.9)
    return fades(lp(y, 1500, 2), 0.02, 0.05)


def drip(r, f0=1250.0):
    """a single drop landing in an almost empty tin bucket: a tiny rising 'plip' + the tin ringing faintly"""
    d = 0.7
    t = tt(d)
    y = np.exp(-t / 0.018) * np.sin(phase(f0 * (1 + 8 * t))) * (1 - np.exp(-t / 0.0008))
    y += modal(d, [(r.uniform(1900, 2050), 0.12, 0.25), (r.uniform(3300, 3500), 0.05, 0.15)], r)
    return fades(y, 0.0, 0.1)


# ================================================================ the finish
def tape_snap(r, dark=1800):
    """a finish tape (worsted yarn) breaking: a soft 'thwip' - a short dark slap + a quick flutter of the loose ends"""
    d = 0.45
    t = tt(d)
    y = bp(r.standard_normal(len(t)), 250, 2500, 1) * np.exp(-t / 0.01) * 1.2
    y += np.sin(phase(140 * (1 + 0.8 * np.exp(-t / 0.006)))) * _env(len(t), 0.0005, 0.03) * 0.7
    fl = bp(r.standard_normal(len(t)), 500, 2500, 1) * (0.5 + 0.5 * np.sin(TAU * 26 * t)) ** 3 * np.clip((t - 0.03) / 0.02, 0, 1) * np.exp(-t / 0.12) * 0.3
    return fades(lp(y + fl, dark, 2), 0.0, 0.06)


def hat_fwip(r):
    """a straw boater tossed up: a quick soft 'fwip' (air) + a tiny straw rustle"""
    w = G.whoosh(0.16, r, 0.05, 700, 2600, 0.7, 0.04, 0.15)
    t = tt(0.16)
    rs = bp(r.standard_normal(len(t)), 2500, 6000, 1) * np.exp(-t / 0.03) * 0.15
    return fades(w + rs, 0.002, 0.04)


def record_scratch(r, dur=0.3):
    """a soft record-scratch 'zzwip-down': a groove-noise band + a pitched tone sweeping down and stopping; muffled"""
    n = ns(dur)
    t = np.arange(n) / SR
    u = t / dur
    f = 900 * (1 - 0.85 * u ** 0.7) + 60
    tone = np.sin(phase(f)) * 0.5 + np.sin(phase(f * 2.02)) * 0.25
    nz = colored(n, r, 0.5)
    band = shape(nz, lambda T_, F_: np.exp(-0.5 * (np.log2(np.maximum(F_[:, None], 20) / np.interp(T_[None, :], [0, dur], [1800, 200])) / 0.6) ** 2), 512, 128)
    e = np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.04, 0, 1) * (1 - 0.4 * u)
    y = (tone + band * 0.6) * e
    return fades(lp(y, 2500, 2), 0.002, 0.03)


# ================================================================ the orchard
def twig_pick(r):
    """an apple picked: a small twig snap + a leafy rustle; dark"""
    d = 0.35
    t = tt(d)
    y = np.zeros(len(t))
    for j in range(2):
        _pm(y, modal(0.06, [(r.uniform(900, 1300), 0.6, 0.008), (r.uniform(1800, 2400), 0.3, 0.005)], r) * (1 - 0.4 * j), 0.012 * j)
    y += bp(r.standard_normal(len(t)), 800, 3000, 1) * _env(len(t), 0.01, 0.08) * 0.25
    return fades(lp(y, 2000, 2), 0.0, 0.05)


def apple_crunch(r):
    """a crisp bite: a burst of tiny fracture clicks through a mouth / apple body resonance; kept below ~1.8 kHz"""
    d = 0.4
    n = ns(d)
    t = np.arange(n) / SR
    im = np.zeros(n)
    for tm in np.sort(r.uniform(0, 0.12, 40)):
        im[ns(tm)] += r.uniform(-1, 1) * np.exp(-tm / 0.06)
    y = resbank(im, [(r.uniform(600, 800), 4, 1.0), (r.uniform(1100, 1400), 5, 0.6)]) + lp(im, 1500, 2) * 2
    y += np.sin(phase(110 * (1 + 0.5 * np.exp(-t / 0.01)))) * _env(n, 0.001, 0.03) * 0.4
    return fades(lp(y, 1800, 2), 0.0, 0.06)


def blergh(r, dur=0.22):
    """the sour 'bleh-uh': a short disgusted voice, wobbling down, gargly"""
    n = ns(dur)
    t = np.arange(n) / SR
    f0 = 170 * (1.1 - 0.35 * t / dur) * (1 + 0.06 * np.sin(TAU * 24 * t))
    forms = G.vowel_track(n, [(0, "E"), (dur * 0.35, "E"), (dur * 0.7, "er"), (dur, "A")])
    amp = np.clip(t / 0.015, 0, 1) * np.clip((dur - t) / 0.06, 0, 1) * (0.75 + 0.25 * np.sin(TAU * 31 * t))
    y = G.vox(f0, forms, amp, r, 1.0, tilt=1.1, breath=0.3, fmax=4500)
    return fades(lp(y, 3500, 2), 0.004, 0.03)


def snore(r, inhale=0.55, exhale=0.0, dark=700):
    """a cartoon snore: a fluttering soft-palate inhale (low rattly noise at ~28 Hz), optional whistly exhale"""
    d = inhale + exhale + 0.05
    n = ns(d)
    t = np.arange(n) / SR
    y = np.zeros(n)
    ni = ns(inhale)
    ti = t[:ni]
    ei = np.sin(np.pi * np.clip(ti / inhale, 0, 1)) ** 1.2
    flutter = (0.5 + 0.5 * np.sin(TAU * 28 * ti)) ** 3
    y[:ni] = lp(colored(ni, r, 1.0), dark, 2) * ei * (0.35 + 0.65 * flutter) * 1.5
    if exhale > 0:
        ne = ns(exhale)
        te = np.arange(ne) / SR
        ee = np.sin(np.pi * np.clip(te / exhale, 0, 1)) ** 1.5
        wh = np.sin(phase(np.full(ne, 1.0) * 900 * (1 - 0.25 * te / exhale))) * 0.12
        air = bp(colored(ne, r, 0.6), 300, 1500, 1) * 0.6
        _pm(y, (air + wh) * ee, inhale + 0.02)
    return fades(y, 0.01, 0.03)


# ================================================================ the dogs
def bark(r, base=None, scale=None, dark=None):
    """one scrappy farm-dog bark 'wuf!': sharp onset, pitch flick down, open vowel formants, rough"""
    base = base or r.uniform(330, 460)
    scale = scale or r.uniform(1.25, 1.5)
    d = r.uniform(0.09, 0.14)
    n = ns(d + 0.03)
    t = np.arange(n) / SR
    f0 = base * (1.15 - 0.35 * np.clip(t / d, 0, 1))
    forms = G.vowel_track(n, [(0, "A"), (d * 0.5, "a"), (d, "U")])
    amp = np.clip(t / 0.004, 0, 1) * np.exp(-t / (d * 0.55))
    y = G.vox(f0, forms, amp, r, scale, tilt=0.9, breath=0.5, fmax=5000, jitter=0.04)
    y += bp(r.standard_normal(n), 800, 3000, 1) * np.exp(-t / 0.01) * 0.6
    if dark:
        y = lp(y, dark, 2)
    return fades(y, 0.001, 0.02)


def bark_volley(dur, r, dogs=3, rate=3.0, dark=None, width=0.8):
    """2-3 dogs barking at a runner's heels, stereo"""
    out = np.zeros((2, ns(dur)))
    for dg in range(dogs):
        base = [420, 330, 520][dg % 3] * r.uniform(0.92, 1.08)
        sc = [1.35, 1.2, 1.55][dg % 3]
        p = r.uniform(-width, width)
        tm = r.uniform(0, 0.3)
        while tm < dur - 0.15:
            place(out, pan(bark(r, base, sc, dark), p) * r.uniform(0.6, 1.0), tm)
            tm += r.uniform(0.6, 1.4) / rate
    return out


def frantic_feet(dur, r, rate=5.5, dark=1400):
    """one runner sprinting flat out on a dirt road (quick scuffy steps), a little rustle of corn; dark"""
    y = np.zeros(ns(dur))
    tm = 0.0
    k = 0
    while tm < dur - 0.3:
        s = G.stroll_step(r, 0.8) * r.uniform(0.7, 1.0) * (1.0 if k % 2 else 0.85)
        _pm(y, s, tm)
        tm += 1 / rate * r.uniform(0.92, 1.08)
        k += 1
    return fades(lp(y, dark, 2), 0.02, 0.05)


def shuffle_feet(dur, r, rate=1.6, dark=1200):
    """an exhausted runner shuffling: slow scuffs on dirt"""
    y = np.zeros(ns(dur))
    tm = 0.1
    while tm < dur - 0.3:
        _pm(y, G.stroll_step(r, 1.4) * r.uniform(0.5, 0.8), tm)
        tm += 1 / rate * r.uniform(0.9, 1.1)
    return fades(lp(y, dark, 2), 0.05, 0.1)


# ================================================================ Hicks' hand-offs
def egg_crack(r):
    """an egg cracked on the rim of a cup: a small dull crack + the white slipping in (soft 'plup'); dark"""
    d = 0.5
    t = tt(d)
    y = modal(0.08, [(r.uniform(1300, 1600), 0.6, 0.006), (r.uniform(2400, 2800), 0.3, 0.004)], r)
    y = np.pad(y, (0, len(t) - len(y)))
    y += bp(r.standard_normal(len(t)), 500, 2500, 1) * np.exp(-t / 0.006) * 0.5
    pl = np.exp(-tt(0.12) / 0.03) * np.sin(phase(380 * (1 + 2.0 * tt(0.12))))
    _pm(y, pl * 0.35, 0.18)
    return fades(lp(y, 2000, 2), 0.0, 0.05)


def glug(r, k=3):
    """a brandy flask tipped: k low hollow glugs"""
    y = np.zeros(ns(0.2 * k + 0.25))
    for i in range(k):
        d = 0.16
        t = tt(d)
        f = r.uniform(230, 290) * (1 + 0.6 * t / d)
        g = np.sin(phase(f)) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
        g += G.bubbles(d, r, 25, 250, 700, (0.008, 0.02)) * 0.4
        _pm(y, g * (1 - 0.15 * i), i * r.uniform(0.17, 0.21))
    return fades(lp(y, 1100, 2), 0.004, 0.05)


# ================================================================ the finish: lift, medal
def cloth_lift(r, dur=0.4):
    """two trainers hoist him: a dark cloth swish + a soft shoe scuff"""
    w = G.whoosh(dur, r, 0.05, 250, 1200, 0.7, 0.06, 0.05)
    t = tt(dur)
    w += lp(r.standard_normal(len(t)), 600, 2) * _env(len(t), 0.02, 0.08) * 0.2
    return fades(lp(w, 1400, 2), 0.004, 0.05)


def medal_plonk(r):
    """a gold medal plonking onto a limp chest: a soft dull 'plonk' (a brass disc muted by a singlet) + ribbon flap"""
    d = 0.6
    t = tt(d)
    y = modal(d, [(r.uniform(520, 560), 0.8, 0.05), (r.uniform(1350, 1450), 0.35, 0.03), (r.uniform(2600, 2800), 0.12, 0.015)], r)
    y += np.sin(phase(160 * (1 + 0.4 * np.exp(-t / 0.008)))) * _env(len(t), 0.001, 0.04) * 0.7
    return fades(y, 0.0, 0.06)


# ================================================================ the drop-outs
def flop_thud(r, size=1.0, dark=900):
    """a runner flopping down in the shade / on the grass: a soft low body thud + a puff of dust"""
    d = 0.45
    t = tt(d)
    y = np.sin(phase(r.uniform(60, 80) * (1 + 0.5 * np.exp(-t / 0.012)))) * _env(len(t), 0.002, 0.07)
    y += bp(colored(len(t), r, 0.6), 300, 2000, 1) * _env(len(t), 0.005, 0.07) * 0.4
    return fades(lp(y * size, dark, 2), 0.0, 0.05)


def sigh(r, dur=0.3, base=None):
    """an exhausted runner's breathy 'haaah' (falling, mostly air)"""
    n = ns(dur)
    t = np.arange(n) / SR
    base = base or r.uniform(95, 125)
    f0 = base * (1.15 - 0.3 * t / dur)
    forms = G.vowel_track(n, [(0, "a"), (dur, "er")])
    amp = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.8
    y = G.vox(f0, forms, amp, r, 1.0, tilt=1.4, breath=1.6, fmax=3500)
    return fades(lp(y, 2500, 2), 0.01, 0.04)


def wagon_creak(dur, r):
    """a hay wagon rolling: wooden axle creaks, slow wheel bumps, a horse's hoof clops far off; dark"""
    y = G.creak(dur, r, 25, 40, G.WOOD, [(0, 0), (0.2, 1), (0.5, 0.6), (0.8, 1), (1, 0)], 0.25, 0.02, 0.8) * 0.6
    n = len(y)
    tm = 0.1
    while tm < dur - 0.2:
        tl = tt(0.12)
        c = modal(0.12, [(r.uniform(350, 450), 0.6, 0.02), (r.uniform(900, 1100), 0.3, 0.01)], r)
        _pm(y, c * 0.25, tm)
        tm += r.uniform(0.38, 0.48)
    return fades(lp(y, 1500, 2), 0.05, 0.1)


def creek_splash(r):
    """a runner sitting down in a creek: a small round splash + a few drops"""
    d = 0.6
    t = tt(d)
    y = np.sin(phase(90 * (1 + 0.5 * np.exp(-t / 0.02)))) * _env(len(t), 0.002, 0.06) * 0.8
    y += bp(colored(len(t), r, 0.4), 300, 3000, 1) * _env(len(t), 0.005, 0.08) * 0.9
    y += G.bubbles(d, r, 60 * np.exp(-t / 0.15) + 2, 500, 2200, (0.005, 0.02), np.exp(-t / 0.2)) * 0.6
    return fades(lp(y, 3000, 2), 0.0, 0.08)


def held_breath(r, dur=0.5):
    """the crowd's collective sharp intake of breath, far and dark ('hhhp')"""
    n = ns(dur)
    t = np.arange(n) / SR
    e = np.clip(t / (dur * 0.7), 0, 1) ** 1.5 * np.clip((dur - t) / 0.04, 0, 1)
    out = np.zeros((2, n))
    for ch in range(2):
        out[ch] = bp(colored(n, r, 0.5), 400, 1800, 1) * e
    return out


def wink_ting(r, f=3520.0):
    """cartoon wink 'ting': a small bright bell on A7 (the 3rd of the final F6/9) with a faint octave"""
    d = 1.4
    t = tt(d)
    y = modal(d, [(f, 1.0, 0.5), (f * 2, 0.12, 0.2), (f * 2.76, 0.08, 0.08)], r)
    y += hp(r.standard_normal(len(t)), 5000) * np.exp(-t / 0.0006) * 0.12
    return fades(y * 0.5, 0.0005, 0.1)
