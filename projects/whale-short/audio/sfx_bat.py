# Procedural sound effects for "The Bat Bomb" (own numpy synthesis, no samples): cute bat squeaks and wing
# flutters, swarms, a bomb casing popping open, rooftop fire pops + fire crackle beds, light-bulb plink, strap and
# buckle, clockwork timer ticks, cartoon poof, approval stamp, tweezers clink, tiny bicep flex, crate lid pop,
# sniffing, the fuel-tank WHOOMP, buckets and running feet, the car 'puff', folder in a wastebasket, wink ting,
# night/desert/base/lab/office ambiences. Every generator returns mono (n,) or stereo (2, n) float arrays.
import numpy as np
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, phase, modal, pan, st, widen, place)
import sfx_gen as G
import sfx_emu as E


def _env(n, att, tau):
    t = np.arange(n) / SR
    return (1 - np.exp(-t / max(att, 1e-4))) * np.exp(-t / tau)


# ================================================================ bats
def squeak(r, f0=None, dur=None, up=None):
    """one cute bat chirp: a short rounded sine chirp (2-3.4 kHz) with a soft 2nd harmonic; never piercing"""
    f0 = f0 or r.uniform(2100, 3300)
    dur = dur or r.uniform(0.05, 0.09)
    n = ns(dur)
    t = np.arange(n) / SR
    u = t / dur
    up = r.random() < 0.5 if up is None else up
    glide = (1 + 0.22 * (u if up else 1 - u)) * (1 + 0.04 * np.sin(TAU * 38 * t))
    ph = phase(f0 * glide)
    y = np.sin(ph) + 0.18 * np.sin(2 * ph + 0.4)
    e = np.sin(np.pi * np.clip(u, 0, 1)) ** 1.6
    return lp(y * e, 5500, 2)


def squeaks(r, k=3, gap=0.07, length=0.45):
    """a little 'eek-eek-eek' phrase (fixed buffer length so phrases can be summed)"""
    y = np.zeros(ns(max(length, k * gap * 1.15 + 0.1)))
    f = r.uniform(2300, 3000)
    for i in range(k):
        G._place_mono(y, squeak(r, f * r.uniform(0.92, 1.12), r.uniform(0.04, 0.07)) * r.uniform(0.6, 1.0), i * gap * r.uniform(0.85, 1.15))
    return y


def flaps(dur, r, rate=11.0, size=1.0):
    """one bat's leathery wingbeats: a soft air 'fff' per downstroke + a tiny membrane flick"""
    n = ns(dur)
    y = np.zeros(n)
    tm = r.uniform(0, 1 / rate)
    nz = colored(n + ns(0.2), r, 0.7)
    while tm < dur:
        L = ns(0.06)
        k = ns(tm)
        seg = nz[k:k + L]
        e = np.sin(np.pi * np.linspace(0, 1, len(seg))) ** 2
        flick = np.zeros(len(seg))
        flick[:ns(0.004)] = r.uniform(0.4, 0.8)
        a = r.uniform(0.6, 1.0)
        G._place_mono(y, (seg * e + 0.5 * flick * r.uniform(-1, 1)) * a, tm)
        tm += (1 / rate) * r.uniform(0.85, 1.15)
    y = bp(y, 250 / size, 2600 / size, 1)
    return fades(y, 0.01, 0.03)


def flutter(dur, r, count=4, width=0.8, rate=11.0, squeak_rate=0.0):
    """a few bats fluttering past (stereo): wingbeats with slow pans + the odd squeak"""
    out = np.zeros((2, ns(dur)))
    for i in range(count):
        d = r.uniform(0.5, 1.0) * dur
        s = r.uniform(0, dur - d) if dur - d > 0 else 0.0
        x = flaps(d, r, rate * r.uniform(0.85, 1.2), r.uniform(0.85, 1.2))
        x *= np.sin(np.pi * np.linspace(0, 1, len(x))) ** 0.8
        p0, p1 = r.uniform(-width, width), r.uniform(-width, width)
        pp = np.linspace(p0, p1, len(x))
        th = (pp + 1) * np.pi / 4
        place(out, np.stack([x * np.cos(th), x * np.sin(th)]) * np.sqrt(2) * r.uniform(0.6, 1.0), s)
    if squeak_rate:
        tm = r.exponential(1 / squeak_rate)
        while tm < dur - 0.1:
            place(out, pan(squeak(r) * r.uniform(0.15, 0.35), r.uniform(-width, width)), tm)
            tm += r.exponential(1 / squeak_rate)
    return out


def swarm(dur, r, env_pts, density=1.0, width=1.0, squeak_rate=6.0):
    """hundreds of bats: a soft rushing wing-roar (many flaps averaged into a ripple) + sparse cute squeaks"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.interp(t, [p[0] for p in env_pts], [p[1] for p in env_pts])
    out = np.zeros((2, n))
    for ch in range(2):
        nz = colored(n, r, 0.8)
        rip = 0.55 + 0.45 * np.abs(np.sin(phase(11 + 2.5 * smooth_noise(n, r, 1.2))))
        rip2 = 0.6 + 0.4 * np.abs(np.sin(phase(13.5 + 2 * smooth_noise(n, r, 1.0))))
        out[ch] = bp(nz, 300, 3000, 1) * rip * rip2 * (0.7 + 0.3 * smooth_noise(n, r, 2.0))
    out += flutter(dur, r, int(6 * density), width, 12.0) * 1.2
    out *= env[None, :]
    tm = r.exponential(1 / squeak_rate)
    while tm < dur - 0.1:
        a = float(np.interp(tm, t[::100], env[::100]))
        place(out, pan(squeak(r) * r.uniform(0.1, 0.3) * a, r.uniform(-width, width)), tm)
        tm += r.exponential(1 / squeak_rate)
    return fades(out, 0.02, 0.08)


def swarm_whoosh(r, dur=1.6, peak=0.25):
    """the swarm bursting out: an airy whoosh that opens up into wings + squeaks"""
    w = G.whoosh(dur, r, peak, 300, 2400, 0.9, 0.5, 0.12)
    x = widen(w, r, 13, 1.0) * 1.2
    x += swarm(dur, r, [(0, 0), (peak, 1.0), (dur * 0.6, 0.7), (dur, 0)], 1.2, 1.0, 14.0)
    return x


# ================================================================ hook / base
def casing_pop(r):
    """the bomb casing's panels pop open: latch 'tchk' + hollow metal 'bonk' + panels springing out"""
    d = 0.9
    t = tt(d)
    latch = modal(d, [(2300, 0.6, 0.008), (3700, 0.4, 0.005)], r) + hp(r.standard_normal(len(t)), 2000) * np.exp(-t / 0.0015) * 0.6
    bonk = modal(d, [(r.uniform(210, 240), 1.0, 0.12), (r.uniform(520, 560), 0.6, 0.08), (r.uniform(930, 990), 0.35, 0.05), (1540, 0.2, 0.03)], r, glide=0.04)
    y = latch * 0.6
    G._place_mono(y, bonk, 0.012)
    for k in range(4):                                    # four panels flapping open, a hair apart
        tm = 0.03 + 0.025 * k + r.uniform(0, 0.01)
        G._place_mono(y, modal(0.25, [(r.uniform(650, 900), 0.5, 0.03), (r.uniform(1500, 1900), 0.3, 0.015)], r) * 0.5, tm)
    y += lp(r.standard_normal(len(t)), 500, 2) * np.exp(-t / 0.03) * 0.5
    return fades(y, 0.0, 0.1)


def kick_thump(r, weight=1.0):
    """picture KICK: a soft round low thump (felt more than heard; nothing above ~300 Hz to mask a word)"""
    d = 0.6
    t = tt(d)
    y = np.exp(-t / 0.12) * np.sin(phase(56 * (1 + 0.7 * np.exp(-t / 0.018)))) * (1 - np.exp(-t / 0.002))
    y += lp(r.standard_normal(len(t)), 220, 2) * np.exp(-t / 0.02) * 0.4
    return fades(lp(y, 300, 2) * weight, 0.0, 0.08)


def fire_pop(r, size=1.0):
    """a little rooftop fire catching: soft 'fwump' (air) + a pop + a few crackles"""
    d = 0.7
    n = ns(d)
    t = np.arange(n) / SR
    fw = bp(colored(n, r, 1.2), 120, 1400, 1) * (1 - np.exp(-t / 0.02)) * np.exp(-t / 0.14) * 1.3
    pop = np.exp(-t / 0.03) * np.sin(phase(r.uniform(95, 130) * (1 + 0.6 * np.exp(-t / 0.008)))) * 0.7
    y = fw + pop
    G._place_mono(y, crackle(0.5, r, 22, 0.6), 0.04)
    return fades(y * size, 0.002, 0.08)


def crackle(dur, r, density=30.0, level=1.0, bright=1.0):
    """fire crackle: random wood snaps (short broadband ticks, some ringing a little) - mono"""
    n = ns(dur)
    y = np.zeros(n)
    cnt = int(density * dur) + 1
    for tm in np.sort(r.uniform(0, dur, cnt)):
        L = ns(r.uniform(0.002, 0.012))
        k = ns(tm)
        if k + L >= n:
            continue
        seg = r.standard_normal(L) * np.exp(-np.arange(L) / (L * 0.3)) * r.uniform(0.2, 1.0) ** 2
        y[k:k + L] += seg
    y = bp(y, 900, 5000 * bright, 1)
    return y * level * 3


def fire_bed(dur, r, size=1.0, density=26.0):
    """burning buildings: low roar (rumbling brown noise, slowly breathing) + crackle, stereo"""
    n = ns(dur)
    out = np.zeros((2, n))
    for ch in range(2):
        roar = lp(colored(n, r, 2.0), 380, 2) * (0.7 + 0.3 * smooth_noise(n, r, 0.8))
        flick = bp(colored(n, r, 1.0), 400, 1600, 1) * 0.25 * (0.5 + 0.5 * smooth_noise(n, r, 3.0))
        out[ch] = roar * size + flick + crackle(dur, r, density / 2, 0.9)
    return out


# ================================================================ workshop / attic / office / lab
def bulb_plink(r):
    """the idea light bulb pops on: a glassy 'plink' + the filament's tiny buzz settling"""
    d = 0.9
    t = tt(d)
    f = 2350.0
    y = modal(d, [(f, 1.0, 0.25), (f * 2.32, 0.35, 0.09), (f * 3.9, 0.12, 0.04)], r)
    y += hp(r.standard_normal(len(t)), 3500) * np.exp(-t / 0.0008) * 0.3
    buzz = np.sin(TAU * 120 * t) * 0.5 + np.sin(TAU * 240 * t) * 0.3
    y += bp(buzz * (1 + 0.3 * r.standard_normal(len(t))), 200, 1500, 1) * np.exp(-t / 0.2) * (1 - np.exp(-t / 0.02)) * 0.08
    return fades(y * 0.6, 0.0, 0.1)


def strap_buckle(r):
    """leather harness pulled snug (short creak) then the buckle: two little clinks"""
    y = np.zeros(ns(0.55))
    c = G.creak(0.22, r, 70, 120, [(400, 8, 1.0), (900, 10, 0.6), (1700, 12, 0.3)], [(0, 0), (0.3, 1), (0.8, 0.8), (1, 0)], 0.15, 0.08, 1.0)
    G._place_mono(y, c * 0.6, 0.0)
    G._place_mono(y, bp(colored(ns(0.18), r, 0.5), 1500, 6000, 1) * np.sin(np.pi * np.linspace(0, 1, ns(0.18))) * 0.2, 0.02)
    G._place_mono(y, lp(G.clink(r, 3100, 0.12, 0.6), 7000, 1) * 0.6, 0.22)
    G._place_mono(y, lp(G.clink(r, 3900, 0.15, 0.6), 7000, 1) * 0.45, 0.28)
    return fades(y, 0.002, 0.05)


def tick(r, tock=False, size=1.0):
    """tiny clockwork tick (escapement click + case ring)"""
    d = 0.06
    t = tt(d)
    f = 3200 if not tock else 2500
    y = modal(d, [(f * r.uniform(0.98, 1.02), 1.0, 0.006), (f * 1.8, 0.5, 0.004), (f * 0.42, 0.3, 0.01)], r)
    y += hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.0007) * 0.5
    return lp(y * size, 7000, 1)


def ticking(dur, r, rate=6.0, voices=1, spread=0.025):
    """`voices` timers ticking at slightly different phases (stereo spread)"""
    out = np.zeros((2, ns(dur)))
    for v in range(voices):
        tm = v * spread + r.uniform(0, 0.01)
        k = 0
        p = 0.0 if voices == 1 else -0.7 + 1.4 * v / (voices - 1)
        rt = rate * r.uniform(0.97, 1.03)
        while tm < dur - 0.05:
            place(out, pan(tick(r, k % 2 == 1, r.uniform(0.8, 1.0)), p), tm)
            tm += 1 / rt
            k += 1
    return out


def poof(r, size=1.0):
    """cartoon 'POOF' spark puff: soft round 'pff' of air + a tiny pop + a fizz of sparkles"""
    d = 0.8
    n = ns(d)
    t = np.arange(n) / SR
    pf = bp(colored(n, r, 0.8), 250, 2200, 1) * (1 - np.exp(-t / 0.012)) * np.exp(-t / 0.11) * 1.4
    pop = np.exp(-t / 0.025) * np.sin(phase(160 * (1 + 0.8 * np.exp(-t / 0.006)))) * 0.6
    fizz = np.zeros(n)
    for tm in r.uniform(0.03, 0.35, 10):
        G._place_mono(fizz, modal(0.05, [(r.uniform(3000, 5000), 1.0, 0.008)], r) * r.uniform(0.1, 0.25), tm)
    return fades((pf + pop + fizz) * size, 0.0, 0.08)


def stamp(r):
    """approval stamp slammed on the desk: wooden handle + desk thunk, paper slap, ink-pad squish"""
    d = 0.7
    t = tt(d)
    desk = modal(d, [(r.uniform(105, 120), 1.0, 0.09), (r.uniform(240, 270), 0.8, 0.06), (r.uniform(470, 520), 0.5, 0.035), (900, 0.25, 0.02)], r, glide=0.03)
    slap = bp(r.standard_normal(len(t)), 700, 5000, 1) * np.exp(-t / 0.006) * 0.9
    sub = np.exp(-t / 0.06) * np.sin(phase(70 * (1 + 0.4 * np.exp(-t / 0.01)))) * 0.8
    sq = bp(colored(len(t), r, 0.5), 400, 2000, 1) * np.clip((t - 0.03) / 0.03, 0, 1) * np.exp(-np.maximum(t - 0.03, 0) / 0.05) * 0.12
    return fades(desk + slap + sub + sq, 0.0, 0.08)


def tweezers_clink(r):
    """steel tweezers closing on the tiny capsule: two delicate clinks"""
    y = np.zeros(ns(0.3))
    G._place_mono(y, lp(G.clink(r, 4300, 0.18, 0.5), 8000, 1), 0.0)
    G._place_mono(y, lp(G.clink(r, 5200, 0.14, 0.4), 8000, 1) * 0.5, 0.045)
    return y


def flex(r):
    """the bat flexes a tiny bicep: a cute rising rubbery 'mmp!' squeak + a soft fabric creak"""
    d = 0.32
    n = ns(d)
    t = np.arange(n) / SR
    f = 700 * (1 + 0.9 * np.clip(t / 0.22, 0, 1) ** 1.5) * (1 + 0.02 * np.sin(TAU * 24 * t))
    ph = phase(f)
    y = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.2
    y = lp(y, 4000, 2) * 0.6
    y += bp(colored(n, r, 0.6), 900, 4000, 1) * np.sin(np.pi * np.clip(t / d, 0, 1)) * 0.08
    return fades(y, 0.003, 0.03)


def bubbling(dur, r, level=1.0):
    """lab glassware: flasks bubbling softly"""
    return G.bubbles(dur, r, 9.0, 500, 2200, (0.01, 0.03), None, (6, 14)) * level


def crate_lid_pop(r):
    """the crate lid pops: nail squeak + wooden 'thock' + the lid clattering down"""
    y = np.zeros(ns(0.9))
    G._place_mono(y, G.creak(0.12, r, 300, 520, G.WOOD, [(0, 0), (0.5, 1), (1, 0.4)], 0.1, 0.03, 1.3) * 0.4, 0.0)
    G._place_mono(y, E.pat(r) * 1.4, 0.11)
    G._place_mono(y, modal(0.25, [(r.uniform(250, 300), 0.8, 0.04), (r.uniform(600, 700), 0.4, 0.02)], r) * 0.8, 0.12)
    for k, tm in enumerate([0.42, 0.53, 0.6]):
        G._place_mono(y, E.pat(r) * [0.6, 0.35, 0.2][k], tm)
    return fades(y, 0.002, 0.05)


def sniff(r, k=2):
    """a bat's quick little sniffs (short inhales through a tiny nose)"""
    y = np.zeros(ns(0.1 + 0.13 * k))
    for i in range(k):
        d = r.uniform(0.07, 0.1)
        n = ns(d)
        e = np.sin(np.pi * np.linspace(0, 1, n)) ** 0.7 * np.linspace(0.6, 1.0, n)
        x = bp(colored(n, r, 0.3), 2500, 7500, 2) * e
        x += bp(colored(n, r, 0.5), 900, 2000, 1) * e * 0.4
        G._place_mono(y, x * r.uniform(0.7, 1.0), i * 0.12)
    return fades(y, 0.002, 0.02)


def head_shake(r):
    """tiny ears flapping in a head shake: brrrp"""
    d = 0.22
    n = ns(d)
    t = np.arange(n) / SR
    m = 0.5 + 0.5 * np.sin(TAU * 22 * t)
    return fades(bp(colored(n, r, 0.6), 600, 3500, 1) * m ** 2 * np.sin(np.pi * t / d), 0.003, 0.02) * 0.5


# ================================================================ the fireball and after
def whoomp(r):
    """the fuel tank goes WHOOMP: short suck-in, a round low boom (sub glide), the air 'whoomp' body, roaring
    tail; mostly below 1.5 kHz so it can sit under 'worked perfectly' without eating the consonants. Stereo."""
    pre = 0.18
    d = 2.6
    n = ns(pre + d)
    t = np.arange(n) / SR
    u = t - pre
    after = (u >= 0)
    suck = G.whoosh(pre + 0.02, r, pre, 300, 1200, 0.9, 0.01, 0.0) * 0.25
    boom = np.where(after, np.exp(-np.maximum(u, 0) / 0.32) * np.sin(phase(np.where(after, 46 * (1 + 0.9 * np.exp(-np.maximum(u, 0) / 0.05)), 0))), 0) * (1 - np.exp(-np.maximum(u, 0) / 0.004))
    body_env = np.where(after, (1 - np.exp(-np.maximum(u, 0) / 0.02)) * np.exp(-np.maximum(u, 0) / 0.45), 0)
    out = np.zeros((2, n))
    for ch in range(2):
        b_ = lp(colored(n, r, 1.6), 900, 2) * body_env * 1.4
        roar = lp(colored(n, r, 2.0), 300, 2) * np.where(after, (1 - np.exp(-np.maximum(u, 0) / 0.15)) * np.exp(-np.maximum(u, 0) / 0.6), 0) * 0.9
        out[ch] = b_ + roar + boom * 1.3
    G._place_mono(out[0], suck, 0.0)
    G._place_mono(out[1], suck, 0.0)
    cr = np.zeros((2, n))
    place(cr, widen(crackle(d - 0.3, r, 18, 0.3, 0.6), r, 9, 1.0) * np.linspace(1, 0.15, ns(d - 0.3))[None, :], pre + 0.25)
    out += cr
    return fades(out, 0.005, 0.3), pre


def bucket(r, water=True):
    """tin bucket swinging: handle clank + a slosh"""
    y = np.zeros(ns(0.6))
    G._place_mono(y, modal(0.35, [(r.uniform(900, 1100), 0.8, 0.05), (r.uniform(1900, 2300), 0.5, 0.03), (r.uniform(3200, 3600), 0.3, 0.02)], r) * 0.5, 0.0)
    G._place_mono(y, lp(G.clink(r, 2600, 0.1, 0.5), 6000, 1) * 0.4, 0.02)
    if water:
        d = 0.4
        n = ns(d)
        e = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
        G._place_mono(y, bp(colored(n, r, 0.8), 300, 2200, 1) * e * (0.6 + 0.4 * smooth_noise(n, r, 12)) * 0.6, 0.05)
    return fades(y, 0.002, 0.05)


def running(dur, r, men=4, rate=3.2, width=0.8):
    """soldiers jogging past on dirt (bucket line): quick scuffy steps, stereo"""
    out = np.zeros((2, ns(dur)))
    for m in range(men):
        tm = r.uniform(0, 1 / rate)
        p = r.uniform(-width, width)
        rt = rate * r.uniform(0.9, 1.1)
        while tm < dur - 0.3:
            s = G.stroll_step(r, 0.9) * r.uniform(0.5, 0.9)
            place(out, pan(lp(s, 3500, 1), p), tm)
            tm += 1 / rt * r.uniform(0.93, 1.07)
    return out


def car_puff(r):
    """the General's car goes 'puff': a soft heavy 'pfoomf', the body sagging (metal creak) and four tyres
    going flat (descending hiss); no bang"""
    d = 1.6
    n = ns(d)
    t = np.arange(n) / SR
    y = bp(colored(n, r, 1.2), 120, 1500, 1) * (1 - np.exp(-t / 0.015)) * np.exp(-t / 0.16) * 1.4
    y += np.exp(-t / 0.08) * np.sin(phase(75 * (1 + 0.5 * np.exp(-t / 0.01)))) * 0.8
    sag = G.creak(0.5, r, 90, 45, G.CHAIN[:4], [(0, 0), (0.3, 1), (0.8, 0.6), (1, 0)], 0.15, 0.02, 0.8)
    G._place_mono(y, sag * 0.35, 0.22)
    for k in range(4):
        hd = r.uniform(0.5, 0.8)
        hn = ns(hd)
        ht = np.arange(hn) / SR
        hiss = bp(colored(hn, r, 0.3), 1800, 5000, 1) * np.exp(-ht / (hd * 0.4)) * (1 - np.exp(-ht / 0.01))
        G._place_mono(y, lp(hiss, 4000, 1) * 0.12, 0.3 + 0.09 * k)
    return fades(y, 0.002, 0.1)


def polish_squeak(r):
    """cloth rubbing a shiny car: little squeegee 'squik'"""
    d = r.uniform(0.12, 0.18)
    n = ns(d)
    t = np.arange(n) / SR
    f = r.uniform(1100, 1400) * (1 + 0.25 * np.sin(np.pi * t / d))
    y = (np.sin(phase(f)) + 0.3 * np.sin(2 * phase(f))) * np.sin(np.pi * t / d) ** 2
    y += bp(colored(n, r, 0.4), 1500, 6000, 1) * np.sin(np.pi * t / d) * 0.25
    return fades(lp(y, 5000, 2) * 0.4, 0.003, 0.02)


def folder_thunk(r):
    """a thick folder dropped into a tin wastebasket: dull paper thunk + the bin's short metal ring + papers settling"""
    d = 0.9
    t = tt(d)
    th = np.exp(-t / 0.05) * np.sin(phase(r.uniform(95, 110) * (1 + 0.4 * np.exp(-t / 0.01)))) * 1.0
    th += bp(r.standard_normal(len(t)), 300, 2500, 1) * np.exp(-t / 0.012) * 0.7
    ring = modal(d, [(r.uniform(330, 360), 0.5, 0.18), (r.uniform(780, 820), 0.35, 0.12), (r.uniform(1350, 1450), 0.2, 0.08), (2250, 0.08, 0.05)], r)
    y = th + ring * 0.5
    pap = bp(colored(ns(0.3), r, 0.4), 1500, 6000, 1) * np.sin(np.pi * np.linspace(0, 1, ns(0.3))) * 0.08
    G._place_mono(y, pap, 0.06)
    return fades(y, 0.0, 0.1)


def wink_ting(r):
    """cartoon wink 'ting': a small bright bell (triangle-like, soft)"""
    d = 1.4
    t = tt(d)
    f = 2637.0                     # E7, sits on the final Fmaj9 colour (the 7th)
    y = modal(d, [(f, 1.0, 0.6), (f * 2.76, 0.25, 0.2), (f * 5.4, 0.06, 0.06)], r)
    y += hp(r.standard_normal(len(t)), 5000) * np.exp(-t / 0.0006) * 0.15
    return fades(y * 0.5, 0.0005, 0.1)


# ================================================================ ambiences (each returns stereo)
def night_desert(dur, r, wind=1.0, crick=0.012):
    out = G.breeze(dur, r, wind, 0.12, 600)
    out += widen(G.crickets(dur, r, 4) * crick, r, 9, 1.0)
    return out


def base_dusk(dur, r):
    """army air base at dusk: breeze, flag lines clinking on a pole, a far generator hum"""
    n = ns(dur)
    t = np.arange(n) / SR
    out = G.breeze(dur, r, 0.9, 0.15, 800)
    hum = (np.sin(TAU * 60 * t) + 0.5 * np.sin(TAU * 120 * t)) * 0.012
    out += pan(lp(hum, 300, 1), -0.4)
    out += pan(G.flag_flutter(dur, r) * 0.12, 0.4)
    return out


def room(dur, r, warm=500, level=1.0):
    """quiet interior room tone"""
    out = np.zeros((2, ns(dur)))
    for ch in range(2):
        out[ch] = lp(colored(ns(dur), r, 1.5), warm, 2) * level
    return out


def wall_clock(dur, r, rate=1.0, level=0.15, p=0.5):
    y = np.zeros((2, ns(dur)))
    tm = r.uniform(0.1, 0.5)
    k = 0
    while tm < dur - 0.1:
        place(y, pan(lp(tick(r, k % 2 == 1), 3000, 1) * level, p), tm)
        tm += 1 / rate
        k += 1
    return y
