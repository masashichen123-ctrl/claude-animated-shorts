# Picture timeline of "The Exploding Whale", mirrored (read-only) from SHOTS.md: 30 fps, TOTAL = 1590 f = 53.000 s.
# Every frame number below is a locked picture event from the shot list; times are frame / 30.
# Events SHOTS.md does not pin to a frame (the tumble thuds, gull calls, the truck doors, the oops, the hubcap...)
# are chosen here (mostly inside measured narration gaps) and listed in cues.md so the picture can follow them.
import json
import os

FPS = 30
TOTAL = 1590
DUR = TOTAL / FPS            # 53.0 s exactly
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def fr(f):
    return f / FPS


# id: (first frame, end frame, set, light)
SHOTS = {
    1: (0, 136, "Oregon beach", "overcast"), 2: (136, 198, "beach after", "overcast"), 3: (198, 334, "coast wide", "day"),
    4: (334, 422, "beach rope", "day"), 5: (422, 496, "car park", "day"), 6: (496, 648, "beach plan", "day"),
    7: (648, 768, "easel / gulls", "day"), 8: (768, 890, "dunes crowd", "day"), 9: (890, 938, "plunger CU", "day"),
    10: (938, 988, "beach BOOM", "day"), 11: (988, 1062, "dunes panic", "day"), 12: (1062, 1140, "dunes reporter", "day"),
    13: (1140, 1228, "far parking lot", "day"), 14: (1228, 1322, "beach smoke", "day"), 15: (1322, 1458, "beach buried", "day"),
    16: (1458, TOTAL, "beach park", "sunny"),
}
XF = [198, 1458]                     # 5-frame anchored dissolves

# locked picture events (frames)
DYNAMITE = 114             # dynamite sticks pop up along the whale's back, lit-fuse sparkles
FLASH = 134
PLOP = 169                 # blubber chunk plops onto the Engineer's hat
KICKS = [171, 960, 1160]
ROPE_SNAP = 366            # rope snaps, the locals tumble
SMELL = 403                # stink wobble lines, a seagull faints off a post
TRUCK = 440                # orange 1970s highway truck pulls up
BLOOP = 558                # thought bubble: whale -> boulder
CRATES = (580, 625)        # crate after crate of dynamite stacked
EASEL = 655
GULL_LICK = 744            # seagulls in bibs licking their beaks
CROWD = 790                # crowd murmur on the dunes from here
CAMERA = 845               # TV film camera whirr
HOLD = (898, 910)          # tense hold, crowd holds its breath
PLUNGER = 914
BOOM = 960
WHISTLE_DOWN = 1020        # blubber chunks coming DOWN
PANIC = 1034
SPLATS = [1090, 1105, 1118]
CAR_CRUNCH = 1158
GULLS_FLEE = 1255
BLINK = 1300
FACEPALM = 1406
DOZER = (1424, 1444)
PARK = 1458
GULL_LAND = 1547
WINK = 1556

# chosen here (not pinned in SHOTS.md), mostly inside the measured narration gaps
TUMBLE = [376, 380, 384]               # the locals land on the sand after the snap (gap after 'move it,' 12.47-12.74)
FAINT_THUD = 419                       # the fainted gull hits the sand (gap 13.83-14.27)
TRUCK_DOORS = [486, 492]               # crew hop out (gap after 'Department.' 16.05-16.66)
CRATE_TIMES = [580, 589, 598, 605, 613, 619, 625]
OOPS = 1050                            # the music's gentle 'oops' (gap after 'everyone.' 34.96-35.51)
HUBCAP = (1216, 1226)                  # a hubcap rolls away and settles (gap after 'away.' 40.5-41.12)
GULL_CALLS = [45, 232, 327, 1321]           # far gull calls, each inside a gap (1.43-1.77, 7.62-8.01, 10.84-11.25, 43.8-44.38)


def shot_t(i):
    a, b = SHOTS[i][:2]
    return fr(a), fr(b)


def shot_at(t):
    f = t * FPS
    for i, (a, b, *_r) in SHOTS.items():
        if a <= f < b:
            return i
    return 16


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
