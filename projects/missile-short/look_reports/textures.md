# Textures and materials: missile short vs premium reference

Scratch: `SCR/look/work/textures/`
- `measure.py`: patch statistics.
- `patches.json`: all numbers.
- `patch_montage.png`: every patch shown at 1080 scale.
- `ours.jpg`, `jar_empire.jpg`, `burglar.jpg`, `window.jpg`, `old.jpg`: contact sheets.

This report builds on `references/reports/textures.md` (the bridge study). Its line-width, plank, stone, roof and
cloud numbers still hold, and are re-used here where the missile refs have no matching surface.

## 0. Method

- **Scale.** All pixel sizes are at 1080 width. Our frames are 540 wide (x2). Ref PNGs are 720 wide (x1.5). The
  sheet cells of `references/sheets/short12_sheet.jpg` (sea, iron hull) are 180 wide (x6), so their 2-6 px band is
  not measurable.
- **Patches.** 14 of ours and 21 reference patches. Every one avoids the caption band and characters (see the
  montage).
- **Colour.** CIE Lab (D65). "med" is the sRGB median. L5/L95 are luma percentiles. Lstd is the L* standard
  deviation.
- **Frequency content.** Difference-of-Gaussian bands on L*, as the std of each band (L* units), all at 1080 scale:
  - **b1** (wavelength about 2-6 px): σ 0.5-1.5 px. Brush and speckle.
  - **b2** (6-24 px): σ 1.5-6 px. Strokes, seams, small dabs.
  - **b3** (24-96 px): σ 6-24 px. Blotches, boards, plates.
  - **b4** (> 96 px): σ 24-96 px. Large tonal drift.
- **Other measures.**
  - edge: fraction of pixels with |∇L*| > 2 per px.
  - hi8 / lo8: fraction of pixels more than 8 L* above / below the median.
  - Water marks: connected components of pixels more than 6 L* above a 21 px median.

## 1. Measured gap table

### 1.1 Band energy: our surfaces are untextured

| Surface | Ours: med, L*, C*, Lstd | Ours b1 / b2 / b3 / b4 | Reference match: med, L*, C*, Lstd | Ref b1 / b2 / b3 / b4 |
|---|---|---|---|---|
| Runway / tarmac | 27s #86868d, L 56, C 4.0, Lstd **1.9** | **0.04 / 0.07 / 0.05 / 0.25** | dirt road jar28 #b18b5a, L 60, C 34, Lstd 7.7; pavers jar41 #505596, L 38, C 38, Lstd 7.3 | 0.87 / 1.35 / 1.98 / 2.30; 1.42 / 3.35 / 3.09 / 2.14 |
| Grass | 29s #589e00, L 59, **C 75**, h126, Lstd 1.9 | 0.09 / 0.19 / 0.28 / 0.47 | burglar49 #7e9c39, L 60, C 54, h117, Lstd 9.9 (lo8 21 %) | 0.48 / 0.90 / 1.81 / **3.75** |
| Grass, near | 20s #549900, L 57, C 73 | 0.29 / 0.72 / 1.77 / 1.54 | jar60 #4e6035; jar47 #857241 (golden) | 1.17-4.77 / 2.7-4.4 / 2.4-2.7 / 1.3-1.5 |
| Facade | 29s #9b9297, L 62, C 7.9 (wall field flat; all energy is from windows) | 1.35 / 4.71 / 6.27 / 4.63 | stone castle jar28 #b6a9a1, L 70, C 7.9, h62 | **5.26 / 6.66** / 5.64 / 4.90 |
| Truck box side | 32s #a4a2b7, L 67, C 11.6, Lstd **0.7** | **0.02 / 0.04 / 0.03 / 0.20** | painted clapboard burglar49 #b8d2c7, L 82, Lstd 13 (board pitch 50 px); urn jar9 | 4.34 / 6.22 / 4.13 / 2.23; 2.05 / 2.79 / 3.41 / 3.68 |
| Museum floor | 40s #7b2a02, L 29, C 52, Lstd 1.3 | **0.04 / 0.07 / 0.08 / 0.27** | wood floor burglar56 (night) #3b386a, Lstd 10.3; bridge study planks L 61-74, gaps 3.6-4.8 px, ΔL* 25-48 | 0.54 / 1.18 / 0.76 / 1.80 |
| Museum wall | 40s #6f6da4, L 48, Lstd 5.5 (light gradient only) | 0.34 / 1.01 / 1.20 / 1.28 | clapboard night burglar0.5 #2444ae | 1.24 / 1.94 / 1.87 / 2.01 |
| Sub hull | 9s #13162c, **L 7.9**, L5 4.1, L95 65 (Phong sweep) | 0.13 / 0.58 / 1.82 / 5.50 | iron hull sh12 #586470, L 42, C 8.5, h259; urn jar9 lit L 50 / shade L 28 | -- / 2.35 / 1.06 / 0.72; 2.05 / 2.79 / 3.41 / 3.68 |
| Missile skin | 1s #eceae9, **L 92.7, L95 98.2** (clipped), C 1.7 | 0.73 / 2.33 / 2.89 / 6.23 (shading only) | brass jar50 #ec9137, L 68, L95 82; stone lit L95 87 | 2.59 / 2.31 / 2.80 / 2.79 |

**Reading.** The reference paints every surface with 1-7 L* of energy in each band. Even its "plain" fields carry
about 1 / 1.4 / 2 / 2.3 L* (dirt road). Most of ours carry 0.02-0.3: **10-50x less**. That reads as untextured
vertex colour.

### 1.2 Sea

| | Ours (1s, 17s) | Reference (sheet 12: "the Navy", "ship's", "to"; bridge-study frames 01, 12, 13) |
|---|---|---|
| Gradient, horizon to bottom of frame | **Inverted.** The far band is #6295c7 (L 60, h264, blue). The near band is #1dbbcd (L 70, h212, cyan). There is a white haze #c4d9f1 (L 86, C 14) at the horizon | Far #39aab6 (L 64, C 31, h209), then #169dac (L 59), #107f97 (L 49), near #0a5d7a (L 36, C 25, h243). **ΔL* -28; hue turns cyan to blue towards the camera** |
| Base Lstd | 3.8 (all from marks) | 3.6-5.7 (mostly the gradient) |
| Mark area (crest more than 6 L* up) | near **5.3 %**, far 7 % | near 0-0.9 %, mid 0.2-1.6 %, far 1.5-5 % |
| Marks per 100x100 px | near **4.5**, far 13 | 0.24-1.5 (2.0 at night) |
| Mark length / width (px) | 20 (p90 58) / 5.7 | 12-30 (p90 36-97) / 3-4.5 |
| Mark orientation | \|angle\| median **16°**; 48 % within ±15°; crosses "+" and V ticks | within ±9°, horizontal on screen |
| Trough under each crest | **none** | -8..-9 L*, directly under the crest |
| Crest ΔL* | +10.7 | +8..+13 |

Our gradient and the reference's run in **opposite** directions. The cause is `lights.ts` `LOOK.day.water`:
near `#22a7b6` (cyan, light) and far `#1a5596` (navy, dark).

### 1.3 Gloss and specular

- **Ref metal (urn jar9).** Two flat tones: lit L* 50 / shade L* 28 (ratio 0.56). The terminator ramp is about 36 px.
  The shade side is dead flat (L* 27-28 over 300 px). One painted highlight streak reaches L* 76 on about 5 % of the
  area. Darkest metal is L* 19 (bridge study).
- **Ours, sub hull.** A smooth Phong sweep from L* 67 to L* 7 over about 300 px, and a black body at L* 4-5 on 60 %
  of the hull. So the gloss is a CG gradient, the darks are crushed, and there is nothing painted on the surface.
- **Ours, missile.** About 40 % of the lit side is clipped at L* 98, then a smooth roll-off to 87 and a shade side at
  L* 51. The white has no hue: C* 1.7. Reference whites are tinted: warm lit (stone h62, C* 8) and cool-violet shade
  (h ~295).

### 1.4 Detail density (edge fraction, |∇L*| > 2)

- **Ours:** 0.000-0.002 on grass, tarmac, truck and floor. 0.06-0.12 on grass near and on the missile. 0.21 on the
  sea, all of it scratch marks.
- **Reference:** 0.07-0.11 on calm fields (road, grass, pavers, wood floor). 0.17-0.30 on walls and metal. 0.45-0.52
  on stone and foliage.

## 2. Why ours reads cheap (ranked)

1. **Most large surfaces carry no texture at all.** Tarmac, truck, museum floor, museum wall, the facade wall field and
   grass are 10-50x below the reference in every band. Viewers read flat vertex colour as "placeholder 3D".
2. **The sea is wrong three ways.**
   - Its gradient is inverted: a light cyan foreground under a dark blue horizon. The reference goes light cyan at the
     horizon to deep blue-teal near the camera, ΔL* -28.
   - Its marks are 5-10x too dense and randomly turned (scratchy crosses and ticks) where the reference has sparse
     horizontal crests.
   - Crests have no trough, so they read as white noise on top of the water, not as waves.
3. **Metal is rendered, not painted.**
   - The sub is near-black (L* 4-8, below the reference minimum of 19) with a plastic Phong sweep.
   - The missile is clipped pure white over 40 % of its lit side, with no panel lines, rivets, markings or wear.
4. **Grass is over-saturated and uniform.** C* 75 vs 54, b4 0.47 vs 3.75, and no darker patches (lo8 0 % vs 21 %).
   The hue is acid green (B channel = 0).
5. **Greys are neutral.** Ours have C* ≈ 4 (tarmac, missile). Reference greys always lean warm when lit (C* 8, h60-80)
   or cool-violet in shade (C* 12-15, h ~295).
6. **No painted edges or wear.** The reference adds lit lips (+4..+7 L*), dark seams (ΔL* 15-48, 3-5 px) and
   occlusion darkening at the base of objects. Ours has none on the truck, missile, sub or podium.

## 3. Implementation spec (templates/bridge)

### 3.0 Rules that apply to every painter (`paint.ts`)

- **Band targets.** In the final frame at working distance, aim for b1 0.5-1.5, b2 1.3-3.5, b3 2-3.5 and b4 2-4 L* on
  "plain" fields. Walls and metal can go higher: b1 2-5, b2 3-6.
- **Sizes in metres.** Size features in metres, not texels. Use px/m = 2954 / D (vfov 36°, 1920 tall).
  - At D = 10 m: b4 > 0.33 m, b3 0.08-0.33 m, b2 2-8 cm.
  - At D = 30 m: b4 > 1 m, b3 0.27-1 m.
- **Three octaves of `blotch()`.** Every painter gets three octaves of value variation on top of its base fill:
  - O1: r = 0.8-2.5 m, α 0.10-0.16, ±5 L*.
  - O2: r = 0.15-0.5 m, α 0.08-0.12, ±3 L*.
  - O3: 1-4 cm dabs or speckles, α 0.15-0.25, ±4-6 L*, at 2000-4000 per m² of texture.
  - Alternate lighter and darker tints of the base hue. Never use pure black or white.
- **Painted lines** (seams, joints, cracks): FWHM 3-5 px at 1080 at the main working distance, ΔL* 15-25, coloured
  as a darker, more saturated version of the base. Never #000.
- **Lit lip and occlusion.** One edge of each panel or board gets a lit lip, +5 L*, 2-4 px. Each object base gets an
  occlusion gradient, -10..-14 L* over its bottom 12-18 %.
- **Macro tint against repetition.** Add a shared `macroNoise()` texture: 512², value noise in 3 octaves, tiled over
  64 m. Sample it in `shade.ts` from world xz on ground materials only, as `albedo *= 0.92 + 0.16 * n`. This kills
  the 4 m tiling and gives b4 on big ground planes.
- **Whites and greys.**
  - Albedo whites stay at most L* 92 on screen. Tint them: lit h60-80 C* 4-8, shade h280-300 C* 10-15.
  - Greys get C* 5-12, never 0-4.

### 3.1 Sea (`world.ts` WATER_COL, `lights.ts` LOOK.*.water, `paint.ts` waterMarks)

1. **Turn the gradient the right way round** (on-screen targets, `lights.ts` day):
   `water: { far: "#39aab6", mid: "#1594a7", near: "#0b5f7c", crest: "#5cc6d4", trough: "#0a4f6c", glint: "#eafcff", shade: [0.5,0.56,0.72] }`.
   For a teal tropical sea, near can be #0d6c86. Golden is unchanged.
2. **Make the depression range a uniform.** The missile short looks at the sea from 10-60 m up, so 24° is too short.
   - Add a uniform `wDepMax` (0.42 for the river, **0.75** for sea shots).
   - Compute `wf = 1.0 - smoothstep(0.0, wDepMax, wDep)`.
   - The goal is that the visible sea always spans the full far-to-near ramp, about 28 L*.
3. **Limit haze over water.** In WATER_COL, after the fog include, clamp the fog factor on the water to ≤ 0.25. The sea
   must meet the sky at L* 60-66, C* ≥ 28, not at #c4d9f1 (C* 14).
4. **Turn the marks into horizontal crests.**
   - In `waterMarks`, set the angle with `a = U(r, -0.16, 0.16)`, which is ±9°, in place of `U(r, 0, Math.PI)`.
   - In the shader, rotate the lookup into the camera frame so the texture's x always runs along screen-right:
     ```glsl
     uniform float wYaw;   // per frame: Math.atan2(camDir.x, camDir.z)
     vec2 wq = mat2(cos(wYaw), -sin(wYaw), sin(wYaw), cos(wYaw)) * vWP.xz;
     vec2 wp = wq + vec2(0.35 * wTime, 0.0);
     ```
     Rotate the drift together with the lookup, or let it be. Foreshortening then squashes the marks into aspect-3-6
     dashes.
5. **Cut density.**
   - `waterNear()` uses `waterMarks("near", 10, 2)` at 1024 px per **16 m**. Use `wp / 16.0`, which roughly doubles
     the mark size in metres, so near marks are 25-50 px long.
   - `waterFar()` uses `waterMarks("far", 120, 12)` at `wp / 60.0`.
   - Target: crest area ≤ 1 % in the bottom half of the frame and ≤ 3 % at the horizon, marks ≤ 1.5 per 100x100 px.
   - Remove the old `water()` texture (90 strokes plus 40 white rectangles) from any sea material. It is the source
     of the "+" crosses.
6. **Pair each crest with a trough.** Keep the trough at `lw * 1.5` under the crest, at mix 0.6. Check that the
   trough colour is about -8 L* from the local base.
7. **Glints.** 1.2-2.4 px x 40-140 px, horizontal (`a = U(r, -0.05, 0.05)`), multiplied by `wf` so they appear only
   in the far 40 %.
8. **Swell.** Add a low-frequency swell: `wc *= 0.96 + 0.08 * texture2D(macroNoise, vWP.xz / 90.0).r`. Target b4
   about 1 L*.
9. **Wake, foam and splash at the hull or missile.** Paint them as flat white shapes, #f2fbff with a pale cyan edge
   #9fe3ec, on a separate decal quad. Do not use more marks for them.

### 3.2 Grass (`paint.ts` grassHD; ground material)

- Use `grassHD()` (256 texels/m, 4 m tile) for every lawn and airfield. Today the lawn renders as a flat colour,
  b1 0.09.
- **Base.**
  - Base #7ea03c (on-screen target L* 60, C* 54, h117), in place of #73b23d. Also lower any ground `color` that
    renders as #589e00.
  - The shade target is a teal-green, #3f6a4c.
- **Octaves.**
  - O1: 10 patches per tile, r 0.6-1.6 m (150-400 px). Dark #5d8530 at α 0.45, light #9cbc52 at α 0.30.
    Target lo8 about 15-20 % of the area.
  - O2: 1400 V-tufts, 7-16 px, lw 2, colours #6b9234 / #94b64a.
  - O3: 6-10 flower or leaf dabs per m², r 3-5 cm: orange #e98a2e, yellow #f2cf4a, white #f5f1e4.
- **Airfield option.** Mowing stripes 4 m wide, alternating ±3 L*, aligned with the runway, drawn in world space in
  the shader: `step(0.5, fract(x / 8.0))`.
- **Edges.** Where grass meets the runway, add a 0.25 m darker band (-6 L*) and ragged tuft overlaps.

### 3.3 Runway asphalt and concrete apron (new `asphaltHD()` and `concreteHD()` in `paint.ts`)

`asphaltHD()`: 1024² over 4 m (256 texels/m), on a world-xz UV.
1. **Base** #7b8090 (on screen L* 52-55, C* 7, h265: a blue-grey that turns violet in shade).
2. **O1.** 8 tar blotches, r 0.4-1.2 m. Dark rgba(60,62,78,.14), light rgba(150,152,165,.10).
3. **O2.** 300 patch dabs, r 4-12 cm, α 0.08, same tints.
4. **Aggregate.** 6000 specks of r 1-2 px (0.4-0.8 cm), 50/50 #5f6372 and #a3a6b2, α 0.25.
5. **Cracks.** 5 per tile, polylines of 5-9 segments, each 8-25 cm long, ±35° jitter, lw 2.5 px,
   rgba(45,46,60,.55), plus a 1 px lit lip at offset (1, -1) in rgba(200,200,210,.25).
6. **Runway markings.** Draw these on a separate decal mesh or texture, not tiled.
   - Centre-line dashes #f1ede2: 30 m long, 0.9 m wide, 20 m gaps. Side stripes 0.9 m wide.
   - Wear: erase about 30 % with speckle dabs of r 1-3 cm in base colour at α 0.6. Edges stay crisp (2-3 px).
7. **Tyre marks.** In the touchdown zone, 0.25-0.35 m wide and 20-60 m long, along the runway, rgba(40,40,50,.18).
   Overlap them 2-4 deep.
8. **Centre-line wear.** A 3 m-wide darker oil band, -6 L*, soft-edged.

Targets in the final frame: b1 about 1, b2 about 1.5-2.5, b3 about 2, b4 about 2.5. Lstd 6-8.

`concreteHD()` (apron, base pad, roadside kerb): 1024² over 5 m.
- Base #b9b2a6 (L* 72, C* 6, h70).
- Slab joints every 5 m along both axes: 3-4 px at 1080 FWHM, ΔL* -18, colour #857d72.
- O1 and O2 blotches ±4 L*.
- Rust-stain or water-stain drips on 10 % of slabs: #a58a6a at α 0.12.
- 2-3 hairline cracks per slab.

### 3.4 Submarine hull (new `hullHD()`; material in `build.ts`)

- **Material.** Replace the Phong hull with `twoTone(Lambert)` and the map `hullHD()`.
  - Albedo base #4d586b.
  - On-screen targets: lit L* 45-52, shade L* 26-30 (never below 19), shade hue h ~280-295.
  - Drop the `specular` / `shininess` sweep.
- **`hullHD()`**: 2048x1024 over 8 m x 4 m, which is 256 texels/m.
  1. Plates 2.0 m x 1.2 m, staggered. Each plate gets ±4 L* tone (`jit(r, base, 0.06, 3, 0.1)`).
  2. Seams: 3 px dark rgba(30,36,48,.55) plus a 2 px lit lip rgba(190,200,215,.30) on the upper side.
  3. Rivets along every seam, every 0.15 m: r 0.018 m (5 px) #2d3442, with a 1.5 px glint #d8dde6 at the upper left.
     Reuse `nail()` with these colours.
  4. Salt and rust streaks running down from each seam: 0.05-0.2 m wide, 0.4-1.8 m long, vertical gradient to α 0.
     Colours #a9b4c2 (salt, α .14) and #8b6a58 (rust, α .10). About 12 per tile.
  5. Waterline band: 0.25 m of #2f3a48 (wet, -8 L*) with a thin foam line #e9f6fa, 2-3 px. Below the waterline, an
     anti-fouling red-brown #7c3a2e if the hull is shown out of the water.
- **Painted highlight, not specular.** In `shade.ts` twoTone add an optional `uSheen` term:
  `lit += uSheen * smoothstep(0.80, 0.93, dot(N, normalize(L + V)))`, with uSheen = 0.22 for metal materials.
  This gives the reference's narrow streak on about 5 % of the surface at L* +20-25 above lit, with hard-ish edges.
  On the other materials uSheen = 0.
- **Deck and casing.** Use a slightly lighter, flat-painted #5d6878. Add non-skid speckle: 3000 specks of r 1 px
  (0.4 cm) at α 0.2 per m² of texture, and walkway plates outlined 3 px.

### 3.5 Missile paint (new `missileSkin()`; missile material in `build.ts`)

- **Map.** 2048x512, wrapped once around the body (u = around, v = along).
- **Albedo** #e7e1d6. On screen, lit L* 88-92 with a warm C* 4-6 at h70. The shade side lands at #9b9cb5 (L* 63-65,
  h ~285). The terminator ramp is 30-40 px at 1080: twoTone with a soft band. No region may clip above L* 95.
- **Panel lines.** Ring seams every 0.7 m, plus one longitudinal seam. 2-3 px, ΔL* -18, colour #8c8a92. Each ring
  seam gets a single rivet row of r 1.5 px dots every 6 cm.
- **Red bands** #cf3328, with a darker 3 px edge #8f1f1a and a lit lip.
- **Stencil markings.**
  - "U.S. NAVY", black #1e2230, bold sans, cap height 0.12 m.
  - A small yellow #f0c53a / black hazard chevron near the booster mount.
  - A 6 cm black "NO STEP" box on the wing root.
  - Wings and fins get the same skin, with a 3 px leading-edge lit lip (+6 L*).
- **Nose cone** a shade greyer, #d7d3cb, with a dark tip ring.
- **Exhaust end.** A soot gradient #2a2a33, from α 0.6 at the nozzle to 0 over 0.6 m. Fine radial streaks lw 1-2 px.
- **Wear.** 60 chips per m², 1-3 px, #b9b4ab at α 0.5, concentrated along seams and edges. Also grime streaks pulled
  back along the body, 0.1-0.4 m long, at α 0.06.
- **Sheen.** uSheen = 0.15 (§3.4), so a thin bright line runs along the body, not a broad clipped field.

### 3.6 Building facade, brick (`paint.ts` facadeHD, `build.ts` house builder)

- Every house and the post office get `facadeHD(...)` at 96 px/m. Today the facade is a flat grey field: the wall's
  b1 / b2 come only from the window frames.
- **1959 post office, two options.**
  - Red-brick: brick #c8643f with `jit` ±8 % L, ±4° hue; mortar #e6d3b6.
  - Cream stone: blocks `["#ddd0bf","#d3c5b3","#e5d9c9","#cabba8"]`, mortar #a39584. Blocks 0.6 x 0.3 m, so they
    survive at 30-60 m.
- **Brick scale.** Draw bricks at true size, 0.215 x 0.065 m. Past 30 m the mortar falls below 1 px, so blend 50 %
  toward a "brick-field" version: brick-coloured O2 blotches (r 0.1-0.3 m, ±5 L*) plus faint horizontal course lines
  every 0.39 m (6 courses), ΔL* -8. This keeps b1 / b2 in the 3-6 L* range of the reference wall.
- **Trim.** Cream sills, lintels and a cornice #efe3c8, 0.12-0.2 m. Each gets a 3 px lit top lip and a 6 px cast
  shadow under it, rgba(60,45,40,.25).
- **Windows.**
  - Glass gradient #8d9cdb to #5761a8, plus 2 diagonal glints (white, α 0.5).
  - Curtains on 35 % of windows.
  - Frame trim #f7f2e8, 0.08 m, with a 1.5 px dark line.
- **Weathering.** Rain streaks under each sill: 0.1 m wide, 0.6-1.2 m long, -6 L*, α fading. A plinth band 0.45 m
  tall in a darker stone.

### 3.7 Museum wood floor and walls

- **Floor.** Replace the flat #7b2a02 (L* 29) with `planksHD` geometry rules at museum scale.
  - Boards 0.14 m wide. Lengths 1.2-2.4 m, staggered, with butt joints.
  - Fills `["#c98a4e","#c08048","#d29659","#b97a43","#cd8f52"]`. On-screen lit L* 60-68, C* 40-50, h60-70.
  - Board-to-board tone std 2-3 L*. Grain strokes α .12-.16.
  - Gaps 4 px at 1080 (FWHM) in #5a2a0c, ΔL* 30-40.
- **Gloss.** No real reflection. Paint 2-3 long soft light bands along the board direction: rgba(255,240,215,.12),
  width 0.4-0.8 m, as a world-space overlay along the gallery axis. Add a soft dark reflection blotch under each
  exhibit: rgba(40,20,10,.15), r 1-2 m.
- **Walls.**
  - Plaster base #8a86b8 (it now renders #6f6da4). O1 blotches ±3 L*, r 0.5-1.5 m, α .06.
  - A wainscot or skirting board 0.15 m tall, in dark wood #5b3a26, with a 3 px lit top lip.
  - Picture-rail line at 2.6 m.
  - Optional wall-panel moulding rectangles: 3 px light and dark pairs, ±8 L*.
- **Plinth or podium wood.** Use `beamHD` fills (#a8743f family) with a lit top lip and occlusion at the base, not
  flat #4e4060 / #b06a2a.

### 3.8 Truck paint (new `vehicleSkin(base, accent)`)

- **Map.** 1024² per side panel, at about 200 texels/m.
- **Body panels.**
  - Seams 2-3 px, ΔL* -15, at the cab/box joint and the door outlines.
  - A lit top lip 4 px, +10 L*.
  - Bottom occlusion: -12 L* over the lowest 15 %.
- **Box (aluminium or painted).**
  - Base #b7b4c4 (L* 73, cool C* 8), so it no longer renders as flat #a4a2b7.
  - Vertical ribs every 0.6 m: a 3 px dark line plus a 3 px light line.
  - Rivet columns every 0.6 m: r 1.5 px dots, 5 cm apart.
  - Large lettering "U.S. MAIL" in #2a4c9a with a #c8302c pinstripe band 0.1 m, about 1 m above the floor line.
- **Cab** #2e56a8 (on screen L* 38-42, C* 50).
  - A chrome bumper and grille, painted as matcap bands: #f0f2f6 on 25-30 % of the area, #8f97a8, #4b5265.
  - Tyres #2a2a33 with a #4a4a55 sidewall ring.
- **Dirt.**
  - Dust spatter on the lowest 20 %: 400 dabs r 0.5-2 cm, #9c8467 at α .15-.3.
  - Two wheel-arch grime fans, α .2.
- **Sheen.** uSheen 0.12.

### 3.9 Sky

Covered by the lighting and depth reports. From a texture view, keep the sky gradient-only. The reference sky carries
no texture beyond three-tone clouds (`cloudHD`, already in paint.ts). Make sure the missile short uses `cloudHD`
three-tone sprites: the clouds in the 1s / 9s frames are one flat tone.

## 4. Acceptance numbers

Measure these with `SCR/look/work/textures/measure.py` on new stills.

| Surface | L* (lit) | C* | b1 | b2 | b3 | b4 | other |
|---|---|---|---|---|---|---|---|
| Sea | far 62-66 → near 34-40 | 25-33 | -- | 0.5-1.5 | 0.5-1.7 | 0.7-1.2 | crest area ≤ 1 % near; marks ≤ 1.5 per 100² px; \|angle\| ≤ 9° |
| Grass | 55-62 | 45-56 | 0.5-1.5 | 0.9-2.7 | 1.8-2.7 | 1.5-3.8 | lo8 12-22 % |
| Runway | 50-56 | 5-10 | 0.8-1.5 | 1.3-3 | 2-3 | 2-3 | Lstd 6-8 |
| Facade | 62-72 | 6-30 | 3-5 | 4-6.5 | 4-6 | 3-5 | |
| Sub hull | lit 45-52 / shade 26-30 | 6-12 | 1-2 | 2-3 | 1-3.5 | -- | L5 ≥ 19 |
| Missile | ≤ 92, shade 60-66 | 3-8 | 1-2.5 | 2-3 | 2-3 | -- | ≤ 2 % pixels ≥ L* 96 |
| Museum floor | 60-68 | 40-50 | 0.5-1.5 | 1.2-3 | 1-2.5 | 1.5-2.5 | gap ΔL* 30-40 |
| Truck box | 70-75 | 6-10 | 1-2 | 2-4 | 2-4 | 2-3 | |
