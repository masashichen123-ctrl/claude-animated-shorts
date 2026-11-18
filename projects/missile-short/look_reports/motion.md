# Motion and animation: missile vs premium references

Scope: character animation (acting beats, expressions, gestures, walks, prop motion, effect sprites) and camera motion,
measured on the **full videos**. Earlier source of truth: `references/reports/motion.md` (20 shorts, move shapes, blinks,
walks). This report re-measures 4 premium references and our `missile.mp4` with one method, and it confirms or updates
those numbers.

Units:
- px/f = pixels per frame at 720x1280 (multiply by 1.5 for our 1080x1920).
- "% of frame" = share of the analysed area.

The caption band (55-80 % of the height) is masked in every video, ours included.

## 0. Method (scripts in `SCR/look/work/motion/`)

- **`measure.py`** works at 360x640 grey. For each frame pair:
  - Farneback dense flow on a 8 px grid, then a RANSAC similarity fit (translation, zoom, roll; 0.75 px threshold). This
    is the **camera**.
  - Camera speed = the mean displacement of the 4 corners plus the centre, x2 to 720p.
  - The previous frame is warped by the camera model and differenced against the current one; pixels with |Δ| > 28 grey
    levels after a 2x2 opening count as **local change**: characters, props, FX and ambient motion.
  - I checked the overlays visually (`vizA.jpg`, `vizB.jpg`, `viz.jpg`). The local mask lands on:
    - bodies, heads and props;
    - flickering signs and floating dust in the refs;
    - the waving letters in ours;
    - some depth parallax during fast camera moves. For that reason, character statistics use **calm frames only**
      (camera < 1 px/f).
- **`faces.py`, character proxy.** Round, solid, white, low-saturation blobs (bean heads), each grown to a body-sized box.
  It splits local change into "on a character" and "elsewhere" (ambient). The proxy is crude: it also catches bright
  walls. Read it as a ratio between videos, not as an absolute.
- **`stats.py`, `stats2.py`**: holds, drifts, moves, move shapes, frozen spans and beat counts, plus per-sentence counts
  from `*_tx.txt`.
- **`sheet.py`**: per-sentence contact sheets used for a manual acting audit (`sh_*.jpg`). This is how expression and
  gesture changes per sentence were counted.

Cut flag: frame diff > 0.08 and camera-fit inlier share < 0.45. Crossfades are not flagged, so shot counts are not reported.

## 1. Measured gap table

### 1.1 Whole-film motion energy

| Metric | missile | burglar | jar_empire | window | jar_nobel | Ref range |
|---|---|---|---|---|---|---|
| Median frame diff (0-1, masked) | **0.0029** | 0.027 | 0.032 | 0.020 | 0.017 | 0.017-0.032 (6-11x ours) |
| p90 frame diff | 0.013 | 0.060 | 0.060 | 0.052 | 0.051 | ≈0.05-0.06 |
| Frozen frames (camera < 0.3 px/f **and** local < 0.05 %) | **42 %** | 4.9 % | 4.9 % | 2.7 % | 14 % | 3-14 % |
| Frames inside frozen runs ≥ 8 f | **28 %** | 2 % | 3 % | 1 % | 9 % | 1-9 % |
| Frozen runs ≥ 15 f (count) | **11** | 1 | 1 | 0 | 3 | 0-3 |
| Longest frozen run | **75 f (2.5 s)** | 16 f | 15 f | 9 f | 37 f | ≤ 15 f typical |

### 1.2 Camera (speed profile)

| Metric | missile | burglar | jar_empire | window | jar_nobel | Ref range |
|---|---|---|---|---|---|---|
| Camera speed median | **0.11 px/f** | 0.93 | 0.68 | 0.52 | 0.15 | 0.15-0.93 |
| Camera speed p75 / p90 | **0.17 / 0.21** | 2.9 / 7.7 | 3.3 / 7.4 | 1.6 / 4.7 | 0.35 / 0.74 | p90 0.7-7.7 |
| Max camera speed (σ 1.2 f smoothed) | **0.96** (raw 1.7) | 21 | 44 | 13 | 12 | 12-44 |
| Hold (< 0.3 px/f) / drift (0.3-2) / move (≥ 2) | **93 / 7 / 0 %** | 28 / 39 / 34 | 31 / 35 / 34 | 28 / 51 / 21 | 71 / 22 / 6 | drift+move 29-72 % |
| Moves per 10 s (peaks ≥ 6 px/f) | **0** | 2.7 | 3.9 | 1.6 | 0.8 | 0.8-3.9 |
| Move peak, median | — | 10.2 | 10.0 | 7.4 | 6.7 | 7-10 px/f |
| Move attack / release (10 % to peak to 10 %) | — | 10 / 27 f | 6 / 9 f | 23 / 27 f | 4 / 9 f | 4-23 / 9-27 f |
| Move duration / travel, median | — | 46 f / 347 px | 19 f / 195 px | 69 f / 296 px | 18 f / 71 px | 18-69 f / 70-350 px |
| Zoom active in quiet frames (abs > 0.05 %/f) | **4.5 %** | 43 % | 41 % | 48 % | 12 % | 12-48 % |
| Share of zoom frames that push in | 100 % | 78 % | 56 % | 86 % | 93 % | ≥ 56 % |
| Net push-in in quiet frames | 0.45 %/s | 1.07 | 0.46 | 1.70 | 0.42 | 0.4-1.7 %/s |
| Roll active (abs > 0.02°/f) | **3.6 %** | 38 % | 19 % | 21 % | 14 % | 14-38 % |

Our only camera life is a push-in of about 0.015 %/f. It is too slow to read: 0.01-0.03 %/f in every 2-second bin. The
template default `pushK(f, f0, 0.0025)` is 0.25 %/f, so the missile CAMS used about 1/15 of it. No lateral move, arc or
roll appears anywhere in the film.

### 1.3 Character and object motion (calm frames, camera < 1 px/f)

| Metric | missile | burglar | jar_empire | window | jar_nobel | Ref range |
|---|---|---|---|---|---|---|
| Local change area, median / p75 | **0.06 % / 0.17 %** | 0.66 / 3.2 | 0.97 / 5.2 | 0.39 / 2.6 | 1.7 / 4.4 | median 0.4-1.7 % (7-28x ours) |
| Calm frames with any local motion (> 0.2 %) | **23 %** | 67 % | 76 % | 62 % | 77 % | 62-77 % |
| Calm frames where a character moves (> 2 % of its box) | **12 %** | 36 % | 45 % | 48 % | 44 % | 36-48 % |
| Ambient local change outside characters (median, % of frame) | **0.00** | 0.03 | 0.85 | 0.25 | 0.81 | 0.03-0.85 |
| Motion beats per second (local-area peaks ≥ 2.5x surroundings) | 0.50 | 0.39 | 0.34 | 0.36 | 0.60 | 0.34-0.60 |
| Motion beats per sentence | 1.7 | 1.4 | 1.3 | 1.7 | 1.7 | ≈ |

**The count of discrete beats is not the gap.** Ours fires about as many beats per second as the refs. The gap is
**amplitude and continuity**: in a calm frame, our moving area is 7-28x smaller. We have no ambient layer. And between
beats our characters freeze (42 % frozen frames), while the refs keep something moving 62-77 % of the time.

Where our motion lives (2-second bins): characters move only between 12 and 21 s (sailor waving the letters: 75-77 % of
those frames; the missile flight). In the rest of the film, character motion is 0-12 %:
- 0-12 s;
- 22-34 s, with the postmaster and the truck;
- 36-46 s.

### 1.4 Acting audit per sentence (manual, contact sheets every 3-5 f)

| Sentence | Length | Acting changes (expression, look, gesture, pose, prop) | Camera |
|---|---|---|---|
| burglar "The first night, nobody notices…" | 3.0 s | **5**: a head turn plus an eye-look shift; a lean and drop into a sit, about 9 f; the cat enters; the cat's expression swaps from wide eyes to a smug squint on "couch" | crossfade-in, push, glide to the cat |
| window "Police stroll right past the door…" | 4.7 s | **5**: a walk cycle across the door, about 1.5 s; the cop's head turns; neutral → closed-eye smile; then the player's grin with teeth; steel balls pour (prop FX) and the bucket fills | slow push, 1 cut |
| jar_empire "But the Emperor had the biggest army…" | 4.1 s | **2**: the emperor's expressions stern → frown → stern | **crane up 3 s** reveals the army, then back down |
| missile "Instead of a warhead, it carried 3,000 letters." | 2.5 s | **1**: a loop of the arm and letter waggle; the expression never changes | static |
| missile "The postmaster general called it historic…" | 3.8 s | **1**: one expression swap; the arm is frozen up the whole time; the bystander is frozen | static |

**Reference: 2-5 acting changes per sentence (median 5) and ≥ 1 expression swap per sentence. When the characters act
less (jar_empire), the camera carries the motion.** Missile: 1 change per sentence, and the camera never compensates.
Expression swaps: refs ≥ 1 per sentence; ours about 1 per 3 sentences.

Confirmed from the earlier report (not re-measured here):
- blinks every 0.5-2.3 s, 4 f, half / shut / shut / half;
- swaps land 0-3 f before the word;
- no squash/stretch, smears, line boil or breathing loops;
- walks 9-12 f per step with a 3-7 % bob.

Effect sprites seen in the refs:
- floating dust or bokeh motes (nobel);
- flickering signs and lights (window);
- pouring particles and props (window);
- drifting smoke and wine ripple (empire).

These are what makes "ambient local change" 0.25-0.85 % of the frame. Ours: 0.

## 2. Why ours reads cheap (ranked)

1. **The camera is a tripod.**
   - 93 % of frames are holds and 0 % are moves. The max speed is 1.7 px/f; the refs reach 12-44 px/f at least once
     per film and 0.8-3.9 times per 10 s.
   - The refs spend 22-51 % of their frames in slow drift and pushes; ours spends 7 %.
   - This is the single biggest contributor to the 0.003 frame diff.
2. **Characters freeze between beats.**
   - 42 % of frames are fully frozen, with 11 frozen spans ≥ 0.5 s; the longest is 2.5 s. The refs have 0-3 such spans.
   - Poses are held for whole sentences: the postmaster's raised arm, a bystander standing like a post.
3. **One acting idea per sentence instead of 3-5.**
   - No look shifts, head turns, lean or sit changes, or prop handling.
   - Expressions change about once per 3 sentences; the refs change at least once per sentence.
4. **No ambient layer.**
   - The refs always have something alive outside the character: motes, flicker, smoke, liquid, flags.
   - Our sky, sea, clouds and flags are static: 0.00 % outside the characters.
5. **Moving things are small.** When we do animate (the letter waggle), the area is 0.8-1 % of the frame. Ref beats are
   whole-body moves or big props: p75 2.6-5.2 %.

## 3. Implementation spec (template code: `templates/bridge/`)

Target numbers for the next missile render. Gate them with `measure.py` + `stats.py`; see 3.6.

| Gate | Target |
|---|---|
| Median masked frame diff | ≥ 0.015 |
| Frozen frames | ≤ 8 % |
| Frozen runs ≥ 15 f | ≤ 2 |
| Camera hold / drift / move | ≤ 45 % / ≥ 35 % / ≥ 15 % |
| Moves per 10 s | ≥ 1.5, peak 7-12 px/f |
| Calm frames with a character moving | ≥ 40 % |
| Local change median in calm frames | ≥ 0.4 % |
| Ambient change outside characters | ≥ 0.2 % of frame |

### 3.1 `story.ts`: CAMS, so every shot moves

The template machinery (`glide`, `pushK`, `dolly`, `zoom`, `rolled`, `KICKS`) already exists and matches the reference
grammar. The missile story did not use it at strength. Rules for writing CAMS:

**a) Base push on every key.** `pushK(f, f0, rate)` with `rate` **0.002-0.0035**: 0.2-0.35 %/f, i.e. 6-10 %/s. The
missile measured 0.015 %/f. On punch words, set `punch = 0.006` with `n = 30-35`.
- Punch words for the missile: "cruise missile", "3,000 letters", "historic", "Unluckily", "very expensive", "exactly one
  flight".
- Check: in quiet frames, net push-in should come out at ≥ 0.8 %/s, which is the window/burglar level.

**b) At least one glide key per shot of ≥ 2 s.**
- Shape: `{ f, dur: 24-45, s }`, travelling 150-350 px at 720p, i.e. 0.2-0.5 frame width. Peak = 1.875 x travel / dur:
  keep it at 7-12 px/f.
- Recipes, in metres at the look distance L:
  - **Lateral truck**: shift `pos` and `look` together by 0.12-0.25 x L along the camera's right vector, dur 36.
  - **Arc**: rotate `pos` around `look` by 8-15° of yaw over 40-60 f. Add an `arc(pos, look, deg)` helper next to
    `dolly`: rotate (pos − look) about Y by `deg x glide(u)`.
  - **Crane / tilt reveal** (jar_empire pattern, for "over the sea", "Mayport", the museum): raise `pos.y` by 0.3-0.5 x L
    and `look.y` by 0.2-0.4 x L over 60-90 f with smootherstep, hold 15-30 f, optionally return. Peak ≤ 12 px/f.
  - **Follow** (the missile in flight, the truck): `look` = the object's position + a lead of 0.15 x its velocity x 1 s.
    `pos` trails behind it through a critically damped spring, ω = 4 rad/s, so the framing lags 3-6 f on speed changes.
    Background speed during a follow: 8-25 px/f, which is the window/burglar range. Add whip blur (template recipe
    `references/reports/motion.md` §5.4) only if the background passes 40 px/f.
- Budget: 1.5-3 glide keys per 10 s across the film, attack ≈ release, 8-25 f each.

**c) Roll.**
- Every key carries `roll` ±0.02-0.05 rad (1-3°), alternating sign between consecutive keys, so that the glide between
  keys produces the slow 1-3° roll drift the refs show in 14-38 % of frames.
- On 2-3 emphasis keys use ±0.07-0.12 rad with `dur ≥ 18`.

**d) Impacts.** Use `KICKS` (frame-alternating, 7 f) on the launch, the landing and the "one flight" button. The missile
has none today.

### 3.2 `cast.ts`: an acting track for every on-screen character

Add a per-character beat list, timed to `words.json`, that drives pose parameters through eased transitions. This
replaces holding one pose per shot.

```ts
/** acting beat: lands LEAD (2 f) before the word onset. All fields optional; omitted ones keep the previous value. */
type Beat = { t: number; expr?: Expr; look?: number; headTilt?: number; lean?: number; arm?: ArmPose; prop?: Prop; dur?: number };
type ArmPose = "hang" | "wave" | "point" | "hip" | "up" | "shrug" | "hold";
/** pose at time t: each numeric field moves from the previous value with smootherstep over b.dur frames
 *  (default 6 f; head turn / look 3-4 f; lean or sit 8-10 f). Expressions swap instantly and get a blink via lidAt swaps. */
const act = (beats: Beat[], t: number) => { /* fold beats with glide((t - (b.t - LEAD)) * FPS / (b.dur ?? 6)) */ };
```

Authoring rules:
- **3-5 beats per sentence** for the character in focus: one expression swap, one look or head change, and one
  gesture or prop change.
- Background characters get **1 beat per sentence**: a look toward the action, or a small reaction.
- No beat-less gap longer than **0.5 s (15 f)** on a character who fills more than 15 % of the frame height. If the
  script has nothing, add a look shift (look ±0.6, 3 f) or a head tilt of 6-10° (6 f), then return after 20-30 f. This is
  the "acting idle" the refs use; still no breathing loops.
- Every `expr` change goes into that character's `SWAPS` list, so `lidAt` hides the swap with the 4-frame blink. Keep the
  `lidAt` gaps at 0.5-2.3 s.
- Gestures change on ones (no `q(…, 24)` quantising below 30 per second of motion).
- Arm moves: 6-10 f in, a hold of 10-30 f, then 8-12 f out.
- Big moves (sit, stand, lean in): 8-10 f.
- Anticipation only for jumps and throws: a 2-3 f crouch. No squash/stretch, no overshoot.

Suggested missile beats, for amplitude:
- **Sailor** (9-15 s): salute (6 f) → look at the missile (3 f) → grin + wave the letters (8 f).
- **Postmaster** (22-26 s):
  - arm up only on "historic", with `headTilt` 8° and `expr` "grin", then the arm down after 25 f;
  - on "entire world", both arms out (`arm: "up"`, 8 f);
  - the bystander turns to look (3 f) and claps or nods.
- **Postman** (32-36 s): walk in (see c), stop, look up at the missile (3 f), then `expr` "shock" on "very expensive".
- **Museum kid** (40-44 s): lean in (10 f), point, then expr "laugh" on "only time".

**c) Walks.** Any character entering or crossing uses `bodyFront` "stroll" or `bodySide` "march", per the template
numbers: 9-12 f per step, bob 3-5 % of height, lean 1-7°. The refs walk someone across in about 1 in 4 sentences; the
missile never walks anyone.

### 3.3 `toon.ts`: poses and effect sprites

**`bodyFront`.** Add an `arm` pose enum: "point", "hip", "up", "shrug", "hold". Use the same 3-point noodle arms as
`wave`. Add `lean` (deg, rotating the torso about the hip, ±12°). `headTilt` already exists.

**New FX drawers.** Each is a `(p: Pen, t: number)` card in the style of `fxStars` or `fxPuff`, ink `INK`, line width as
for `fxNote`. Every FX drawer animates on ones (key on `q(u, 30)`) and lives 12-40 f.

| FX | Use on | Drawing | Timing |
|---|---|---|---|
| `fxSweat` | "Unluckily", "very expensive" | 1-2 teardrops of 40x60 u at the temple | slide 30 u down over 12 f, then fade |
| `fxSparkle` | "historic", the museum | 4-point stars of 30-60 u | scale 0→1→0 over 10 f, 3-5 of them staggered by 3 f |
| `fxSpeed` | the missile flying, the truck | 5-8 parallel ink lines of 150-400 u, 4-8 u thick, behind the object along −velocity | jitter each line's offset per frame (on ones) |
| `fxZzz` | spare: bored clerk, long hold | "z" glyphs of 30-70 u | rise 80 u and fade over 40 f, a new one every 20 f |
| `fxExhaust` | missile and truck exhaust | reuse `fxPuff` | emit 1 puff every 3 f; each grows 0.4→1.2 and drifts 0.3 m back over 20 f |

**Ambient layer (world.ts or cast.ts `stage`).** Every exterior shot gets ≥ 2 of the following:
- clouds drifting 0.3-0.6 px/f at 720p (move the `fxCloud` x by `0.02 m/s x L`);
- sea glints flickering: 20-40 small soft cards on the water toggling every 4-8 f;
- flags or windsock fluttering: a 2-3 frame cycle of `rot` ±0.08;
- a bird pair crossing in 3-4 s;
- heat shimmer or dust motes on the runway: 15-30 soft 6-10 px dots rising 0.5 px/f.

Interiors (museum): 20-40 dust motes in the light beam, rising 0.3-0.6 px/f.

Target: ambient local change ≥ 0.2 % of the frame median (window 0.25, empire and nobel 0.8).

### 3.4 Order of work (largest gain per hour)

1. CAMS: base push 0.25 %/f on every key, plus 1 glide (truck, arc or crane) per shot, plus follow cams on the flight.
   This should take the missile's median frame diff from 0.003 to about 0.01 on its own, judging by window and nobel,
   where most of the diff comes from slow camera drift.
2. Acting tracks, 3-5 beats per sentence, with no frozen span over 15 f.
3. The ambient layer.
4. FX sprites on 4-6 punch words.
5. Walks for the postman and the kid.

### 3.5 Leave as is

- Blink system `lidAt`.
- `LEAD` = 2 f.
- `glide` smootherstep.
- `KICKS` shape.
- No squash/stretch, smears, line boil or breathing loops.

The refs show none of these.

### 3.6 QA gate

Run the scripts on every render:

```
python3 -I SCR/look/work/motion/measure.py out.mp4 out.npz
python3 -I SCR/look/work/motion/stats.py SCR SCR/look/work/motion
```

`stats.py` hard-codes its video list (`missile`, `burglar`, …) and reads `<video>.npz` from its second argument, so add
the new name to that list first. Fail the render if any target in the table at the top of §3 is missed.

## Files

All under `SCR/look/work/motion/`:
- scripts: `measure.py`, `stats.py`, `stats2.py`, `faces.py`, `viz.py`, `sheet.py`;
- data: `stats.json`, `stats2.json`, `*.npz`;
- sheets: `sh_burglar2.jpg`, `sh_window3.jpg`, `sh_empire4.jpg`, `sh_missile4.jpg`, `sh_missile7.jpg`;
- overlays: `viz*.jpg`.
