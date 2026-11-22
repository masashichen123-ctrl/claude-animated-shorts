# Picture timeline of "Chicago Lifts a Hotel" (1861), mirrored (read-only) from SHOTS.md: 30 fps, TOTAL = 1770 f = 59.000 s.
# Every frame number below is a locked picture event from the shot list; times are frame / 30.
# Where a locked event sits on a key narration word, the bright / sustained / voice-like part of its sound is moved into the
# nearest measured narration gap (the frame stays the visual sync point, and a dark short part of the sound sits on the
# frame); those choices are marked "gap" here and listed in cues.md.
import json
import os

FPS = 30
TOTAL = 1770
DUR = TOTAL / FPS            # 59.0 s exactly = 2,832,000 samples
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def fr(f):
    return f / FPS


# id: (first frame, end frame, set, light)
SHOTS = {
    1: (0, 198, "Chicago street, the hotel rises", "bright"), 2: (198, 300, "swamp-edge streets", "overcast"),
    3: (300, 389, "muddy street, the puddle", "overcast"), 4: (389, 469, "sickroom and street", "overcast"),
    5: (469, 618, "city council hall", "warm"), 6: (618, 715, "street raised, the pit", "day"),
    7: (715, 817, "grand hotel front", "bright"), 8: (817, 937, "contractors' office", "interior"),
    9: (937, 1072, "under the hotel, jackscrews", "day"), 10: (1072, 1223, "the signal, the turns", "day"),
    11: (1223, 1301, "hotel wide, board flag", "day"), 12: (1301, 1489, "hotel cutaway interior", "warm"),
    13: (1489, 1570, "window close-up", "bright"), 14: (1570, TOTAL, "platform + sleeping car", "golden dusk"),
}
XF = [469, 715, 1570]                # 5-frame anchored dissolves

# locked picture events (frames, SHOTS.md)
HOOK = (100, 198)
FLASH = 196
FROG = 250
SLURP = (280, 303)
PUDDLE = 328
SNORT = 358
COUGH = (389, 427)
TUT = 427
GAVEL = 496
GASP = (541, 585)
SHOVEL = (623, 650)
BONK = 685
HOTEL = (715, 788)
BLUEPRINT = 823
SHAKE = (890, 912)
CLUNK = 974
MARCH = 1033
WHISTLE = 1079
CLICKS = (1130, 1142)
CLICK2, CLICK3 = 1168, 1194
TICKS = (1234, 1248, 1261)
FANFARE = 1276
SIGN = 1309
SOUP = 1360
SNORE = 1385
BELL = 1409
TAP = 1526
WINK = 1550
STEAM = 1588
COIN = 1596
RAILS = 1619
SNORE2 = 1676
TRAIN_WHISTLE = 1727

# chosen here (moved into measured narration gaps; voice.wav activity at -40 dB; words.json edges are up to 0.15 s early)
# measured gaps: 0.00-0.14 1.99-2.37 5.01-5.35 6.59-7.23 8.73-9.04 10.43-10.73 12.26-12.66 14.55-14.96 16.55-16.86 18.35-18.66
# 20.09-20.69 21.71-22.01 23.46-23.86 26.77-27.17 29.04-29.34 30.72-31.23 33.65-34.00 35.35-35.76 38.41-38.77 39.42-39.72
# 40.26-40.79 42.88-43.46 44.81-45.12 47.21-47.56 49.03-49.61 51.59-52.18 54.91-55.22 56.19-56.49 57.89-59.0
FLASH_T = 6.62             # the soft flash 'pfoomf' in the gap after 'inside.'
FROG_RING = 8.76           # the frog's bright droplet ring in the gap after 'swamp.'
SCHLORP = 10.45            # the boot 'schlorp' (bright wet release) in the gap after 'mud,'
SNORT_T = 12.30            # the dog's snort in the gap after 'go.'
TUT_T = 14.66              # the doctor's tut in the gap after 'out,'
SNEEZE_T = 14.74           # a last small sneeze in the same gap
GAVEL_T = 16.57            # the gavel in the gap after 'decision,' (frame 496 = 16.53)
GASP_T = 18.38             # the council's collective gasp in the gap after 'feet,'
GASP2_T = 20.12            # ... and a second 'oooh' after 'underneath.'
GRAVEL_T = 21.71           # the gravel dump rumble in the gap after 'easy,'
BONK_STARS = 23.47         # the head-bonk 'bwoing' wobble in the gap after 'up too.'
CHIME_T = 42.90            # the fanfare chime in the gap after 'six feet,'
RING_T = 33.66             # the iron jackscrew's ring in the gap after 'building,'
DING_T = 47.38             # the desk bell in the gap after 'in,'
WINK_T = 51.62             # the wink 'ting' in the gap after 'broke.'
WHISTLE_T = 36.29          # foreman's whistle in the short gap right after 'signal,'
TWHISTLE_T = 57.93         # the soft train whistle after 'them.'
MID_GAPS = [(54.91, 55.22)]

def shot_t(i):
    a, b = SHOTS[i][:2]
    return fr(a), fr(b)


def shot_at(t):
    f = t * FPS
    for i, (a, b, *_r) in SHOTS.items():
        if a <= f < b:
            return i
    return 14


def words():
    return json.load(open(os.path.join(ROOT, "voice", "words.json"), encoding="utf-8"))


def lines():
    return json.load(open(os.path.join(ROOT, "voice", "lines.json"), encoding="utf-8"))


def speech_spans(merge=0.25):
    """spoken spans keyed from words.json (s, e); merged when the gap is < merge s"""
    sp = []
    for w in words():
        s, e = float(w["s"]), max(float(w["e"]), float(w["s"]) + 0.12)
        if sp and s - sp[-1][1] < merge:
            sp[-1][1] = max(sp[-1][1], e)
        else:
            sp.append([s, e])
    return sp
