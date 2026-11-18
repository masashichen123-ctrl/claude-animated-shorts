# Depth: missile short vs premium references

**Scope:** depth of field, aerial perspective and fog, sky and clouds, horizon, layering, and background detail density.

**Frames compared**
- **Ours:** 13 frames of `missile_*.png`, 540x960, native.
- **Reference, new set:** 39 PNGs (jar_empire, burglar, window), 720x1280, downscaled to 540x960 with INTER_AREA for the region statistics.
- **Reference, old set:** 38 JPEGs (`short*`), 540x960.

**Caption masking:** the caption band (rows 62-78 % of frame height) is masked out of every reference statistic.

**Scripts and data** (in `SCR/look/work/depth/`)
- Scripts: `measure.py` (region stats), `tileblur.py` (calibrated tile blur), `esf.py` (edge-spread blur in boxes), `sky.py` (sky stops), `atmos.py` (contrast vs depth bands).
- Data: `stats.csv`.
- Contact sheets: `ours.jpg`, `jar_empire.jpg`, `burglar.jpg`, `window.jpg`, `ref4.jpg`, `ours4.jpg`, `refblur5.jpg`.

**Units**
- Blur is a Gaussian sigma in 720p px, written "σ720".
- The disc radius at our 1080x1920 output is about 3 × σ720. That is the `cInf` and `maxCoC` unit in `lensblur.ts`.

**Prior report:** this confirms and updates `references/reports/depth.md` (bridge study), which drove the current `lensblur.ts`, `LOOK.sky`, and fog 25→300.

---

## 1. Measured gap table

### 1a. Detail density and contrast (whole frame, caption masked)

| Metric | Ours (n 13) | Ref new (n 39) | Ref old (n 38) | Gap |
|---|---|---|---|---|
| Canny edge pixels, whole frame | **2.45 %** | 7.33 % | 5.78 % | ×3 fewer |
| Edge pixels, top third (background) | **0.66 %** | 5.72 % | 4.63 % | ×8 fewer |
| Edge pixels, middle third | 4.5 % | 10.7 % | 8.5 % | ×2.4 |
| Mean gradient energy, top third | **0.027** | 0.120 | 0.095 | ×4.4 |
| Empty 60-px tiles (< 0.5 % edge pixels) | **54 %** | 17 % | 21 % | 3× more empty area |
| Textured 48-px tiles (mid-band energy > 2e-4) | **34 %** (24-50) | 66 % (20-92) | — | half |
| Local contrast, median of 16-px luma std | **0.004** | 0.029 | 0.019 | ×5-7 flatter |
| Luma p5 / p95 | 0.28 / 0.85 | 0.13 / 0.90 | 0.12 / 0.84 | our darks are lifted, the range is short |
| Saturation, median | 0.54 (grass at **s = 1.00**, #58a001) | 0.45 | 0.48 | ours is clipped where it is flat |
| Vignette (corner/centre luma) | 0.865 | **0.708** | 0.675 | ours too even: the eye is not held centre |

### 1b. Depth of field

Blur is σ720 from the edge-spread fit (p30 of each box, n edges ≥ 20 unless noted).

| Shot | Subject | Background | Foreground |
|---|---|---|---|
| Ref jar_empire 0.3 s (MS, palace) | 0.6 | **1.6** | — |
| Ref jar_empire 21 s (insert, bowl) | 0.6 | **2.2** + bokeh discs | — |
| Ref window 33 s (MS from behind) | 0.5 | — | **5.0-6.4** (plant, cat) |
| Ref window 41 s, jar 47/60 s, window 3 s (wides/MS) | 0.5-0.6 | 0.5-0.9 (**sharp**, only hazed) | — |
| Ref, old 539-frame study | sharp | when on: CU 4.2, MS 4.0, FS 2.7, WS 1.9 | 3.7-7.8 |
| Ours 9 s (sailor on deck) | ~1.1 | 3.6 | — |
| Ours 23 s (podium) | ~1.0 | **9.7** (plane tail), clouds 4.0 | — |
| Ours 43 s (museum CU) | ~2.0 | **8.3** | wing over the head |
| Ours 17 s / 1 s (missile flying) | missile itself **4.0** (near-field) | cloud 2.8 | — |

Share of frames with clearly blurred regions:
- **Ours:** 5/13 frames (38 %) have more than 10 % of tiles at sigma540 > 1.5.
- **Ref new:** 5/39 (13 %) by the same rule, 27-33 % in the old study.

So **how often** DOF is on is roughly fine. Two things are wrong:
- **Too strong.** Our backgrounds reach 8-10 σ720. That is a 24-29 px disc, at the `maxCoC 24` clamp. The ref uses 1.6-4.
- **Nothing to blur.** What gets blurred is empty sky and flat grass, so the blur cannot read as depth.

### 1c. Sky

| Metric | Ours day (n 9) | Ref day (short13, jar 15) | Ref golden/sunset/night (n 12) |
|---|---|---|---|
| Top colour | #5299db (h 209, s 0.63) | #76bcf9 / #9ec8ed (h 207-208) | varied: #f09570, #ea757d, #1e4cb9, #564f94 |
| Colour just above the horizon | #73b1e8-#cbdef4 (h 208-213) | #aadffe / #d6e9f9 (h **202-207**) | #ffc489, #ffa88b, #9f8f9e |
| Horizon/top luminance | 1.18-1.42 (36 s: 1.67) | 1.19-1.45 | 1.13-2.1 (night up to 3+) |
| Hue shift, top → horizon | **+1 to +4°** (drifts violet) | −1 to −6° (drifts cyan) | **13-60°** (e.g. 17→30, 351→49, 246→304) |
| Sky texture, median 15-px luma std | **0.0034** | 0.0059-0.0067 | 0.006-0.011 |
| Horizontal variation (row std: clouds, sun glow) | **0.016-0.021** | 0.047-0.054 | 0.04-0.21 |
| Sky share of frame height | median 0.26, range 0.21-**0.71** | 0.16-0.23 | 0.13-0.34, median **0.20** |
| Clouds per frame | 0-2 isolated puffs, **2:1 aspect**, plain cumulus clip-art, sharp unless DOF | 3-10, elongated **4-7:1** strata, sizes shrink toward the horizon, shaded in the sky's own hue (pink/violet bellies), sun glow behind them | same |

### 1d. Aerial perspective: bands below the horizon line (exteriors: ours n 9, ref n 11)

Columns:
- **lc:** median 16-px luma std (local contrast).
- **sat:** median HSV saturation.
- **dA:** RGB distance (0-1.7) from the band's median colour to the horizon sky colour.
- **edge%:** Canny edge share in the band.

| Band (frame height below horizon) | lc ours | lc ref | sat ours | sat ref | dA ours | dA ref | edge% ours | edge% ref |
|---|---|---|---|---|---|---|---|---|
| 0-5 % (skyline) | 0.010 | 0.033 | 0.41 | 0.41 | 0.09 | **0.06** | 5.4 | 6.8 |
| 5-15 % (far) | **0.007** | 0.040 | **0.19** | 0.41 | 0.28 | **0.19** | **1.9** | 9.7 |
| 15-30 % (mid) | 0.012 | 0.067 | 0.26 | 0.45 | 0.29 | **0.32** | 4.5 | 10.6 |
| > 30 % (near) | **0.004** | 0.028 | **0.85** | 0.49 | **0.92** | 0.67 | 2.0 | 7.1 |

Reading of the table:
- **Ref: a smooth, monotone ramp.** Colour moves toward the horizon colour step by step (dA 0.06 → 0.19 → 0.32 → 0.67). Contrast and detail peak in the midground. Saturation stays about constant at 0.41-0.49, because the haze carries the key hue (golden haze s 0.36-0.47; see the row profiles in jar 47/60).
- **Ours: a step.** The fog greys the 5-15 % band to s 0.19 (pale blue-white #cee0f6, s 0.16). Then it jumps straight to clipped grass (s 1.0, dA 0.92).
- **No midground in ours.** Ours has zero to minimal midground detail at every depth: row std is 0.00-0.01 below our horizon vs **0.08-0.24** in the ref.

### 1e. Horizon treatment

| | Ours | Ref |
|---|---|---|
| Horizon y (top of frame = 0) | 0.21-0.44 | 0.16-0.30 |
| Sky-to-land transition | A fog smear 0.08 of frame height wide (17 s: rows 0.35 → 0.46; edge fit about 20 σ720 at 20 s), or a bare hard line of grass against sky (32/34 s) | A **crisp** silhouette (far town, hills, mountains: ESF 0.6-0.9 σ720) over 1-2 rows, hazed in colour but not blurred |
| What sits on the horizon | Nothing (sea or grass meets sky). One building card in 17 s | 3-5 stacked layers: fields → tree line → haze band → town/castle → mountains → sun glow |

### 1f. Layering

Foreground framing is a near object cut by the frame edge:
- **Ref:** about 30 % of frames: jar 0.3/2.5/47/60 (tree branch), window 6/33/41, burglar 52.
- **Ours:** about 15 % (9 s hull, 43 s wing). Ours are big flat dark masses: hull 13 s, luma about 0.07. One even covers the subject's head (43 s).

Visible depth layers in an exterior wide (counted by eye): **ref 5-7, ours 2-3** (grass / runway / sky).

---

## 2. Why ours reads cheap (ranked)

1. **Empty backgrounds.**
   - 54 % of our frame area is featureless (ref 17 %). The top third has 1/8 of the ref's edges and 1/4 of its gradient energy.
   - Every other depth cue needs something to act on. Blur, haze and parallax cannot show depth on a flat colour field.
   - So our DOF reads as "smudgy", not "lens".
2. **No midground and no horizon layer.**
   - Our ground plane runs straight into the sky through a white fog smear, or a hard grass edge.
   - The ref always stacks a crisp, hazed far silhouette (town, hills) with a haze band at its base.
3. **Wrong haze model.**
   - Our fog desaturates far bands toward pale blue-white (s 0.19) while the near grass is clipped at s 1.0. The result is grey-in-the-middle and neon-in-front.
   - The ref keeps saturation about 0.45 at every depth. Its haze is tinted with the key light (blue day, peach golden, violet night), and contrast ramps up toward the midground.
4. **DOF too strong and on the wrong shots.**
   - Our backgrounds hit the 24 px clamp (8-10 σ720). The ref background blur is 1.6-4 σ720 (5-12 px at 1080).
   - The ref blurs rich backgrounds: patterned walls, light sources as bokeh discs. We blur empty sky.
   - The ref also uses strong blur mostly on **foreground** occluders (5-6.4 σ720), which we almost never have.
5. **Clip-art sky.**
   - The colour gradient itself is fine (luminance ratio 1.2-1.4, about the ref's day values).
   - But it has a single hue, half the ref's texture, no sun glow and no horizontal variation (row std 0.02 vs 0.05-0.2).
   - Clouds are 1-2 isolated 2:1 white puffs, where the ref has many elongated, hue-shaded strata that shrink toward the horizon.
   - The sky also takes too much of the frame (up to 71 %; ref median 20 %).
6. **No framing vignette and few foreground layers.**
   - The corners are almost as bright as the centre (0.87 vs 0.71).
   - Foreground occluders appear half as often, and when present they are dark, flat and badly placed.

---

## 3. Implementation spec (target: `/home/user/claude-animated-shorts/templates/bridge/`)

### 3.1 Background content first (`world.ts`, `build.ts`): the prerequisite for every other depth fix

Add a reusable `Backdrop` builder (new function in `build.ts`, called from `World` constructor) that every exterior set gets.

**Distance rings** (all on the normal ink layer so they get outlines, all receiving fog):

| Ring | Distance from set centre | Content | Height | Notes |
|---|---|---|---|---|
| R3 mountains / far hills | 700-950 m | 1 closed ring of 2-3 overlapping silhouette strips (`ShapeGeometry` extruded 1 m, noise ridge: sum of 3 sines, amplitudes 40/18/7 m, periods 400/150/60 m) | 40-120 m | albedo pre-mixed 50 % toward fog colour; flat-shaded |
| R2 far town / tree line | 250-500 m | 30-60 instanced boxes (6-25 m wide, 8-30 m tall, gabled or flat roofs, 2-3 facade colours from the set's palette) **or** tree clumps (5-9 m spheres-on-trunk instanced), in clusters of 4-10 | 8-30 m | gives the crisp skyline the ref has (0-5 % band edge share ≥ 6 %) |
| R1 midground | 40-200 m | scattered props per set: trees 1 per 300 m², bushes, fences, poles, hangars, parked vehicles, small buildings; leave a clear lane for the shot's subject | 2-15 m | this band must reach local contrast ≥ 0.04 |
| R0 ground dressing | 0-40 m | painted ground variation, not just the `grassHD` tile. Add 3 decal types: path or dirt patches, darker grass tufts, flower specks (2-4 px at 1080) | — | ground tiles: luma std ≥ 0.03 |

For the sea sets (1 s, 9 s, 13 s, 17 s), add a coastline in R2/R3 (cliffs and a town on the far shore), and ships or buoys in R1.

**Acceptance metrics:** rerun `SCR/look/work/depth/measure.py` and `tileblur.py` on new stills.

| Metric | Now | Target |
|---|---|---|
| Edge share, top third | 0.66 % | ≥ 4 % |
| Empty 60-px tiles | 54 % | ≤ 25 % |
| Textured 48-px tiles | 34 % | ≥ 60 % |
| Median local contrast | 0.004 | ≥ 0.02 |

### 3.2 Haze: replace the linear `THREE.Fog` with key-tinted, height-pooled, saturation-keeping haze

Where: `world.ts` (`this.fog`, `update()`), `lights.ts` (`LightPreset.fog*`), `shade.ts` (the lam/two-tone shader's fog chunk).

**1. Distance term.** Exponential with an offset, so it ramps instead of stepping (`d` = view distance in m):

```glsl
float fd = 1.0 - exp(-max(d - hazeStart, 0.0) / hazeLen);   // day: hazeStart 30, hazeLen 175
```

This gives 0.16 at 60 m, 0.50 at 150 m, 0.75 at 270 m and 0.88 at 400 m. It matches the ref's dA ramp: about 0.1 / 0.28 / 0.48 / 0.9 relative to the near band.

**2. Height pooling.** Haze sits low, so far silhouettes stay readable (the ref's far tops are crisp):

```glsl
fd *= mix(1.0, exp(-max(wPos.y - groundY, 0.0) / hazeH), 0.6);   // hazeH 60 m
```

**3. Cap and colour.**
- `f = min(fd, hazeMax)` with `hazeMax` 0.85 (day) and 0.8 (golden).
- Colour = `L.fog`, set to the sky's horizon stop (`LOOK.sky.c[0]`) **but with saturation ≥ 0.30**. A pale-white fog is what greys our far band.

**4. Saturation keep.** This stops the green × blue-white mix going grey:

```glsl
vec3 c = mix(col, hazeCol, f);
float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
c = l + (c - l) * (1.0 + 0.6 * 4.0 * f * (1.0 - f));
```

It boosts chroma up to +60 % at f = 0.5 and adds nothing at 0 or 1.

**5. Presets** (replace the `fog`, `fogNear`, `fogFar` fields; keep the old fields for ink tinting):

| Preset | hazeCol | hazeStart | hazeLen | hazeH | hazeMax |
|---|---|---|---|---|---|
| day | `#a9cdf0` | 30 | 175 | 60 | 0.85 |
| golden | `#f6bf8c` | 25 | 150 | 50 | 0.80 |
| night (if added) | `#3a3f7a` | 20 | 140 | 40 | 0.75 |

**6. Ink.** `ink.ts` already fog-tints ink (`fogInk 0.3`). Feed it the same `f` (pass hazeStart/Len instead of near/far), and raise `fogInk` to 0.5. The ref's far ink is lifted, not removed.

**7. Optional haze band.**
- A horizontal additive card at the base of R2, 15-25 m tall.
- Gradient alpha 0.35 → 0, coloured `hazeCol`.
- This reproduces the ref's glowing mist layer between the midground and the far town (jar 47/60 rows 0.29-0.44: v 0.86-0.97, s 0.36-0.43).

**8. Grass and ground saturation cap.** In `LOOK.day.sat` or the `grassHD` palette, clamp grass so its on-screen colour is about `#5f9e2a` (s ≤ 0.75), not `#58a001` (s 1.00). The near band must not out-shout the subject (ref near-band saturation 0.49).

### 3.3 Sky (`lights.ts` `LOOK.*.sky`, `world.ts` sky `ShaderMaterial`)

**1. Day stops.** Shift the horizon toward cyan, not violet:

```ts
sky: { c: ["#bfe3fb", "#a3d3f7", "#78b6ee", "#5398e2", "#3576d0"], e: [0, 3, 9, 18, 40] }
```

Horizon hue 203 → top hue 214. Horizon/top luminance about 1.45.

**2. Painted texture.** Add to the sky fragment shader (world space, so it does not swim with the camera):

```glsl
uniform vec3 sunDirW; uniform vec3 glowCol; uniform float glowK; uniform float tex;
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5), b=fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5),
        c=fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5), d=fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5);
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
// after the 5-stop mix:
vec3 dir = normalize(vP);
vec2 q = vec2(atan(dir.z, dir.x) * 6.0, el * 14.0);
c *= 1.0 + tex * (vn(q) + 0.5 * vn(q * 2.7) - 0.75);                    // tex 0.05 -> luma std ~0.006 like ref
float sg = pow(max(dot(normalize(vec3(dir.x, 0.0, dir.z)), normalize(vec3(sunDirW.x, 0.0, sunDirW.z))), 0.0), 4.0);
c = mix(c, glowCol, glowK * sg * (1.0 - smoothstep(0.0, 0.52, el)));     // day glowK 0.25 #eaf6ff; golden 0.55 #fff0c0
```

The target is a horizontal row std of 0.04-0.08 in the sky, from the glow and clouds together.

**3. Golden.** Widen the hue sweep to the ref's 15-60° (horizon orange → top rose/violet). The current golden stops already do this; keep them and set `glowK` to 0.55.

### 3.4 Clouds (`world.ts` constructor, `paint.ts` `cloudHD`)

**Count and placement.** Replace the 9 cards with **30 cards in 3 shells**:

| Shell | Count | Distance | Height | Width | Aspect (w:h) | Card opacity |
|---|---|---|---|---|---|---|
| Low, near the horizon | 12 | 800-1000 m | 25-70 m | 80-160 m | **5-7:1** | 0.75 |
| Mid | 12 | 650-800 m | 80-170 m | 120-220 m | 3-4:1 | 0.9 |
| High | 6 | 600-700 m | 180-300 m | 160-260 m | 2-2.5:1 | 1.0 |

The heights put the low clouds at about 2-4° elevation.

**Fogging.** Clouds keep `fog: false`. Instead, pre-mix each card's colour toward the sky colour at its elevation: 45 % for low, 20 % for mid, 0 for high. That gives the ref's fading near the horizon.

**`cloudHD(seed, pal, aspect)`.** Add an aspect parameter:
- Canvas 1024×(1024/aspect).
- Lobes laid along x with radius 0.35-0.6 × the canvas height.
- Belly `shade` 25 % of the height, then `mid`, then `lit` crown. Keep the flat soft bottom.
- Make the day `shade` hue follow the sky: `#b9c6ee` (bluish) for day and `#a98fc4` for golden (already set).

**Thin strata.** Add 2-3 extra texture variants: thin strata, 8:1, height 40 % filled, alpha 0.6, for the low shell.

**Frame check.** Each exterior frame should show **3-8 clouds** of mixed size, and never a lone 2:1 puff centred in empty blue.

### 3.5 DOF (`lensblur.ts`, `story.ts` DOF table and `dofAt`)

**1. Split the CoC clamp** into far and near in `lensblur.ts`.
- Add `uniform float maxFar, maxNear;` and in `cocAt`: `return c < 0 ? max(c*nearScale, -maxNear*s) : min(c, maxFar*s);`.
- Constructor defaults: **`maxFar = 14`, `maxNear = 22`**, `nearScale = 1.4`.
- The ref's background blur tops out at about 4.2 σ720 (12.6 px at 1080). Its foreground occluders are 5-7.8 σ720 (15-23 px).
- In the near-field gather, use `M = maxNear * s`.

**2. Bokeh highlights.** Rich blurred backgrounds should show lights as discs (ref jar 21 s). In the main gather, weight bright samples:

```glsl
vec3 sc = texture2D(inputBuffer, suv).rgb;
float hw = 1.0 + 3.0 * max(dot(sc, vec3(0.2126,0.7152,0.0722)) - 0.85, 0.0) / 0.15;  // up to x4 for L>=1
acc += sc * w * hw; wsum += w * hw;
```

Apply this in the MAIN stage only (PRE stage `hw = 1`).

**3. DOF table values** (`story.ts` `DOF`):

| Shot type | `cInf` (px at 1080) | Background σ720 | Notes |
|---|---|---|---|
| CU and inserts | 10-12 | ~3.5-4 | Use only when the background has R1/R2 detail or light sources |
| MS | 8-10 | ~2.7-3.3 | |
| FS | 0, or 5-6 on chosen beats | | |
| WS / EWS / establishing | **0** | | The ref's wides are sharp, and depth comes from haze (3.2) |

- **Never set `cInf > 0` on a shot whose background is more than 60 % sky or flat ground.** Fix the content (3.1) or the framing instead.
- Concretely, for the missile shots: 23 s goes 24-px clamp → `cInf 10` with the plane at the R1 distance. 43 s goes to `cInf 10`. 9 s is OK at about 11.
- Keep the focus point on the subject's eyes (`eyes(id)`).
- No focus pulls inside shots (unchanged).

**4. Foreground occluders** (`story.ts` `FOREGROUND`).
- Target 25-30 % of shots, most of them MS/CU.
- Place each at 0.3-0.5 × the focus distance, covering 10-25 % of one frame edge, never overlapping the face. The 43 s wing over the head breaks this rule.
- Use mid-value, lit, saturated objects (plants, a mailbag, a rail, a crate, a crowd shoulder), luma 0.25-0.6, not near-black masses (luma 0.07 now).
- With `nearScale 1.4` and `maxNear 22` they land at the ref's 5-7 σ720.

### 3.6 Horizon and framing (`story.ts` CAMS, grade)

**Horizon y.** Put the horizon at **0.18-0.30** of frame height in exteriors (ref median 0.20). Raise the camera look-at or tilt it down 3-6° on 1 s, 23 s and 36 s, so the sky is about 20-30 % of the frame, not 43-71 %.

**Horizon line.** It must always be an object silhouette from R2/R3 (3.1):
- edge σ720 ≤ 1;
- haze ≥ 0.6 at the base, ≤ 0.4 at the top (height pooling does this automatically).

**Vignette** (`grade.ts`, coordinate with the grade report): corner/centre luma 0.87 → **0.72**, giving `k ≈ 0.28`, `r0 0.45` in the existing vignette formula.

### 3.7 Re-measure checklist

After the changes, render the same 13 timestamps and rerun the five scripts in `SCR/look/work/depth/`. Targets:

| Area | Target |
|---|---|
| Top-third edge share | ≥ 4 % |
| Empty 60-px tiles | ≤ 25 % |
| Below-horizon bands: dA | ramp about 0.05 / 0.2 / 0.3 / 0.65 |
| Below-horizon bands: saturation | 0.38-0.5 in every band |
| Below-horizon bands: local contrast | peaks in the 15-30 % band at ≥ 0.04 |
| DOF background blur (when on) | 1.6-4.2 σ720 |
| Foreground occluder blur | 5-7 σ720 |
| Subject | ≤ 0.7 σ720 |
| Sky row std | ≥ 0.04 |
| Sky hue shift, top → horizon | ≤ 0° (day: cyan-ward) |
| Clouds per exterior frame | 3-8 |
| Vignette | about 0.72 |

---

**Caveats**
- The reference frames are 720p, downscaled to 540. Ours are native 540, so our absolute sharpness is not comparable; compare background vs subject differences.
- Edge-spread values in small boxes with fewer than 20 edges, such as our subject faces, are noisy and only indicative.
- The reference exteriors are mostly golden or night scenes. Day-sky references are n = 2 in the new set plus the old study's n = 37.
- No reference material left the machine, and nothing under `/home/user/claude-animated-shorts` was edited.
