# Grade and targeted colour: missile short vs premium references

Topic: colour grade, contrast, saturation, and "targeted colours" (one intentional palette per shot).
Work folder: `SCR/look/work/grade/`.

- Scripts: `scripts/measure.py` (per-frame metrics), `scripts/summ.py` (aggregates), `scripts/hue.py` (pooled per-hue colour), `scripts/sim.py` and `simI.py` (numpy model of the proposed grade, applied to our stills and re-measured).
- Data: `frames.json`, `summary.txt`, `hue.txt`, `sim.json`.
- Images: `*_sheet.jpg` contact sheets, `sim_sbs.jpg` (ours on top, proposed grade below), `sim/` graded stills.

This report confirms `references/reports/grade.md` and extends it. That report fitted tone, black point and vignette. This one measures **palette structure**: which hues get chroma, how much area they get, warm against cool, and chroma per value zone. Those are the "targeted colour" gaps it did not cover.

## 0. Method

- **Frames.**
  - Ours: 13 stills. 11 are day exteriors (D); 2 are interiors (I, museum 40 s and 43 s).
  - Reference: 39 stills from the three new shorts (jar_empire, burglar, window), labelled by hand: D 4, golden G 3, interior I 18, night N 14.
  - Also 38 older `shortNN` JPEGs. Their "bright" subset, median Y' > .45, n = 14, is used as extra day evidence.
  - Everything is resized to 540x960.
- **Caption mask.** Rows 60-78 % of the height are removed in the reference frames.
- **Ink mask** (as in the old report): 7x7 closing − Y' > .12 and Y' < .30. Non-ink statistics also drop a 1 px dilation of the ink.
- **Luma.** Y' uses Rec.709 weights on sRGB values.
- **Chroma** is CIELAB C*ab (D65). **Hue families** use the 30° HSV-hue bins red 0, orange 30, …, rose 330, weighted by C* over pixels with C* > 15.
- **Warm fraction** = C*-weighted share of hue 330-90° ÷ (warm + cool 150-270°).
- **Palette.** K-means with k = 6 in Lab, on every 7th non-caption, non-ink pixel. The "hero" is the most chromatic cluster with at least 2 % of the area. "heroC/restC" is the hero's C* ÷ the area-weighted C* of the other five clusters.
- **Texture metrics.**
  - abTex = median local (9x9) std of the a*, b* vector.
  - flatBlocks = share of 24x24 blocks with L*, a* and b* std all below 2.5.

## 1. Measured gap table

### 1a. Aggregates (median of per-frame values)

| metric | ours D (11) | ref D (4) | ref old bright (14) | ours I (2) | ref I (18) | ref N (14) |
|---|---|---|---|---|---|---|
| Y' p5 / p25 / p50 / p75 / p95 / p99 | .28/.49/.55/.67/.86/.94 | .25/.46/.60/.78/.92/.96 | .25/.50/.62/.73/.89/.96 | .17/.23/.50/.55/.64/.70 | .16/.27/.43/.54/.90/.97 | .09/.18/.27/.40/.79/.96 |
| share shadows Y'<.3 / mids / highlights Y'>.7 | .03 / **.79** / **.19** | .07 / .49 / **.41** | .05 / .59 / .32 | .33 / .66 / **.01** | .30 / .34 / .15 | .55 / .37 / .08 |
| non-ink Y' p5 | .33 (subs .05) | .28 | .31 | .19 | .16 | .09 |
| black point (darkest 0.5 %) | **#030112** (3,1,18) | #2f1e24 to #45262d | – | #12011d | #1b0f14 to #29160e | #080d41 |
| C* p25 / p50 / p90 / p99 | 14/31/48/76 | 11/16/47/70 | 19/30/45/67 | 41/47/61/71 | 13/19/41/66 | 22/38/70/77 |
| area share with C*>60 | **9.5 %** (max 43 %) | 3.0 % | 5.2 % | **25 %** (max 49 %) | 2.4 % | 30 % |
| C* median shadows / mids / highlights | **31** / 35 / 18 | 19 / 33 / 14 | 20 / 33 / 17 | **48 / 48 / 40** | 21 / 25 / 12 | 37 / 42 / 18 |
| HSV S median shadows / mids / highlights | .61 / .50 / .23 | .42 / .51 / .18 | .50 / .49 / .21 | .97 / .55 / .48 | .57 / .43 / .14 | .69 / .49 / .15 |
| zone a*/b* shadows (pooled) | +9.9 / **−16.6** (navy) | +15.6 / +1.6 (rose-mauve), D + old bright pooled | | +28.9 / **+21.4** (brown) | +15.2 / −0.2 | +16.5 / −29.1 |
| zone a*/b* mids | **−11.7 / −6.5** (teal) | +4.8 / +7.7 (warm neutral) | | +19.8 / +21.9 | +11.1 / +9.8 | +17.9 / −32.5 |
| zone a*/b* highlights | −1.9 / **−13.7** (cold blue) | −2.3 / **+13.6** (cream) | | +13.7 / +44.1 | +3.0 / +12.2 | +2.5 / +2.8 |
| **warm fraction** (C*-weighted) | **0.18** | **0.80** | 0.77 | 0.75 | 0.80 | 0.11 |
| C* median of warm px / cool px | 74 / 35 | 43 / 19 | 31 / 31 | 55 / 35 | 29 / 27 | 30 / 44 |
| L* median of warm px / cool px | 58 / 65 | 60 / 67 | 69 / 58 | 48 / 39 | 51 / 45 | 52 / 33 |
| hue families with >5 % chroma weight | 2 | 3 | 3 | 2 | 4 | 3 |
| hue entropy (bits, 12 bins) | **1.31** | 1.90 | 1.58 | 1.04 | 1.93 | 1.68 |
| share of the top-2 hue bins | .92 | .81 | .87 | .92 | .76 | .80 |
| **hero cluster C* / area share** | 71 / **25 %** | 59 / **4.6 %** | 56 / 18 % | 64 / 4.6 % | 55 / 7.5 % | 66 / 23 % |
| hero C* ÷ rest C* | 2.65 (rest C* 27) | **3.25** (rest C* 18) | 2.41 | 1.39 | 2.94 | 2.03 |
| palette L* span (6 clusters) | 53 | 50 | 59 | 58 | 64 | 69 |
| abTex (local a*b* variation) | **0.42** | 1.38 | 1.03 | 0.32 | 1.38 | 1.17 |
| local L* std (9x9) | **0.22** | 3.34 | 0.72 | 0.20 | 1.41 | 0.85 |
| flatBlocks (dead-flat 24 px blocks) | **67 %** | 17 % | 40 % | 66 % | 26 % | 36 % |
| centre/edge mean Y' | 1.03 | 1.00 | 0.99 | 1.16 | 1.18 | 1.87 |

### 1b. Hue content, C*-weighted %

| set | red | orange | yellow | chartr. | green | spring | cyan | azure | blue | violet | magenta | rose |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ours D | 1 | 2 | 0 | **27** | 0 | 0 | **9** | **49** | 11 | 1 | 0 | 1 |
| ref D | 20 | 35 | 3 | 11 | 1 | 1 | 3 | 17 | 4 | 3 | 1 | 1 |
| ref old bright | 11 | 28 | 20 | 5 | 6 | 2 | 2 | 20 | 2 | 1 | 0 | 1 |
| ours I | 6 | **67** | 0 | 0 | 0 | 0 | 0 | 0 | 25 | 1 | 1 | 0 |
| ref I | 24 | 43 | 7 | 0 | 0 | 0 | 3 | 7 | 8 | 5 | 2 | 1 |
| ref N | 3 | 6 | 1 | 0 | 0 | 0 | 1 | 29 | 49 | 6 | 2 | 3 |

### 1c. Pooled per-hue colours (pixels with S > .25)

"Lit" is the brightest 30 % of each hue's pixels; "dark" is the darkest 30 %.

| hue | ours D: pixel share, lit, dark | ref bright day: pixel share, lit, dark |
|---|---|---|
| chartreuse (grass) | 19.6 %, **#5ba205 (L60 C75)**, #509201 (L54 C71) | 4.6 %, #9ed46f (L79 C55), #698c34 (L54 C49) |
| green | 0.5 % | 5.3 %, #7ecb7d (L75 C50), #61a068 (L60 C39) |
| cyan (our sea) | 10.5 %, **#29c2d2 (L72 C37)**, #1ba1b6 | 3.3 %, #5dbab7 (L70 C28), #206168 (L38 C19) |
| azure (sky) | 51.5 %, #9cc5ef (L78 C26), #478ccc (L56 C40) | 19.7 %, #8cc0f0 (L76 C29), #4079c5 (L51 C45) |
| blue | 14.4 %, #444b78 (L33), **#060c2b (L4)** | 2.3 %, #7f86b8 (L57), #222045 (L15) |
| red | 0.4 %, #eb2a36 (L53 C81) | 14.1 %, #da8e86 (L67 C32), #6a332e (L29 C27) |
| orange | 1.1 % | 32.4 %, #e7bb87 (L79 C33), #8f5f3b (L45 C32) |
| yellow | 0.2 % | 11.1 %, #f8e27c (L90 C52), #9da142 (L64 C49) |
| ours I orange | 60.2 %, #f3a443 (L73 C63), **dark #722703 (L27 C48)** | ref I orange 41.9 %, #eabf7c (L80 C39), dark #5e3c25 (L29 C24) |

### 1d. Per-shot palettes

K-means, k = 6, sorted by area: hex, area share, C*.

| shot | palette | hero (C*, area) | warm fraction |
|---|---|---|---|
| 1 sea + missile | #23b6c8 37 % C36 · #64a2d7 28 % · #b6d0ef 22 % · #ece9e9 9 % · #5a597a 3 % · #ee1f2b 1 % C88 | the sea itself (36, 37 %) | .02 |
| 9 sub deck | **#10142a 32 % L7** · #82b4e7 30 % · greys 37 % · #eb1425 1 % | sky (31, 30 %) | .07 |
| 13 sailor + letters | **#0f142c 50 % L7** · sky 30 % · #992954 2 % | sky (33, 12 %) | .08 |
| 17 missile over land | sea 38 % · sky 39 % · #569f1b 11 % C71 | grass (71, 11 %) | .16 |
| 20 runway + palm | **#559b03 40 % C73** · sky 46 % · grey 7 % | grass (73, **40 %**) | .65 (grass counts as warm) |
| 23 podium | sky 58 % · grey 21 % · #4a3e64 15 % · #ab470d 5 % C63 | podium side (63, 5 %) | .18 |
| 27 plane + sacks | grey #86858c 38 % · sky 39 % · lavender-grey 17 % | sky (37, 27 %) | .03 |
| 29 building + kid | **grass 43 % C74** · sky 22 % · grey 20 % | grass (74, 43 %) | .71 |
| 32/34 truck | grass 25 % C73 · sky 31 % · lavender-grey 33 % · navy 12 % | grass (73, 25 %) | .57 |
| 36 missile + postman | sky 75 % · grass 10 % C73 | grass (73, 10 %) | .20 |
| 40 museum | #6b689f 43 % violet-grey · #782904 26 % L28 C51 · #bb7b83 11 % · #d99345 7 % | gold (54, 7 %) | .54 |
| 43 museum CU | **#ef9d37 40 % C66 · #d68f3e 25 % C56** · #762a07 22 % C49 | orange everywhere (74, 2 %) | .96 |
| ref burglar 52 (day door) | plum #694b60 26 % C18 · cream #efd9be 24 % · **#ea653a 24 % C69** · sage #a6bcb9 17 % · gold 6 % · green 3 % | orange door (69, 24 %) | .93 |
| ref burglar 49 (day lawn) | mint-grey #a5cac4 30 % C13 · cream 21 % · green #739535 19 % C53 · slate 14 % · violet #756290 11 % · **#e08939 5 % C61** | orange (61, 5 %) | .74 |
| ref jar 28 (castle gate, day) | ochre #ad8757 33 % C32 · cream 28 % · grey 19 % · plum-grey 10 % · sky #5f99d5 6 % · **#b23f31 4 % C57** | red banners (57, 4 %) | .86 |
| ref burglar 13 (kitchen) | **yellow #f9d567 32 % C58** · lilac-grey 28 % · teal #1b7d9a 17 % · white 14 % | yellow wall (58, 32 %), teal as the complement | .76 |

### 1e. What the proposed grade alone achieves

Numpy model of section 3A, applied to our 11 day stills and re-measured (`sim.py`).

| metric | ours D now | + proposed grade | ref D |
|---|---|---|---|
| Y' p50 / p75 / p95 | .546 / .665 / .858 | .598 / .721 / .898 | .596 / .778 / .915 |
| highlight share | .19 | .285 | .41 |
| C* p50 | 31 | 26 | 16 |
| C* highlights | 18 | 10.5 | 14 |
| warm fraction | .18 | **.26** | .80 |
| hero area | 25 % | 24 % | 4.6 % |

Museum shots with the interior preset (`simI.py`):

- shadow C* 48 → 28-29 (ref 21);
- shadow a*/b* +29/+21 → +23/+6;
- the highlights are still missing: p99 .70 → .75, against .97 in the reference.

**Conclusion: the grade fixes about half of the tone gap but almost none of the palette gap.** The warm/cool balance, hero area and big saturated fields come from albedos and set choices, so they must be fixed in `lights.ts` LOOK and `paint.ts`/`build.ts`.

## 2. Why ours reads cheap (ranked)

1. **No targeted hero colour, and chroma on the biggest areas.**
   - In the reference, the most saturated cluster is a small accent: median 4.6 % of the frame by day and 7.5 % in interiors, at C* 55-60. That is 3.0-3.3x the chroma of everything else, and the rest averages C* 18.
   - Ours puts the highest chroma on the largest fields:
     - grass #5ba205 at C* 73-75 on 25-43 % of the frame;
     - cyan sea at C* 36 on 37 %;
     - museum orange at C* 56-66 on 65 %.
   - Pixels at C* > 60 cover 9.5 % of a median day frame for us (up to 43 %), against 3.0 % in the reference, and 25 % in our museum against 2.4 %.
   - Result: nothing pops, because everything shouts.
2. **The wrong temperature balance.**
   - Reference day and interior frames are warm-dominant: C*-weighted warm fraction 0.77-0.80. Cool sky or shadow is the restrained foil (cool C* 19, warm C* 43).
   - Ours by day is 0.18 warm: azure 49 %, chartreuse 27 %, cyan 9 %, and red, orange and yellow together 3 %.
   - The reference day hue mix is about 20 % red, 35 % orange, 17 % azure and 11 % chartreuse.
   - The museum overshoots the other way: 67 % orange, a single family.
3. **Split tone inverted.**
   - Reference day: rose-mauve darks (a* +15.6, b* +1.6), warm-neutral mids (+4.8/+7.7) and cream highlights (b* +13.6).
   - Ours: navy darks (b* −16.6), teal mids (a* −11.7) and cold blue highlights (b* −13.7).
   - The black point is (3,1,18) blue-black, against (35-69, 19-38, 20-45) warm in the reference.
4. **Value structure compressed into the mids.**
   - By day, 79 % of our pixels sit between Y' .3 and .7, against 49 %. Our highlight share is .19 against .41, and p75 is .67 against .78.
   - Two shots (9, 13) put 32-50 % of the frame in a L* 7 navy-black submarine. The reference never uses near-black as a large area; its darks are coloured, L* 15-30.
   - The museum has no light source: p99 .70 against .97.
5. **Shadows more saturated than they should be.**
   - Reference chroma by zone, shadows / mids / highlights: 19 / 33 / 14 by day and 21 / 25 / 12 indoors, so shadows are about 0.6-0.85x the mids.
   - Ours: 31 / 35 / 18 by day (0.9x) and 48 / 48 / 40 in the museum (1.0x, brown-orange shadows #722703).
6. **Flat fills with no colour variation within a surface.**
   - Local a*b* variation: 0.42 against 1.38.
   - Local L* std: 0.22 against 1.4-3.3.
   - 67 % of our 24 px blocks are dead flat, against 17-26 %.
   - The reference modulates hue and value inside every surface; ours are single RGB fills.
   - This is shared with the textures report, but it is also why our saturated fills read "default RGB".
7. **Too few hue families.** Hue entropy is 1.31 bits against 1.9, and only 2 families exceed 5 % against 3-4. The reference adds a third and fourth family as small accents: teal against yellow, violet against orange, green against red.

## 3. Implementation spec (our code: `templates/bridge/`)

### 3A. `grade.ts`

**A1. Replace `GRADE_DAY2`.** Validated on our stills in the section 1e table.

```ts
export const GRADE_DAY2: GradeParams = {
  ky: [0.05, 0.12, 0.29, 0.575, 0.82, 0.94, 1],   // was [0, .1, .28, .6, .835, .945, 1]
  sat: [0.85, 1.0, 1.05],                         // shadows desaturated (ref shadow C* = 0.6x mids)
  tintS: [0.0, 0.022],   // rose-warm darks: RGB (+8.8, -2.6, 0)/255. Black point ≈ (22,10,13), ref (35,19,20)
  tintM: [-0.012, 0.006], // mids toward warm neutral: kills the teal cast (ours a* -11.7 → ref +4.8)
  tintH: [-0.018, 0.006], // cream highlights: about +6 b* (ours b* -13.7 → ref +13.6 needs albedo help too)
  vig: [0.12, 0.45],
};
```

**A2. Add a hue-selective saturation stage**, the "targeted colour" secondary. Place it in `mainImage` right after the luma saturation step:

```glsl
uniform float gradeHueSat[12];        // multiplier at HSV hue 0,30,...,330 deg
vec3 rgb2hsvG(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));
  vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y);
  return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x); }
// after: c = vec3(y) + s * (c - vec3(y));
float hh = rgb2hsvG(clamp(c,0.,1.)).x * 12.0;           // 0..12
int i0 = int(floor(hh)); float f = fract(hh); f = f*f*(3.0-2.0*f);
float hs = mix(gradeHueSat[i0 % 12], gradeHueSat[(i0 + 1) % 12], f);
c = vec3(y) + hs * (c - vec3(y));
```

- Add `hueSat: number[]` (12 values) to `GradeParams`, give it a `new Uniform([...])` in the constructor, and lerp it in `set()`.
- Day values, at 0, 30, …, 330°: `[1.15, 1.12, 1.0, 0.78, 0.78, 0.80, 0.78, 0.92, 1.0, 1.0, 1.0, 1.10]`.
  - This cuts chartreuse, green and cyan fields by about 22 % and lifts red, orange and rose accents by 12-15 %.
  - Note: a GLSL ES 3 integer `%` is fine in WebGL2. In WebGL1 use `mod(float(i0+1), 12.)`.
- Golden: `[1.1, 1.0, 0.95, 0.8, 0.8, 0.85, 0.9, 1.0, 1.1, 1.15, 1.1, 1.1]`. This keeps violet, blue and rose alive, which the old report found missing.

**A3. New presets `GRADE_INTERIOR` and `GRADE_NIGHT`.**

- Widen `GRADES`, `GRADE_STRENGTH` and `gradeFor` to `"day" | "golden" | "interior" | "night"`, and add the same keys to `story.ts` shot `light`. The museum shots (14, 15) use `interior`.
- Interior is validated on shots 40 and 43: shadow C* 48 → 28, shadow b* +21 → +6.

```ts
export const GRADE_INTERIOR: GradeParams = {
  ky: [0.03, 0.11, 0.27, 0.54, 0.80, 0.93, 1], sat: [0.55, 0.78, 0.95],
  tintS: [0.035, 0.012], tintM: [0.012, 0.004], tintH: [-0.02, 0.006], vig: [0.22, 0.38],
  hueSat: [1.1, 0.9, 1.0, 1, 1, 1, 1, 1.1, 1.15, 1.1, 1.0, 1.05],   // orange -10 %, blue/violet +10-15 %
};
export const GRADE_NIGHT: GradeParams = {  // ref N: shadows b* -29, blue+azure 78 %, centre/edge Y' 1.87
  ky: [0.03, 0.09, 0.2, 0.42, 0.7, 0.88, 1], sat: [1.1, 1.15, 1.0],
  tintS: [0.06, 0.01], tintM: [0.045, 0.005], tintH: [-0.01, 0.004], vig: [0.40, 0.30],
  hueSat: [1.1, 1.15, 1.0, 0.8, 0.8, 0.85, 0.95, 1.05, 1.1, 1.05, 1.0, 1.0],
};
```

**A4. Acceptance**, on the final frame with captions masked:

| | day | interior |
|---|---|---|
| Y' p50 | .57-.62 | |
| Y' p75 | ≥ .74 | |
| highlight share (Y'>.7) | ≥ .30 | |
| shadow C* | ≤ 0.7x mids | ≤ 0.85x mids |
| shadow a* / b* | +10..+18 / −4..+4 | |
| highlight b* | ≥ +5 | |
| black point (darkest 0.5 %) | R ≥ 20, R > B | |
| p99 | | ≥ .93 |

### 3B. `lights.ts`

- **`LOOK.day.water`**: from cyan C* 36 to calmer azure-ultramarine with a value gradient.
  - On screen it measured #23b6c8, cyan h 213°, L* 68, across 37 % of the frame.
  - Ref cool C* is 19-29, and the ref day hue mix has 3 % cyan.
  - New values: `near: "#2f7cc4"` (L50 C42 h265), `mid: "#3f8fd2"`, `far: "#8ab8e6"` (L73 C28), `crest: "#d6efff"`, `trough: "#1f5596"`. Keep `shade`.
  - Target on screen: sea C* median ≤ 30, hue 240-270°, L* gradient ≥ 20 from near to far.
- **`LOOK.day.sat`**: 1.08 → 1.0. World saturation is now added selectively by `hueSat`; the global boost is what pushed grass to C* 75.
- **`LOOK.day.sky`**: keep it; it matches the reference (#9cc5ef/#478ccc against #8cc0f0/#4079c5). Optionally warm the 0° horizon stop to `#c9d8ea` so the horizon meets the warm ground with less blue.
- **`LIGHTS.day.shade`**: [.30, .29, .36] → [.34, .30, .37]. That moves the darks from navy (b* −17) toward mauve (ref zone a* +15.6, b* +1.6); cast shadows on light ground stay blue-violet. Coordinate with the lighting report, which owns cast-shadow colour.

### 3C. `paint.ts` / `build.ts` albedos

These are on-screen targets. Albedo values are starting points: re-measure after render and nudge.

1. **Grass**, the biggest offender.
   - On screen: #5ba205, L60 C75, on 20-43 % of frames.
   - Target, lit: L* 74-79, C* 50-55, h 120-125 (#9ed46f-#8cc85a). Shade side: L* 54, C* 45 (#698c34).
   - Starting points: `grassHD` base `"#73b23d"` → `"#a3cb72"`; the blade strokes `["#8fbf5c", "#b2d683", "#7fae52"]`; `build.ts` `GREENS` → `["#98c56a", "#8cbd60", "#a6cf78"]`; `RECOLOR.grass` → `"#9ac66b"`.
   - Add 1-3 m value mottling of ±6 L* and ±5° hue, warm in the light and cool in dips. That raises abTex from 0.4 toward 1.4.
   - Frame rule: grass ≤ 25 % of any shot. Re-frame or add a path or warm dirt (#c9a774) to break it up.
2. **Near-black materials**: the submarine hull #10142a (L* 7, 32-50 % of shots 9 and 13).
   - Make it a coloured dark slate: lit `#4a5578` (L37), shade `#2b3354` (L22). Never below L* 15 over areas larger than 5 %.
   - Same rule for the truck tyres and the museum's darkest brown #331217: plum or oxblood at L* 18-25 (#4d2725).
3. **Hero accents**: one warm, chromatic item per shot, C* 55-70, 4-10 % of the frame, nowhere else that chromatic.

   | hero | colour |
   |---|---|
   | missile red bands | #e0503f (C* 65), slightly widened |
   | mail sacks | warm canvas #d9b27a (L76 C33) with a red/navy stripe; they read grey #a39a8a now |
   | mail truck | cream body #efe3cc with a #d84a3a stripe, instead of the lavender-grey box #a1a0b5 |
   | podium | wood #b5753f lit, instead of the violet-grey front #4a3e64 |
   | letters | white with red/blue airmail edging |
   | kid's shirt | yellow #f2c94c, already close |

4. **Neutral greys warmed.**
   - Runway and road #86858c (C 4, h 298) → #9d948b (C 6, h 50).
   - Building facade grey #a39b9a → facade cream #e2c49a / ochre #d8a95f, from the existing facade palette.
   - White missile body lit #f3ece0 (b* +6), not blue-white.
5. **Museum** (shots 40 and 43):
   - Replace the all-orange set with a split: warm-gold exhibit plus a cool violet-blue wall, about 60:25 warm:cool, as ref I is 74:19.
   - The orange wall becomes `#b9a48c` warm grey, C* 15.
   - Add one bright source (window or spotlight pool, L* ≥ 92) so p99 ≥ .93.
   - Shadow albedo or shade under the warm key: C* ≤ 25, not the #722703 C* 48 brown.

### 3D. A per-shot colour script (new constant, `story.ts`)

Add `palette` to each shot so build and cast pick colours on purpose:

```ts
type ShotPalette = { hero: string; heroArea: [number, number]; warmFrac: [number, number]; coolCmax: number };
// day default: hero C* 55-70 at 0.04-0.10 of frame, warm fraction 0.65-0.85, cool background C* <= 30
```

Missile assignments (ours → target hero):

| shot | hero |
|---|---|
| 1 | red bands + a warm sunlit cream missile over azure sea |
| 9 / 13 | red bands and the letters against a slate (not black) hull |
| 17 / 20 | warm sand/runway strip and the palm trunk (#b07a4a) against muted grass |
| 23 | wood podium |
| 27 | canvas sacks |
| 29 | the kid's yellow shirt against a cream building |
| 32 / 34 | truck stripe |
| 36 | missile red |
| 40 / 43 | gold exhibit against a violet wall |

A shot passes if the measured hero area is 4-10 %, heroC/restC ≥ 2.8, warm fraction ≥ 0.65 (day/interior), C*>60 area ≤ 5 %, and hue entropy ≥ 1.6 bits.