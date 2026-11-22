# Picture timeline of "The Time Lock" (the 1870s invention of the bank vault time lock), mirrored (read-only) from SHOTS.md:
# 30 fps, TOTAL = 1590 f = 53.000 s = 2,544,000 samples. Every frame number below is a locked picture event from the shot list;
# times are frame / 30. Where a locked event sits on a narration word, the bright / sustained / voice-like part of its sound is
# moved into the nearest measured narration gap (the frame stays the visual sync point and a dark, short part of the sound sits
# on the frame); those choices are marked "gap" here and listed in cues.md.
import json
import os

FPS = 30
TOTAL = 1590
DUR = TOTAL / FPS            # 53.0 s exactly = 2,544,000 samples
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def fr(f):
    return f / FPS


# id: (first frame, end frame, set, light)
SHOTS = {
    1: (0, 183, "moonlit street, then the banker's bedroom", "night"), 2: (183, 330, "bedroom, then the night march", "night"),
    3: (330, 455, "bank interior, the vault", "candle"), 4: (455, 522, "vault door opens", "night, golden spill"),
    5: (522, 695, "Sargent's workshop", "warm"), 6: (695, 775, "workbench, two clocks", "warm"),
    7: (775, 935, "lock mechanism close-up", "warm"), 8: (935, 1114, "Morrison, Illinois", "bright day"),
    9: (1114, 1241, "bank vault, night again", "night"), 10: (1241, 1373, "vault room, time passing", "night"),
    11: (1373, 1430, "street of banks", "bright day"), 12: (1430, TOTAL, "modern vault, the guard clock", "bright"),
}
XF = [522, 935, 1430]                # 5-frame anchored dissolves

# locked picture events (frames, SHOTS.md)
CROWBAR = 126                # crowbar tossed over the shoulder
TIPTOE = (126, 150)
CUT_BED = 150
GASP = 172
FLASH = 183
PLAN = 205
SCOOP = 239
MARCH = (275, 330)
VAULT = (365, 374)
KEYJ = (438, 462)
WHEEL = 484
DOOR = 493
SPARK = 594
SCRIBBLE = (625, 658)
KEYHOLE = 676
SCREW = 722
ASSEMBLE = (742, 750)
TICKS0 = 750                 # steady ticking from here to 935
BOLT = 798
FAIL1 = 840
FAIL2 = 887
SIGH = 910
BOLTON = 1034
PAT = 1040
SNIP = 1087
MARCH2 = (1126, 1151)
FAIL3 = 1172
PALM = 1210
THUMBS = 1220
FIST = 1260
ROPE = 1283
LAPSE = (1303, 1325)
SMUG = 1342
QUEUE = (1382, 1403)
STEPS = 1504
WINK = 1551

# chosen here (moved into measured narration gaps; voice.wav activity at -40 dB, 10 ms RMS)
# measured gaps: 2.06-2.42 4.67-4.96 6.13-6.77 7.67-7.97 8.85-9.12 10.30-10.60 11.78-12.18 14.81-15.23 16.91-17.49 19.28-19.58
# 20.51-20.84 22.85-23.25 25.52-25.93 27.29-27.59 29.27-29.59 30.79-31.19 33.01-33.37 36.64-37.07 38.77-39.07 40.91-41.46
# 42.58-42.83 43.71-44.06 45.08-45.66 47.12-47.70 49.56-49.86
CLANK_T = 4.70             # the crowbar's clank when it lands, in the gap after 'vaults.' (frame 126 = 4.20 is the toss)
GASP_T = 6.22              # the banker's gasp in the gap after 'banker.' (frame 172 = 5.73)
FLASH_T = 6.10             # the flash itself (frame 183 = 6.10), a dark 'pfoomf' at the very start of the gap
SCOOP_T = 7.68             # the cloth scoop whoosh in the gap before 'Grab' (frame 239 = 7.97)
KEYJ_T = 14.82             # the key jingle in the gap after 'key,' (frames 438-462 = 14.6-15.4)
OPEN_T = 16.93             # the door's golden shimmer in the gap after 'anything.' (frame 493 = 16.43)
SPARK_T = 20.53            # the spark's ping in the gap after 'idea.' (frame 594 = 19.8; a tiny dark pre-spark sits on the frame)
CLATTER_T = 25.52          # the last springs rolling off the bench in the gap after 'clocks.'
SIGH_T = 30.82             # the sigh in the gap after 'asking.' (frame 910 = 30.33)
BELL_T = 33.03             # the far church bell in the gap after '1874,'
SNIP_T = 36.66             # the ribbon snip's bright 'snik' in the gap after 'Illinois.' (frame 1087 = 36.23)
PALM_T = 40.93             # the face-palm slaps in the gap after 'he.' (frame 1210 = 40.33; a dark pap sits on the frame)
SMUG_T2 = 45.12            # the clock's second, even smugger tick in the gap after 'care.'
COIN_T = 47.15             # the coin-bag chinks in the gap after 'one.'
WINK_T = 51.98             # the wink 'ting' right after 'clock.' (frame 1551 = 51.70)
GRID0 = 25.0               # the clock groove grid (music woodblock + SFX ticks), beat = 60 / BPM
BPM = 96.0


def shot_t(i):
    a, b = SHOTS[i][:2]
    return fr(a), fr(b)


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
