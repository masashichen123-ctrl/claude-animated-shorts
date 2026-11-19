# Picture timeline of "The Great Emu War", mirrored (read-only) from SHOTS.md: 30 fps, TOTAL = 1770 f = 59.000 s.
# Every frame number below is a locked picture event from the shot list; times are frame / 30.
# Events SHOTS.md does not pin to a frame (march step phase, truck bounces, head turn, blink, crate pats) are chosen
# here and listed in cues.md so the picture can follow them if it wants to.
import json
import os

FPS = 30
TOTAL = 1770
DUR = TOTAL / FPS            # 59.0 s exactly
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def fr(f):
    return f / FPS


# id: (first frame, end frame, set, light)
SHOTS = {
    1: (0, 121, "stubble", "morning"), 2: (121, 157, "stubble", "morning"), 3: (157, 305, "farm", "day"),
    4: (305, 389, "farm", "day"), 5: (389, 450, "verandah", "day"), 6: (450, 602, "road", "day"),
    7: (602, 695, "paddock", "day"), 8: (695, 825, "dam", "golden"), 9: (825, 937, "paddock", "day"),
    10: (937, 1135, "camp", "dusk"), 11: (1135, 1201, "dump", "day"), 12: (1201, 1270, "paddock", "day"),
    13: (1270, 1382, "parade", "day"), 14: (1382, 1504, "paddock", "day"), 15: (1504, 1656, "parade", "golden"),
    16: (1656, 1694, "road", "sunset"), 17: (1694, TOTAL, "wheat", "golden"),
}
XF = [157, 695, 937, 1504]            # 5-frame anchored dissolves

# locked picture events (frames)
FLASH = 119
KICK = 126
LOST = 128
TRUCK_STOP = 456
SALUTE = 502
GUNS_CUT, GUNS = 527, 543
CRATES_CUT, CRATE = 556, 582
GUN_CU, JAM = 797, 801
HAMMER = [837, 841, 846, 850]
TRUCK_CUT, OUTRAN = 875, 902
PEN = 963
CASINGS = (1040, 1087)
PUFFS = [1205 + 4 * k for k in range(10)]
SCATTER, SPIN_CUT, ONCE = 1382, 1450, 1479
WORLD = 1633
HOME = 1663

# chosen here (not pinned in SHOTS.md)
EMU_STEPS_1 = [24, 38, 52]            # the hook emu stepping out of the wheat
CRANK = [(389, 402), (436, 449)]      # phone crank bursts: before "So the farmers" and right after "army."
PATS = [1166, 1180]                   # soldier pats the crates
MARCH13 = [1275 + 15 * k for k in range(8)]   # toy soldiers' footfalls, 120 steps/min, on the music beat
TURN = (1736, 1750)                   # shot 17: the emu turns its head ...
BLINK = 1756                          # ... and blinks


def shot_t(i):
    a, b = SHOTS[i][:2]
    return fr(a), fr(b)


def shot_at(t):
    f = t * FPS
    for i, (a, b, *_r) in SHOTS.items():
        if a <= f < b:
            return i
    return 17


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
