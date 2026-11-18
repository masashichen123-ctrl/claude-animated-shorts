# Lighting: missile short vs premium references (jar_empire, burglar, window)

Private study. Measurements come from 13 of our frames (540x960) and 39 reference frames (720x1280, caption band
60-78 % height masked). For frame statistics both sets were resized to 540x960. Pixel widths are given at **1080 width**.
Scripts and data are in `SCR/look/work/lighting/`: `pairs.py`/`pairs.md`, `frames.py`/`frames.md`,
`frames_agg.md`, `day.py`/`day.md`, `edges.py`/`edges.md`, `glows.md`, and the grid overlays `g_*.jpg`.
This builds on `references/reports/lighting.md` (the old bridge study, whose recipe is now in `lights.ts`/`shade.ts`).
That recipe fixed the grey and muddy shadows. These three new references show what it still lacks: **warm key light,
light motivated by local sources, light pools and falloff, emissives that bloom, softer cast shadows, and changes of
lighting mood from beat to beat.**

## 1. Measured gap table

### 1a. Same material, lit vs shade (per-channel ratios are linear shade/lit; hue and C* are CIE Lab)

| ID | Frame | Surface | Lit | Shade | R | G | B | Y ratio | Lab hue lit → shade | C* lit → shade |
|---|---|---|---|---|---|---|---|---|---|---|
| O1 | ours 20 | grass, palm shadow | #5ca201 | #37624d | .35 | .34 | ≫1 | .36 | 125 → 159 | 76 → 22 |
| O2 | ours 32 | grey road, truck shadow | #86868d | #585e83 | .41 | .47 | .85 | .49 | **284** → 288 | 4 → **22** |
| O5 | ours 20 | runway, cast shadow | #9b9b9e | #595d84 | .31 | .34 | .67 | .36 | **297** → 290 | 2 → **23** |
| O3 | ours 1 | white missile, top vs underside (form) | #fdf9f8 | #7f7f97 | .21 | .22 | .33 | .23 | (neutral, C 1) → 291 | 1 → 14 |
| O4 | ours 9 | submarine hull, lit vs turned away (form) | #b0aaa0 | #363339 | .09 | .08 | .12 | **.08** | 90 → 304 | 6 → 4 |
| O6 | ours 40 | museum: missile (in golden shade) vs floor | #716ea5 | #7a2a02 | – | – | – | – | whole missile in violet shade, floor burnt orange C 52 | |
| R1 | burglar 49 | grass, deep tree shadow (day) | #7f9b36 | #373c4b | .18 | .14 | 1.91 | **.16** | 118 → **281** | 54 → 10 |
| R2 | burglar 49 | grass, round blob (day) | #689431 | #356952 | .26 | .48 | 2.77 | .47 | 124 → 161 | 55 → 24 |
| R3 | burglar 44 | floor, window sun patch vs room | #f5ddac | #aba8c1 | .44 | .55 | 1.30 | .55 | **88** → 297 | 27 → **13** |
| R4 | jar 9 | grey jar, lit vs cast shadow (torch-lit interior) | #837773 | #3f3f4f | .22 | .27 | .46 | .27 | **45** → 292 | 6 → **11** |
| R8 | jar 0.3 | grey jar, form shading | #a09ea2 | #70707e | .46 | .47 | .57 | .48 | 297 → 291 | 2 → 9 |
| R5 | window 41 | wall, lamp pool vs far wall (night) | #97827c | #1e3156 | .04 | .14 | .47 | **.13** | 41 → 283 | 9 → 26 |
| R6 | burglar 0.5 | siding, pool vs top of frame (night) | #4499f3 | #081d67 | .04 | .04 | .15 | **.06** | 274 → 298 | 52 → 51 |
| R7 | burglar 0.5 | grass, pool vs corner (night) | #247f55 | #0c203b | .20 | .07 | .48 | .09 | 158 → 279 | 40 → 20 |

**Reading.**
- **Lit side.** Reference lit neutrals are **warm**: grey jar #837773 (hue 45°), floor patch hue 88°. Our lit neutrals are **cool or neutral**: road hue 284°, runway 297°, white missile clipped to #fdf9f8 (C* 1).
- **Shade side.** Reference shade on neutrals is blue-violet, hue 281-297° (ours is too, 288-291°), but with **C\* 9-13**. Ours has **C\* 22-23**: about 2x too saturated.
- **Day key/fill.** Cast-shadow Y ratio is .16-.55 in the reference and .36-.49 in ours. That range is fine.
- **Dark materials.** Our dark material crushes to black: submarine Y .08, tower #060d2d L\* 4. Reference day dark band: L\* 27-31.
- **Night and lamp-lit scenes.** The ratio between the light pool and its surround is .06-.13. Nothing in ours does this.

### 1b. Frame statistics (medians; frames resized to 540x960, captions masked)

| Metric | Ours (13) | Ref day ext (4) | Ref day int (7) | Ref lamp-lit int (6) | Ref night (12) | Ref all (39) |
|---|---|---|---|---|---|---|
| Brightest 15 % of non-sky pixels: Lab hue / b* | **269° / −1** (cool) | 85° / +12 | 83° / +11 | 78° / +18 | 159° / −2 | – |
| Darkest 15 % of non-sky pixels: hue / b* | 290° / −19 | 176° / −2 | 45° / +9 | 169° / −2 | 300° / −19 | – |
| Sky share of frame | **30 %** | 3 % | 2 % | 0 | 3 % | – |
| Border ring / inner L* (light falloff) | **0.97** | 0.99 | 0.96 | **0.57** | **0.53** | 0.71 (corners/centre) |
| Low-frequency light structure: std of L* blurred at σ = 8 % width (lower 60 % of frame) | **7.8** | – | – | – | – | **13.6** (jar 11.1, burglar 12.6, window 17.2) |
| L* p2 / p50 / p98 (whole frame) | 21 / 59 / 91 | – | – | – | – | 11 / 41 / 95 |
| Emissive pixels (L* > 88, C* > 18) | **0.01 %** | – | – | – | – | **0.55 %** (0.34 % in the lower 60 %) |
| Pixels at L* > 97 | 0.05 % | – | – | – | – | 0.80 % |
| Distinct lighting moods per short | 2 (day + golden used indoors) | – | – | – | – | jar 5, burglar 3, window 3 (72 % of sampled frames are **not** plain day) |

### 1c. Shadow softness, glow and rim (px at 1080 width; 10-90 % edge widths read from profiles)

| Item | Ours | Reference |
|---|---|---|
| In-focus cast shadow edge | truck on road **8 px**, palm on grass **9 px** | jar cast shadow (jar 9) **24 px**; tree shadow on grass (burglar 49) **35 px**; blob under a figure **36 px**; window sun patch ~40+ px |
| Corner AO | none (no interiors except the museum, which has none) | Broad gradient, never a dark crease: wall under ceiling −5 L\*, wall above floor −4 L\* (~10 % luminance), each over **135-160 px** |
| Emissive glow r50 / r10 | no emissive sources | candle 12 / 15; headlamp 15 / 18; lantern **45 / 78**; lit window **147 / 192**. Cores clip to #fffeff, halo warm (#ffc98a, #dec76f) |
| Backlight rim on props | none | jar 60 (low sun behind): rim L\* **168 vs body 70 (2.3x)**, ~18 px wide, pink-peach #dab9be |
| Key-side warm edge on characters | none | burglar 49 torso: +17 L\* and b\* +26..+36 at the sun-side edge, fading over ~45 px |
| Hero face toward the camera | Truck box side in shade (#a4a2b7 lavender) in 32/34. Missile underside .23 of top | Hero facades and props face the key: castle gate, house facade, kitchen |

## 2. Why ours reads cheap (ranked)

1. **The same lighting everywhere: flat noon plus sky.**
   - 11 of 13 frames use one day preset, and 30 % of each frame is sky.
   - The references change mood 3-5 times per short (torch-lit interior, day, sunset, moonlit night, lamp-lit room). 72 % of their frames are not plain day.
   - Our museum epilogue reuses the outdoor `golden` sun indoors. The whole missile sits in violet shade (#716ea5) on a burnt-orange floor (#7a2a02). That is not light, just a colour cast.
2. **No warm/cool split.**
   - Our lit surfaces are neutral or cool: brightest non-sky pixels hue 269°, b\* −1. White clips to #fdf9f8.
   - Reference lit surfaces are consistently warm: hue 78-88°, b\* +11..+18. Shadows are cool but low in chroma (C\* 9-13). Ours are C\* 22.
   - So our pictures read as "blue-grey CG", and theirs as "sunlit".
3. **No motivated local light: no pools, no falloff.**
   - Low-frequency light structure: 7.8 vs 13.6. The reference puts light where the story is: window patch on the floor, lantern pool, lamp on the wall, tree dapple on the lawn.
   - Lamp-lit and night frames fall off to .53-.57 at the border. Ours are uniform (.97).
   - In `shade.ts` the two-tone shading also **discards every light except the sun**, because `directDiffuse` is overwritten. So a lamp added today would do nothing.
4. **No emissives, so the bloom has nothing to work on.**
   - Emissive pixels: 0.01 % vs 0.55 %. The bloom pass is configured (threshold 1.0) but no source exceeds 1.0.
   - Natural candidates: missile booster flame and exhaust, runway lights, lit windows, truck headlights, museum spotlights and display lights.
5. **Shadows too crisp and hero faces in shade.**
   - Cast edges are 8-9 px vs 24-36 px, so our shadows look like CG shadow maps rather than painted ones.
   - The fixed az 75° day sun puts the camera-facing side of boxy heroes (truck, podium) in shade.
6. **Dark materials crush to black (L\* 4)**, and **there is no rim** on backlit shots (the reference gives 2.3x rims at sunset).

## 3. Implementation spec (target code: `templates/bridge/`)

On-screen targets are given first, and every value below is a starting point to calibrate against them. Calibration:
render stills at `--scale 0.5`, then run `SCR/look/work/lighting/pairs.py` / `day.py` with boxes on the same surfaces.

### 3.1 `lights.ts`: warmer key, lower-chroma shade, an albedo floor, new presets

Widen the preset key: `Record<"day" | "golden" | "morning" | "interior" | "night", LightPreset>` (and the same for
`LOOK`, `GRADES`). `story.ts` ShotDef `light` takes the new names. Add these fields to `LightPreset`:

```ts
albFloor: C3;     // linear albedo floor used in shade.ts (dark materials never go black)
gobo: number;     // 0..1 strength of the sun cookie (tree and cloud dapple), shade.ts
goboScale: number;// world metres per cookie cell
rim: C3;          // backlight rim colour x strength (0 = off), shade.ts
ao: number;       // corner AO depth (fraction), shade.ts
aoR: number;      // AO reach in metres
vig: number;      // grade.ts vignette k (border/inner target noted per preset)
prac: number;     // multiplier on point/spot "practical" lights inside the two-tone shader
bloomI: number; bloomR: number; // Bridge.tsx bloom intensity/radius per preset
softM: number;    // shadow penumbra in world metres (world.ts -> shadow.radius)
```

**`day`** (changed values only):

```ts
lit:   [1.60, 1.43, 1.14],      // was [1.58,1.5,1.33]; Y ~1.45, B/R .71 -> lit neutrals hue 60-85°, C* 8-14
shade: [0.30, 0.30, 0.34],      // was [0.30,0.29,0.36]
lift:  [0.04, 0.045, 0.07],     // was [0.05,0.06,0.11]: the blue lift doubled the shadow chroma (C* 22 -> target 10-13)
albFloor: [0.030, 0.030, 0.042],// navy hull: shade L* ~24-28 instead of 4
gobo: 0.5, goboScale: 9, rim: [0,0,0], ao: 0.10, aoR: 0.7, vig: 0.06, prac: 1, bloomI: 0.6, bloomR: 0.6, softM: 0.16,
```

Also lower the white albedo cap: any world albedo over 0.80 linear should be clamped at 0.80 in `twoTone` (see 3.2),
so that lit white lands at L\* 93-96 with b\* +6..+12 (#fbefdc-ish), not clipped #fdf9f8.

**`morning`** (new; the hook and launch at sea, a backlit low sun; it borrows golden's sky machinery):

```ts
az: 28, el: 12,
lit: [1.70, 1.22, 0.78], shade: [0.20, 0.21, 0.34], lift: [0.04, 0.05, 0.12], lambert: 0.35, sideK: 0.84, term: 0.10,
charTint: [1.0, 0.86, 0.72], charShade: 0.88, charGrad: 0.09, bodyGrad: 0.24, sideTint: [0.88, 0.84, 0.96],
blob: [0.70, 0.68, 0.84], actorShadow: true,
top: "#5a86c8", hor: "#ffd9a8", skyCurve: [0.03, 0.55, 0.8], fog: "#f3c9a4", fogNear: 40, fogFar: 360, sunDisc: "#fff0d0",
sunCol: "#ffc890", sunI: 4, sky: "#d9c6c8", ground: "#8a7a70", hemiI: 0.5, bias: -0.0005, normalBias: 0.025,
albFloor: [0.03,0.03,0.045], gobo: 0, goboScale: 9, rim: [1.25, 0.85, 0.62], ao: 0.08, aoR: 0.7, vig: 0.18,
prac: 1, bloomI: 0.8, bloomR: 0.7, softM: 0.22,
```

Targets: lit ground b\* +20..+30, shadow hue 270-300° with C\* 12-20, rim 2.0-2.3x body L, border/inner L\* 0.82.

**`interior`** (new; the museum shots 40/43). There is no sun in frame. The directional light becomes a high
"skylight/spot" key and two or three practical spots make the pools:

```ts
az: 140, el: 62,
lit: [1.35, 1.15, 0.88], shade: [0.20, 0.21, 0.30], lift: [0.03, 0.035, 0.06], lambert: 0.45, sideK: 0.80, term: 0.25,
charTint: [1.0, 0.90, 0.80], charShade: 0.86, charGrad: 0.10, bodyGrad: 0.22, sideTint: [0.88, 0.86, 0.96],
blob: [0.55, 0.52, 0.60], actorShadow: false,
top: "#2a2433", hor: "#3b3140", skyCurve: [0,0,0], fog: "#2e2836", fogNear: 18, fogFar: 70, sunDisc: "#000000",
sunCol: "#ffe2bc", sunI: 2.4, sky: "#6a6080", ground: "#4a3a34", hemiI: 0.3, bias: -0.0003, normalBias: 0.015,
albFloor: [0.025,0.025,0.035], gobo: 0, goboScale: 9, rim: [0,0,0], ao: 0.12, aoR: 0.8, vig: 0.45,
prac: 1.6, bloomI: 0.9, bloomR: 0.75, softM: 0.12,
```

Targets: border/inner L\* **0.57**; pool centre / room ratio Y 0.25-0.35 (darker room = 0.3x pool); bright band hue
75-85° b\* +15..+20; dark band L\* 12-15, hue ~300°, C\* 15.

**`night`** (new; optional, use only if a beat needs it): moon key `lit: [0.55, 0.62, 1.05]`, `shade: [0.10, 0.12, 0.24]`,
practicals `prac: 2.0` warm #ffc98a, `vig: 0.5`, so a pool reaches 8-15x its surround (Y ratio .06-.13).

**Per-beat assignment for the missile short** (refs: 3-5 moods per ~60 s):

| Our frames | Beat | Preset |
|---|---|---|
| 1, 9, 13 | launch from the submarine | `morning` (backlit, warm rim on missile and sailor, flame bloom) |
| 17, 20, 23, 27, 29 | flight, landing, ceremony, plane | `day` |
| 32, 34, 36 | mail truck, postman | `day` with sun az 125 (hero face lit) |
| 40, 43 | museum epilogue | `interior` (spot pools on the missile, warm practical, falloff) |

### 3.2 `shade.ts`: keep practical lights, albedo floor/cap, sun cookie, rim, corner AO

1. **Stop discarding non-sun lights.**
   - In the `LFB` patch, after `directLight.color *= sunVis;`, add `if ( i == 0 ) directLight.color = vec3( 0.0 );`.
     After unrolling, `i` is a literal, so this only zeroes the sun's physical contribution.
   - Every point and spot light then still accumulates through three's `RE_Direct` into `reflectedLight.directDiffuse`.
   - In `TWO_TONE`, read that accumulation **before** overwriting it: `vec3 prac = reflectedLight.directDiffuse;`.
   - Then write:
     `reflectedLight.directDiffuse = <existing two-tone expr> + prac * uPrac;` (new uniform `uPrac` = preset `prac`).
   - Do the same in `cardshade.ts` CARD: `outgoingLight += diffuseColor.rgb * prac * uPrac * 0.6;`, so characters
     brighten inside pools. Capture `prac` before CARD replaces `outgoingLight`.
   - Bump `customProgramCacheKey` to `twoTone6_` and `card10`.
2. **Albedo floor and cap.** Right after `alb` is computed: `alb = clamp( alb, uAlbFloor, vec3( 0.80 ) );`.
3. **Sun cookie (dapple / cloud shadows; day exteriors only).**
   - Add a world-position varying. In `onBeforeCompile` vertex: declare `varying vec3 vWP;`, and after
     `#include <worldpos_vertex>` write
     `vWP = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;` (with `#ifdef USE_INSTANCING` use `modelMatrix * instanceMatrix`).
   - Fragment: a 2-octave value noise
     `float ck = smoothstep( 0.38, 0.62, vnoise( vWP.xz / uGoboScale + uGoboOff ) * 0.7 + vnoise( vWP.xz / (uGoboScale*0.37) ) * 0.3 );`
     then `sunVis *= mix( 1.0, ck, uGobo );`.
   - Drift `uGoboOff` by 0.04 cells/s (`world.ts`, from `f`).
   - Targets:
     - 25-35 % of the visible ground in cookie shadow, blobs 5-10 m across, edges ~30 px at 1080 (the smoothstep width does this);
     - the low-frequency L\* std of the lower frame rises from 7.8 to 11-14.
   - Keep the cookie off characters (cards) and off the sky.
4. **Backlight rim** (props; only when the sun is ahead):
   ```glsl
   float back = smoothstep( 0.0, 0.6, -sunV.z );                       // view space: sun in front of the lens
   float rimT = pow( 1.0 - facing, 4.0 ) * back * mix( 0.5, 1.0, sunVis );
   reflectedLight.directDiffuse += uRim * rimT;                        // uRim = preset rim (0 by day)
   ```
   Target: rim band ≈ 18 px at 1080 on an object a third of the frame wide, peak L 2.0-2.3x the body.
5. **Corner AO** (interiors, plus building bases outside): a world-space height term, not SSAO.
   - Add uniforms `uFloorY`, `uCeilY` (world.ts sets them per set; ceiling = 1e4 outdoors).
   - `float up = dot( geometryNormal, upV );`
   - `float d = min( vWP.y - uFloorY, uCeilY - vWP.y );`
   - `float ao = 1.0 - uAO * ( 1.0 - smoothstep( 0.0, uAOR, d ) ) * ( 1.0 - abs( up ) );`, applied to vertical faces only.
     Multiply the final `directDiffuse` by it.
   - Target: −4..−5 L\* within 135-160 px at 1080 of the floor or ceiling line, with no dark crease. Contact still
     comes from ink plus blobs.

### 3.3 `world.ts`: hero-facing sun, softer shadow maps, practical rig, cookie and AO uniforms

- **Light the hero's face.** Default day `az` stays 75. For every shot whose hero is a camera-facing box (truck, podium,
  plane fuselage side, building), set `SUN_SHOT[id] = { az: 125, el: 45 }`. Test: dot(sunDir, −camFwd) ≥ 0.25.
  Shots 32/34 must show the truck box lit warm (≈ #e9dcc8), not #a4a2b7.
- **Soft shadows.**
  - Set `this.sun.shadow.mapSize.set(2048, 2048)`, `this.sun.shadow.blurSamples = 16`, and per frame
    `this.sun.shadow.radius = THREE.MathUtils.clamp(L.softM / (2 * Rr / 2048), 3, 16)`.
  - This needs VSM: in `Bridge.tsx` change `<ThreeCanvas ... shadows>` to `shadows="variance"`.
  - Re-tune `bias` to about −0.0001 and `normalBias` about 0.01 if VSM light-bleed shows. If bleeding persists, use
    `shadows="percentage"` (PCF) with the same radius formula, capped at 6.
  - Target: in-focus cast-shadow 10-90 % widths of **24-36 px at 1080**; blobs ~36 px. Today: 8-9 px.
- **Practicals.**
  - A `practical(pos, col, I, angle, target?)` helper adds `THREE.SpotLight` or `PointLight` with `castShadow = false`,
    `decay = 2`, `penumbra = 0.6`, `angle = 28°`.
  - Museum: one spot from above-front onto the missile (#ffe2bc), one warm wall sconce (#ffc98a), one display-case
    light (#fff0d8).
  - Calibrate intensity so that the pool centre on the floor (mid-grey albedo) reaches 1.3-1.5x the room level after
    the two-tone shading, and the room outside the pools reaches 0.3x the pool.
- **Uniforms per frame.** `TONE.uPrac`, `uAlbFloor`, `uGobo`, `uGoboScale`, `uGoboOff`, `uRim`, `uAO`, `uAOR`,
  `uFloorY`, `uCeilY` come from the preset. `fx.grade` vignette k = `L.vig` (`grade.ts`: border/inner L\* targets day
  0.97, morning 0.82, interior 0.57, night 0.53).

### 3.4 Emissives + `Bridge.tsx` bloom

- **The `glow` helper.**
  - Add `glow(hex, k)` to `shade.ts`: `new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), fog: false, toneMapped: true })`.
  - Values above 1.0 linear cross the bloom threshold. The NEUTRAL tone map clips the core to white, and the halo keeps the hue.
  - Set the object's layer to NOINK if its ink line looks wrong.
- **Sources for the missile short:**

  | Source | Core | Halo colour | k | Target glow r50 px at 1080 |
  |---|---|---|---|---|
  | booster flame / jet exhaust | #fff4d8 | #ff9a3c | 6 | 40-60 |
  | runway edge lights (shot 20) | #fff2c8 | – | 4 | 12-18 |
  | truck headlights | #fff6e0 | – | 4 | 15 |
  | lit windows (building 29 at morning or interior) | #ffd79a | – | 2.5 | 100-150 for whole windows |
  | museum spot bulbs / display lights | #fff0d8 | – | 5 | 15-45 |

- **Bloom.** Keep `luminanceThreshold: 1.0` and `mipmapBlur`. Read intensity and radius from the preset per frame
  (`fx.bloom.intensity = L.bloomI`; radius through `fx.bloom.mipmapBlurPass.radius = L.bloomR`): day 0.6/0.6,
  morning 0.8/0.7, interior 0.9/0.75. For window-sized glows (r50 ~150 px), use `levels: 8` (the fixed 1920-high MIP
  base keeps the scale consistent).
- **Frame target.** 0.3-0.6 % of frame pixels at L\* > 88 with C\* > 18 on shots that contain a practical. Today: 0.01 %.

### 3.5 Acceptance numbers (re-measure with the scripts in `work/lighting/`)

| Check | Now | Target |
|---|---|---|
| Lit neutral (road, white missile, grey hull): Lab hue / C\* | 284-297° / 1-4 | 60-90° / 6-14 |
| Cast shadow on neutral: hue / C\* / Y ratio | 288° / 22 / .36-.49 | 280-300° / 9-14 / .27-.55 |
| Darkest material in a day frame, L\* | 4 | ≥ 22 |
| Brightest non-sky 15 %: b\* | −1 | +10..+18 |
| Low-frequency L\* std (lower 60 %) | 7.8 | 11-14 |
| Border/inner L\* (interior / morning) | 0.87 / – | 0.57 / 0.82 |
| Cast-shadow edge, px at 1080 | 8-9 | 24-36 |
| Emissive pixel share | 0.01 % | 0.3-0.6 % (practical shots) |
| Moods in the short | 1.5 | 3 (morning, day, interior) |
