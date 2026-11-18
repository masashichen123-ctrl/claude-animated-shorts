# Character shape: missile short vs premium reference

Topic: head shape, proportions, torso, limbs, hands and feet, hats and hair, face placement, outline, cast variety.
Scratch work is in `SCR/look/work/charshape/`:
- scripts: `fit.py` (flood-fill silhouette fit), `blob.py` (port of `toon.ts` `blobPts`/`headBlob`), `bez.py` (proposed Bezier head), `preview.py`
- fits: `out2/fits.json`, `out3/`, `out4/`
- previews: `spec_preview.png` (current vs proposed, drawn only from our own numbers) and `head_compare.png`

`earlier` means `references/reports/characters.md` (38 head fits from 20 shorts). This study re-measured 3 new reference shorts (jar_empire, burglar, window) and 13 missile frames. Where the two agree, the earlier numbers stand.

Units:
- `W` = head width (the skin fill inside the outline).
- `a` = W/2.
- `HH` = head height.
- Reference pixels are at 720 px wide; ours are rescaled to 720.

## Main finding

**Our missile cast is already drawn with `toon.ts` v2, but v2's head is too subtle to read as anything other than a circle, and every hat copies the skull outline.**

Evidence that the missile cast uses v2:
- The sailors' pale-mauve legs measure rgb (124,105,121). This is exactly `mix("#e8e8e8", INK, 0.55)`, the v2 leg formula applied to white trousers.
- The faces show lidded eyes and the 4-button bean torsos.

Why the head still reads as a circle:
- I ported `headBlob`/`blobPts` to Python and measured them. Seeds 1 to 6 deviate from their best-fit circle by only **1.8 to 3.3 % R RMS (3.8 to 6.1 % max)**, with H/W 0.92 to 0.97 and chin curvature 1.00 (the same as a circle).
- `hatOn` builds the `cap` and `hair` hats from `hp` (the head's own contour) pushed out by 3 %. The silhouette therefore stays the ellipse, which is what the user is seeing.
- In the reference, the readable head shape comes from three things, not from the skull alone:
  1. a broad, shallow jaw;
  2. a turned face (features and chin pushed to one side);
  3. a hat or hair silhouette that breaks the skull outline.

## 1. Measured gap table

### 1a. Head contour (skin fill; jaw measured below the widest row, so hats and hair do not bias it)

| metric | circle | **ours** (missile, n=4) | **ref** (front heads, n=6: b26 ×2, b49, j36, j25, w22) | `toon.ts` v2 `headBlob` (seeds 1–6) | **proposed** (§3) |
|---|---|---|---|---|---|
| jaw depth: widest row → chin, ÷ a | 1.00 | **1.03–1.17** | **0.89** (0.71–0.93) | 0.91–0.97 | 0.85 |
| width at 50 / 80 / 95 % of jaw depth, ÷ W | .866 / .60 / .31 | .82–.85 / .57–.60 / .35–.36 | **.83 / .60 / .34** | .84 / .60 / .35 | .86 / .61 / .36 |
| chin curvature radius (circle fit to bottom 18 %), ÷ a | 1.00 | **0.81–0.88** (narrow, pointed chin) | **1.10** (0.91–1.13) (broad, flat jaw) | 1.00 | 1.04–1.14 |
| jaw superellipse exponent | 2.0 | 1.9–2.0 | 1.9–2.2 (back side 1.7–1.9) | 2.15–2.45 | 2.2 front / 1.9 back |
| H/W (whole skull) | 1.0 | ≈1.0 (circle under the cap) | **0.93** (earlier: IQR 0.83–1.01) | 0.92–0.97 | 0.85 / 0.935 / 1.03 (3 archetypes) |
| chin x offset toward the facing side, ÷ W | 0 | 0 (all faces frontal) | 0.02–0.04 front; **+0.07** police 3/4 | 0.01–0.02 | +0.03 (+0.06 in 3/4) |
| eye-pair x shift toward the facing side, ÷ W | — | **0.00** (every character) | +0.03 to **+0.17** (w22 0.17, earlier median 0.08) | 7u = 0.07, only when `facing ≠ 0` | +0.10 |
| eye spacing, centre to centre, ÷ W | — | **0.29–0.35** | 0.20–0.30 (police 0.30, w22 0.20, earlier median 0.26) | 0.26 | 0.26 |
| mouth below the eye line, ÷ W | — | 0.19–0.25 | 0.18–0.22 | 0.20 | 0.19 |
| brows above the eye line, ÷ W | — | none on most frames | **0.21** (police) | 0.20 | 0.20 |
| deviation from the best-fit circle, RMS / max, % R | 0 / 0 | ≈0 (visually a perfect circle) | (occluded) | **1.8–3.3 / 3.8–6.1** | 3.2 / 6.0, plus a hat that breaks the outline |

### 1b. Head silhouette including hair and hat (what the eye actually reads)

| | **ours** | **ref** |
|---|---|---|
| hat or hair outline vs skull | **identical to the skull**: the cap is the skull's top cut at 0.30 HH, scaled ×1.03, plus a dark band | **independent shape** |
| reference examples | — | police cap crown ≥1.07 W wide and ≈0.33 W tall, flared trapezoid; baseball cap with brim projecting ≈0.3 W sideways; bowl haircut overhanging the back of the head by ≈0.07 W and adding ≈0.15–0.35 HH on top, with a faceted crown (straight runs on the back-top); spiky tufts 0.06–0.12 W |
| bare round skull visible | 100 % of our cast | ≈0 % of reference characters (every one in the 3 new shorts has hair or a hat) |

### 1c. Body (full figures: ours missile 9s/23s/40s/43s; ref burglar 13s/18s, window 19s/22s)

| metric | **ours** | **ref** | gap |
|---|---|---|---|
| total height | 3.5 HH (9s); 4.0 HH (40s) | 3.5 HH (b13; earlier 3.3–3.7) | ok |
| torso length (chin → torso bottom) | 1.18–1.47 HH | 1.05–1.23 HH | ok to slightly long |
| torso max width ÷ W | **0.82 (9s), 0.93 (40s), 1.03 (43s)** | **0.65–0.66** (b13, w19, w22), 0.87 (police); earlier median 0.80 | ours 15–40 % too wide; reads as an egg, not a bean |
| torso widest point, from the top | 0.27–0.55 (9s and 13s widest high, near the shoulders) | **0.64–0.80** (w19 0.64, w22 0.80) | ours is top-heavy |
| torso top width ÷ max width | 0.6–0.8 | **0.41–0.66** | ours lacks the narrow top |
| leg stroke ÷ W | 0.067 (5 px on 75 px) | **0.060–0.063** (b13 11 px on 184 px; police 21 px on 335 px) | ok |
| **leg and arm colour** | **pale mauve-grey rgb (124,105,121), luma ≈0.44**, on light trousers | **near-ink rgb (37,27,53) / (41,32,52), luma ≈0.12**, whatever the clothing | ours dissolve into light backgrounds; the stick-figure read is lost |
| hands | ink dots ≈0.10 W diameter | ink dots 0.08–0.15 W | ok |
| feet | ink ovals ≈0.24 W | ink strokes 0.15–0.25 W | ok |

### 1d. Outline and cast variety

| | **ours** | **ref** |
|---|---|---|
| head outline median ÷ W | 5.3–6.7 % (p10–p90 4.8–8.7 px) | 4.2–8.4 % | ok |
| ink colour (darkest 15 % of the ring) | rgb **(22,0,12)**, saturated near-black | plum (47,29,40) (earlier); here (23,3,29)–(96,67,68) depending on the grade | ours too black; lift it (grade/outlines topic) |
| head size in a close-up, ÷ frame width | 0.18–0.22 (13s, 23s) | **0.37–0.47** (police 0.47, w22 0.37, w43 ≈0.45) | at 0.2 of the frame a 6 % shape deviation is about 6 px at 1080 width, which reads as a circle |
| distinct head silhouettes across the cast | **1** (circle + skull-copy cap) | ≥ 6 per short: hair (bowl, side part, spiky, bun) and hats (police cap, baseball cap, helmet, crown hat, beanie) | |
| torso shapes | 1 template, only the colour changes | 0.62–0.90 W, plus straps, badges, belts, collars, camera | |
| face accessories | none | glasses on 5 of 9 burglar-short characters, beard, sunglasses, headlamp | |
| facing | **all frontal**, features symmetric | most characters 3/4, features shifted 0.08–0.17 W | |

## 2. Why ours reads cheap, ranked

1. **The silhouette is a circle.**
   - The skull is within 3 % RMS of a circle.
   - The cap and hair are the same circle (`hatOn` builds them from `hp` ×1.03).
   - The torso is a wide egg the same width as the head, so the figure reads as two stacked circles on sticks.
2. **Every face is dead-frontal and symmetric** (facing = 0): eyes centred, chin centred. Reference faces are turned, with features 0.08–0.17 W toward one side and the jaw bulging on that side. That turn is what makes their heads look shaped.
3. **Pale limbs.** Legs and arms are pale mauve (luma 0.44), produced by `mix(pants, INK, 0.55)` with white trousers. The reference uses near-ink limbs (luma ≈0.12) whatever the clothing colour.
4. **The jaw is the wrong way round.**
   - Ours is deep (1.03–1.17 a) with a narrow chin (radius 0.84 a), because v2 uses `egg -0.12`.
   - The reference jaw is shallow (0.89 a) with a broad, flat bottom (radius 1.10 a): a "bun" rather than an egg.
5. **Torso too wide** (0.82–1.03 W against 0.65–0.80 W) and widest too high.
6. **One template for the whole cast**: no hair or hat archetypes, no accessories, no body-width variety.
7. Heads are small in close-ups (0.2 of the frame width against about 0.4), so shape detail is lost. This is a camera topic, but it multiplies items 1 and 2.

## 3. Implementation spec (`templates/bridge/toon.ts`, 600×1000 design canvas, soles at y = 975)

### 3.1 Head: replace `headBlob` + `blobPts` (heads only; keep `blobPts` for torsos) with a 4-segment cubic Bezier path

Add a sampler next to `curve`:

```ts
/** sample closed cubic-Bezier segments [p0,h0,h1,p1] (clockwise on screen) into a polyline for Pen.shadedFill / inkRing */
const bezPts = (segs: [P2, P2, P2, P2][], n = 24): P2[] => {
  const out: P2[] = [];
  for (const [p0, h0, h1, p1] of segs) for (let i = 0; i < n; i++) {
    const t = i / n, s = 1 - t, A = s * s * s, B = 3 * s * s * t, C = 3 * s * t * t, D = t * t * t;
    out.push([A * p0[0] + B * h0[0] + C * h1[0] + D * p1[0], A * p0[1] + B * h0[1] + C * h1[1] + D * p1[1]]);
  }
  return out;
};
/** Bezier handle factor that makes a quarter-segment pass through the superellipse(n) 45-degree point (n=2 gives 0.552) */
const kap = (n: number) => (2 ** (-1 / n) - 0.5) / 0.375;
```

#### Head shape

Head-local units: `a = W/2`. The origin is the **widest row** (not the centre); +y is down; `f` is facing (+1 = toward screen-right).

The front side is the side the face turns to. Anchors:

| anchor | standard | "bun" (wide) | "bean" (tall) |
|---|---|---|---|
| R, front widest point | (1.03, 0) | (1.04, 0) | (1.02, 0) |
| C, chin | (0.08, 0.89) | (0.08, 0.80) | (0.07, 1.00) |
| L, back widest point | (−0.97, −0.02) | (−0.96, −0.02) | (−0.98, −0.02) |
| T, crown | (0.02, −0.98) | (0.02, −0.90) | (0.03, −1.06) |
| kF (front jaw) = kap(nJf) | kap(2.2) = 0.545 | kap(2.3) | kap(2.1) |
| kB (back jaw) = kap(nJb) | kap(1.9) = 0.508 | kap(2.0) | kap(1.85) |
| kT (crown) | kap(1.75) = 0.461 | same | same |
| measured H/W | **0.935** | 0.85 | 1.03 |
| jaw depth ÷ a | 0.85 | 0.76 | 0.93 |
| width at 50 / 80 / 95 % of jaw depth | .86 / .61 / .36 | .87 / .63 / .33 | .83 / .57 / .31 |

The archetype range 0.85–1.03 covers the reference IQR of 0.83–1.01.

Segments, written in head units and then multiplied by `[f·a, a]` and offset to `(cx, wy)`:

```
R→C : [R, (R.x, R.y + (C.y−R.y)·kF), (C.x + (R.x−C.x)·kF, C.y), C]
C→L : [C, (C.x + (L.x−C.x)·kB, C.y), (L.x, L.y + (C.y−L.y)·kB), L]
L→T : [L, (L.x, L.y + (T.y−L.y)·kT), (T.x + (L.x−T.x)·kT, T.y), T]
T→R : [T, (T.x + (R.x−T.x)·kT, T.y), (R.x, R.y + (T.y−R.y)·kT), R]
```

For `f = −1`, also reverse the point order so the contour stays clockwise for `inkRing` (it uses the outward normal of a clockwise contour).

Per-character jitter from `rnd(seed, k)`:
- archetype: `rnd < 0.25` gives bun, `> 0.8` gives bean, otherwise standard;
- C.x ± 0.04;
- T.x ± 0.05;
- nJb ± 0.1;
- whole-path rotation ± 4° about the widest-row centre.

Drop the 0.8 % noise: with sampled Beziers it only adds wobble.

**Exact adult standard head, facing +1, in design units** (a = 118, W = 236, HH = 1.87a = 220.7):
- head centre x = 300;
- widest row wy = 318;
- this assumes `BUILD.adult` torso 1.1 / legs 1.4 and `chin = torsoBot − 1.1·HH`, which gives torsoBot 666, chin 423, wy = chin − 0.89a = 318, crown 202.

As fractions of the canvas (x/600, y/1000):

```
P0 R  (421.5, 318.0)  = (0.7025, 0.318)
  h   (421.5, 382.3)  = (0.7025, 0.382)
  h   (378.1, 423.0)  = (0.630, 0.423)
P1 C  (309.4, 423.0)  = (0.516, 0.423)
  h   (245.2, 423.0)  = (0.409, 0.423)
  h   (185.5, 371.3)  = (0.309, 0.371)
P2 L  (185.5, 315.6)  = (0.309, 0.316)
  h   (185.5, 263.4)  = (0.309, 0.263)
  h   (248.4, 202.4)  = (0.414, 0.202)
P3 T  (302.4, 202.4)  = (0.504, 0.202)
  h   (357.3, 202.4)  = (0.596, 0.202)
  h   (421.5, 264.7)  = (0.7025, 0.265)
→ P0
```

Kid build: a = 112. torsoBot = 975 − 1.0·HH = 766, chin = 588, wy = 488, crown = 378. Use the same unit anchors.

Wiring:
- In `bodyFront`/`bodySide`, replace `const H = headBlob(...)` and `const hp = blobPts(300, hc, H)` with `hp = headPath(seed, Bd.a, facing)`.
- Set `hc = wy` for features. Faces already use cy = eye line, and the eye line sits at the widest row (police measurement).
- Rewrite `H.b` uses as follows: `crown = wy − T.y·a`, `chin = wy + C.y·a`, `HH = (C.y − T.y)·a`.
- For `bodySide`, use facing = +1 with R = (1.08, 0) and C = (0.30, 0.86), so the jaw juts forward. Put the eye at hx + 27u as now.

#### Facing default

Never leave `facing` at 0. In `cast.ts` `person()`:
- standing characters get `facing = sign(screenX(target) − screenX(self))`, where the target is the speaker, the prop or the frame centre;
- use 0 only for a deliberate "stare at camera" beat.

In `faceFront`, raise the feature shift from `7u` to **`10u`** (eyes) and from `8u` to **`11u`** (mouth). These are the measured 0.08–0.17 W.

### 3.2 Hats and hair: own silhouette, never a scaled skull copy

In `hatOn`, the `cap`/`hair` branch currently builds its shape from `hp`. Replace it with these generic rules, all in units of W:

**Hat crown band:**
- width **1.02–1.10 W** at the base: wider than the skull, so it overhangs both sides;
- seated **0.25–0.32 HH below the crown**, with the base edge sagging 0.03 W (already in `sag()`);
- tilted **4–8°** toward the back of the head.

**Peaked cap or service cap:**
- crown is a trapezoid 0.30–0.38 HH tall, its top 1.05–1.12 W wide (it flares);
- the top corners are rounded with radius 0.04 W, and the top edge has a 0.02 W lift on the front side;
- the peak is a half-ellipse 0.40 W × 0.05 HH, its centre shifted **0.16 W toward the facing side** so it sticks out of the silhouette;
- outline 0.85 × w0.

**Brimless cap or beanie:**
- dome 1.04 W wide and 0.30 HH tall;
- the dome's top is flattened: superellipse n = 2.6, not the skull's 1.75;
- an optional pompom or tuft of 0.07 W, offset to the back.

**Hair:**
- separate polygon with 0.05–0.08 W overhang on the back side and 0.00–0.02 W on the front;
- top raised 0.10–0.20 HH above the skull crown;
- crown built from 3–5 straight-ish facets: Bezier handles kap(1.4) = 0.316;
- a fringe edge cut diagonally across the forehead, from (−0.45 W, wy − 0.55a) to (+0.40 W, wy − 0.20a) on the facing side;
- 0–3 tufts, each a triangle 0.06–0.12 W tall;
- hair colour per character.

The existing `shako`/`tophat` branches already break the silhouette and stay as they are.

**Archetype table, chosen by seed:**

| slot | options |
|---|---|
| head | bun / standard / bean |
| headwear | bowl hair / side-part hair / spiky hair / bun-on-top hair / peaked cap / beanie / none = bald (≤10 %) |
| accessory | none 50 % / round glasses 30 % (two rings r = 0.11 W, 0.025 W ink, bridge 0.06 W, centred on the eyes) / moustache 10 % / beard 10 % |

### 3.3 Torso (`bodyFront`: `T`; `BUILD`)

| parameter | new value |
|---|---|
| `BUILD.adult.tw` | 0.80 → **0.70** |
| `BUILD.stout.tw` | 0.92 → **0.86** |
| `BUILD.kid.tw` | 0.72 → **0.66** |
| new thin build | `slim: { a: 112, torso: 1.15, legs: 1.45, tw: 0.62 }` |

Torso blob:
- `nTop 2.2 → 1.9`
- `nBot 2.6 → 2.4`
- `egg 0.12 → 0.22`

With these, the top width is ≈0.55 of the maximum and the widest point sits at ≈0.70 of the height, matching the measured 0.41–0.66 and 0.64–0.80.

Keep the torso top hidden under the head (chin − 0.25 HH). Add `asym 0.06·facing` and `tcx = 300 + 4u·facing`.

### 3.4 Limbs

Legs:
- `legCol = mix(o.pants, INK, 0.55)` → **`mix(o.pants, INK, 0.85)`**;
- when the luma of `o.pants` is above 0.6 (white or light trousers), use `INK` directly;
- target luma ≤ 0.18;
- far leg: `mix(o.pants, INK, 0.92)`.

Arms:
- `armCol = mix(o.jacket, INK, 0.5)` → **`mix(o.jacket, INK, 0.8)`**, under the same rule;
- side-view far arm: 0.9.

Unchanged:
- widths: legs 5.8u, arms 5.2u;
- hands: dot r = 5.5u, INK;
- feet: 7.5u × 16u strokes. They already match (0.06 W legs, 0.11 W hands, 0.16 W feet).

### 3.5 Face values already in v2 (confirmed, keep)

- Eyes 26u apart (0.26 W), eye line at the widest row.
- Brows 20u up (17u under a brim).
- Mouth 19–20u down.
- Lidded deadpan default.
- No blush, no catchlights.
- Outline w0 = 5u with `1 + 0.45·cos(θ − θthick)`.

The only face changes are the facing default and the 10u/11u shift in 3.1. Ink colour belongs to the outlines/grade reports: the on-screen ink is rgb (22,0,12), against a plum ≈ (47,29,40) target.

### 3.6 Check after implementing

Render one still per archetype at 1080×1920. On each, measure with `SCR/look/work/charshape/fit.py` (flood fill from a cheek seed):
- jaw depth ÷ a must be 0.80–0.93;
- chin curvature ÷ a must be 1.0–1.2;
- eye-pair shift must be ≥ 0.08 W for any facing ≠ 0;
- leg luma must be ≤ 0.2;
- the hat or hair outline must extend ≥ 0.03 W beyond the skull on at least one side.

`spec_preview.png` shows the current construction (left) against this spec (right), drawn only from our numbers.
