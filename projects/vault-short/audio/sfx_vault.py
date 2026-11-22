# Procedural sound effects specific to "The Time Lock" (own numpy synthesis, built on the helpers of the earlier shorts):
# night town (crickets, owl), crowbar toss + clank, soft-soled tiptoe, cobble steps, the deep vault-door groan, key jingle,
# wheel + bolt mechanics, workshop (gears, tinkering, pencil), springs, clockwork assembly + ticking, the prairie town (breeze,
# horse, bell), ribbon snip, face-palm slaps, rope, cards, knitting, bird, coin bags, the modern vault hum, guard-clock steps.
import numpy as np
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, phase, modal, pan, st, place, widen)
import sfx_gen as G
import sfx_emu as E
import sfx_bat as B
import sfx_marathon as M
import sfx_chicago as C

pm = G._place_mono


def _e(n, att, tau):
    t = np.arange(n) / SR
    return (1 - np.exp(-t / max(att, 1e-4))) * np.exp(-t / tau)


# ---------------------------------------------------------------- ambiences (stereo)
def night_town(dur, r, level=1.0):
    """a still night in a small town: soft crickets (a few voices, wide), a faint breeze, a far dog's hush"""
    n = ns(dur)
    out = np.zeros((2, n))
    for i in range(3):
        out += pan(lp(G.crickets(dur, r, 2), 6000, 1) * 0.5, [-0.7, 0.1, 0.75][i])
    out += G.breeze(dur, r, 0.55, 0.12, 500)
    return out * level


def owl(r, hoots=2):
    """a far owl: soft rounded 'hoo ... hoo-hoooo' (sine + 2nd harmonic with a slight downward bend, dark)"""
    out = np.zeros(ns(1.2))
    tm = 0.0
    for k in range(hoots):
        L = 0.12 if k < hoots - 1 else 0.2
        n = ns(L)
        t = np.arange(n) / SR
        f = 410 * (1 - 0.08 * t / L)
        y = (np.sin(phase(f)) + 0.25 * np.sin(2 * phase(f))) * np.sin(np.pi * np.clip(t / L, 0, 1)) ** 1.3
        pm(out, y, tm)
        tm += L + 0.06
    return fades(lp(out, 900, 2), 0.01, 0.05)


def vault_room(dur, r, level=1.0):
    """a dark bank interior at night: a low room tone, a faint candle flicker, one far timber tick now and then"""
    n = ns(dur)
    out = np.zeros((2, n))
    out += widen(lp(colored(n, r, 1.5), 260, 2) * 0.5, r, 9, 0.8)
    cf = B.crackle(dur, r, 4.0, 0.12, 0.5)
    out += pan(lp(cf, 1500, 1), 0.3)
    return out * level


def workshop(dur, r, level=1.0):
    """a cluttered workshop: a warm room tone, gear whirs (small mechanisms spinning up and down), tinkering clinks, a wall clock"""
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    out += widen(lp(colored(n, r, 1.2), 420, 2) * 0.35, r, 9, 0.7)
    for k in range(int(dur * 0.7) + 1):                                  # gear whirs: a ratcheting turn that spins up and ebbs
        a = r.uniform(0.2, dur - 0.5)
        L = r.uniform(0.25, 0.6)
        m = ns(L)
        tl = np.arange(m) / SR
        rate = 28 + 50 * np.sin(np.pi * tl / L)
        click = np.clip(np.sin(phase(rate)), 0, 1) ** 4
        w = bp(r.standard_normal(m), 350, 1800, 1) * click * np.sin(np.pi * tl / L) ** 0.8
        pm_st = pan(lp(w, 1800, 1) * 0.45, r.uniform(-0.6, 0.6))
        place(out, pm_st, a)
    for k in range(int(dur * 1.6)):                                      # tinkering: small metal clinks and taps
        a = r.uniform(0.1, dur - 0.2)
        c = lp(G.clink(r, np.exp(r.uniform(np.log(1500), np.log(3800))), 0.1, 0.5), 4500, 1) * r.uniform(0.15, 0.5)
        place(out, pan(c, r.uniform(-0.7, 0.7)), a)
    out += B.wall_clock(dur, r, 0.9, 0.12, 0.55)
    return out * level


def prairie(dur, r, level=1.0):
    """a bright prairie town: a dry breeze through fields, a far meadowlark phrase or two, a slow cart with a horse"""
    n = ns(dur)
    out = G.breeze(dur, r, 0.7, 0.15, 800)
    out += widen(G.bird_chirps(dur, r, 0.25, "blackbird") * 0.05, r, 9, 1.0)
    out += C.hooves(dur, r, 1.5, 0.14, 0.6, 0.4)
    out += C.murmur(dur, r, 6, 0.25, 1100)
    return out * level


def modern_hum(dur, r, level=1.0):
    """a modern vault room: a low 60 / 120 Hz mains hum, a faint air-handling hiss, a tiny electronic whine"""
    n = ns(dur)
    t = np.arange(n) / SR
    h = np.sin(TAU * 60 * t) * 0.5 + np.sin(TAU * 120 * t) * 0.28 + np.sin(TAU * 180 * t) * 0.08
    h *= 0.8 + 0.2 * smooth_noise(n, r, 0.3)
    air = lp(colored(n, r, 0.6), 900, 2) * 0.12
    return pan(h + air, 0.0) * level


# ---------------------------------------------------------------- the night heist
def crowbar_toss(r):
    """a crowbar tossed over a shoulder: a dark whoosh + a short iron 'whirr' (dark, quiet)"""
    return lp(G.whoosh(0.34, r, 0.4, 200, 900, 0.9, 0.2, 0.08), 1000, 2)


def crowbar_clank(r):
    """the iron bar clanging on cobbles and bouncing: three decaying iron clanks (1.1-3.4 kHz modes), the last a rattle"""
    out = np.zeros(ns(1.0))
    for k, (tm, a) in enumerate(((0.0, 1.0), (0.17, 0.55), (0.30, 0.3), (0.38, 0.15))):
        f = r.uniform(1100, 1500) * (1 + 0.03 * k)
        c = modal(0.5, [(f, 1.0, 0.09), (f * 2.38, 0.6, 0.05), (f * 3.9, 0.35, 0.03), (r.uniform(160, 200), 0.5, 0.06)], r)
        c += hp(r.standard_normal(ns(0.5)), 2500) * np.exp(-tt(0.5) / 0.0012) * 0.5
        pm(out, c * a, tm)
    return fades(out[: ns(0.26)], 0.0, 0.1)


def tiptoe_steps(r, k=5, gap=0.30):
    """soft-soled sneaking steps: tiny dark 'pf' of leather on cobbles"""
    out = np.zeros((2, ns(k * gap + 0.2)))
    for i in range(k):
        d = 0.12
        y = np.sin(phase(r.uniform(90, 120) * (1 + 0.4 * np.exp(-tt(d) / 0.01)))) * _e(ns(d), 0.002, 0.025)
        y += bp(r.standard_normal(ns(d)), 400, 1800, 1) * _e(ns(d), 0.001, 0.008) * 0.5
        place(out, pan(lp(y, 1100, 2) * r.uniform(0.6, 1.0), -0.6 + 1.2 * (i % 2)), i * gap)
    return out


def candle(dur, r):
    """a candle flame: a faint flutter and tiny crackles, dark"""
    n = ns(dur)
    y = lp(colored(n, r, 0.7), 900, 2) * (0.3 + 0.7 * smooth_noise(n, r, 5.0)) * 0.15 + B.crackle(dur, r, 7.0, 0.1, 0.5) * 0.4
    return pan(lp(y, 2500, 1), 0.4)


def cobble_step(r, soft=1.0, slipper=False):
    """one step on cobbles: a heel thump + a dull stone 'tok' (dark); slipper = a slapping flop"""
    d = 0.2
    t = tt(d)
    if slipper:
        y = np.sin(phase(r.uniform(70, 90) * (1 + 0.3 * np.exp(-t / 0.01)))) * _e(len(t), 0.002, 0.03) * 0.7
        y += bp(r.standard_normal(len(t)), 300, 1500, 1) * _e(len(t), 0.002, 0.012) * 0.5
        return fades(lp(y * soft, 900, 2), 0.0, 0.04)
    y = np.sin(phase(r.uniform(85, 115) * (1 + 0.25 * np.exp(-t / 0.012)))) * _e(len(t), 0.001, 0.04)
    y += modal(d, [(r.uniform(520, 700), 0.45, 0.012), (r.uniform(1100, 1500), 0.25, 0.008)], r)
    y += bp(r.standard_normal(len(t)), 400, 2500, 1) * _e(len(t), 0.0005, 0.006) * 0.5
    return fades(lp(y * soft, 1600, 2), 0.0, 0.05)


def march_cobbles(dur, r, beat, banker=True):
    """two robbers' boots on every beat (alternating sides), the third leading, the banker's slippers flopping on the off-beats"""
    out = np.zeros((2, ns(dur + 0.3)))
    tm, k = 0.0, 0
    while tm < dur - 0.1:
        place(out, pan(cobble_step(r, 1.0 if k % 2 == 0 else 0.85), -0.35 if k % 2 == 0 else 0.35), tm)
        place(out, pan(cobble_step(r, 0.7), -0.6 if k % 2 == 0 else 0.6), tm + 0.012)
        if banker:
            place(out, pan(cobble_step(r, 0.55, True), 0.0), tm + beat / 2)
        tm += beat * (1 + r.normal(0, 0.006))
        k += 1
    return out[:, : ns(dur)]


def vault_groan(dur, r, dark=330, bright_gap=None):
    """the huge vault door: a very deep, slow groan, a stick-slip creak in heavy timber / iron modes (rate 9 -> 24 Hz) low-passed
    at `dark` Hz, plus a sub swell (38-60 Hz). Mono-compatible stereo."""
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for ch, (a, b) in enumerate(((9, 24), (11, 27))):
        c = G.creak(dur, r, a, b, G.TIMBER, [(0, 0), (0.3, 0.7), (0.6, 1.0), (1, 0)], 0.35, 0.01, 0.55)
        out[ch] += lp(c, dark, 3)
    sub = np.sin(phase(42 + 18 * np.sin(np.pi * t / dur))) * np.sin(np.pi * t / dur) ** 1.5 * 0.8
    out += pan(sub, 0.0)
    return out


def creak_bright(dur, r):
    """the upper half of the same groan (metal hinge squeal at 500-1800 Hz); placed only in a narration gap"""
    c = G.creak(dur, r, 26, 60, G.WOOD, [(0, 0), (0.3, 1), (0.7, 0.8), (1, 0)], 0.25, 0.01, 1.7)
    return fades(bp(c, 500, 2400, 1), 0.02, 0.08)


def key_jingle(r, dur=0.5, level=1.0):
    """a ring of old keys jangling: a cloud of small bright metal clinks (1.5-4.5 kHz), thinning out"""
    n = ns(dur)
    y = np.zeros(n)
    for tm in np.sort(r.uniform(0, dur * 0.85, 12)):
        a = np.exp(-tm / (dur * 0.5))
        pm(y, G.clink(r, np.exp(r.uniform(np.log(1900), np.log(4300))), 0.14, 0.7) * r.uniform(0.4, 1.0) * a, tm)
    return fades(y * level, 0.001, 0.1)


def knee_knock(r):
    """a knobbly knee knocking its twin through a nightshirt: a dull wooden-ish 'tup' (dark)"""
    d = 0.14
    t = tt(d)
    y = modal(d, [(r.uniform(210, 260), 1.0, 0.03), (r.uniform(480, 560), 0.4, 0.015)], r)
    y += bp(r.standard_normal(len(t)), 300, 1200, 1) * np.exp(-t / 0.005) * 0.4
    return fades(lp(y, 1000, 2), 0.0, 0.03)


def wheel_turn(dur, r, rate=7.0, dark=700, level=1.0):
    """the big spoked wheel turning a heavy bolt: slow iron ratchet 'krk ... krk' (a pawl over teeth), dark and weighty"""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    tm = 0.02
    while tm < dur - 0.1:
        c = modal(0.12, [(r.uniform(240, 300), 1.0, 0.025), (r.uniform(520, 640), 0.7, 0.02), (r.uniform(1150, 1400), 0.3, 0.01)], r)
        c += bp(r.standard_normal(ns(0.12)), 600, 3500, 1) * np.exp(-tt(0.12) / 0.002) * 0.7
        pm(y, c * r.uniform(0.7, 1.0), tm)
        tm += (1 / rate) * r.uniform(0.85, 1.15)
    y += lp(colored(n, r, 1.5), 200, 2) * 0.5 * np.sin(np.pi * t / dur)
    return pan(fades(lp(y, dark, 2) * level, 0.02, 0.05), 0.0)


def golden_shimmer(r, dur=1.4):
    """golden light spilling out: a soft airy swell with a few shimmering high partials (bright, in the gap only)"""
    n = ns(dur)
    t = np.arange(n) / SR
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.6
    y = bp(colored(n, r, 0.3), 1500, 6500, 1) * e * 0.25
    for f in (1760, 2217, 2637, 3520):
        y += np.sin(TAU * f * t + r.uniform(0, TAU)) * e * 0.12 * (0.6 + 0.4 * np.sin(TAU * r.uniform(3, 6) * t))
    return fades(widen(y, r, 11, 0.8), 0.05, 0.3)


# ---------------------------------------------------------------- the workshop
def spark_ping(r):
    """a yellow idea-spark: a bright little 'ting' (A7 + 5th partials) with a rising sparkle fizz"""
    d = 1.0
    t = tt(d)
    y = modal(d, [(3520.0, 1.0, 0.16), (3520 * 1.5, 0.35, 0.1), (3520 * 2.76, 0.2, 0.05)], r)
    fz = np.zeros(len(t))
    for k, tm in enumerate(np.sort(r.uniform(0.02, 0.3, 9))):
        pm(fz, modal(0.05, [(2800 + 600 * k + r.uniform(-100, 100), 1.0, 0.01)], r) * 0.2, tm)
    y += fz + hp(r.standard_normal(len(t)), 5000) * np.exp(-t / 0.0006) * 0.12
    return fades(y[: ns(0.5)] * 0.5, 0.0005, 0.12)


def pre_spark(r):
    """the dark little 'pip' of the idea lighting up (low and short, sits on the frame under 'clever')"""
    d = 0.18
    t = tt(d)
    y = np.sin(phase(330 * (1 + 0.8 * np.exp(-t / 0.02)))) * _e(len(t), 0.001, 0.03)
    return fades(lp(y, 700, 2), 0.0, 0.05)


def pencil(dur, r, strokes=7.0):
    """a soft pencil scribbling over a blueprint: duller than a nib, 1.5-5 kHz grain in strokes"""
    n = ns(dur)
    s = E.pen_scratch(dur, r, strokes)
    return fades(lp(s, 5000, 1) * 0.8, 0.02, 0.05)


def screwdriver_pop(r):
    """a screwdriver prying the clock's case open: a tiny metal creak, then a woody 'pop'"""
    d = 0.45
    t = tt(d)
    y = np.zeros(len(t))
    pm(y, G.creak(0.25, r, 70, 110, G.SMALLMETAL, None, 0.2, 0.01, 0.3) * 0.4, 0.0)
    pop = modal(0.2, [(r.uniform(300, 380), 1.0, 0.025), (r.uniform(900, 1100), 0.5, 0.015)], r)
    pop += bp(r.standard_normal(ns(0.2)), 500, 3000, 1) * np.exp(-tt(0.2) / 0.004)
    pm(y, pop, 0.06)
    return fades(lp(y, 1800, 2), 0.005, 0.1)


def springs(r, k=12, dur=1.6):
    """clock springs and little gears spilling over the bench and bouncing: soft 'boing' coils (300-900 Hz, a slow wobble)
    bouncing with shrinking gaps, a few small clinks"""
    out = np.zeros(ns(dur + 0.6))
    tm, gap = 0.0, 0.2
    for i in range(k):
        L = r.uniform(0.25, 0.5)
        n = ns(L)
        t = np.arange(n) / SR
        f = r.uniform(300, 900)
        y = np.sin(phase(f * (1 + 0.02 * np.sin(TAU * r.uniform(14, 24) * t)))) * np.exp(-t / (L * 0.4)) * _e(n, 0.002, 1.0)
        y += 0.3 * np.sin(phase(2.01 * f * (1 + 0.02 * np.sin(TAU * 20 * t)))) * np.exp(-t / (L * 0.2))
        pm(out, y * r.uniform(0.3, 1.0), tm)
        if i % 2 == 0:
            pm(out, G.clink(r, r.uniform(1800, 3200), 0.08, 0.4) * 0.3, tm + r.uniform(0, 0.05))
        tm += gap
        gap = max(0.05, gap * 0.82)
    return fades(out, 0.001, 0.3)


def assemble_clicks(r, n=7, span=0.27):
    """gears and springs snapping together: tiny dry clicks climbing in pitch, a final soft 'chk'"""
    out = np.zeros(ns(span + 0.2))
    for i in range(n):
        f = 900 + 350 * i
        c = modal(0.05, [(f, 1.0, 0.006), (f * 2.1, 0.4, 0.004)], r) + hp(r.standard_normal(ns(0.05)), 2000) * np.exp(-tt(0.05) / 0.0008) * 0.4
        pm(out, c * (0.5 + 0.5 * i / n), i * span / n)
    pm(out, modal(0.12, [(520, 1.0, 0.03), (1250, 0.4, 0.015)], r) * 0.9, span)
    return fades(lp(out, 3500, 1), 0.0, 0.1)


def clock_ticks(dur, r, t0, beat, size=1.0, dark=2400):
    """steady clockwork ticking on the music's beat grid: a tick (3 kHz escapement click) and a lower tock, alternating"""
    out = np.zeros((2, ns(dur)))
    tm, k = t0, 0
    while tm < dur - 0.05:
        x = B.tick(r, k % 2 == 1, size * (1.0 if k % 2 == 0 else 0.9))
        place(out, pan(lp(x, dark, 2), 0.0), tm)
        tm += beat
        k += 1
    return out


def bolt_click(r):
    """a clock arm locking the bolt: a short 'ka-chk' of steel on steel, dark and weighty"""
    d = 0.3
    t = tt(d)
    y = modal(d, [(r.uniform(900, 1000), 1.0, 0.02), (r.uniform(1900, 2100), 0.6, 0.012), (r.uniform(320, 380), 0.8, 0.03)], r)
    y += hp(r.standard_normal(len(t)), 1500) * np.exp(-t / 0.001) * 0.6
    pm(y, modal(0.2, [(r.uniform(520, 600), 1.0, 0.03)], r) * 0.7, 0.07)
    return fades(lp(y, 2600, 2), 0.0, 0.08)


def lock_clack(r, size=1.0):
    """the held bolt refusing to move: a firm steel 'clack' (the wheel stopping dead), dark"""
    d = 0.35
    t = tt(d)
    y = modal(d, [(r.uniform(300, 360), 1.0, 0.05), (r.uniform(720, 800), 0.8, 0.03), (r.uniform(1500, 1700), 0.4, 0.015)], r)
    y += bp(r.standard_normal(len(t)), 500, 3000, 1) * np.exp(-t / 0.002) * 0.9
    return fades(lp(y * size, 1800, 2), 0.0, 0.1)


def tiny_rattle(r, dur=0.3):
    """the tiny shake of the stuck mechanism after the clack: a cloud of very small dull rattles"""
    n = ns(dur)
    y = np.zeros(n)
    for tm in np.sort(r.uniform(0, dur * 0.8, 8)):
        pm(y, G.clink(r, r.uniform(900, 1700), 0.07, 0.3) * np.exp(-tm / (dur * 0.5)) * r.uniform(0.3, 1.0), tm)
    return fades(lp(y, 2200, 1), 0.001, 0.08)


# ---------------------------------------------------------------- Morrison
def horse(r, dur=0.9):
    """a horse's soft nicker: a breathy pulsing 'hhrrrnnh' (sawtooth with a falling glide, throat formants 600 / 1900 Hz)"""
    n = ns(dur)
    t = np.arange(n) / SR
    f = 330 * (1 + 0.3 * np.exp(-t / 0.35)) * (1 + 0.03 * np.sin(TAU * 7 * t))
    ph = phase(f)
    y = sum(np.sin(k * ph) / k for k in range(1, 14))
    y = bp(y, 450, 2600, 1) * (0.55 + 0.45 * np.clip(np.sin(TAU * 17 * t), 0, 1)) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.2
    y += bp(r.standard_normal(n), 400, 2200, 1) * np.sin(np.pi * np.clip(t / dur, 0, 1)) * 0.12
    return fades(lp(y, 2200, 2) * 0.4, 0.04, 0.2)


def far_bell(r, dur=2.0, f=392.0, damp=1.0):
    """a distant church bell: a strike with the classic inharmonic partials (0.5, 1, 1.2, 1.5, 2, 2.5), a long soft decay, dark"""
    modes = [(f * m, a, tau * damp) for m, a, tau in ((0.5, 0.7, 1.3), (1.0, 1.0, 1.1), (1.2, 0.5, 0.9), (1.5, 0.35, 0.7), (2.0, 0.4, 0.6), (2.5, 0.15, 0.4))]
    y = modal(dur, modes, r)
    y += lp(r.standard_normal(ns(dur)), 1500, 1) * np.exp(-tt(dur) / 0.004) * 0.2
    return fades(lp(y * 0.5, 2600, 2), 0.001, min(0.4, dur * 0.4))


def bolting_clunk(r):
    """bolting the great door onto the frame: a heavy iron 'THUNK' with a wrench ratchet tail (dark)"""
    y = np.pad(C.iron_clunk(r), (0, ns(0.2)))
    pm(y, wheel_turn(0.18, r, 18, 1200).mean(0), 0.55)
    return y


def hand_pat_dark(r):
    """a proud pat on the great steel door: a dull 'pomp' (palm on cold steel, a faint ring)"""
    d = 0.4
    t = tt(d)
    y = modal(d, [(r.uniform(190, 230), 1.0, 0.07), (r.uniform(500, 600), 0.5, 0.05), (r.uniform(1050, 1250), 0.3, 0.03)], r)
    y += bp(r.standard_normal(len(t)), 500, 2500, 1) * np.exp(-t / 0.006) * 0.5
    return fades(lp(y, 1400, 2), 0.0, 0.1)


def ribbon_snip(r):
    """scissors snipping a ribbon: a bright steel 'snik' (two quick blade rings) + a soft cloth fall"""
    d = 0.4
    t = tt(d)
    y = modal(0.12, [(r.uniform(3400, 3700), 1.0, 0.012), (r.uniform(5200, 5700), 0.6, 0.008), (r.uniform(2100, 2300), 0.4, 0.02)], r)
    y += hp(r.standard_normal(ns(0.12)), 3000) * np.exp(-tt(0.12) / 0.0015) * 0.7
    y = np.pad(y, (0, ns(0.28)))
    pm(y, bp(r.standard_normal(ns(0.25)), 300, 1800, 1) * _e(ns(0.25), 0.02, 0.07) * 0.18, 0.1)
    return fades(y, 0.0, 0.1)


# ---------------------------------------------------------------- the night return, the waiting
def palm_slap(r, size=1.0):
    """a palm slapping a forehead: a quick 'pap' (hollow skull resonance ~400 Hz + a skin slap, 1-3 kHz)"""
    d = 0.2
    t = tt(d)
    y = modal(d, [(r.uniform(380, 460), 1.0, 0.03), (r.uniform(900, 1100), 0.4, 0.015)], r)
    y += bp(r.standard_normal(len(t)), 900, 3800, 1) * np.exp(-t / 0.004) * 0.9
    return fades(lp(y * size, 3800, 1), 0.0, 0.06)


def palm_dull(r):
    """the same face-palm heard as a dull 'pomp' (dark, sits on the frame under 'neither')"""
    return fades(lp(palm_slap(r, 0.8), 700, 2), 0.0, 0.05)


def fist_shake(r, dur=0.6):
    """a robber shaking his fist: a cloth swish + a couple of arm 'whff's (dark)"""
    n = ns(dur)
    t = np.arange(n) / SR
    sw = 0.5 + 0.5 * np.sin(TAU * 5.5 * t - 1.5)
    y = bp(colored(n, r, 0.5), 250, 1500, 1) * sw ** 2 * np.sin(np.pi * np.clip(t / dur, 0, 1)) * 0.6
    return fades(lp(y, 1100, 2), 0.04, 0.1)


def rope_tie(dur, r):
    """rope being wound and knotted: a dry fibrous rustle (bp 500-2800 Hz with a slow wobble), a final tug 'thup'"""
    n = ns(dur)
    t = np.arange(n) / SR
    wob = 0.45 + 0.55 * np.clip(np.sin(phase(9 * (1 + 0.2 * smooth_noise(n, r, 2.0)))), 0, 1)
    y = bp(colored(n, r, 0.3), 500, 2800, 1) * wob * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7 * 0.5
    tug = modal(0.15, [(r.uniform(120, 150), 1.0, 0.03), (r.uniform(300, 360), 0.4, 0.02)], r) * 0.6
    pm(y, tug, dur - 0.18)
    return fades(lp(y, 2800, 1), 0.02, 0.05)


def card_shuffle(r, dur=0.4):
    """a riffle shuffle: a fast run of small card flicks (bp 2.5-7.5 kHz) that speeds up, a final snap"""
    n = ns(dur)
    y = np.zeros(n)
    tm = 0.0
    gap = 0.03
    while tm < dur - 0.06:
        c = bp(r.standard_normal(ns(0.012)), 2500, 7500, 1) * np.exp(-tt(0.012) / 0.003) * r.uniform(0.4, 1.0)
        pm(y, c, tm)
        tm += gap * r.uniform(0.7, 1.2)
        gap = max(0.008, gap * 0.93)
    pm(y, bp(r.standard_normal(ns(0.02)), 1500, 6000, 1) * np.exp(-tt(0.02) / 0.004) * 0.7, dur - 0.05)
    return fades(y, 0.0, 0.04)


def knit_clicks(dur, r, rate=5.5):
    """knitting needles clicking: tiny bright-dull 'tik ... tak' pairs (bamboo-ish, 1.2-2.6 kHz)"""
    n = ns(dur)
    y = np.zeros(n)
    tm, k = r.uniform(0, 0.1), 0
    while tm < dur - 0.05:
        f = 1300 if k % 2 == 0 else 1750
        c = modal(0.05, [(f * r.uniform(0.96, 1.04), 1.0, 0.007), (f * 2.4, 0.3, 0.004)], r)
        pm(y, c * r.uniform(0.5, 1.0), tm)
        tm += (1 / rate) * r.uniform(0.85, 1.15)
        k += 1
    return pan(lp(y, 3000, 1), 0.4)


def bird_chip(r):
    """a small bird chirping: three quick falling 'tsee' chips (3.8-5.2 kHz)"""
    out = np.zeros(ns(0.5))
    for j in range(3):
        L = r.uniform(0.05, 0.07)
        tl = tt(L)
        f = r.uniform(4200, 5200) * (1 - 0.3 * tl / L)
        pm(out, np.sin(phase(f)) * np.sin(np.pi * tl / L) ** 2 * (1 - 0.15 * j), j * 0.13)
    return fades(out * 0.8, 0.002, 0.05)


def smug_tick(r, size=1.0, bright=False):
    """the clock's tiny smug 'tick': a single short wooden tick, a hair too deliberate"""
    x = B.tick(r, False, size)
    return lp(x, 4500 if bright else 2000, 2)


# ---------------------------------------------------------------- the queue, the modern vault
def coin_bag_thump(r, size=1.0):
    """a heavy bag of coins set down: a soft dull 'thump' (dark)"""
    d = 0.3
    t = tt(d)
    y = np.sin(phase(r.uniform(70, 95) * (1 + 0.3 * np.exp(-t / 0.015)))) * _e(len(t), 0.003, 0.06)
    y += bp(colored(len(t), r, 0.6), 200, 1200, 1) * _e(len(t), 0.003, 0.03) * 0.4
    return fades(lp(y * size, 800, 2), 0.0, 0.06)


def coin_chinks(r, dur=0.7):
    """coins shifting in a bag: a cloud of bright little chinks (2.5-6 kHz) thinning out"""
    n = ns(dur)
    y = np.zeros(n)
    for tm in np.sort(r.uniform(0, dur * 0.8, 14)):
        pm(y, G.clink(r, np.exp(r.uniform(np.log(2500), np.log(5800))), 0.1, 0.5) * np.exp(-tm / (dur * 0.5)) * r.uniform(0.3, 1.0), tm)
    return fades(y, 0.001, 0.15)


def guard_steps(r, k=5, gap=0.3125):
    """the guard clock's stiff little legs: tiny hard 'tik' taps (a cartoon marching in place), dark-ish"""
    out = np.zeros((2, ns(k * gap + 0.2)))
    for i in range(k):
        d = 0.1
        t = tt(d)
        y = modal(d, [(r.uniform(700, 820), 1.0, 0.012), (r.uniform(1500, 1800), 0.4, 0.008)], r)
        y += np.sin(phase(110 * (1 + 0.3 * np.exp(-t / 0.01)))) * _e(len(t), 0.001, 0.015) * 0.7
        place(out, pan(lp(y, 1800, 2), -0.3 + 0.6 * (i % 2)), i * gap)
    return out


def murmur_queue(dur, r):
    """a patient queue of bankers: a low murmur, a cough, shoes shuffling (dark)"""
    out = C.murmur(dur, r, 9, 1.0, 900)
    out += pan(lp(colored(ns(dur), r, 1.0), 700, 2) * 0.05, 0.0)
    return out
