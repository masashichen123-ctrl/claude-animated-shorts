# Picture timeline of "The 1904 Olympic Marathon", mirrored (read-only) from SHOTS.md: 30 fps, TOTAL = 1680 f = 56.000 s.
# Every frame number below is a locked picture event from the shot list; times are frame / 30.
# Where a locked event sits on a key narration word, the bright / voice-like part of its sound is moved into the
# nearest measured narration gap (the frame stays the visual sync point); those choices are marked "gap" here and
# listed in cues.md.
import json
import os

FPS = 30
TOTAL = 1680
DUR = TOTAL / FPS            # 56.0 s exactly
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def fr(f):
    return f / FPS


# id: (first frame, end frame, set, light)
SHOTS = {
    1: (0, 133, "dusty road", "hot"), 2: (133, 204, "road, car", "hot"), 3: (204, 340, "stadium start / road", "hot"),
    4: (340, 449, "dirt road, cars + dust", "hot"), 5: (449, 553, "roadside well", "hot"), 6: (553, 686, "stadium finish", "hot"),
    7: (686, 768, "road flashback", "hot"), 8: (768, 886, "apple orchard", "hot"), 9: (886, 988, "orchard / finish", "hot"),
    10: (988, 1078, "cornfield, dogs", "hot"), 11: (1078, 1273, "road, trainers' car", "hot"), 12: (1273, 1331, "finish, long lens", "hot"),
    13: (1331, 1415, "finish, carried", "hot"), 14: (1415, 1507, "high 3/4 course", "hot"), 15: (1507, TOTAL, "Boston 1905", "spring"),
}
XF = [204, 1507]                     # 5-frame anchored dissolves

# locked picture events (frames, SHOTS.md)
BOTTLE = 99                # trainer holds up the skull bottle
GULP = 110                 # Hicks gulps it, eyes go swirly
FLASH = 131
CAR1 = 133                 # the open 1904 car putters past (shot 2)
WAVE = 162                 # Lorz waves cheerfully from the back seat (horn honk near here)
DOUBLE_TAKE = 176
PISTOL = 210               # starter's pistol puff
HEAT = 262                 # CUT to blazing sun: heat buzz / cicadas from here
CARS = 344                 # two cars drive ahead
DUST = (398, 427)          # dust clouds roll back over the runners
TONGUES = 495
DRIP = 529                 # the bucket comes up with a single drop
TAPE1 = 607                # Lorz breaks the tape
HATS = 661                 # crowd leaps up, boaters fly
CAR_PASS = (740, 750)      # flashback: Lorz's car passes
STOP_DEAD = 752            # the cheering stops dead (boaters freeze mid-air)
APPLE_PICK = 822
APPLE_BITE = 830
SOUR = (867, 871)          # face turns green, worms, stink lines
SNORE = 926                # Z bubbles
FINISH4 = 965              # cheerful finish, four fingers
DOGS = (1013, 1055)
EGG = 1204
FLASK = 1235
BOTTLE2 = 1246
HELD_BREATH = 1304
LIFT = 1378
TAPE2 = 1399               # carried through the tape, medal plonk
DROPOUTS = (1440, 1477)
BOSTON = 1507
TAPE3 = 1604               # Lorz wins Boston
LOOK_DOWN = 1637
HONK = 1650
WINK = 1660

# chosen here (not pinned in SHOTS.md, or moved off a key word into a narration gap measured on voice.wav at -40 dB;
# words.json is up to 0.15 s early at some line ends, so the gaps below are the measured ones)
SWIRL = 4.17               # the swirly 'boing' after 'poison.' ends (4.13-4.17), before the flash @131 (4.37)
COUGHS = [12.64, 14.59]                 # runners coughing in the dust (gaps 12.62-12.90 and 14.58-14.75: a very soft "And" starts at 15.0)
DRIP_LAND = 18.21          # the single drop lands in the tin bucket (gap after 'course.' 18.12-18.70)
HATS_FWIP = [22.56, 22.61, 22.67]       # boaters fly (gap after 'cheered,' 22.55-22.87)
SCRATCH = 25.34            # the soft record-scratch tail of the stop (gap after 'car.' 25.26-25.69); the cheer itself stops dead @752
BLERGH = 29.55             # the sour 'blergh' (gap after 'rotten,' 29.50-29.82)
SNORE_OUT = 31.34          # the audible snore (gap after 'nap.' 31.28-31.58); a dark inhale starts @926
BARKS_GAP = [35.67, 35.74, 35.80, 35.86]   # the clear bark volley (gap after 'dogs.' 35.66-36.07)
MEDAL = 46.97              # the medal 'plonk' (gap after 'it.' 46.86-47.42)
SIGHS = [48.46, 50.08]     # drop-out sighs (gaps 48.45-48.62 and 49.77-50.41)
SPLASH = 49.90             # a runner sits down in the creek (gap 49.77-50.41)
BOTTLE2_TINK = 42.04      # the bright glass tink of the skull bottle waits for the gap after 'strychnine.' (42.01-42.41): its 6 kHz sits on the word's 's'
HONK_T = 55.08             # the honk @1650 starts as the final 't' of 'foot.' ends (55.07)

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
