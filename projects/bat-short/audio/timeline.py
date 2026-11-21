# Picture timeline of "The Bat Bomb", mirrored (read-only) from SHOTS.md: 30 fps, TOTAL = 1650 f = 55.000 s.
# Every frame number below is a locked picture event from the shot list; times are frame / 30.
# Events SHOTS.md does not pin to a frame (sniffs, bucket clanks, running feet, the five ticking timers' phase)
# are chosen here and listed in cues.md so the picture can follow them if it wants to.
import json
import os

FPS = 30
TOTAL = 1650
DUR = TOTAL / FPS            # 55.0 s exactly
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def fr(f):
    return f / FPS


# id: (first frame, end frame, set, light)
SHOTS = {
    1: (0, 114, "desert sky", "night"), 2: (114, 171, "air base", "dusk"), 3: (171, 328, "cave mouth", "dusk"),
    4: (328, 547, "workshop", "warm"), 5: (547, 653, "model house", "interior"), 6: (653, 733, "president", "interior"),
    7: (733, 853, "lab", "cool"), 8: (853, 968, "test base", "day"), 9: (968, 1110, "test base", "day"),
    10: (1110, 1150, "under the tank", "shade"), 11: (1150, 1215, "test base", "day"), 12: (1215, 1302, "test base", "day"),
    13: (1302, 1418, "test base", "smoke"), 14: (1418, 1515, "war office", "dusk"), 15: (1515, TOTAL, "cave mouth", "night"),
}
XF = [171, 853, 1418, 1515]            # 5-frame anchored dissolves

# locked picture events (frames)
CASING_POP = 80            # bomb casing panels pop open, the swarm bursts out
GRIN = 95                  # one bat grins at the lens
FLASH = 112
DIVE = 121                 # swarm dives on the air base
FIRES = (128, 139)         # little rooftop fires pop
KICKS = [139, 628, 713, 1186, 1397]
COLUMN = 290               # bat column out of the cave
BULB = 331
STRAP = 367
UNIMPRESSED = 413
MODEL_CUT = 430
ATTIC = 553                # bat flutters into the attic
HANG = 565
TICK = (607, 628)
POOF = 628
STAMP = 711
TWEEZERS = 800
FLEX = 845
CRATE_CARRY = 880
CRATE_POP = 940
ESCAPE = 947
TANK = (1110, 1150)        # five bats under the tank, timers ticking
WHOOMP = 1186
FIRE_SPREAD = 1215
CRANE_UP = 1274
HANGAR_GLIDE = (1310, 1350)
CAR_CUT = 1365
CAR_PUFF = 1394
FOLDER_WEIGH = (1430, 1450)
FOLDER = 1489
WINK_TURN = 1600
WINK = 1610

# chosen here (not pinned in SHOTS.md)
SNIFFS = [998, 1044, 1106]             # shot 9: a soft sniff, sniff-sniff in the gap after 'do.', a last one after 'place.'
SHAKE = 1053                           # ... and a little head shake (ears flapping)
BUCKETS = [1222, 1236, 1262, 1291]     # shot 12: bucket clanks / sloshes along the line
POLISH = (1366, 1392)                  # shot 13: cloth squeaks on the car before the puff


def shot_t(i):
    a, b = SHOTS[i][:2]
    return fr(a), fr(b)


def shot_at(t):
    f = t * FPS
    for i, (a, b, *_r) in SHOTS.items():
        if a <= f < b:
            return i
    return 15


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
