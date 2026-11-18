# Composition and camera: missile short vs premium references

Scope: framing, character size, headroom, placement, camera height/tilt, FOV, dutch, foreground framing, empty/flat area,
scene density, shot types per beat. All 13 of our frames (`look/ours/missile_*.png`) and 37 reference frames
(`look/ref/{jar_empire,burglar,window}_*.png`, captions masked at 58-76 % of height) were measured at 540x960.

Work files: `look/work/composition/` (scripts `scripts/metrics.py`, `scripts/vv.py`; data `metrics.json`, `metrics.txt`;
gridded sheets `g_ours1.jpg g_ours2.jpg g_je1.jpg g_je2.jpg g_bu1.jpg g_bu2.jpg g_wi.jpg` with 10 % lines and thirds;
our full shot strip `strip1fps.jpg`).

Note: the missile project's source is not in the repo (`projects/missile-short` holds only package.json). The specs
below target the template it was built from (`templates/bridge/story.ts` CAMS / FOREGROUND / DOF, `build.ts` set dressing,
`world.ts`), using the same `Shot`/`Key`/`dolly`/`zoom` grammar, so they port straight into the missile's copy.

---------------------------------------------------------------------------------------------------------------------

## 1. Measured gap table

### 1a. Automatic metrics (median, IQR in brackets)

| metric (definition) | ours (13) | refs (37) | gap |
|---|---|---|---|
| Flat area: share of 12x12 blocks with L std < 4, a/b std < 2.5, no Canny edge | **0.77** (0.74-0.82) | **0.44** (0.35-0.51) | ours 1.8x flatter |
| Largest single connected flat region, share of frame | **0.33** (0.32-0.37) | **0.16** (0.08-0.22) | ours 2x |
| Flat share of the top 30 % of frame | **0.94** (0.83-0.96) | **0.51** (0.38-0.69) | top of our frames is near-empty |
| Flat share of the bottom 24 % of frame | **0.87** (0.76-0.94) | **0.54** (0.43-0.72) | bottom also empty (grass/asphalt/sea) |
| Canny edge density (detail) | **0.023** (0.020-0.025) | **0.058** (0.042-0.072) | refs 2.5x more line detail |
| Distinct regions > 0.15 % of frame (mean-shift + edge segmentation) | **21** (15-27) | **38** (28-47) | refs 1.8x more shapes |
| Near-vertical line segments >= 70 px (architecture/props) | **5** (1-5) | **13** (6-18) | refs show built structure |
| Vertical vanishing point (verticals' convergence) in frame heights from centre | none measurable (no verticals) except 23 s: 13.7 (level) | 1.1-2.4 on 7/37 frames (strong down-tilt + wide lens), 3-7 on 6 more (moderate) | we never tilt |

Per-frame values (ours): flat 0.55 (1 s) ... 0.86 (36 s); top-30 % flat 0.80-1.00 on every frame; regions 9 (17 s) to 36 (23 s).
The only reference frames as flat as ours are deliberate "breather" beats: jar_empire 31 s sunset (0.80) and 21 s insert (0.68).

### 1b. Hand-annotated framing (from the gridded sheets)

| metric | ours | refs | gap |
|---|---|---|---|
| Main character body height, % frame H (full-body visible) | 18-39 % (median 29 %) | 25-63 % when full body; otherwise cropped (MCU) | ours 1.7x smaller |
| **Head height, % frame H** | 4-11 %, **median 6.5 %** (9s 6, 13s 8, 23s 8/5, 29s 4, 36s 7, 40s 6, 43s 11) | 8-22 %, **median 15 %** (JE6 22, B18 20, B36 20, JE0.3 17, W41 17, W15/W22 15, B0.5 15, JE41 11, B6.5/B13 10, B9.5 8) | **heads 2.3x smaller** |
| Frames with a CU/MCU (head >= 15 %) | 0/13 | 10/37 (27 %) | none |
| Frames with no character at all | 6/13 (1, 17, 20, 27, 32, 34) = 46 % | 6/37 = 16 % (inserts + establishing) | 3x |
| Head-top position (headroom) of main char | 29-81 % (median 45 %), i.e. huge headroom of sky | 23-52 %, most 30-45 %; the area above the head is always filled with set (signage, throne, windows, shelves) | ours: headroom = empty sky |
| Main char horizontal centre | 17-62 %, mostly 37-50 % | left third 25-40 % on 9/19 character frames, centred on hero CUs | similar; ours lacks the counterweight object on the other third |
| Horizon / sky | horizon at 25-47 % from top on 10/11 exteriors; sky = 20-70 % of frame (median 38 %), 0-1 cloud | exteriors: horizon <= 30 % from top or hidden behind set; sky median ~20 %, always carries a feature (sun/rays, moon, smoke, overhanging branch) | 2x more sky, featureless |
| Camera pitch | ~0 deg (level, eye height) on 12/13 | clearly high-angle (>= 20 deg down) on 8/37, low-angle on 4/37, level 25/37 | we have no high/low angles |
| Vertical FOV (estimated) | 34-46 deg (template default 40) | interiors / wides ~60-70 deg (est. from wall-height vs head-width in burglar 9.5 s: f ~ 925 px of 1280 -> 69 deg; strong convergence in JE28, B13, B44, W6, W15); CU/MCU ~40-50 deg | wides need ~+20 deg |
| Dutch roll | +-2.3 deg max (template 0.03-0.04 rad) | ~0 on almost all; drama comes from pitch and diagonals (JE31 slope ~25 deg, B56 leaning body) | not a gap; do not add dutch |
| Foreground framing element (nearer than subject, cropped by an edge, often blurred) | 2/13 (13 s sack at left edge, 23 s podium) = 15 % | 29/37 = **78 %** (jar lid, guards cropped at edges, frogs, tree branches, couch, slippers, shelf, stools, heads in OTS) | 5x |
| Frame edges (outer 12 % columns) occupied by vertical structure | 1/13 (29 s building) | ~22/37 (curtains, pillars, door frames, shelves, walls) | |
| Distinct props/objects per frame (hand count) | **median 3** (1 s: 2; 17/20/27/29/32/36/43 s: 3) | **median ~13** (B9.5 ~18, B6.5 ~14, JE28 ~14, JE36 ~15, B36 MCU ~10, W19 30+ products) | **4x** |
| Static hold | 32 s and 34 s are pixel-identical (0.5 % of pixels differ): the truck shot holds 4.6 s with no change | refs never hold (polish_study: camera moves on 70-81 % of frames) | |
| Tangents | 43 s: museum wing edge runs exactly through the kid's head top; 40 s: wing line at head height | none seen | |

### 1c. Shot types per story beat (refs)
| beat | ref grammar (seen in Empire/Burglar/Window) |
|---|---|
| Hook (0-2 s) | character already acting, MS/MCU, head 15-17 %, prop/object of the story in the same frame, dense set |
| Set-up / explanation | MS (char 40-60 %) at a third + insert ECU of the key object (cup, dial, key, slippers) |
| Scale / "the whole X" | high-angle aerial, pitch 30-60 deg down, horizon at the very top or out of frame, crowd/army fills frame |
| Reaction / punchline | CU/MCU head 18-22 %, low or level, often a foreground blur element |
| Transition between places | establishing wide, wide lens 60-70 deg, strong convergence (road, corridor, checker floor) |
| Ending | pull-back / crane to high wide |
Ref mix: inserts 8 %, CU/MCU 27 %, MS 27 %, group/interior wide 22 %, establishing/aerial 16 %.
Ours: inserts 0 %, CU/MCU 0 %, MS 15 % (13 s, 43 s), small-figure full shot 38 %, object-only wide 46 %.

---------------------------------------------------------------------------------------------------------------------

## 2. Why ours reads cheap (ranked)

1. **Two-thirds of every frame is one flat colour.** 77 % flat blocks vs 44 %; the top 30 % of our frames is 94 % flat
   (sky) and the bottom quarter 87 % flat (grass, asphalt, sea, black hull). This happens because the camera sits at eye
   height looking level at small subjects in an open field: half the frame is sky by geometry.
2. **The characters are too small.** Head 6.5 % of frame height vs 15 %. Faces are the expensive-looking part of this
   style (ink, shading, expressions), and we show them at 40 % of the reference scale; no CU in 13 frames.
3. **Nothing in the world.** ~3 objects per frame vs ~13; 21 shapes vs 38; 5 vertical structures vs 13. A missile alone
   over a featureless sea or a truck on a lawn reads as a placeholder scene.
4. **No foreground layer.** 15 % vs 78 % of frames have a near object cropped by an edge. Without it, DOF has nothing to
   blur in front and the image has no depth planes (BG / subject / FG).
5. **Only one camera height and one lens.** Level eye-height, ~40 deg on every shot. The refs use high angles for
   scale beats (sky disappears, ground becomes the background), low angles for authority, and 60-70 deg lenses for
   wides, so lines converge and sets wrap around the frame.
6. **Shot types don't match beats.** 46 % of our frames have no character (refs 16 %); emotional beats ("historic",
   "Luckily", "Unluckily", "only time") get a full shot of a tiny figure instead of a CU.
7. **Static holds and tangents.** 4.6 s identical truck frames; wing edges slicing heads in the museum.

---------------------------------------------------------------------------------------------------------------------

## 3. Implementation spec

### 3.1 Framing targets (constants, story.ts)
Put these in story.ts next to CAMS and use them when authoring every key (and in the QA check of 3.6).

```ts
/** composition targets measured on the reference shorts (head = head blob height, HH * SU = 0.48 m adult, 0.45 m kid) */
export const FRAMING = {
  CU:   { head: [0.18, 0.24], headTop: [0.22, 0.34], fov: [38, 45] },          // reaction / punchline
  MCU:  { head: [0.14, 0.18], headTop: [0.28, 0.42], fov: [40, 48] },          // dialogue, hook
  MS:   { body: [0.40, 0.62], headTop: [0.25, 0.40], fov: [42, 52] },          // explanation, character + object
  FS:   { body: [0.25, 0.40], headTop: [0.30, 0.50], fov: [50, 62] },          // character in place (needs FG + dense set)
  WIDE: { body: [0.06, 0.20], horizonMaxFromTop: 0.28, fov: [58, 70], pitchDeg: [15, 40] }, // establishing / scale
  INSERT: { objectFill: [0.45, 0.75], fov: [34, 42] },                         // the key object, DOF on
} as const;
/** frame-level limits (see 3.6 for the metric definitions) */
export const COMP_LIMITS = { flatMax: 0.55, bigFlatMax: 0.22, topFlatMax: 0.70, botFlatMax: 0.70, regionsMin: 30, skyMax: 0.28 };
```
Distribution over a ~45 s short (about 20-24 camera keys): >= 4 CU/MCU, >= 5 MS, 2-3 inserts, 3-4 wides, <= 3 frames
without a character. No shot holds without camera motion (keep the existing pushK rate >= 0.0015 on every hold).

Sizing formula (three.js `fov` is vertical; t = tan(fov/2)):
- distance to put a subject of real height h at fraction q of frame height: `d = h / (q * 2 * t)`.
  Adult card: body 1.68 m (3.5 x HH, BUILD.adult), head 0.48 m. Examples: MCU head 16 % at fov 44 -> d = 0.48/(0.16*0.808) = **3.7 m**;
  MS body 50 % at fov 46 -> d = 1.68/(0.5*0.849) = **4.0 m**; CU head 20 % at fov 40 -> **3.3 m**; kid MS (1.29 m) 50 % at fov 46 -> 3.0 m.
- Wides: lens 60-66 deg, pitch 18-35 deg down, so the horizon lands at (0.5 - tan(pitch)/ (2t)) of height from top: pitch 25 deg
  at fov 64 -> 0.5 - 0.466/1.25 = **0.13 from top**. At pitch 0 the horizon is at 0.50: this is why our frames are half sky.

### 3.2 A framing helper (story.ts) so keys are authored as composition, not raw positions
```ts
/** camera that puts a subject (base point, height h) at q of frame height with its top at `top` (0 = frame top) and its
 *  centre at xs (-1 left edge .. +1 right edge), viewed from azimuth az (rad, 0 = looking toward +z), pitch (rad, + = down) */
export const framed = (base: V3, h: number, o: { q: number; top: number; xs?: number; az: number; pitch: number; fov: number; roll?: number }): Shot => {
  const t = Math.tan((o.fov * Math.PI) / 360), tx = t * (9 / 16), d = h / (o.q * 2 * t);
  const c: V3 = [base[0], base[1] + h / 2, base[2]];
  const f: V3 = [Math.sin(o.az) * Math.cos(o.pitch), -Math.sin(o.pitch), Math.cos(o.az) * Math.cos(o.pitch)];
  const r: V3 = [-f[2], 0, f[0]], rl = Math.hypot(r[0], r[2]) || 1; r[0] /= rl; r[2] /= rl;  // camera right
  const u: V3 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]; // camera up
  const yc = 1 - 2 * (o.top + o.q / 2), xs = o.xs ?? 0;          // subject centre in NDC
  const pos: V3 = [c[0] - f[0] * d, c[1] - f[1] * d, c[2] - f[2] * d];
  const look: V3 = [0, 1, 2].map((i) => c[i] - r[i] * xs * tx * d - u[i] * yc * t * d) as V3;
  return { pos, look, fov: o.fov, roll: o.roll ?? 0 };
};
```
Wrap it in `dolly(...pushK...)` exactly like the existing S-functions: `const S = (f) => { const s = framed(...); return dolly(s.pos, s.look, pushK(f, f0, 0.0025), { fov: s.fov }); }`.
Check: `framed(c, 1.68, {q: .5, top: .3, xs: -.33, az, pitch: .1, fov: 46})` gives a MS with the head top at 30 % and the body on the left third.

### 3.3 FOREGROUND (story.ts) - from 2 entries to one per character shot
Rules (refs): an FG element on ~75 % of shots; it sits at **0.3-0.5 x focus distance**, is cut by one frame edge (or a
corner), covers **12-25 % of frame area**, never overlaps a face (keep >= 4 % of frame height from the head bbox), is
blurred by DOF (`cInf` >= 10 on that shot). Bottom corners and one side edge are the usual places; an overhang (branch,
awning, wing, banner) along the top edge kills empty sky.

Extend the type so FG can be any build function, not only kit GLBs, and can be attached to the camera:
```ts
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number;
  /** "cam": pos is in camera space (x right, y up, z forward, metres) so the element stays framed during push-ins */
  space?: "world" | "cam"; tilt?: number };
```
In world.ts (the FOREGROUND loop at ~line 320/398), when `space === "cam"` set the object's matrix every frame from
`camAt(id,f)`: `obj.position = pos.x*right + pos.y*up + pos.z*fwd + cam.position`, orientation yaw relative to the camera.
Missile FG kit names needed (build in build.ts with existing primitives or Kenney): `railing`, `rope_coil`, `mail_sack`,
`letter_bundle`, `palm_fronds`, `wing_tip`, `mic_stand`, `crowd_heads` (3-5 back-of-head cards from cast.ts at 1.6 m),
`velvet_rope`, `crate`, `fuel_pump`, `hedge`, `fence`. Per-shot entries are listed in section 4.

### 3.4 Set dressing (build.ts): density targets and a scatter helper
Targets per frame: >= 10 distinct objects, >= 30 shape regions, >= 8 vertical structures, at least one side edge
covered by a tall structure on non-insert shots, no flat region > 22 % of frame.

Add to build.ts:
```ts
/** dress a ring around a subject: n props from `kits`, at radius r0..r1 (m), on the far side of the camera only
 *  (angle within +-spread of the view direction away from the lens), heights h0..h1, seeded; uses prop() so the
 *  sight-line test still keeps them off the subject */
export const dressAround = (b: Batch, kit: Kit, c: V3, camDir: number, kits: string[], n: number,
  r0: number, r1: number, spread: number, h: [number, number], seed: number) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = camDir + (r() - 0.5) * 2 * spread, d = r0 + (r1 - r0) * Math.sqrt(r());
    prop(b, kit, kits[Math.floor(r() * kits.length)], c[0] + Math.sin(a) * d, c[1], c[2] + Math.cos(a) * d, h[0] + r() * (h[1] - h[0]), r() * 6.28);
  }
};
/** a row of things (hangars, parked planes, houses, mailboxes, lamp posts) along a line, for converging perspective */
export const rowOf = (b: Batch, kit: Kit, name: string, from: V3, to: V3, n: number, h: number, yaw: number, jitter = 0.15, seed = 1) => { ... };
```
Ground planes: no plain grass/asphalt fields wider than ~10 m in shot. Break them with painted runway markings,
tyre marks, kerbs, puddles, flower beds, path tiles (paint.ts already has grass/cobble; add `asphaltHD` with lane
lines, cracks, oil stains, `tarmacMarkings`). Sea: wake lines, foam patches, buoys, distant boats, a coastline strip.

Sky: by composition rule the horizon sits <= 28 % from top on exteriors (via pitch, 3.1) or is hidden behind set.
When sky remains (low angles), it must carry a feature: 3+ layered clouds overlapping the frame edge, a contrail,
gulls, a sun halo (world.ts already has sprites; place 2 clouds per shot inside the frustum, one cut by a top corner).

### 3.5 Camera height / angle library
| use | height | pitch | fov | notes |
|---|---|---|---|---|
| hero / authority (postmaster) | 0.9-1.1 m (chest) | 6-12 deg up | 40-44 | background becomes set, flags, plane tail |
| conversation MS | 1.2-1.4 m | 3-8 deg down | 44-50 | floor/deck detail behind feet instead of sky |
| scale / establishing | 12-40 m | 20-40 deg down | 58-66 | horizon <= 15 % from top, rows converge |
| insert of object | 0.3-1.0 m from object | 30-70 deg down for containers | 34-40 | DOF cInf 12-16 |
| chase (missile flight) | 3-6 m above/behind | 25-35 deg down | 50-55 | ground/coast is the background |
Dutch: keep current small rolls (<= 0.04 rad) only on emphasis; the refs don't use real dutch angles.

### 3.6 Composition QA (scratch script, run on every still before final render)
Use `look/work/composition/scripts/metrics.py` (definitions in 1a). Fail a frame when: flat > 0.55, biggest flat
region > 0.22, top-30 % flat > 0.70, bottom-24 % flat > 0.70, regions < 30 (character shots) - except one deliberate
breather beat per short. Also project the head bbox of every character (cast.ts knows card size) and assert head %
and head-top are inside the FRAMING band of that key's type, and that no long world edge (wing, rail, roofline) passes
within 4 % of frame height of a head top (tangent check).

---------------------------------------------------------------------------------------------------------------------

## 4. Shot-by-shot recomposition plan (all 13 frames)

Timings from our cut list (scene changes at 3.9, 5.9, 12.5, 15.4, 16.6, 19.1, 26.2, 30.6, 35.2, 42.2 s).
"Now" numbers are measured; "New" is the target. Positions are relative to the subject; author them with `framed()`.

### 1 s - "In 1959, the US delivered the mail by cruise missile" (hook, 0-3.9 s)
- Now: missile side-on over sea, missile 19 % of H at 43-62 %, horizon 35 %, sky 35 % + sea bottom 38 % flat (flat 0.55), no character, level camera.
- New: **hook = character + object in one frame** (ref hooks always open on a character mid-action). High chase,
  camera 4 m above and 6 m behind-left of the missile, pitch 28 deg down, fov 54 -> horizon at ~12 % from top with a
  thin coastline + lighthouse + 2 boats. Missile runs on a diagonal lower-left -> upper-right through the centre,
  length = 75 % of frame diagonal; a hatch on its back is open with 6-10 letters fluttering out toward the lens (FG
  letters at 0.4x distance, blurred, cut by the bottom-left edge). Sea: wake V behind the missile, foam patches,
  sub's wake far below. Alt for 0-1.2 s: MCU of a postman with a mail sack looking up (head 16 %, head top 46 %,
  x = 0.35, camera 1.0 m pitch 12 deg up), missile streaking across the top 35 % with contrail, then whip-pan to the chase.
- FG: letters (cam-space, `letter_bundle`, z 2.5 m). DOF cInf 10 focused on the missile.

### 9 s - "the Navy had a submarine with a missile on it / submarine Barbero loaded a missile" (5.9-12.5 s)
- Now: sailor 29 % H (head 6 %, head top 39 %, x 37 %) on a black hull; flat 0.73, black hull is one flat mass ~45 % of frame, sky 30 %.
- New, 2 keys:
  a) 5.9-8.3 establishing: 30 m up, pitch 32 deg down, fov 60. Sub spans 80 % of frame diagonal lower-left -> upper-right;
     missile on its launcher aft; 4 sailor cards on deck (body 7-9 %); escort ship + tug, buoys, gulls; Florida coast strip
     (beach, palms, low houses) along the top 12 %. No sky beyond 12 %.
  b) 8.3-12.5 MS "loaded a missile": sailor body 52 % (head 15 %), head top 28 %, x = 0.33, camera 1.3 m above deck,
     4.2 m away, pitch 6 deg down, fov 46. Right two-thirds: missile on the launch rail with a crane hook lowering a
     crate stencilled US MAIL, 2 more sailors at 25 % behind. Deck: hatch, cleats, painted hull number, rope coils.
     Hull colour dark navy-grey with painted texture, not black (no flat region > 22 %).
- FG: `railing` stanchion + chain along the left edge (0.4x focus distance, 15 % of frame width), `rope_coil` bottom-right corner. DOF cInf 10 on the sailor.

### 13 s - "Instead of a warhead, it carried 3,000 letters" (12.5-15.4 s)
- Now: sailor MS 39 % (head 8 %) centred-left waving a letter; dark hull fills the bottom half (bottom flat 0.99).
- New: a) 12.5-13.7 **insert**: open nose bay, camera 0.9 m above, pitch 60 deg down, fov 38; letter bundles fill 70 % of
  frame, warhead-shaped empty cradle crossed out. b) 13.7-15.4 **MCU** sailor proud: head 17 %, head top 30 %, x 0.38,
  camera 1.5 m, 3.6 m away, fov 44, level; he holds a letter stack up next to his face; missile body with "U.S. MAIL"
  stencil fills the right third behind him; deck crew loading sacks out of focus.
- FG: `mail_sack` pile bottom-left corner (20 % of frame area, 0.4x distance). DOF cInf 12.

### (15.4-16.6 launch, not in the 13 stills) - low angle from the deck, 0.6 m, pitch 20 deg up, fov 56; missile leaving the rail upper-right, smoke filling the bottom 40 %, a ducking sailor cropped by the left edge in FG.

### 17 s - "It launched, flew about 100 miles over the sea, and 22 minutes later" (16.6-19.1 s)
- Now: missile in the right half (17 % H), sea 45 % flat, land strip, one tiny building, horizon 35 %, flat 0.63, 9 regions.
- New: **scale shot**, aerial chase from above-behind: camera 8 m above the missile, pitch 38 deg down, fov 58; horizon out
  of frame or <= 6 % from top. Missile occupies 35-45 % of frame width at y 55-68 %, heading toward the upper-left; below it
  the coastline crosses the frame diagonally (sea left, land right) with beach, roads, a town grid, piers, boats, so "100
  miles" reads as geography. Cloud cards pass between camera and missile (cam-space FG at the top-right corner, blurred),
  a dotted flight-path line + small clock graphic "22 min" can be a world-space decal on the clouds.
- FG: `cloud` card, top-right, 0.3x distance. DOF cInf 6 (mild).

### 20 s - "it landed at a naval air station in Mayport" (19.1-~21.6 s)
- Now: palm 52 % H in the centre, grass 48 % (bottom flat 0.94), sky 47 %; landing missile tiny at the top right.
- New: establishing of the air station: camera 14 m up at the runway edge, pitch 20 deg down, fov 62; runway enters
  bottom-left and converges to upper-right (vanishing at ~18 % from top). Along it with `rowOf`: 3 hangars with "MAYPORT"
  lettering, control tower, 4 parked planes, fuel truck, windsock, fence, ground crew cards with flags (body 8 %).
  Missile touching down at the upper-left thirds intersection with a parachute/skid dust trail.
- FG: palm used as a **framing element**, not a subject: trunk at x 0.92, fronds overhanging the top-right 20 %, blurred
  (cInf 8, focus on the landing point). Horizon <= 18 % from top.

### 23 s - "The postmaster general called it historic for the peoples of the entire world" (22.1-26 s)
- Now: postmaster head 8 % behind a podium (podium = 31 % of frame, flat brown), sailor 30 % at right, sky 40 %.
- New: a) **low-angle MCU** of the postmaster: camera 1.0 m, 3.5 m away, pitch 10 deg up, fov 42; head 18 %, head top 28 %,
  x 0.42; behind him: bunting, 2 flags, the plane tail, a hangar wall (no sky above 15 %). Photographers flash (sprites)
  on "historic". b) 24.6-26 "entire world": reverse MS over his shoulder (shoulder + head back cropped left 25 %, FG) onto
  a cheering crowd of 8-12 cards (heads 6-8 %), banners, a newsreel camera on a tripod.
- FG: `mic_stand` cluster bottom-right (cam-space, 0.45x distance) in a); back of his head in b). Podium shown front-on
  and cropped by the bottom edge so its flat face is <= 15 % of frame; give it a painted crest. DOF cInf 12.

### 27 s - "Luckily, every letter arrived" (26.4-27.8 s)
- Now: plane wing with sacks, a character cut in half at the left edge, asphalt 40 % flat (bottom flat 1.00).
- New: **MS** of a postal clerk catching / stacking sacks: body 50 %, head 14 %, head top 32 %, x 0.62; camera 1.2 m,
  pitch 8 deg down, fov 48. Background: sorting trolley, open mail van doors, ground crew, hangar wall with signage.
  Asphalt gets lane paint, chocks, cables. A green tick stamp / "DELIVERED" ink stamp lands on a sack (effect sprite).
- FG: `mail_sack` pile bottom-left 22 % of frame, blurred.

### 29 s - "Unluckily, every delivery needed a missile" (28.3-30.6 s)
- Now: kid 18 % H (head 4 %, head top 47 %) at x 17 % in front of a flat building; grass bottom 42 % flat (0.99).
- New: **comic MS from low**: camera 0.7 m, 3.2 m away, pitch 4 deg up, fov 48. Kid body 52 % (head 15 %), head top 30 %,
  x 0.34, looking at a missile nose sticking out of a smashed mailbox on the right third (mailbox 35 % H), smoke puffs,
  scattered letters on the lawn. House facade behind fills the top 65 %: porch, door, windows, picket fence, hedge,
  bike, garden gnome, tree overhanging the top-left. Horizon hidden.
- FG: `fence` pickets bottom-right corner + flower bed (0.4x distance). DOF cInf 10. This is the punchline: also hold a
  0.6 %/f punch push for 35 f on "missile".

### 32 s - "mail is cheap because one truck carries thousands of letters" (30.6-~33.5 s)
- Now: truck side profile, no driver, sky 42 %, grass/road 50 %, flat 0.82; and the frame is **identical to 34 s** (static 4.6 s).
- New: **low 3/4 front**, camera 0.8 m, 6 m off the front corner, pitch 4 deg up, fov 54; truck front fills 55 % of
  width, driver card waving in the cab (head 7 %), rear doors open with a wall of letters/sacks spilling; street converges
  to a vanishing point at ~35 % from top, lined with `rowOf` houses, mailboxes, lamp posts and trees on both sides
  (horizon hidden by houses). Push-in 0.25 %/f through the whole shot.
- FG: mailbox on a post at the left edge (cam-space, 0.35x distance, 18 % of frame height), blurred.

### 34 s - "...for a tank of fuel" (~33.5-35.2 s)
- Now: same frame as 32 s.
- New: **insert** of the fuel gauge/filler: camera 0.6 m from the truck's tank, fov 38, gauge fills 50 % of frame, needle
  swings to FULL; a pump nozzle in from the left edge (FG). Then 0.6 s MS of the postman walking past with a sack
  (body 48 %, x 0.36) if the edit needs a character.

### 36 s - "A missile is a very fast, very expensive delivery van that only makes one trip" (35.4-39.2 s)
- Now: missile at the left 60-80 %, postman head 7 % at the bottom edge (body cut), **sky 70 % of frame** (top flat 1.00, biggest flat region 0.68).
- New: a) **two-shot MS**: camera 1.2 m, pitch 6 deg down, fov 48; postman at x 0.66, body 50 %, head 14 %, head top 30 %;
  missile on a trolley beside him spanning the left 55 % at the same depth, a dangling price tag "$$$" (insert-worthy) on
  its fin; hangar wall + parked planes behind hide the horizon. b) "only makes one trip": the missile flies off and the
  pink burst (existing effect) happens in a high wide (fov 60, pitch 20 deg down) with the hangars and the postman small in FG.
- FG: trolley handle / `crate` bottom-left corner.

### 40 s - "So the future of mail lasted exactly one flight" (39.6-42 s)
- Now: museum, plane wing at head height, 2 visitors 28 % (head 6 %), flat violet walls; wing line tangent to heads.
- New: **museum establishing**, camera 3.5 m up, pitch 22 deg down, fov 60: missile on a plinth in the centre third
  with a "1959" plaque, velvet ropes converging, 5-7 visitor cards (body 18-25 %), banners, skylight shafts, a hanging
  plane and a rocket as other exhibits, a timeline wall with framed photos. Keep all long wing/rope lines >= 4 % of frame
  height from any head top.
- FG: `velvet_rope` post + rope bottom-right (0.35x distance), blurred.

### 43 s - "It's still the only time America's mail has gone by missile" (42.4-46 s, ending)
- Now: kid MS 51 % H centred (head 11 %), wing edge slices the head top (tangent), walls flat orange (top flat 0.98).
- New: **ending crane**: start MCU, camera 1.1 m, 3.4 m away, pitch 10 deg up, fov 44: kid head 17 %, head top 34 %,
  x 0.36, looking up at the missile nose that enters from the top-right corner on a diagonal (nose tip >= 6 % from the head).
  From 43.6 s crane out on a curved path (like S15c) to 10 m up, pitch 40 deg down, fov 60, revealing the whole hall
  with visitors, plaque, the mail sack display; end on a held wide with the push-in still running.
- FG: plaque stand bottom-left in the MCU (0.4x distance); none in the wide. DOF cInf 12 -> 0 ramped with the crane.

### (3.9-5.9 post office, not in the 13 stills) - currently a flat grey wall with a sign and 2 small clerks (heads ~5 %):
reframe as MS of the postmaster at the counter (head 15 %), a stamp + letter insert, mail cubbies wall behind (vertical structure).

---------------------------------------------------------------------------------------------------------------------

## 5. Top 5 fixes (summary)
1. **Kill empty sky/ground by camera geometry**: exteriors at pitch 18-40 deg down with fov 58-66 so the horizon sits
   <= 28 % from top (now 25-47 % with level cameras; sky median 38 % -> <= 20 %). Target flat area <= 0.55 (now 0.77), top-30 % flat <= 0.70 (now 0.94).
2. **Bigger characters**: head 6.5 % -> 15 % of frame height median; >= 4 CU/MCU per short (now 0); distance d = h/(q * 2 tan(fov/2)), e.g. MCU 3.7 m at fov 44.
3. **Set density**: 3 -> >= 10 objects per frame, regions 21 -> >= 30, verticals 5 -> >= 8, via `dressAround`/`rowOf` in build.ts and painted ground markings.
4. **Foreground layer on ~75 % of shots** (now 15 %): FOREGROUND entries at 0.3-0.5 x focus distance, 12-25 % of frame, cam-space option, DOF blurred.
5. **Beat-driven shot types + no static holds/tangents**: hook = character + missile, inserts for letters/fuel/price, high wides for scale, low MCU for the postmaster, crane-out ending; no 4.6 s identical holds, no world edge within 4 % of a head top.
