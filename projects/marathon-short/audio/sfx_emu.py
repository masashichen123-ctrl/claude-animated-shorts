# Procedural sound effects for "The Great Emu War" (own numpy synthesis, on top of the shared kit in sfx_gen.py):
# Lewis gun (cracks at ~9.5 rounds/s + drum/bolt rattle + ejected casings), jam clack + spring boing, 1930s truck
# engine / skid / gear crunch / suspension bounce, dust puffs, emu boom (drumming) + grunts, emu footsteps and herd
# thunder, wheat rustle, flies, magpie-like warbles, wall-telephone magneto crank + bells, hammer on steel, pen
# scratch + flourish, brass casings, boots on a parade ground, crates, pats, pecks, feathers, blink.
import numpy as np
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, reson, resbank, peq, colored, smooth_noise, ramp, fades, shape,
                 phase, modal, pan, st, widen, place)
from sfx_gen import _place_mono, clink, rattle, creak, whoosh, SMALLMETAL, CHAIN, WOOD


def _n(r, n):
    return r.standard_normal(n)


# ================================================================ Lewis gun
def lewis_shot(r, close=1.0):
    """one .303 round: supersonic crack + muzzle boom + bolt clack + short outdoor slap-back"""
    d = 0.45
    n = ns(d)
    t = np.arange(n) / SR
    z = _n(r, n)
    crack = hp(z, 900, 2) * np.exp(-t / 0.0025) * 1.6
    nw = np.zeros(n)
    k = ns(0.0006)
    nw[:k] = np.linspace(1, -1, k)
    crack += lp(nw, 9000, 1) * 2.0
    boom = np.exp(-t / 0.045) * np.sin(phase(r.uniform(95, 125) * (1 + 0.6 * np.exp(-t / 0.006)))) * 1.3
    body = bp(z, 250, 2200, 1) * np.exp(-t / 0.018) * 1.0
    clack = np.zeros(n)
    _place_mono(clack, modal(0.06, [(r.uniform(1300, 1600), 1.0, 0.012), (r.uniform(2600, 3300), 0.7, 0.008), (r.uniform(4200, 5200), 0.4, 0.005)], r), 0.022)
    tail = lp(_n(r, n), 1800, 1) * np.exp(-np.maximum(t - 0.03, 0) / 0.11) * (t > 0.025) * 0.22
    y = crack * close + boom + body + clack * 0.55 + tail
    return fades(y, 0.0, 0.05)


def lewis_burst(r, rounds=5, rate=9.4, close=1.0, casings=True):
    """a Lewis-gun burst: rounds at ~rate/s with jitter, the drum's ratchet rattle between rounds, ejected casings"""
    dur = rounds / rate + 0.9
    n = ns(dur)
    y = np.zeros(n)
    times = [k / rate + r.normal(0, 0.003) + 0.005 for k in range(rounds)]
    for tm in times:
        _place_mono(y, lewis_shot(r, close) * r.uniform(0.85, 1.0), tm)
        # ratchet / cocking-rod rattle on the recoil
        for j in range(3):
            _place_mono(y, clink(r, r.uniform(900, 2200), 0.05) * 0.12, tm + 0.04 + j * 0.012)
    if casings:
        for tm in times:
            for j in range(2):
                _place_mono(y, casing_clink(r) * 0.18, tm + r.uniform(0.25, 0.45) + j * r.uniform(0.04, 0.09))
    return fades(y, 0.0, 0.05)


def casing_clink(r):
    """one brass .303 casing landing: tube ring with a few partials"""
    f0 = np.exp(r.uniform(np.log(2600), np.log(5400)))
    y = modal(0.15, [(f0, 1.0, r.uniform(0.02, 0.05)), (f0 * r.uniform(1.48, 1.62), 0.6, 0.025), (f0 * r.uniform(2.6, 2.9), 0.35, 0.012)], r)
    t = tt(0.15)
    y += hp(_n(r, len(t)), 3500) * np.exp(-t / 0.0006) * 0.3
    return y


def casings_cascade(dur, r, env_pts, density=60.0):
    """the mountain of casings glinting / shifting: a cascade of brass clinks + a sliding hiss, density follows env_pts"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.interp(t, [p[0] for p in env_pts], [p[1] for p in env_pts])
    y = np.zeros(n)
    cnt = int(density * dur)
    for tm in np.sort(r.uniform(0, dur - 0.1, cnt)):
        a = env[ns(tm)]
        if a < 0.03 or r.uniform() > a:
            continue
        _place_mono(y, casing_clink(r) * r.uniform(0.3, 1.0), tm)
    y += hp(_n(r, n), 3500, 2) * env * 0.04 * (0.6 + 0.4 * smooth_noise(n, r, 6.0))
    return fades(y, 0.01, 0.2)


def jam_clack(r):
    """gun jams: heavy bolt slam that stops dead (clack) + dull thunk + small smoke 'pff'"""
    d = 0.6
    n = ns(d)
    t = np.arange(n) / SR
    z = _n(r, n)
    clack = modal(d, [(1180, 1.0, 0.02), (2350, 0.8, 0.014), (3700, 0.5, 0.009), (5600, 0.3, 0.005)], r)
    hit = bp(z, 500, 6000, 1) * np.exp(-t / 0.003) * 1.4
    thunk = np.exp(-t / 0.05) * np.sin(phase(150 * (1 + 0.3 * np.exp(-t / 0.01)))) * 0.9
    pff = np.zeros(n)
    _place_mono(pff, puff_noise(r, 0.35, 700, 2500) * 0.35, 0.03)
    return fades(clack + hit + thunk + pff, 0.0, 0.05)


def spring_boing(r, dur=0.95):
    """the drum spring pops out: 'sproing' - a fast up-sweep into a wobbling metallic twang that dies away"""
    n = ns(dur)
    t = np.arange(n) / SR
    f0 = 260.0
    wob = 0.22 * np.exp(-t / 0.35) * np.sin(TAU * 11.0 * t)
    f = f0 * (1 + 0.9 * np.exp(-t / 0.025)) * (1 + wob)
    ph = phase(f)
    y = (np.sin(ph) + 0.45 * np.sin(2.76 * ph) + 0.25 * np.sin(5.4 * ph) + 0.15 * np.sin(8.9 * ph)) * np.exp(-t / 0.32)
    y *= (1 - np.exp(-t / 0.002))
    y += hp(_n(r, n), 2000) * np.exp(-t / 0.004) * 0.5
    return fades(y, 0.0, 0.08)


def cock(r):
    """Lewis cocking handle pulled back and released: ratchet + clack"""
    y = np.zeros(ns(0.35))
    for j in range(5):
        _place_mono(y, clink(r, r.uniform(1500, 2500), 0.05) * 0.4, j * 0.018)
    _place_mono(y, modal(0.15, [(1050, 1.0, 0.02), (2200, 0.7, 0.012), (3600, 0.4, 0.006)], r), 0.16)
    return y


# ================================================================ truck (1930s 4-cylinder)
def engine(dur, r, rpm, load=0.6, gear_whine=0.0):
    """rpm = array (or float) over the clip: firing pulses (rpm/30 Hz for 4 cyl) exciting exhaust + body resonances,
    valve clatter, a little intake hiss; load = brightness / roughness"""
    n = ns(dur)
    rp = np.full(n, rpm, float) if np.isscalar(rpm) else np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(rpm)), rpm)
    rate = rp / 30.0
    x = np.zeros(n)
    tm = 0.0
    i = 0
    while tm < dur:
        k = ns(tm)
        if k >= n:
            break
        x[k] += r.uniform(0.7, 1.0) * (1.0 if i % 4 else 1.15)
        tm += 1.0 / rate[k] * (1 + r.normal(0, 0.03))
        i += 1
    exh = resbank(x, [(r.uniform(62, 72), 3, 1.0), (r.uniform(130, 150), 4, 0.8), (r.uniform(230, 260), 5, 0.5), (r.uniform(420, 470), 6, 0.3)])
    body = resbank(x, [(r.uniform(900, 1100), 8, 0.25), (r.uniform(1900, 2300), 10, 0.15)]) * load
    t = np.arange(n) / SR
    clat = hp(_n(r, n), 2500) * (0.5 + 0.5 * np.sin(phase(rate * 2))) ** 6 * 0.02 * (0.5 + load)
    hiss = bp(colored(n, r, 1.0), 300, 2500, 1) * 0.03 * load
    y = exh + body + clat + hiss
    if gear_whine:
        y += gear_whine * np.sin(phase(rp / 60 * 9.0)) * 0.02
    return fades(lp(y, 6000, 1), 0.05, 0.08)


def skid(r, dur=0.6):
    """tyres skidding on red dirt: gravel crunch grains + scrub hiss falling with speed, ends in a body rock"""
    n = ns(dur)
    t = np.arange(n) / SR
    u = t / dur
    speed = np.clip(1 - u, 0, 1) ** 0.7
    g = np.zeros(n)
    cnt = int(900 * dur)
    for tm in np.sort(r.uniform(0, dur, cnt)):
        k = ns(tm)
        if r.uniform() < speed[k] + 0.05:
            g[k] += r.uniform(-1, 1)
    grit = bp(g, 900, 5000, 2) * 2.5
    scrub = bp(colored(n, r, 0.8), 250, 1400, 1) * speed * 0.6
    hiss = bp(_n(r, n), 1800, 6000, 1) * speed ** 1.5 * 0.25
    y = (grit * speed + scrub + hiss) * np.minimum(1, t / 0.03)
    rock = np.exp(-np.maximum(t - dur * 0.92, 0) / 0.08) * (t > dur * 0.92) * np.sin(TAU * 70 * t) * 0.5
    return fades(y + rock, 0.005, 0.06)


def gear_crunch(r, dur=0.32):
    """crash gearbox: teeth grinding (irregular fast impacts through steel modes) then a clunk as it engages"""
    n = ns(dur)
    x = np.zeros(n)
    tm = 0.0
    while tm < dur * 0.8:
        k = ns(tm)
        x[k] += r.uniform(-1, 1)
        tm += 1 / r.uniform(220, 420)
    env = np.interp(np.arange(n) / SR, [0, 0.03, dur * 0.7, dur * 0.8, dur], [0, 1, 0.8, 0, 0])
    gr = resbank(x * env, [(r.uniform(700, 900), 12, 1.0), (r.uniform(1600, 1900), 14, 0.8), (r.uniform(2700, 3100), 16, 0.6), (r.uniform(4000, 4600), 18, 0.4)])
    gr += bp(_n(r, n), 1000, 5000, 1) * env * 0.15
    clunk = np.zeros(n)
    _place_mono(clunk, modal(0.2, [(180, 1.0, 0.04), (420, 0.6, 0.025), (950, 0.3, 0.012)], r) * 1.2, dur * 0.78)
    return fades(gr + clunk, 0.002, 0.04)


def truck_bounce(r, a=1.0):
    """one bounce on rough ground: suspension thud + leaf-spring creak + tray / gun rattle"""
    d = 0.5
    n = ns(d)
    t = np.arange(n) / SR
    thud = np.exp(-t / 0.07) * np.sin(phase(r.uniform(55, 70) * (1 + 0.3 * np.exp(-t / 0.015)))) * 1.4
    y = thud
    _place_mono(y, creak(0.22, r, 70, 120, CHAIN[:4], rough=0.15) * 0.5, 0.04)
    _place_mono(y, rattle(0.3, r, 60, np.exp(-np.linspace(0, 1, ns(0.3)) * 3), heavy=True) * 0.6, 0.01)
    return y * a


# ================================================================ dust, impacts
def puff_noise(r, dur, lo, hi):
    n = ns(dur)
    t = np.arange(n) / SR
    env = (1 - np.exp(-t / 0.012)) * np.exp(-t / (dur * 0.28))
    return bp(colored(n, r, 0.5), lo, hi, 1) * env


def dust_puff(r, size=1.0):
    """a bullet hitting dirt: dull thud + 'pfft' of dust + a few grains of grit"""
    d = 0.4
    n = ns(d)
    t = np.arange(n) / SR
    thud = np.exp(-t / 0.025) * np.sin(phase(r.uniform(70, 110) * (1 + 0.5 * np.exp(-t / 0.006)))) * 0.9
    pf = puff_noise(r, d, 350, 2600) * 1.4
    g = np.zeros(n)
    for tm in r.uniform(0.01, 0.2, 14):
        g[ns(tm)] += r.uniform(-1, 1)
    grit = hp(g, 2500) * 0.6
    return fades((thud + pf + grit) * size, 0.0, 0.05)


def crate_thud(r, big=1.0):
    """wooden ammo crate set down: box boom + plank knock + rounds rattling inside"""
    d = 0.6
    t = tt(d)
    box = modal(d, [(r.uniform(120, 150), 1.0, 0.07), (r.uniform(290, 340), 0.7, 0.04), (r.uniform(560, 650), 0.45, 0.025), (r.uniform(1000, 1200), 0.25, 0.012)], r)
    knock = bp(_n(r, len(t)), 300, 3000, 1) * np.exp(-t / 0.006) * 0.8
    y = box + knock
    _place_mono(y, rattle(0.25, r, 70, np.exp(-np.linspace(0, 1, ns(0.25)) * 4), heavy=True) * 0.5, 0.01)
    return fades(y * big, 0.0, 0.05)


def pat(r):
    """palm pat on a crate: soft woody thock"""
    d = 0.25
    t = tt(d)
    y = modal(d, [(r.uniform(160, 200), 1.0, 0.035), (r.uniform(380, 450), 0.5, 0.02), (r.uniform(800, 950), 0.2, 0.01)], r)
    y += bp(_n(r, len(t)), 400, 2500, 1) * np.exp(-t / 0.008) * 0.6
    return fades(y, 0.0, 0.03)


def hammer_metal(r, big=1.0):
    """hammer on the steel gun mount / truck tray: bright clang + strike click + tray thunk"""
    d = 0.7
    t = tt(d)
    clang = modal(d, [(r.uniform(1750, 1900), 1.0, 0.16), (r.uniform(2850, 3050), 0.7, 0.1), (r.uniform(4200, 4500), 0.5, 0.06), (r.uniform(6000, 6500), 0.3, 0.03)], r)
    hit = bp(_n(r, len(t)), 800, 8000, 1) * np.exp(-t / 0.002) * 1.2
    tray = modal(d, [(r.uniform(160, 200), 1.0, 0.05), (r.uniform(330, 380), 0.6, 0.03)], r) * 0.8
    return fades((clang * 0.6 + hit + tray) * big, 0.0, 0.08)


def heel_click(r):
    d = 0.2
    t = tt(d)
    y = modal(d, [(r.uniform(900, 1200), 1.0, 0.012), (r.uniform(2200, 2800), 0.6, 0.008)], r)
    y += np.exp(-t / 0.02) * np.sin(TAU * 120 * t) * 0.6 + hp(_n(r, len(t)), 2000) * np.exp(-t / 0.001) * 0.4
    return y


def parade_step(r, men=14, spread=0.006, width=0.7, toy=0.0):
    """a line of men landing the same foot on a hard dirt parade ground: heel thumps + gravel crunch, tiny spread;
    toy > 0 adds a small wooden 'tock' (toy-soldier feel)"""
    d = 0.35
    out = np.zeros((2, ns(d)))
    pre = 0.02
    for i in range(men):
        n = ns(0.25)
        t = np.arange(n) / SR
        heel = np.exp(-t / r.uniform(0.02, 0.035)) * np.sin(phase(r.uniform(85, 125) * (1 + 0.2 * np.exp(-t / 0.01))))
        z = _n(r, n)
        crunch = bp(z, 900, 5000, 1) * np.exp(-t / 0.025) * 0.5
        click = hp(z, 3000) * np.exp(-t / 0.001) * 0.25
        x = heel + crunch + click
        if toy:
            x += modal(0.25, [(r.uniform(1100, 1300), 1.0, 0.015), (r.uniform(2800, 3200), 0.4, 0.006)], r) * toy
        dt = pre + abs(r.normal(0, spread))
        p = float(np.clip((i / max(1, men - 1) - 0.5) * 2 * width, -1, 1))
        k = ns(dt)
        seg = pan(x * r.uniform(0.6, 1.0), p)
        m = min(seg.shape[1], out.shape[1] - k)
        out[:, k:k + m] += seg[:, :m]
    return out, pre


# ================================================================ emus
def emu_boom(r, pulses=5, f0=None, rate=None):
    """the real emu call: a deep drumming boom from the inflatable throat sac - resonant low pulses that speed up"""
    f0 = f0 or r.uniform(60, 80)
    rate = rate or r.uniform(3.2, 4.2)
    times = []
    tm = 0.0
    for i in range(pulses):
        times.append(tm)
        tm += 1 / (rate * (1 + 0.12 * i))
    d = times[-1] + 0.4
    n = ns(d)
    y = np.zeros(n)
    for i, tm in enumerate(times):
        L = 0.22
        t = tt(L)
        e = np.sin(np.pi * np.clip(t / L, 0, 1)) ** 2 * np.exp(-t / 0.12)
        f = f0 * (1 + 0.08 * np.exp(-t / 0.03)) * (1 - 0.03 * i)
        ph = phase(f)
        p = (np.sin(ph) + 0.5 * np.sin(2 * ph + 0.3) + 0.2 * np.sin(3 * ph + 0.9)) * e
        p += lp(_n(r, len(t)), 400, 2) * e * 0.15
        _place_mono(y, p * (0.75 + 0.25 * (i / max(1, pulses - 1))), tm)
    return fades(peq(y, 180, 4.0, 1.2), 0.005, 0.1)


def emu_grunt(r, dur=None):
    """guttural grunt: irregular low glottal pulses through two throat formants"""
    dur = dur or r.uniform(0.12, 0.26)
    n = ns(dur)
    x = np.zeros(n)
    tm = 0.0
    f = r.uniform(38, 60)
    while tm < dur:
        k = ns(tm)
        if k >= n:
            break
        x[k] = r.uniform(0.6, 1.0)
        tm += 1 / f * (1 + r.normal(0, 0.08))
    y = resbank(x, [(r.uniform(230, 300), 5, 1.0), (r.uniform(600, 800), 6, 0.5), (r.uniform(1300, 1600), 8, 0.15)])
    t = np.arange(n) / SR
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7
    return fades(y * env, 0.004, 0.02)


def emu_step(r, weight=1.0):
    """big two-toed bird foot on dirt: soft thud + claw scrape"""
    d = 0.25
    n = ns(d)
    t = np.arange(n) / SR
    thud = np.exp(-t / 0.03) * np.sin(phase(r.uniform(75, 110) * (1 + 0.25 * np.exp(-t / 0.008))))
    z = _n(r, n)
    scrape = bp(z, 1200, 5000, 1) * np.exp(-t / 0.03) * (1 - np.exp(-t / 0.004)) * 0.35
    tap = bp(z, 400, 2000, 1) * np.exp(-t / 0.004) * 0.4
    return fades((thud * weight + scrape + tap), 0.0, 0.03)


def peck(r):
    d = 0.12
    t = tt(d)
    y = modal(d, [(r.uniform(1600, 2100), 1.0, 0.008), (r.uniform(3500, 4200), 0.5, 0.004)], r)
    y += bp(_n(r, len(t)), 500, 3000, 1) * np.exp(-t / 0.01) * 0.5
    return y


def herd(dur, r, density=40.0, env_pts=None, width=0.9, boom_rate=0.0, grunt_rate=0.0, run=True):
    """a herd of emus: many feet (running thunder when run=True) + low rumble + scattered grunts and booms; stereo"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.ones(n) if env_pts is None else np.interp(t, [p[0] for p in env_pts], [p[1] for p in env_pts])
    out = np.zeros((2, n))
    for tm in np.sort(r.uniform(0, dur - 0.2, int(density * dur))):
        a = env[ns(tm)]
        if a < 0.02:
            continue
        s = emu_step(r, r.uniform(0.6, 1.2)) * a * r.uniform(0.3, 1.0)
        if r.uniform() < 0.5:
            s = lp(s, r.uniform(1500, 4000), 1)
        place(out, pan(s, r.uniform(-width, width)), tm)
    if run:
        rum = lp(colored(n, r, 1.5), 160, 2) * env * 0.35 * (0.7 + 0.3 * smooth_noise(n, r, 3.0))
        out += st(rum)
    for rate, fn in ((grunt_rate, lambda: emu_grunt(r)), (boom_rate, lambda: emu_boom(r, int(r.integers(3, 6))))):
        if rate <= 0:
            continue
        tm = r.uniform(0.1, 0.6)
        while tm < dur - 0.3:
            a = env[ns(tm)]
            g = fn() * a * r.uniform(0.3, 0.8)
            seg = pan(g, r.uniform(-width, width))
            k = ns(tm)
            m = min(seg.shape[1], n - k)
            out[:, k:k + m] += seg[:, :m]
            tm += r.exponential(1 / rate) + 0.15
    return fades(out, 0.02, 0.1)


# ================================================================ nature / ambience
def wheat_rustle(dur, r, level=1.0, gust=0.25):
    """dry wheat heads brushing: high crackly rustle that swells with the gusts"""
    n = ns(dur)
    g = 0.45 + 0.55 * (0.5 + 0.5 * smooth_noise(n, r, gust))
    out = np.zeros((2, n))
    for ch in range(2):
        grains = lp(np.abs(_n(r, n)) ** 3, 120, 1)
        grains /= np.std(grains) + 1e-9
        z = bp(_n(r, n), 2200, 9000, 2) * (0.3 + 0.7 * grains)
        z += 0.4 * bp(colored(n, r, 0.5), 700, 2500, 1)
        out[ch] = z * g ** 1.6 * level
    return out


def flies(dur, r, count=2, level=1.0):
    """bush flies buzzing past: wing-beat buzz with doppler-ish pitch wobble, swooping in and out, panning"""
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for i in range(count):
        f0 = r.uniform(175, 235)
        wob = 1 + 0.06 * smooth_noise(n, r, 1.2) + 0.01 * np.sin(TAU * r.uniform(8, 14) * t)
        ph = phase(f0 * wob)
        y = np.zeros(n)
        for k in range(1, 14):
            y += (1 / k ** 0.9) * np.sin(k * ph + r.uniform(0, TAU))
        y = bp(y, 300, 4000, 1)
        amp = np.clip(0.5 + 0.8 * smooth_noise(n, r, 0.5), 0, 1) ** 2
        p = smooth_noise(n, r, 0.3)
        out[0] += y * amp * np.sqrt((1 - p) / 2 + 0.05)
        out[1] += y * amp * np.sqrt((1 + p) / 2 + 0.05)
    return out * level / count


def magpie(r, notes=None):
    """one magpie-like carolling phrase: fluty notes with glides, a two-voice moment and a gargle"""
    notes = notes or int(r.integers(4, 8))
    segs = []
    tm = 0.0
    y = np.zeros(ns(4.0))
    for i in range(notes):
        L = r.uniform(0.08, 0.3)
        tl = tt(L)
        f0 = r.uniform(700, 2200)
        f1 = f0 * 2 ** (r.uniform(-0.6, 0.6))
        f = f0 + (f1 - f0) * (tl / L) ** r.uniform(0.6, 1.6)
        ph = phase(f)
        e = np.sin(np.pi * tl / L) ** 1.2
        v = np.sin(ph) + 0.12 * np.sin(2 * ph)
        if r.uniform() < 0.3:                      # gargle (fast AM)
            v *= 0.6 + 0.4 * np.sin(TAU * r.uniform(35, 60) * tl)
        if r.uniform() < 0.25:                     # two-voice syrinx moment
            v += 0.5 * np.sin(phase(f * r.uniform(1.25, 1.5)))
        _place_mono(y, v * e * r.uniform(0.5, 1.0), tm)
        tm += L + r.uniform(0.02, 0.12)
    return fades(y[: ns(tm + 0.1)], 0.003, 0.03)


def magpies(dur, r, density=0.25, width=0.8):
    n = ns(dur)
    out = np.zeros((2, n))
    tm = r.uniform(0.3, 1.5)
    while tm < dur - 2.0:
        m = magpie(r)
        seg = pan(m * r.uniform(0.5, 1.0), r.uniform(-width, width))
        k = ns(tm)
        mm = min(seg.shape[1], n - k)
        out[:, k:k + mm] += seg[:, :mm]
        tm += r.exponential(1 / density) + seg.shape[1] / SR + 0.5
    return out


def lamp_hiss(dur, r):
    n = ns(dur)
    return bp(_n(r, n), 2500, 9000, 1) * (0.85 + 0.15 * smooth_noise(n, r, 2.0))


# ================================================================ telephone, pen, feathers, blink
def phone_crank(r, dur=0.75, bells=True):
    """magneto wall telephone: crank ratchet + generator hum rising with the crank speed + the twin bells ringing"""
    n = ns(dur)
    t = np.arange(n) / SR
    spd = np.clip(t / 0.15, 0, 1) * np.clip((dur - t) / 0.1, 0, 1)
    rev = 3.2 * spd
    clicks = np.zeros(n)
    tm = 0.0
    while tm < dur:
        k = ns(tm)
        if k >= n:
            break
        if spd[k] > 0.05:
            clicks[k] += r.uniform(0.6, 1.0)
        tm += 1 / max(rev[k] * 12, 6)
    rat = resbank(clicks, [(r.uniform(1700, 2000), 14, 1.0), (r.uniform(3200, 3600), 16, 0.6), (r.uniform(700, 850), 10, 0.5)])
    gen = np.sin(phase(np.maximum(rev, 0.01) * 40)) * spd * 0.12 + np.sin(phase(np.maximum(rev, 0.01) * 80)) * spd * 0.05
    y = rat + gen
    if bells:
        tm = 0.03
        i = 0
        while tm < dur - 0.02:
            if spd[ns(tm)] > 0.3:
                f0 = 1250 if i % 2 else 1480
                b_ = modal(0.6, [(f0 * r.uniform(0.995, 1.005), 1.0, 0.35), (f0 * 2.72, 0.45, 0.12), (f0 * 5.1, 0.2, 0.05)], r)
                _place_mono(y, b_ * 0.55, tm)
            tm += 1 / 17.0
            i += 1
    return fades(y, 0.002, 0.05)


def pen_scratch(dur, r, strokes=6.0):
    """steel nib on paper: grainy high scratches in strokes"""
    n = ns(dur)
    t = np.arange(n) / SR
    strk = lp(np.clip(np.sin(phase(strokes * (1 + 0.2 * smooth_noise(n, r, 2.0)))), 0, 1) ** 0.7, 60, 2)
    grains = lp(np.abs(_n(r, n)) ** 4, 400, 1)
    grains /= np.std(grains) + 1e-9
    y = bp(_n(r, n), 2500, 8000, 2) * (0.4 + 0.6 * grains) * strk
    return fades(y, 0.01, 0.03)


def pen_flourish(r, dur=0.45):
    """one bold flourish: fast accelerating stroke with a rising scratch band, ending in a tap (full stop)"""
    n = ns(dur)
    t = np.arange(n) / SR
    u = t / dur
    env = np.sin(np.pi * np.clip(u / 0.8, 0, 1)) ** 0.8 * (u < 0.8) * np.minimum(1, t / 0.025)
    z = _n(r, n)
    fc = lambda T: 3000 + 3500 * np.interp(T, t, np.clip(u / 0.8, 0, 1))
    y = shape(z, lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / fc(T)[None, :]) / 0.5) ** 2), 512, 128) * env
    grains = lp(np.abs(_n(r, n)) ** 4, 600, 1)
    y *= 0.5 + 0.5 * grains / (np.std(grains) + 1e-9)
    tap = np.zeros(n)
    _place_mono(tap, modal(0.06, [(2600, 1.0, 0.006), (4100, 0.5, 0.004)], r) * 0.6, dur * 0.88)
    return fades(y + tap, 0.005, 0.02)


def feathers(r, dur=0.45):
    """emu turning its head: soft feather/neck rustle"""
    n = ns(dur)
    t = np.arange(n) / SR
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return bp(colored(n, r, 0.6), 900, 6000, 1) * env * (0.6 + 0.4 * smooth_noise(n, r, 12.0))


def blink(r):
    """cartoon blink: tiny soft double 'plip'"""
    y = np.zeros(ns(0.2))
    for k, (f, a) in enumerate([(2300, 1.0), (2900, 0.6)]):
        _place_mono(y, modal(0.08, [(f, 1.0, 0.01), (f * 2.1, 0.3, 0.005)], r) * a, k * 0.055)
    return y


def salute(r):
    """two soldiers snapping to attention: heel clicks + a hand-to-hat swish"""
    y = np.zeros(ns(0.5))
    _place_mono(y, heel_click(r), 0.0)
    _place_mono(y, heel_click(r) * 0.8, 0.018)
    _place_mono(y, whoosh(0.2, r, 0.06, 900, 3500, 0.7, 0.05, 0.2) * 0.4, 0.06)
    return y
