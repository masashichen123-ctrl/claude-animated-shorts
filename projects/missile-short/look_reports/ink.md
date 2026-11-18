# Ink (black drawn lines on the 3D world): missile vs premium reference

Work folder: `SCR/look/work/ink/`. Scripts: `lines.py` (whole-frame line census), `prof.py` (perpendicular
profile + equivalent width EW), `crop.py` (nearest-neighbour zooms), `sheet.py`. Crops: `o_*.png` (ours),
`r_*.png` (reference). Raw numbers: `ours.json`, `ref.json`, `ref540.json`.

Method.
- **Line census (`lines.py`):** frame resized to 1080x1920. Luma black-hat with a 15 px ellipse, threshold 28/255
  (dark ridges narrower than ~15 px). Then every 4th row and column is scanned and each ridge crossing is counted.
  Width = min(horizontal run, vertical run). "Thin" means ≤ 3 px, "thick" means > 3 px. Caption band 58-76 % masked
  on the references.
- **Fair-resolution check:** ours are 540 wide (x2 up) and the refs 720 wide (x1.5 up), so I also pushed every ref
  through ours' pipeline (down to 540, then up to 1080). That is the `ref@540` column below.
- **Width scans (`prof.py`):** EW = dip area / (background − 12). EW does not depend on blur.
- **Sample sizes:** 11 of our frames (1 s and 17 s left out because the water strokes count as false lines) and
  41 reference frames (jar_empire, burglar, window).

## 1. Measured gap

| metric (1080-wide equivalent) | ours | ref @540 (fair) | ref native | note |
|---|---|---|---|---|
| dark-line crossings per 1000 scan px | **2.14** (IQR 1.75-2.39) | **5.71** | 7.27 (5.1-10.6) | ref has 2.7x more lines |
| thin lines (≤ 3 px) per 1000 px | **0.23** | **2.50** | 3.50 | **11x gap: interior detail lines** |
| thick lines (> 3 px) per 1000 px | 1.75 | 3.62 | 4.09 | 2x gap: fewer parts and objects |
| thin : thick ratio | 0.13 | 0.69 | 0.86 | ref is a two-weight line system |
| line-pixel area % | 2.3 | n/a | 5.8 (3.8-8.1) | |
| median run width, census | 6 px | 4 px | 4 px | |
| silhouette EW, near hero prop | truck cab 5.4-6.0 px (EW 2.7-3.0 @540) | | fridge 5.1-5.6 px (EW 3.4-3.7 @720), ±5 % along the edge | **near silhouettes already match** |
| silhouette / depth-jump EW, median over all distances | ~5-6 px | | 3.1 px (outlines.md, n=25) | ours a bit heavy at mid distance |
| crease EW | podium corner ~2 px | | 2.2 px | OK |
| interior detail line EW (siding seam, mullion, brick mortar, shutter slat) | **none** | | **0.8-1.5 px** (EW 0.5-1.0 @720) | ours has no such class |
| interior line colour | none | | **local colour × ~0.6 measured** (≈ ×0.4 before AA); siding (101,137,136) on (147,190,192); mortar (140,126,100) on (218,206,178); mullion (101,118,132) on (171,217,232) | a tinted dark, not black |
| silhouette core colour | #030303 (core luma 2-15) | | (4,9,22) at luma 17 near; lightens to ~50 far | |
| line core luma, median over all lines | 15 | 74 | 63 | ref lines are mostly lighter, thin detail lines |
| material / colour-boundary lines (stripe, band, panel, banner edge) | **none** (podium flag stripes, plain colour joins) | | present: banners, shields, window frames, fridge panels | |
| taper / wobble on geometry lines | none | | none (constant width ±5 %, clean corners) | painted lines slightly irregular |
| line vs DOF | blurs with the background (ink before lens) | | blurs with the background | OK |
| line vs fog / distance | #030303 → 30 % fog tint past 60 m | | core 7 → 16 → 50 over near/mid/far arches; detail lines persist far (jar 15 s: 31 crossings/1000) | |
| defects seen | tail fin trailing edge (27 s): no line, a white rim instead; far missile top (17 s): dashed, about 1 px | | none | |

Zoom evidence: compare `o_truck32.png`, `o_build29.png` and `o_plane27.png` with `r_fridge.png`, `r_house49.png`
and `r_castle.png`. Ours have bold outlines around big blank panels. The reference adds a second, thin weight: plank
seams, mullions, mortar, slats and frames, every 15-40 px at 1080 on every hero surface.

## 2. Why ours reads "almost no ink" (ranked)

1. **No thin interior line weight (11x gap).** The reference "drawn" feel comes from many 1-1.5 px tinted-dark
   lines inside every surface: siding, bricks, planks, window mullions, panel seams, slats. Ours has blank flat
   faces. The InkPass cannot create these, because they are not geometry edges.
2. **Too few parts (2x gap in thick lines).** Our props are single boxes and cylinders: truck = cab box + cargo
   box + wheels, building = one box with painted windows, podium = one box. The reference props are built from
   trims, frames, sills, lids, rims and handles, and each part adds silhouettes and creases.
3. **No material-boundary lines.** Colour changes on one face (the missile's red band, flag stripes, window glass
   vs frame, the cab vs window) carry no line. In the reference they almost always do.
4. **One weight everywhere.** Our few lines are all heavy (median run 6 px vs 4 px). Without a thin weight, the
   heavy lines read as "low-poly outline shader", not drawing.
5. **Dropped and broken silhouettes.** The plane fin trailing edge (27 s) has no line. The far missile (17 s) shows
   a dashed ~1 px line. Painted window frames in the 29 s building are navy strokes, not ink.

## 3. Implementation spec

### 3.1 `ink.ts`: what it already does well

`ink.ts` already gives the reference's geometry-line algorithm:
- near-side depth-jump silhouettes with constant screen width;
- normal creases;
- concave contacts;
- no outlines on characters (NOINK);
- display-gamma composite;
- applied before the lens blur.

The near-silhouette width (5.1 px at 6 m) matches the reference hero props (5.1-5.6 px). **The ink pass is not the
main gap. Content is: parts and painted lines.** Still, change the following.

**A. `DEF` constants (rebalance into two weights):**

| constant | now | new | why |
|---|---|---|---|
| `widthNear` | 5.1 | **4.6** | ref hero 5.1-5.6 at ~1.5 m-equivalent framing; our 6 m props measure 5.4-6.0 |
| `widthFar` | 3.3 | **2.8** | ref median for depth jumps over all distances is 3.1, and 2.15 for far arches |
| `creaseScale` | 0.8 | **0.5** | crease 2.3 px near → 1.4 px far (ref 2.2 px median) |
| `angleLo` / `angleHi` | 35 / 50 | **30 / 45** | catches bevel and trim creases on the new part geometry |
| `color` | #030303 | **#05080f** | ref near core (4,9,22) is a faint cool near-black |
| `fadeNear` / `fadeFar` | 150 / 450 | keep | |
| compMat `fogInk` | 0.3 | **0.45**, and uniform `fogStart` 60 → **40** | far ref lines lighten to luma ~50 |

**B. New edge class: material-boundary lines.** Add it to the mask shader.
- In `NORMAL_FRAG`, write a per-material id into alpha: `gl_FragColor = vec4(n, 1.0 + inkId)`.
- `inkId` is a uniform set in `normalMat.onBeforeRender`. It comes from `src.userData.inkId ?? (src.id % 1024)`.
  HalfFloat holds integers exactly up to 2048.
- Coverage tests stay correct. Change `nc.a < 0.5` / `nq.a < 0.5` to `< 0.5` (still valid, since the id is ≥ 1).
- In `MASK_FRAG`, inside the radius loop, add this beside the crease test:

  ```glsl
  float hm = 0.5 * w * matScale;                 // matScale = 0.35 -> 1.6 px near, 1.0 px far
  float cm = clamp(hm + 0.5 - d, 0.0, 1.0);
  if (cm > 0.0) {
    vec4 a1 = textureLod(tNormal, vUv - o, 0.0), a2 = textureLod(tNormal, vUv + o, 0.0);
    float m1 = (a1.a > 0.5 && abs(floor(a1.a) - floor(nc.a)) > 0.5 && abs(z1 - zc) < zc * depthLo) ? 1.0 : 0.0;
    float m2 = (a2.a > 0.5 && abs(floor(a2.a) - floor(nc.a)) > 0.5 && abs(z2 - zc) < zc * depthLo) ? 1.0 : 0.0;
    eM = max(eM, max(m1, m2) * cm);
  }
  ...
  float ink = max(max(eD, eN), eM * matGain) * ...;   // matGain = 0.85
  ```

- Add `matScale` (0.35) and `matGain` (0.85) to `InkOptions`, `DEF` and `set()`.
- Opt-out: materials that share `userData.inkId` (e.g. all ground/terrain patches, grass vs runway blend) get no
  line between them. Set `inkId = 0` on the ground family. The sea horizon and wall/floor joins must stay
  line-free (the ref has none).

**C. Minimum width floor**, so far silhouettes never break into dashes (the 17 s missile):
`w = max(mix(wNear, wFar, t), 1.6) * pxScale`, then the same for creases: `hc = max(0.5*w*creaseScale, 0.7*pxScale)`.

**D. Diagnose the 27 s fin and the 17 s missile with `ink.debug = 1`.**
- If the mask has the line, then the white rim on the fin's trailing edge is a lit edge face of a 2-4 cm slab
  painted over the ink band. The near-side band lands on that face. Fix in `build.ts`: thin fins and wings get a
  0.06 m min thickness and a mid-grey edge-face colour, never a rim-lit white.
- If the mask lacks the line, the fin is on NOINK or is a single-sided plane with `depthWrite` false. Put it back
  on layer 0.

### 3.2 Painted interior detail lines (biggest gap): `paint.ts`

Add one helper and use it in every prop and building texture:

```ts
/** Tinted-dark detail line, the reference's thin weight. lwTex from screenPx at a typical shot distance. */
export function detailLine(g: CanvasRenderingContext2D, pts: [number, number][], base: string, lwTex: number, r: () => number) {
  const c = new THREE.Color(base).multiplyScalar(0.40);          // local colour x 0.40
  g.strokeStyle = `rgba(${c.r*255|0},${c.g*255|0},${c.b*255|0},0.85)`;
  g.lineCap = "round"; g.lineJoin = "round";
  g.lineWidth = lwTex * (0.9 + 0.2 * r());                          // ±10 % hand variation
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();                                                       // optional: 1 gap of 4-8 % length per 300 tex px
}
```

**Width rule.** `lwTex = 1.3 * texPerMetre * d / 2637`. Here 2637 is f in px at 1080x1920 with a 40° vertical FOV,
and `d` is the typical camera distance for that prop. For a 30° FOV use 3583.
- Example: a truck panel at 8 m with a 512 texel/m texture gives lwTex = 1.3·512·8/2637 = **2.0 tex px**.
- Hero props need **≥ 512 texels/m** and `anisotropy = 8`. Otherwise mipmapping erases sub-2-texel lines at
  grazing angles.
- Target on screen: **1.0-1.5 px at 1080**, contrast ≈ 40-45 % darker than the surface.

**Spacing.** Aim for one detail line every **15-40 px on screen** across hero surfaces. That gives the measured
~2.5-3.5 thin crossings per 1000 scan px over the whole frame, including sky.

**Per prop in the missile short:**
- **Missile body:** circumferential panel seams every 0.5 m, one longitudinal seam, a hatch rectangle with 4 rivet
  dots (dot Ø 1.5x lwTex), and nose-cone and band edge lines.
- **Submarine deck:** plank or plate seams every 0.4 m, butt joints staggered, a rivet row along the edges.
- **Truck:**
  - cargo box: vertical ribs every 0.35 m, plus door seam and hinge marks;
  - cab: door outline, handle, grille bars every 0.06 m, bumper split;
  - wheels: hub circle plus 5 bolt dots.
- **Building (29 s):**
  - windows: frame lines doubled (outer + inner, 0.06 m apart), cross mullions, sill line;
  - wall: horizontal panel or siding lines every 0.25 m, or a brick grid of 0.25 x 0.08 m with mortar lines;
  - roof: parapet coping line.
- **Runway / road:** slab joints every 4 m along and 3.5 m across, a few crack polylines, edge stripes with their
  own dark edge line.
- **Plane:** panel lines every 0.6 m, aileron and flap split lines, window row with frames.
- **Podium:** plank seams every 0.12 m, top-board edge line. Flag stripes get separating lines (also by B).
- **Museum:** floor boards every 0.15 m, wall wainscot rail line, plaque frame.
- **Palm trunk:** ring lines every 0.12 m (curved arcs, not straight).

**Do not** paint a line where a geometry edge already gets InkPass ink (box borders, plank ends at a beam). That
gives the double line the reference never shows. Keep 2 tex px of margin from UV borders that map to geometry
edges.

### 3.3 More parts (thick-line gap): `build.ts`

Each hero prop needs ≥ 6 distinct sub-meshes that break its silhouette or face. Examples:
- window frames as boxes protruding 0.03-0.05 m;
- door frames, sills, a roof coping 0.1 m proud;
- truck bumper, mirror, cab step, wheel arch, hubcap;
- missile fins with real thickness, a nose ring and a tail-cone lip;
- podium top board 0.04 m proud with a 0.02 m overhang.

Each part adds silhouettes and creases through the existing InkPass, and moves the thick crossings from 1.75 toward
3.6 per 1000 px.

### 3.4 What not to do

- No wobble, taper or noise on the geometry ink. The reference holds its width within ±5 % along an edge.
- No ink on the sea horizon or on wall/floor or ground/runway joins.
- No black (#030303) for the painted detail lines. They must be a tint of the local colour, or the frame turns into
  a wireframe.
