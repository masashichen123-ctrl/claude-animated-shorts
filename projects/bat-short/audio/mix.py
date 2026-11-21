# Final mix of "The Great Emu War": voice (gain only) + original score (ducked under speech, per-section level
# automation relative to the voice) + synthesized SFX stem (lightly ducked under speech). Keying = words.json spans,
# widened by the voice's own measured activity (analysis only: the voice itself is never processed beyond gain).
# Master gain to -14 LUFS integrated; own 4x-oversampled look-ahead limiter for <= -1 dBTP;
# exactly 59.000 s = 2,832,000 samples / 48 kHz / stereo / 24-bit.
# Writes public/emu/mix.wav + voice/mix_final.wav (same file), audio/out/stem_*.wav, audio/cues.md.
# One command:  python3 audio/mix.py      (music cached in audio/out/_cache/; --fresh re-renders everything)
import os
import sys
import time
import json
import shutil
import subprocess
import numpy as np
from scipy import ndimage, signal
from dsp import (SR, ns, st, dbg, read_wav, write_wav, integrated, momentary, short_term, lra, true_peak, fades, hp)
import timeline as T

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, "out")
CACHE = os.path.join(OUT, "_cache")
N = ns(T.DUR)                    # 2,832,000 samples = 59.000 s
TARGET_LUFS = -14.0
CEIL_DBTP = -1.3                 # limiter ceiling (spec: true peak <= -1.0 dBTP)
DUCK_DB = -3.0                   # gentle music dip while the voice speaks (slow attack / release, no pumping)
SFX_DUCK_DB = -3.0               # SFX dip while the voice speaks
MUSIC_UNDER = -18.5              # music vs voice, LU, over the spoken parts of each section (after the duck)
GAP_BLOOM_DB = 4.0               # extra lift in narration gaps >= GAP_MIN s (with the duck release: ~ -11 LU under the voice)
GAP_MIN = 0.55

# per-section offsets (dB) on top of MUSIC_UNDER
SEC_OFFSET = {"unlucky": -1.0, "ending": -4.0, "lost": -1.5}
# rides on the music only (start, end, dB)
RIDES = [(40.15, 40.70, -2.0)]   # 'Unluckily,'


def log(*a):
    print(f"[{time.strftime('%H:%M:%S')}]", *a, flush=True)


def cached(name, fn, fresh=False):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, name + ".npy")
    if os.path.exists(p) and not fresh:
        log("cache hit", name)
        return np.load(p).astype(np.float64)
    x = fn()
    np.save(p, np.asarray(x, np.float32))
    return x


# ================================================================ voice + speech key
def load_voice():
    x, sr = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
    assert sr == SR, sr
    v = x[0] if x.shape[0] == 1 else x.mean(0)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return st(out)


def voice_activity(v, thr_db=40.0, merge=0.12):
    """measured speech regions (10 ms RMS within thr_db of the peak); used to widen the words.json key"""
    h = ns(0.01)
    e = np.sqrt(np.convolve(v[0] ** 2, np.ones(h) / h, "same"))[::h]
    db = 20 * np.log10(e + 1e-9)
    on = db > db.max() - thr_db
    segs, s = [], None
    for i, o in enumerate(on):
        if o and s is None:
            s = i
        if (not o) and s is not None:
            if i - s > 2:
                segs.append([s / 100, i / 100])
            s = None
    m = []
    for a, b in segs:
        if m and a - m[-1][1] < merge:
            m[-1][1] = b
        else:
            m.append([a, b])
    return m


def key_spans(v):
    sp = T.speech_spans() + voice_activity(v)
    sp.sort()
    m = []
    for a, b in sp:
        if m and a - m[-1][1] < 0.15:
            m[-1][1] = max(m[-1][1], b)
        else:
            m.append([a, b])
    return m


def duck_curve(spans, depth, pre=0.06, post=0.1, att=0.05, rel=0.25):  # noqa
    return _duck(spans, depth, pre, post, att, rel)


def _duck(spans, depth, pre, post, att, rel):
    ctrl = 1000
    nc = int(T.DUR * ctrl) + 2
    va = np.zeros(nc)
    for s, e in spans:
        va[max(0, int((s - pre) * ctrl)): int((e + post) * ctrl)] = 1.0
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc)
    e = 0.0
    for i in range(nc):
        tgt = va[i]
        e += (tgt - e) * (ka if tgt > e else kr)
        env[i] = e
    return np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth * env)


def gap_bloom(spans):
    """+GAP_BLOOM_DB in the longer narration gaps (and before the first / after the last word), 0.3 s ramps"""
    d = np.zeros(N)
    edges = [(-1.0, 0.0)] + [tuple(x) for x in spans] + [(T.DUR + 1, T.DUR + 2)]
    for (a0, a1), (b0, b1) in zip(edges[:-1], edges[1:]):
        if b0 - a1 >= GAP_MIN:
            d[max(0, ns(a1 + 0.12)): max(0, ns(b0 - 0.2))] = GAP_BLOOM_DB
    return ndimage.uniform_filter1d(d, ns(0.3), mode="nearest")


def speech_mask(spans):
    m = np.zeros(N, bool)
    for a, b in spans:
        m[ns(a): ns(b)] = True
    return m


# ================================================================ music level automation
def section_curve(m_d, v, mask):
    import music
    gains = {}
    prev = 0.0
    for name, a, b in music.SECTIONS:
        seg = slice(ns(a), ns(b))
        k = mask[seg]
        if k.sum() > ns(0.4):
            Lm, Lv = integrated(m_d[:, seg][:, k]), integrated(v[:, seg][:, k])
        else:
            Lm, Lv = integrated(m_d[:, seg]), integrated(v[:, seg]) if np.any(v[:, seg]) else -99
        g = (Lv + MUSIC_UNDER + SEC_OFFSET.get(name, 0.0) - Lm) if (np.isfinite(Lm) and Lv > -90) else prev
        if name == "jam":                       # music is silent here (only the room tail): keep the dam level
            g = prev
        gains[name] = float(np.clip(g, -30, 30))
        prev = gains[name]
    t = np.arange(N) / SR
    curve = np.zeros(N)
    for name, a, b in music.SECTIONS:
        curve[t >= a] = gains[name]
    sm = ndimage.uniform_filter1d(curve, ns(0.12), mode="nearest")      # 120 ms crossfade between section levels
    hard = np.zeros(N, bool)
    for tb in (T.fr(T.FLASH),):                              # silent / hit boundaries switch instantly
        hard[ns(tb - 0.1): ns(tb + 0.1)] = True
    curve = np.where(hard, curve, sm)
    for a, b, db in RIDES:
        d = np.zeros(N)
        d[ns(a): ns(b)] = db
        curve += ndimage.uniform_filter1d(d, ns(0.06), mode="nearest")
    return curve, gains


# ================================================================ limiter
def limiter(x, ceil_db=CEIL_DBTP, look=0.003, rel=0.08):
    """4x-oversampled peak detection, look-ahead min filter, release one-pole, centred smoothing -> gain curve"""
    c = dbg(ceil_db)
    n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    g2 = g1.copy()
    idx = np.flatnonzero(g1 < 1.0)
    if len(idx):
        kr = 1 - np.exp(-1 / (rel * SR))
        gap = ns(rel * 8)
        brk = np.flatnonzero(np.diff(idx) > gap)
        starts = np.concatenate([[idx[0]], idx[brk + 1]])
        ends = np.concatenate([idx[brk], [idx[-1]]])
        for a, b_ in zip(starts, ends):
            e = min(n, b_ + gap)
            seg = g1[a:e]
            out = np.empty(len(seg))
            g = 1.0
            for k in range(len(seg)):
                g = min(seg[k], g + (1 - g) * kr)
                out[k] = g
            g2[a:e] = out
    g3 = ndimage.uniform_filter1d(g2, 2 * La + 1, mode="nearest")
    g3 = np.minimum(g3, 1.0)
    return x * g3[None, :], g3


# ================================================================ checks
def lufs(x):
    v = integrated(x)
    return v if np.isfinite(v) else -99.0


def click_check(y, sfx_stem, music_stem, events, music_cuts):
    """discontinuity check at every placed SFX event (start + end, on the SFX stem) and every music cut (on the music
    stem), plus the same boundaries in the final mix: the largest sample-to-sample jump within +-3 ms of the boundary
    vs the largest jump in the 40 ms before it. Flagged when > 4x (12 dB) and not a designed transient (an event whose
    own dry signal jumps that much in its first 15 ms). Returns (n_checked, list of suspicious points)."""
    pts = []
    for (name, t0, t1, own_jump) in events:
        pts.append((t0, name, "start", own_jump, sfx_stem))
        pts.append((t1, name, "end", 0.0, sfx_stem))
    for tb in music_cuts:
        pts.append((tb, "music cut", "cut", 0.0, music_stem))
    bad = []
    dd = {}
    for tb, name, kind, own, stem in pts:
        k = ns(tb)
        if k < ns(0.05) or k > N - ns(0.01):
            continue
        key = id(stem)
        if key not in dd:
            dd[key] = np.abs(np.diff(stem, axis=1)).max(0)
        d = dd[key]
        w = d[k - ns(0.003): k + ns(0.003)].max()
        ref = d[k - ns(0.043): k - ns(0.003)].max() + 1e-9
        if w > 4 * ref and w > 0.01 and w > 2 * own:
            bad.append((round(tb, 3), name, kind, round(float(20 * np.log10(w / ref)), 1)))
    return len(pts), bad


def section_table(v, m, s, spans):
    import music
    Mv, Mb, Mm = momentary(v), momentary(m + s), momentary(m)
    tc = np.arange(len(Mv)) * 0.01 + 0.2
    speak = np.zeros(len(tc), bool)
    for a, b in spans:
        speak |= (tc >= a + 0.05) & (tc <= b - 0.05)
    speak &= Mv > lufs(v) - 10
    rows = []
    for name, a, b in music.SECTIONS:
        seg = slice(ns(a), ns(b))
        Lv, Lm, Ls, Lb = lufs(v[:, seg]), lufs(m[:, seg]), lufs(s[:, seg]), lufs(m[:, seg] + s[:, seg])
        k = speak & (tc >= a) & (tc < b) & np.isfinite(Mb) & (Mb > -70)
        med = float(np.median(Mv[k] - Mb[k])) if k.sum() > 5 else float("nan")
        p10 = float(np.percentile(Mv[k] - Mb[k], 10)) if k.sum() > 5 else float("nan")
        mm = float(np.median(Mv[k] - Mm[k])) if k.sum() > 5 else float("nan")
        gapk = (~speak) & (tc >= a) & (tc < b) & (Mm > -70)
        bloom = float(np.median(Mm[gapk]) - np.median(Mm[k])) if (k.sum() > 5 and gapk.sum() > 5) else float("nan")
        rows.append((name, a, b, Lv, Lm, Ls, Lb, mm, med, p10, bloom))
    return rows


def ffmpeg_ebur(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True, timeout=300)
    txt = r.stderr
    i = txt.rfind("Summary:")
    out = []
    for line in txt[i:].splitlines():
        if line.strip():
            out.append(line.rstrip())
        if line.strip().startswith("Peak:"):
            break
    return "\n".join(out)


# ================================================================ main
def main():
    fresh = "--fresh" in sys.argv
    t_start = time.time()
    os.makedirs(OUT, exist_ok=True)
    v = load_voice()
    v_ref = integrated(v)
    spans = key_spans(v)
    mask = speech_mask(spans)
    log(f"voice: {v_ref:.2f} LUFS (as stereo), TP {true_peak(v):.2f} dBTP, {len(spans)} key spans")

    import music
    b = music.build()
    m_raw = cached("music_raw", lambda: music.render(b, ref=-20.0)[0], fresh)
    log("music", f"{lufs(m_raw):.2f} LUFS raw")
    m_d = m_raw * dbg(duck_curve(spans, DUCK_DB, pre=0.25, post=0.15, att=0.25, rel=0.6))[None, :]
    sec, sec_gains = section_curve(m_d, v, mask)
    m = m_d * dbg(sec + gap_bloom(spans))[None, :]

    import sfx
    events = []
    holder = {}

    def _s():
        def on_event(c, x, t0):
            j = float(np.abs(np.diff(x[:, : ns(0.015)], axis=1)).max()) if x.shape[1] > 10 else 0.0
            events.append((c.name, t0, t0 + x.shape[1] / SR, j, c))
        out, C = sfx.render(v_ref, on_event)
        holder["C"] = C
        return out
    s_raw = cached("sfx", _s, True)             # always re-rendered (~30 s): the cue sheet needs the measured event list
    C = holder["C"]
    s_st = s_raw * dbg(duck_curve(spans, SFX_DUCK_DB, att=0.03, rel=0.25))[None, :]
    log("sfx", f"{lufs(s_st):.2f} LUFS")

    # ---------------- master: one gain on every stem, then the limiter
    mix0 = v + m + s_st
    G = TARGET_LUFS - lufs(mix0)
    for it in range(6):
        y, g3 = limiter(mix0 * dbg(G))
        L = lufs(y)
        log(f"master iter {it}: gain {G:+.2f} dB -> {L:.2f} LUFS, TP {true_peak(y):.2f} dBTP, max GR {-20 * np.log10(g3.min()):.2f} dB")
        if abs(L - TARGET_LUFS) < 0.02:
            break
        G += TARGET_LUFS - L
    y = fades(y, 0.002, 0.03)
    assert y.shape == (2, N), y.shape
    # stems carry the master gain AND the limiter's gain curve (+ the end fade), so voice + music + sfx = mix exactly
    endf = fades(np.ones((1, N)), 0.002, 0.03)[0]
    gv, gm, gs = (x_ * dbg(G) * (g3 * endf)[None, :] for x_ in (v, m, s_st))
    mix_path = os.path.join(ROOT, "public", "emu", "mix.wav")
    os.makedirs(os.path.dirname(mix_path), exist_ok=True)
    write_wav(mix_path, y)
    shutil.copyfile(mix_path, os.path.join(ROOT, "voice", "mix_final.wav"))
    write_wav(os.path.join(OUT, "stem_voice.wav"), gv)
    write_wav(os.path.join(OUT, "stem_music.wav"), gm)
    write_wav(os.path.join(OUT, "stem_sfx.wav"), gs)
    log("wrote mix + stems")

    # ---------------- measure
    I, TP, LRA = lufs(y), true_peak(y), lra(y)
    Mmax, Smax = float(np.max(momentary(y))), float(np.max(short_term(y)))
    grdb = -20 * np.log10(g3)
    in_speech = grdb[mask]
    gr_stats = dict(max=float(grdb.max()), pct_over_0_1=float((grdb > 0.1).mean() * 100), pct_over_0_5=float((grdb > 0.5).mean() * 100),
                    speech_max=float(in_speech.max()), speech_pct_over_0_1=float((in_speech > 0.1).mean() * 100),
                    speech_p90=float(np.percentile(in_speech, 90)), speech_p99=float(np.percentile(in_speech, 99)))
    rows = section_table(gv, gm, gs, spans)
    # music in the longer gaps vs the voice's integrated loudness
    Mm_ = momentary(gm)
    tc_ = np.arange(len(Mm_)) * 0.01 + 0.2
    lg = np.zeros(len(tc_), bool)
    for (a0, a1), (b0, b1) in zip(spans[:-1], spans[1:]):
        if b0 - a1 >= GAP_MIN:
            lg |= (tc_ >= a1 + 0.2) & (tc_ <= b0 - 0.2)
    lg |= tc_ >= spans[-1][1] + 0.2
    gap_under = float(lufs(gv) - np.median(Mm_[lg]))
    sp_ = np.array([r[7] for r in rows if np.isfinite(r[7])])
    music_cuts = [T.fr(T.FLASH), T.fr(T.JAM), T.fr(1382), T.fr(1201)]
    n_chk, bad = click_check(y, gs, gm, [(e[0], e[1], e[2], e[3] * dbg(G)) for e in events], music_cuts)
    clip = int((np.abs(y) >= 0.9999).sum())
    eb = ffmpeg_ebur(mix_path)
    stats = dict(I=I, TP=TP, LRA=LRA, Mmax=Mmax, Smax=Smax, G=G, gr=gr_stats, v_ref=v_ref, voice_I=lufs(gv), music_I=lufs(gm),
                 sfx_I=lufs(gs), sec_gains=sec_gains, gap_under=gap_under, speech_under_med=float(np.median(sp_)), n_chk=n_chk, bad=bad, clip=clip, samples=y.shape[1],
                 voice_peak=float(20 * np.log10(np.abs(gv).max())))
    log(json.dumps({k: (round(v_, 2) if isinstance(v_, float) else v_) for k, v_ in stats.items() if k not in ("sec_gains",)}, default=str))
    for r in rows:
        log(f"{r[0]:<9} voice {r[3]:6.1f} music {r[4]:6.1f} sfx {r[5]:6.1f} | speech: v-music {r[7]:5.1f} v-bed med {r[8]:5.1f} p10 {r[9]:5.1f} | bloom {r[10]:4.1f}")
    print(eb)
    write_cues(C, b, stats, rows, eb, spans, v)
    json.dump({"I": I, "TP": TP, "samples": y.shape[1]}, open(os.path.join(OUT, "loudness.json"), "w"))
    log(f"done in {time.time() - t_start:.0f} s")


def write_cues(C, b, st_, rows, eb, spans, v):
    import music
    vI = st_["voice_I"]
    L = []
    w = L.append
    w("# The Great Emu War - soundtrack cue sheet")
    w("")
    w("All sound is original and synthesized in numpy/scipy: instruments in `instruments.py` (brass, snare, glock, timpani from the "
      "shared kit + banjo, Rhodes, soft kick, shaker and more added here), SFX in `sfx_emu.py` / `sfx_gen.py`; "
      "placed by `music.py` / `sfx.py` from `timeline.py` (frames from SHOTS.md), mixed by `mix.py`.")
    w("Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch, no time change). Rebuild everything + verify: `bash audio/build.sh` (about 1.5 min; mix only: `python3 audio/mix.py --fresh`).")
    w("")
    w("## Files")
    w("| file | content |")
    w("|---|---|")
    w(f"| `public/emu/mix.wav` = `voice/mix_final.wav` | final mix, 48 kHz, stereo, 24-bit, {st_['samples']:,} samples = {st_['samples'] / SR:.3f} s |")
    w("| `audio/out/stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain, after the master limiter's gain curve: voice + music + sfx = mix.wav |")
    w("| `audio/check.py` | verification: transcription of voice.wav vs the mix (faster-whisper small.en), clicks, duration, loudness |")
    w("")
    w("## Master loudness (own BS.1770-4 meter)")
    w(f"- Integrated **{st_['I']:.2f} LUFS**, true peak **{st_['TP']:.2f} dBTP**, LRA {st_['LRA']:.1f} LU, max momentary {st_['Mmax']:.1f} LUFS, "
      f"max short-term {st_['Smax']:.1f} LUFS; {st_['clip']} samples at full scale")
    w(f"- Stems at mix gain: voice {st_['voice_I']:.1f} LUFS (peak {st_['voice_peak']:.1f} dBFS), music {st_['music_I']:.1f} LUFS, sfx {st_['sfx_I']:.1f} LUFS "
      f"(master gain {st_['G']:+.2f} dB and the limiter gain curve, the same on every stem)")
    gr = st_["gr"]
    w(f"- Master limiter (4x oversampled look-ahead, ceiling {CEIL_DBTP} dBTP): max gain reduction {gr['max']:.2f} dB, active (>0.1 dB) on "
      f"{gr['pct_over_0_1']:.2f} % of samples; inside speech: max {gr['speech_max']:.2f} dB, 90th / 99th percentile {gr['speech_p90']:.2f} / {gr['speech_p99']:.2f} dB, active on {gr['speech_pct_over_0_1']:.1f} % of speech samples. "
      "This peak limiting is the only processing besides gain that reaches the narration: the TTS voice has an 18.3 dB true-peak-to-loudness ratio, "
      "so -14 LUFS at <= -1 dBTP cannot be reached with gain alone.")
    w(f"- Discontinuity check: {st_['n_chk']} boundaries (start + end of every placed SFX event, every music cut-off) checked in the final mix, "
      f"{len(st_['bad'])} suspicious" + (": " + ", ".join(f"{t} s {n} {k} (+{d} dB)" for t, n, k, d in st_['bad']) if st_['bad'] else "."))
    w("")
    w("ffmpeg ebur128 cross-check:")
    w("```")
    w(eb)
    w("```")
    w("")
    w("## Voice on top: per-section loudness")
    w(f"Key: words.json spans, widened by the voice's own measured activity (TTS word times drift by up to 0.25 s). "
      f"Music: {DUCK_DB:+.0f} dB gentle duck under speech (attack 250 ms, release 600 ms) + {GAP_BLOOM_DB:+.0f} dB bloom in gaps >= {GAP_MIN} s; section gain set so the music sits {MUSIC_UNDER:+.1f} LU "
      f"(+ per-section offset) under the voice over the spoken parts. SFX: {SFX_DUCK_DB:+.0f} dB duck under speech.")
    w("Columns: integrated LUFS per stem at mix gain; then over 400 ms windows centred on speech: median voice-music, median and 10th "
      "percentile voice-bed (bed = music + sfx); bloom = median music level in the gaps minus in speech (LU).")
    w("")
    w("| section | time s | voice | music | sfx | voice-music (speech, med) | voice-bed med | voice-bed p10 | bloom |")
    w("|---|---|---|---|---|---|---|---|---|")
    f = lambda x: "-" if (not np.isfinite(x) or x <= -98) else f"{x:.1f}"
    for r in rows:
        w(f"| {r[0]} | {r[1]:.2f}-{r[2]:.2f} | {f(r[3])} | {f(r[4])} | {f(r[5])} | {f(r[7])} | {f(r[8])} | {f(r[9])} | {f(r[10])} |")
    w("")
    w(f"Music under the voice: median over the sections' speech windows {st_['speech_under_med']:.1f} LU; in the longer gaps "
      f"(>= {GAP_MIN} s) the music's median momentary level is {st_['gap_under']:.1f} LU under the voice's integrated loudness.")
    w("")
    w("Applied section gains (dB): " + ", ".join(f"{k} {v_:+.1f}" for k, v_ in st_["sec_gains"].items()) + ". Music rides: " +
      ", ".join(f"{a:.2f}-{b_:.2f} s {db:+.1f} dB" for a, b_, db in RIDES if db) + ".")
    w("")
    w("Narration gaps (measured on voice.wav), where the loud hits and the music blooms go: " +
      ", ".join(f"{spans[i][1]:.2f}-{spans[i + 1][0]:.2f}" for i in range(len(spans) - 1)) + ".")
    w("")
    w("## Music map (chill re-score: laid-back acoustic / lo-fi bed, F major, 88 bpm, swung eighths)")
    w("Fingerpicked nylon guitar, warm Rhodes, round upright bass, brushes + shaker + soft kick (no snare, no crashes, no rolls), "
      "vibes sparkles, and a small playful EMU figure (A-D-C-A..G-A, muted banjo), all composed here; progressions Fmaj7-Dm7-Gm7-C9 "
      "and Dm7-Bbmaj7-Gm7-C9. The first brass-march score is kept for reference in `music_march.py` (not used).")
    w("")
    w("| time s | frame | music |")
    w("|---|---|---|")
    for t, d in sorted(b.cues):
        w(f"| {t:.2f} | {t * T.FPS:.0f} | {d} |")
    w("")
    w("## SFX events")
    w("naive = the event's level vs the voice stem (max momentary, LU); applied = naive - 6 dB + offsets; beds are integrated loudness. "
      "'mix LUFS' = max momentary in the final mix (before the speech duck). Frames marked * are chosen here (not pinned in SHOTS.md): "
      f"emu steps {T.EMU_STEPS_1}, crank {T.CRANK}, pats {T.PATS}, toy march {T.MARCH13[0]}+15k, head turn {T.TURN}, blink {T.BLINK}.")
    w("")
    w("| # | time s | frame | cue | what | naive | applied | mix LUFS | pan |")
    w("|---|---|---|---|---|---|---|---|---|")
    for i, c in enumerate(sorted(C, key=lambda c: (c.t, c.name))):
        kind = " (bed)" if c.kind == "bed" else ""
        meas = c.measured if c.measured is not None else c.applied
        fr_ = f"{c.frame}" if c.frame is not None else f"{c.t * T.FPS:.0f}"
        w(f"| {i + 1} | {c.t:.3f} | {fr_} | {c.name}{kind} | {c.desc} | {c.naive:+.0f} | {c.applied:+.1f} | {vI + meas:.1f} | {c.p:+.2f} |")
    w("")
    w("## Verification")
    w("See the end of this file (appended by `check.py`).")
    w("")
    open(os.path.join(HERE, "cues.md"), "w", encoding="utf-8").write("\n".join(L))


if __name__ == "__main__":
    main()
