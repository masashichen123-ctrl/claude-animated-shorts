# Procedural sound effects for "The Exploding Whale" (own numpy synthesis, no samples): Pacific surf + beach wind,
# seagull calls (and a gull fainting), dynamite sticks popping up with fuse sparkles, a blubber plop, a rope
# creaking and snapping + bodies tumbling on sand, a cartoon stink wobble, a 1970s V8 highway truck, thought-bubble
# bloop, dynamite crates stacked, easel tap, gulls licking their beaks, dune crowd chatter, a 16 mm film camera
# whirr, the plunger, the BOOM (low transient + a big tail), falling-blubber whistles, umbrella pops and panic,
# splats, a car crushed flat, a hubcap rolling away, wings fleeing, a face-palm, a bulldozer + shovels, a sunny
# park (birds, kids far away) and the wink 'ting'. Every generator returns mono (n,) or stereo (2, n) float arrays.
import numpy as np
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, reson, resbank, colored, smooth_noise, fades, phase, modal, pan, st,
                 widen, place, shape)
import sfx_gen as G
import sfx_emu as E
import sfx_bat as B


def _env(n, att, tau):
    t = np.arange(n) / SR
    return (1 - np.exp(-t / max(att, 1e-4))) * np.exp(-t / tau)


def _pm(buf, x, t):
    G._place_mono(buf, x, t)


# ================================================================ ambience
def surf(dur, r, close=1.0, period=(5.5, 8.0)):
    """Pacific surf: a low ocean rumble + waves (a swell rising, the crash, the long fizzing wash), stereo"""
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for ch in range(2):
        out[ch] = lp(colored(n, r, 2.0), 220, 2) * (0.75 + 0.25 * smooth_noise(n, r, 0.15)) * 0.8
    tm = r.uniform(-2.0, 1.0)
    while tm < dur:
        L = r.uniform(4.0, 6.0)
        m = ns(L)
        u = np.arange(m) / SR
        crash = 1.0
        swell = np.clip(u / crash, 0, 1) ** 2 * (u < crash)
        wash = np.where(u >= crash, np.exp(-(u - crash) / r.uniform(1.0, 1.6)), 0) * (1 - np.exp(-np.maximum(u - crash, 0) / 0.05))
        a = r.uniform(0.6, 1.0) * close
        p = r.uniform(-0.6, 0.6)
        for ch in range(2):
            nz = colored(m, r, 1.0)
            body = bp(nz, 150, 1200, 1) * (0.7 * swell + 1.0 * wash)
            fizz = bp(colored(m, r, 0.4), 1200, 5000, 1) * wash ** 1.5 * (0.6 + 0.4 * smooth_noise(m, r, 6.0)) * 0.35
            g = np.cos((p + 1) * np.pi / 4) if ch == 0 else np.sin((p + 1) * np.pi / 4)
            seg = (body + fizz) * a * g * np.sqrt(2)
            k = ns(tm)
            a0, b0 = max(0, k), min(n, k + m)
            if b0 > a0:
                out[ch, a0:b0] += seg[a0 - k: b0 - k]
        tm += r.uniform(*period)
    return out


def beach_wind(dur, r, level=1.0, bright=700):
    return G.breeze(dur, r, level, 0.14, bright)


def grass_rustle(dur, r, level=1.0):
    """beach grass on the dunes moving in the wind"""
    n = ns(dur)
    out = np.zeros((2, n))
    for ch in range(2):
        g = 0.5 + 0.5 * smooth_noise(n, r, 0.4)
        out[ch] = bp(colored(n, r, 0.6), 1500, 5000, 1) * g ** 2 * (0.6 + 0.4 * smooth_noise(n, r, 9.0)) * 0.3 * level
    return out


def gull(r, f0=None, k=None, gap=None, far=1.0):
    """herring-gull call: nasal 'kyow' (pitch up then down, harmonics through a ~1.8 kHz formant, a rasp),
    k repeats ('kyow-kyow-kyow'); far = low-pass amount (1 close .. 0.3 far)"""
    f0 = f0 or r.uniform(650, 850)
    k = k or int(r.integers(1, 4))
    gap = gap or r.uniform(0.17, 0.24)
    y = np.zeros(ns(k * gap + 0.4))
    for i in range(k):
        d = r.uniform(0.16, 0.24) * (1.25 if i == k - 1 else 1.0)
        n = ns(d)
        u = np.linspace(0, 1, n)
        f = f0 * r.uniform(0.95, 1.05) * (1 + 0.45 * np.sin(np.pi * u ** 0.7) - 0.15 * u)
        ph = phase(f)
        s = np.zeros(n)
        for h in range(1, 7):
            s += np.sin(h * ph + r.uniform(0, TAU)) / h ** 0.8
        s *= 1 + 0.35 * np.sin(TAU * 70 * u * d)
        s = reson(s, 1800, 1.8) * 1.2 + 0.3 * s
        e = np.sin(np.pi * u) ** 0.9 * (1 - np.exp(-u * d / 0.01))
        _pm(y, s * e * r.uniform(0.7, 1.0), i * gap)
    return fades(lp(y, 1500 + 3500 * far, 2), 0.003, 0.05)


def park_bed(dur, r):
    """sunny beach park: sparrows + a fluting bird, a soft breeze, far surf, far kids playing (very low)"""
    n = ns(dur)
    out = beach_wind(dur, r, 0.6, 600)
    out += surf(dur, r, 0.35) * 0.6
    out += widen(G.bird_chirps(dur, r, 0.7, "sparrow") * 0.03, r, 9, 1.0)
    out += pan(G.bird_chirps(dur, r, 0.35, "blackbird") * 0.025, -0.4)
    kids = np.zeros(n)
    for j in range(3):
        kids += G.babble(dur, r, r.uniform(260, 330), 1.35, rate=4.8, active=0.45, fmax=3000) * 0.010
    out += widen(lp(kids, 2200, 2), r, 11, 1.0)
    return out


def crowd(dur, r, people=14, level=1.0):
    """a cheerful crowd chatting on the dune top (distant, dark), stereo"""
    n = ns(dur)
    out = np.zeros((2, n))
    for p in range(people):
        kid = p % 6 == 5
        base = r.uniform(240, 300) if kid else (r.uniform(95, 135) if p % 2 else r.uniform(170, 230))
        y = G.babble(dur, r, base, 1.3 if kid else r.uniform(0.95, 1.15), rate=r.uniform(3.6, 4.8), active=r.uniform(0.4, 0.7), fmax=3200)
        out += pan(lp(y, 2000, 2), r.uniform(-0.8, 0.8)) * r.uniform(0.5, 1.0)
    return out * level / np.sqrt(people)


# ================================================================ shot 1-2: dynamite, flash, plop
def stick_pop(r):
    """one dynamite stick popping up out of the blubber: a soft cork 'thup' + a tiny wooden tick"""
    d = 0.18
    t = tt(d)
    f = r.uniform(260, 340) * (1 + 0.8 * np.exp(-t / 0.006))
    y = np.sin(phase(f)) * _env(len(t), 0.001, 0.02)
    y += bp(r.standard_normal(len(t)), 500, 2500, 1) * np.exp(-t / 0.004) * 0.4
    return fades(y, 0.0, 0.04)


def stick_pops(r, k=5, gap=0.055):
    y = np.zeros(ns(k * gap + 0.25))
    for i in range(k):
        _pm(y, stick_pop(r) * r.uniform(0.7, 1.0), i * gap * r.uniform(0.9, 1.1))
    return y


def fuse_sparkle(dur, r, n_fuses=5, width=0.8):
    """lit fuses fizzing: dense tiny sparks (bright ticks) + a soft hiss, several fuses across the stereo field"""
    n = ns(dur)
    out = np.zeros((2, n))
    for i in range(n_fuses):
        y = np.zeros(n)
        cnt = int(dur * r.uniform(60, 90))
        for tm in r.uniform(0, dur, cnt):
            L = ns(r.uniform(0.0008, 0.003))
            k = ns(tm)
            if k + L < n:
                y[k:k + L] += r.standard_normal(L) * np.exp(-np.arange(L) / (L * 0.3)) * r.uniform(0.2, 1.0)
        y = bp(y, 2500, 9000, 1) * 2.0 + bp(colored(n, r, 0.3), 3000, 8000, 1) * 0.06
        out += pan(y, -width + 2 * width * i / max(1, n_fuses - 1))
    return fades(out, 0.02, 0.05)


def plop(r, size=1.0):
    """a blubber chunk plopping onto a hard hat: a wet round 'blop' (pitched drop down) + a short squish, dark"""
    d = 0.45
    t = tt(d)
    f = r.uniform(150, 175) * (1 + 0.9 * np.exp(-t / 0.02))
    y = np.sin(phase(f)) * _env(len(t), 0.002, 0.06) * 1.0
    y += modal(d, [(r.uniform(420, 470), 0.3, 0.03), (r.uniform(900, 1000), 0.12, 0.015)], r)      # the plastic hat
    sq = bp(colored(len(t), r, 0.8), 250, 1400, 1) * np.clip((t - 0.02) / 0.02, 0, 1) * np.exp(-np.maximum(t - 0.02, 0) / 0.08)
    sq *= 0.6 + 0.4 * np.sin(TAU * 31 * t)
    y += sq * 0.5
    return fades(y * size, 0.0, 0.06)


# ================================================================ shot 4: the rope, the smell, the fainting gull
def rope_snap(r):
    """thick rope under strain (fibre creaks) then the SNAP (a dark thwack + a whip of the loose end); stereo,
    built to sit under 'move': the snap itself is short and lives below ~2 kHz"""
    pre = 0.45
    d = pre + 0.7
    n = ns(d)
    y = np.zeros(n)
    strain = G.creak(pre, r, 40, 85, G.TIMBER, [(0, 0), (0.4, 0.6), (0.9, 1.0), (1, 0.8)], 0.2, 0.04, 1.2)
    _pm(y, strain * 0.5, 0.0)
    t = tt(0.35)
    snap = np.sin(phase(110 * (1 + 1.2 * np.exp(-t / 0.008)))) * _env(len(t), 0.0005, 0.05) * 1.2
    snap += bp(r.standard_normal(len(t)), 300, 2200, 1) * np.exp(-t / 0.008) * 1.2
    _pm(y, snap, pre)
    whip = G.whoosh(0.3, r, 0.05, 400, 1500, 0.7, 0.08, 0.05) * 0.5
    _pm(y, whip, pre + 0.01)
    return fades(y, 0.01, 0.05), pre


def sand_thud(r, size=1.0):
    """a body landing on the sand: soft low thud + a puff of sand"""
    d = 0.4
    t = tt(d)
    y = np.sin(phase(r.uniform(65, 85) * (1 + 0.5 * np.exp(-t / 0.01)))) * _env(len(t), 0.002, 0.06)
    y += bp(colored(len(t), r, 0.6), 400, 2500, 1) * _env(len(t), 0.004, 0.06) * 0.5
    return fades(y * size, 0.0, 0.05)


def stink_wobble(r, dur=1.2):
    """cartoon stink lines rising: a queasy low 'wah-wah-wah' (wobbling hollow tone + a breathy wobble), dark"""
    n = ns(dur)
    t = np.arange(n) / SR
    lfo = np.sin(TAU * 5.0 * t)
    f = 150 * (1 + 0.07 * lfo) * (1 + 0.15 * t / dur)
    ph = phase(f)
    y = np.sin(ph) + 0.5 * np.sin(2 * ph + 0.3) + 0.25 * np.sin(3 * ph)
    w = 0.5 + 0.5 * lfo
    y = (reson(y, 400, 2.0) * (1 - w) + reson(y, 650, 2.0) * w) * 1.5 + 0.3 * y
    br = bp(colored(n, r, 0.8), 300, 1200, 1) * (0.5 + 0.5 * lfo) ** 2 * 0.25
    e = np.clip(t / 0.15, 0, 1) * np.clip((dur - t) / 0.35, 0, 1)
    return fades(lp((y + br) * e, 1200, 2), 0.01, 0.05)


def gull_faint(r):
    """the gull swoons: a weak falling 'kyo-oww', a flutter of feathers"""
    y = np.zeros(ns(0.5))
    d = 0.3
    n = ns(d)
    u = np.linspace(0, 1, n)
    f = 780 * (1 + 0.2 * np.sin(np.pi * u * 0.6) - 0.45 * u ** 1.4)
    ph = phase(f)
    s = sum(np.sin(h * ph) / h for h in range(1, 6))
    s = reson(s, 1600, 1.8) + 0.3 * s
    _pm(y, s * np.sin(np.pi * u) ** 0.8 * 0.8, 0.0)
    _pm(y, E.feathers(r, 0.2) * 0.5, 0.2)
    return fades(lp(y, 3500, 2), 0.003, 0.05)


# ================================================================ shot 5: the highway truck (1970s V8)
def v8(dur, r, rpm, load=0.6):
    """V8 engine: E.engine's 4-cylinder firing model at twice the rate, with an uneven V8 burble, darker"""
    rp = np.asarray(rpm, float) if not np.isscalar(rpm) else np.full(64, float(rpm))
    y = E.engine(dur, r, rp * 2.0, load)
    n = len(y)
    burble = 1 + 0.25 * np.sin(phase(np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(rp)), rp) / 60.0))
    return lp(y * burble, 2500, 2)


def truck_arrive(r, d_in=0.8, d_idle=1.2):
    """the truck rolls in (engine coming down from cruise), brakes + gravel crunch at the stop, then idles; stereo"""
    d = d_in + d_idle
    n = ns(d)
    t = np.arange(n) / SR
    rpm = np.interp(np.linspace(0, d, 200), [0, d_in * 0.7, d_in, d], [1500, 1100, 750, 700])
    eng = v8(d, r, rpm, 0.5)
    env = np.interp(t, [0, d_in * 0.6, d_in, d - 0.3, d], [0.4, 1.0, 0.85, 0.7, 0.0])
    p = np.interp(t, [0, d_in], [0.7, 0.05])
    out = np.stack([eng * env * np.cos((p + 1) * np.pi / 4), eng * env * np.sin((p + 1) * np.pi / 4)]) * np.sqrt(2)
    gr = lp(E.skid(r, 0.5), 2500, 2) * 0.35
    place(out, pan(gr, 0.1), d_in - 0.45)
    place(out, pan(E.truck_bounce(r, 0.5), 0.05), d_in - 0.02)
    return fades(out, 0.2, 0.3)


def door_slam(r, big=1.0):
    """a 1970s truck door: latch clack + hollow steel door thunk"""
    d = 0.5
    t = tt(d)
    th = modal(d, [(r.uniform(90, 110), 1.0, 0.06), (r.uniform(210, 240), 0.7, 0.04), (r.uniform(480, 540), 0.4, 0.025), (1100, 0.15, 0.012)], r, glide=0.05)
    latch = modal(d, [(r.uniform(1800, 2100), 0.4, 0.008), (3300, 0.25, 0.005)], r)
    y = th + latch + bp(r.standard_normal(len(t)), 300, 3000, 1) * np.exp(-t / 0.006) * 0.5
    return fades(lp(y, 4000, 2) * big, 0.0, 0.06)


# ================================================================ shot 6-7: bloop, boulder, crates, easel, licks
def bloop(r):
    """thought-bubble 'bloop': one round rising bubble tone, short"""
    d = 0.16
    t = tt(d)
    f = 330 * (1 + 1.1 * (t / d) ** 1.4)
    y = np.sin(phase(f)) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.2
    return fades(lp(y, 2500, 2), 0.002, 0.02)


def stone_clonk(r):
    """the thought bubble's whale turns into a boulder: a heavy stone 'clonk' (low, dry)"""
    d = 0.5
    t = tt(d)
    y = modal(d, [(r.uniform(140, 160), 1.0, 0.05), (r.uniform(330, 360), 0.6, 0.03), (r.uniform(720, 780), 0.3, 0.015)], r)
    y += lp(r.standard_normal(len(t)), 900, 2) * np.exp(-t / 0.01) * 0.6
    return fades(y, 0.0, 0.05)


def crate_stack(r, big=1.0):
    """a wooden dynamite crate set on the pile: box thud + sticks shifting inside (dark)"""
    y = E.crate_thud(r, big)
    d = 0.3
    sh = np.zeros(ns(d))
    for tm in r.uniform(0.01, 0.12, 6):
        _pm(sh, E.pat(r)[: ns(0.06)] * r.uniform(0.15, 0.35), tm)
    _pm(y, sh, 0.01)
    return fades(lp(y, 2200, 2), 0.0, 0.05)


def easel_tap(r):
    """pointer tapping the easel board: a dry wooden 'tok' (two taps, the second softer)"""
    y = np.zeros(ns(0.6))
    for k, a in enumerate([1.0, 0.7]):
        d = 0.12
        t = tt(d)
        x = modal(d, [(r.uniform(700, 800), 1.0, 0.012), (r.uniform(1500, 1700), 0.4, 0.006)], r)
        x += bp(r.standard_normal(len(t)), 600, 3000, 1) * np.exp(-t / 0.003) * 0.5
        _pm(y, x * a, k * 0.40)          # the 2nd tap lands in the gap after 'plan?' (22.23)
    return fades(lp(y, 3000, 2), 0.0, 0.03)


def beak_lick(r, k=3):
    """gulls licking their beaks: tiny wet tongue smacks / slurps (short, mid band)"""
    y = np.zeros(ns(0.1 + 0.11 * k + 0.2))
    for i in range(k):
        d = r.uniform(0.04, 0.07)
        n = ns(d)
        u = np.linspace(0, 1, n)
        x = bp(colored(n, r, 0.5), 700, 2600, 1) * np.sin(np.pi * u) ** 2 * (0.5 + 0.5 * np.sin(TAU * 45 * u * d))
        x += np.sin(phase(np.full(n, r.uniform(900, 1300)) * (1 + 0.4 * u))) * np.exp(-u * 6) * 0.3
        _pm(y, x * r.uniform(0.6, 1.0), i * r.uniform(0.09, 0.13))
    return fades(y, 0.002, 0.02)


def fork_clink(r):
    y = np.zeros(ns(0.3))
    _pm(y, modal(0.25, [(r.uniform(3100, 3500), 0.8, 0.05), (r.uniform(5600, 6200), 0.4, 0.025)], r), 0.0)
    _pm(y, modal(0.25, [(r.uniform(3600, 4000), 0.5, 0.04)], r), 0.06)
    return fades(lp(y, 7000, 1) * 0.5, 0.0, 0.05)


# ================================================================ shot 8-9: camera, plunger
def film_camera(dur, r):
    """16 mm news film camera running: motor whine + the 24 fps claw ratchet + film rustle (mid, soft)"""
    n = ns(dur)
    t = np.arange(n) / SR
    f = 210 * (1 + 0.004 * smooth_noise(n, r, 2.0))
    ph = phase(f)
    motor = (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * 0.25
    claw = np.zeros(n)
    tm = 0.0
    while tm < dur:
        _pm(claw, modal(0.02, [(r.uniform(1700, 2100), 1.0, 0.003), (r.uniform(3200, 3600), 0.5, 0.002)], r) * r.uniform(0.6, 1.0), tm)
        tm += 1 / 24.0
    rustle = bp(colored(n, r, 0.5), 1500, 5000, 1) * 0.05
    y = motor + claw * 0.7 + rustle
    return fades(lp(y, 4000, 2), 0.06, 0.08)


def plunger(r):
    """the T-handle plunger pushed down: a short rod slide (metal friction) into a solid box clunk; anchor = clunk"""
    pre = 0.14
    d = pre + 0.5
    y = np.zeros(ns(d))
    n = ns(pre)
    u = np.linspace(0, 1, n)
    slide = bp(colored(n, r, 0.4), 700, 3000, 1) * np.sin(np.pi * u) ** 0.8 * 0.35
    slide += G.creak(pre, r, 300, 520, G.SMALLMETAL, [(0, 0), (0.3, 1), (1, 0.6)], 0.1, 0.0, 0.6) * 0.15
    _pm(y, slide, 0.0)
    t = tt(0.4)
    clunk = modal(0.4, [(r.uniform(110, 125), 1.0, 0.05), (r.uniform(260, 290), 0.6, 0.03), (r.uniform(620, 680), 0.3, 0.015)], r)
    clunk += bp(r.standard_normal(len(t)), 400, 2500, 1) * np.exp(-t / 0.004) * 0.5
    _pm(y, clunk, pre)
    return fades(lp(y, 3000, 2), 0.005, 0.05), pre


# ================================================================ shot 10-11: BOOM, falling blubber, panic
def boom_hit(r):
    """the BOOM transient @960: a short, low-passed sub punch only (nothing in the speech band: 'whale exploded'
    is still being said); stereo"""
    d = 0.6
    t = tt(d)
    y = np.sin(phase(42 * (1 + 1.1 * np.exp(-t / 0.03)))) * _env(len(t), 0.002, 0.16) * 1.4
    y += lp(colored(len(t), r, 1.5), 180, 2) * _env(len(t), 0.003, 0.08) * 0.8
    y = lp(y, 220, 2)
    return fades(widen(y, r, 6, 0.4), 0.0, 0.15)


def boom_tail(r, dur=3.6):
    """the BIG part of the BOOM, after 'exploded' ends: a wide 'whoomph' blast body, sand + debris roar, rolling
    rumble; the bright debris part is short (in the gap) and the rest decays low and dark; stereo"""
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for ch in range(2):
        body = shape(colored(n, r, 1.2), lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / (180 + 900 * np.exp(-T[None, :] / 0.12))) / 1.3) ** 2), 1024, 256)
        body *= _env(n, 0.012, 0.16) * 1.6
        rumble = lp(colored(n, r, 2.0), 160, 2) * _env(n, 0.05, 1.0) * 1.6
        roll = lp(colored(n, r, 1.6), 400, 2) * _env(n, 0.08, 0.5) * (0.7 + 0.3 * smooth_noise(n, r, 3.0)) * 0.7
        sand = bp(colored(n, r, 0.5), 1500, 6000, 1) * _env(n, 0.01, 0.07) * 0.35
        out[ch] = body + rumble + roll + sand
    sub = np.sin(phase(38 * (1 + 0.6 * np.exp(-t / 0.05)))) * _env(n, 0.003, 0.45) * 1.6
    out += sub[None, :]
    return fades(out, 0.002, 0.5)


def fall_whistle(r, dur=1.0, f0=1500, f1=650):
    """a chunk falling from the sky: a soft descending whistle (sine + breath), getting louder as it comes"""
    n = ns(dur)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    y = np.sin(phase(f)) + 0.06 * np.sin(2 * phase(f))
    y += bp(colored(n, r, 0.5), 800, 3000, 1) * 0.08
    e = (t / dur) ** 1.3 * np.clip((dur - t) / 0.06, 0, 1)
    return fades(y * e, 0.01, 0.02)


def umbrella_pop(r):
    """an umbrella snapping open: spring click + nylon 'fwump'"""
    d = 0.3
    t = tt(d)
    click = modal(d, [(r.uniform(1900, 2300), 0.5, 0.006), (r.uniform(3500, 4000), 0.3, 0.004)], r)
    fw = bp(colored(len(t), r, 0.8), 250, 1800, 1) * _env(len(t), 0.01, 0.05) * 1.0
    return fades(lp(click + fw, 4000, 2), 0.0, 0.04)


def scatter(dur, r, people=7, width=0.9):
    """the crowd scattering: quick footsteps in soft sand running off in all directions (dark)"""
    out = np.zeros((2, ns(dur)))
    for m in range(people):
        tm = r.uniform(0, 0.3)
        p0 = r.uniform(-0.3, 0.3)
        p1 = np.clip(p0 + r.choice([-1, 1]) * r.uniform(0.4, 0.9), -width, width)
        rt = r.uniform(3.6, 4.6)
        while tm < dur - 0.25:
            s = sand_thud(r, r.uniform(0.25, 0.45)) + bp(colored(ns(0.4), r, 0.5), 800, 3000, 1) * _env(ns(0.4), 0.005, 0.05) * 0.15
            pp = p0 + (p1 - p0) * tm / dur
            place(out, pan(lp(s, 2500, 1) * (1 - 0.6 * tm / dur), pp), tm)
            tm += 1 / rt * r.uniform(0.9, 1.1)
    return out


def splat(r, size=1.0, dark=900):
    """a blubber chunk landing: heavy wet 'SPLUT' - thud + squelch (gurgling) + a few droplets; dark by default"""
    d = 0.8
    n = ns(d)
    t = np.arange(n) / SR
    th = np.sin(phase(r.uniform(70, 90) * (1 + 0.7 * np.exp(-t / 0.012)))) * _env(n, 0.002, 0.07) * 1.2
    sq = bp(colored(n, r, 0.9), 180, 1600, 1) * _env(n, 0.006, 0.12) * (0.6 + 0.4 * np.sin(phase(28 + 14 * np.exp(-t / 0.1))))
    drops = G.bubbles(d, r, 18 * np.exp(-t / 0.15) + 1, 600, 1800, (0.004, 0.012), np.exp(-t / 0.2)) * 0.25
    y = th + sq * 0.9 + drops
    return fades(lp(y * size, dark, 2), 0.0, 0.08)


def basket_crunch(r):
    """the picnic basket flattened: wicker creak-crunch under a soft splat"""
    y = splat(r, 0.8, 1400)
    _pm(y, G.creak(0.25, r, 300, 120, G.WOOD, [(0, 1), (1, 0)], 0.3, 0.1, 1.4) * 0.35, 0.02)
    return y


def car_crunch(r):
    """a car flattened by a falling blubber chunk: deep body crunch (roof folding, low metal groans), tyres splaying;
    built dark so it can sit right before / under 'car' - the bright debris (glass, hubcap) is placed later in a gap"""
    d = 1.4
    n = ns(d)
    t = np.arange(n) / SR
    y = np.sin(phase(55 * (1 + 0.8 * np.exp(-t / 0.02)))) * _env(n, 0.002, 0.12) * 1.3
    y += lp(colored(n, r, 1.3), 500, 2) * _env(n, 0.005, 0.1) * 0.9
    crum = np.zeros(n)
    for tm in np.sort(r.uniform(0.0, 0.25, 22)):
        _pm(crum, modal(0.15, [(r.uniform(180, 420), 1.0, 0.03), (r.uniform(500, 900), 0.5, 0.015)], r) * r.uniform(0.2, 0.6), tm)
    y += crum
    groan = G.creak(0.7, r, 60, 35, G.CHAIN[:4], [(0, 0), (0.2, 1), (0.8, 0.5), (1, 0)], 0.2, 0.02, 0.6)
    _pm(y, groan * 0.3, 0.2)
    y += splat(r, 0.6, 700)[:n] if n <= ns(0.8) else np.pad(splat(r, 0.6, 700), (0, n - ns(0.8)))
    return fades(lp(y, 700, 2), 0.0, 0.2)


def glass_tinkle(r, dur=0.5):
    y = np.zeros(ns(dur + 0.2))
    for tm in np.sort(r.uniform(0, dur * 0.7, 9)):
        _pm(y, modal(0.12, [(r.uniform(3000, 5500), 1.0, 0.02), (r.uniform(6000, 8000), 0.4, 0.01)], r) * r.uniform(0.2, 0.6), tm)
    return fades(lp(y, 8000, 1), 0.0, 0.05)


def hubcap_roll(r, dur=0.95):
    """a hubcap pops off, rolls away wobbling and settles (spinning-down rattle: wa-wa-wa-wrrrr)"""
    n = ns(dur)
    t = np.arange(n) / SR
    rate = 9 + 30 * (t / dur) ** 2
    ph = phase(rate)
    y = np.zeros(n)
    hits = np.flatnonzero(np.diff(np.floor(ph / TAU)) > 0)
    for k in hits:
        a = 0.3 + 0.7 * (1 - k / n)
        _pm(y, modal(0.06, [(r.uniform(1200, 1400), 1.0, 0.01), (r.uniform(2600, 3000), 0.4, 0.006)], r) * a * 0.5, k / SR)
    ring = modal(dur, [(1310, 0.2, 0.3), (2840, 0.1, 0.2)], r) * np.clip(t / 0.05, 0, 1)
    return fades(lp(y + ring * 0.5, 6000, 1), 0.003, 0.1)


# ================================================================ shot 14-16
def wings_flee(dur, r, birds=6):
    """the gulls flee: heavier feathered wingbeats taking off, stereo, dark"""
    out = np.zeros((2, ns(dur)))
    for i in range(birds):
        d = r.uniform(0.6, 1.0) * dur
        s = r.uniform(0, dur - d)
        x = B.flaps(d, r, r.uniform(5.5, 7.0), r.uniform(1.6, 2.2))
        x *= np.sin(np.pi * np.linspace(0, 1, len(x))) ** 0.8
        place(out, pan(x * r.uniform(0.6, 1.0), r.uniform(-0.8, 0.8)), s)
    return lp(out, 2200, 2)


def face_palm(r):
    """palm onto forehead: a soft skin 'slap' (dark) + a little cloth / glasses rattle"""
    d = 0.35
    t = tt(d)
    y = bp(r.standard_normal(len(t)), 300, 2000, 1) * _env(len(t), 0.001, 0.012) * 1.2
    y += np.sin(phase(150 * (1 + 0.3 * np.exp(-t / 0.01)))) * _env(len(t), 0.001, 0.03) * 0.6
    _pm(y, modal(0.1, [(r.uniform(2500, 2900), 0.15, 0.01)], r), 0.01)
    return fades(lp(y, 1600, 2), 0.0, 0.04)


def bulldozer(dur, r):
    """a 1970s bulldozer pushing sand: low diesel chug, track clank, sand pushed in waves; dark, stereo"""
    n = ns(dur)
    t = np.arange(n) / SR
    rpm = 600 + 120 * np.sin(np.linspace(0, 3.0, 64) + r.uniform(0, TAU))
    eng = E.engine(dur, r, rpm * 1.5, 0.4)
    eng = lp(eng, 700, 2) * 1.2
    tr = np.zeros(n)
    tm = 0.0
    while tm < dur:
        _pm(tr, modal(0.08, [(r.uniform(400, 600), 1.0, 0.012), (r.uniform(900, 1300), 0.5, 0.008)], r) * r.uniform(0.15, 0.3), tm)
        tm += 1 / 7.0 * r.uniform(0.9, 1.1)
    sand = bp(colored(n, r, 1.2), 150, 900, 1) * (0.5 + 0.5 * np.abs(np.sin(TAU * 0.7 * t))) * 0.5
    y = eng + lp(tr, 1500, 2) + sand
    return fades(widen(y, r, 9, 0.8), 0.15, 0.3)


def shovel_scrape(r, dur=0.35):
    """a spade into sand + the throw: gritty scrape (stick-slip) and a soft sand pour"""
    n = ns(dur)
    u = np.linspace(0, 1, n)
    sc = bp(colored(n, r, 0.4), 900, 4000, 1) * np.sin(np.pi * u) ** 0.6 * (0.6 + 0.4 * smooth_noise(n, r, 25)) * 0.5
    pour = bp(colored(n, r, 0.8), 300, 2000, 1) * np.clip((u - 0.5) * 4, 0, 1) * np.exp(-np.maximum(u - 0.5, 0) * 4) * 0.4
    return fades(sc + pour, 0.005, 0.04)


def gull_land(r):
    """the seagull lands on the park sign: a few wingbeats braking + a little claw tap on wood"""
    y = B.flaps(0.32, r, 9.0, 1.6) * 0.8
    _pm(y, E.pat(r)[: ns(0.1)] * 0.4, 0.28)
    return fades(lp(np.pad(y, (0, ns(0.12))), 3000, 2), 0.002, 0.04)


def wink_ting(r):
    """cartoon wink 'ting': a tiny very high bell on E8 (above the speech band) over a soft E7 body"""
    d = 1.3
    t = tt(d)
    f = 5274.0
    y = modal(d, [(f, 1.0, 0.45), (f / 2, 0.08, 0.5), (f * 1.5, 0.12, 0.12)], r)
    y += hp(r.standard_normal(len(t)), 5000) * np.exp(-t / 0.0006) * 0.12
    return fades(y * 0.5, 0.0005, 0.1)
