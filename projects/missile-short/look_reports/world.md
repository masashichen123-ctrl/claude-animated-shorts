# World and prop design: missile short vs the premium reference

Topic: how the reference models its environments and props, and a set-by-set modelling spec for the missile short
that `templates/bridge/build.ts` can implement.

Scratch work is in `SCR/look/work/world/`:
- scripts: `measure.py` (frame statistics), `props.py` (prop crops), `sheet.py` (contact sheets)
- data: `measure.json`
- images: `crops_sheet.jpg`, `z_palm_car.png`, `ours_*.jpg`, `ref_*.jpg`

This is private study. Only general rules and numbers are taken from the reference. No reference prop is traced.
Every prop below is designed from the 1959 history: USS Barbero, Regulus I, NAAS Mayport, and the 1955-71
red/white/blue Post Office livery.

**Method.**
- All frames are scaled to 1080 px wide. The reference caption bands (33-38 % and 66-74 % of height) are masked.
- Ours are 540-px stills upscaled x2. That softens edges, so our edge numbers are a slight under-count. It is not
  enough to explain a 3x gap.
- In 1 s and 17 s, our edge density is inflated by the water-streak texture. Those are not prop edges.
- **Edge density:** Canny 40/110 after a σ1.2 blur, as % of pixels.
- **Empty tile:** a 36x36 px tile with no edge and luma std < 6.
- **Regions:** connected components of a coarse Lab quantisation (L/24, a/16, b/16, median 5) larger than 0.03 % of
  the frame.
- **Hue families:** 15° hue bins with C* > 18 that cover > 1.5 % of the frame.

---

## 1. Measured gap table

### 1a. Whole-frame set density

| Metric (1080 w) | Ours (13 frames) p25 / med / p75 | Ref 2026 (39 frames: jar, burglar, window) | Ref older (20 shorts) | Ref exterior day only (short04/13/14/19, jar 15/28) | Gap |
|---|---|---|---|---|---|
| Edge density % | 0.84 / **0.97** / 1.09 | 2.13 / **3.06** / 4.08 | 1.75 / **2.54** / 3.41 | 1.3 – 11.8, median **4.5** | **x2.6 – 3.2 too few lines** |
| Empty 36-px tiles % | 70.9 / **73.6** / 77.0 | 29.9 / **39.5** / 50.3 | 40.8 / **46.7** / 58.9 | 19 – 56, median **40** | **+27 to +34 pts too empty** |
| Painted regions per frame | 72 / **103** / 117 | 266 / **307** / 371 | 239 / **259** / 298 | 239 – 470, median **287** | **x2.5 – 3 too few shapes** |
| Hue families per frame | 3 / **4** / 5 | 5 / **6** / 9 | 5 / **6** / 9 | 3 – 9, median 6 | about 2 hue families short |
| Distinct named objects in frame (hand count) | 2 – 5 (20 s: palm, runway, sea; 32 s: truck, sacks, road, grass) | 10 – 25 (burglar 9.5 s: fridge, door, window, curtain, counter, 4 jars, calendar, phone, lamp, cabinets, notes, magnets, tiles) | 8 – 20 | 10 – 30 | **x4 too few objects** |
| Frames with readable in-world text or emblems | **1 / 13 (8 %)**: "1959" plaque only | 14 / 30 sampled (**47 %**) | 10 / 20 (**50 %**) | 4 / 6 | **No signage** |

Our worst frames are 36 s (83 % empty, 61 regions), 27 s (78 %, 2 hues) and 32/34 s (77 %, 3 hues). In each, one
untextured plane (grass, tarmac or sky) fills the frame.

### 1b. Prop crops

Measured in crops scaled to a 400 px long side. "Crossings" is the mean number of edge crossings per scanline
across the object, which gives secondary detail per object.

| Prop | Crossings / row | Crossings / column | Colour bins > 1 % | Bevel (visual estimate, ±30 %) | Secondary detail present |
|---|---|---|---|---|---|
| ref 1950s fridge | 11.1 | 17.3 | 15 | **soft: corner radius ≈ 13 % of width**; door edge rounded | handle, kick-plate grille (≈ 20 slots), 4 magnets, 2 notes, door seam |
| ref kitchen counter | 18.6 | 13.7 | 21 | top slab overhang ≈ 4 % of depth, 2-3 px radius | panel doors with inset frames, knobs, items on top |
| ref police car | 13.4 | 8.7 | 20 | soft, ≈ 10 % of height | two-tone livery, light bar, star decal, lettering, wheel rims, lights |
| ref shop block | 11.8 | 16.4 | 26 | crisp corners | window frames ≈ 8 % of window width, cream sills, striped awnings, zig-zag trim bands, roof AC units, planters |
| ref castle gate | 32.5 | 32.5 | 28 | crisp | stones, crenellation, banners, crest, lamps, stalls |
| **our mail truck** | **5.0** | **7.0** | 11 | **none** (2 boxes + 4 cylinders) | one window quad |
| **our missile** | 9.4 * | 7.4 | 15 | none (plain cylinder, knife fins) | one red band, an intake ring |
| **our podium** | 7.1 | 5.8 | 10 | none (one box) | a flag stripe decal |
| **our building** | 7.7 | 14.2 | 14 | none | flat blue window rectangles, no frames, sills or roof items |
| **our palm** | 6.3 | 11.5 | 14 | — | straight trunk, 6 flat fronds |

\* Our missile crop includes water-streak noise. Against the comparable reference props, our props carry
**about 50 % of the cross-detail** and **60 % of the colour bins**.

### 1c. Palm tree (our 20 s vs the reference desert-street palms)

| | Reference | Ours |
|---|---|---|
| Trunk | Tapered 5.5 % → 3.5 % of height; bowed with ≈ 6 % lateral offset at mid-height; warm tan **#c59f7b** (shade #8c6d5f) | Straight; constant ≈ 5.3 % of height; purple-brown **#5d4b63** |
| Crown | 8 – 9 arched-then-drooping blades, length 0.30 – 0.40 x trunk height; brown nut cluster at the crown | 6 flat single polygons that radiate out with no droop |
| Leaf colour | Sage / mint **#7f9b77 – #8eb68d**; each blade outlined | Two different greens on one tree: blue-teal #30694d fronds, acid #42bd1e crown hub |

### 1d. Colours that read as "untreated primitive"

Measured medians of our renders:

| Surface | Ours | Problem |
|---|---|---|
| Submarine hull (9 s / 13 s) | **#060d2d** | Near-black navy over 40 % of the frame. The reference never goes below L* 19 (textures.md) |
| Museum wall / floor (40 s) | #706da5 / #792903 | One flat lilac and one flat burnt orange, unrelated to any material |
| Truck box | #a4a2b7 | Lavender-grey: a neutral albedo turned lilac by the two-tone shade (same bug as house walls, build.ts STYLES round 2) |
| Building wall | #9e9697 | Same lilac-grey problem |
| Runway | #8b8b92 | Flat, no slab joints, and the markings are only centre dashes |
| Grass | #58a000 | Over-saturated acid green; ref grass sits around #6aab4f (build.ts RECOLOR) |

---

## 2. Why ours reads cheap (ranked by measured impact)

1. **Empty planes dominate.** 74 % of tiles are featureless, against ~40 % in the reference. Every shot is one prop on
   a bare sky, sea, grass or tarmac plane. The reference fills 60 % of the frame with set dressing in 3 depth layers:
   a foreground framing object, midground props and a busy background skyline. *Fix: clutter budget and set
   dressing (§3.2, §4).*
2. **No secondary detail on props.** Our props have half the cross-detail. The reference always breaks a face larger
   than about 1 m² with:
   - a seam or panel line;
   - a trim band (contrasting colour, about 10 % of the face height);
   - a frame around every opening;
   - small "jewellery" (knobs, rivets, magnets, lights, decals).

   Ours are raw boxes and cylinders. *Fix: the detail rules in §3.1.*
3. **Knife-edged primitives with uniform proportions.** Nothing has a bevel, an overhang, a taper or a bulge.
   - The reference rounds hand-scale and vehicle-scale props generously (radius 10-15 % of the smallest
     dimension) and keeps buildings crisp.
   - The reference exaggerates chunkiness: thick frames, deep sills, fat handles, overhanging tops.

   *Fix: `rbox()` and the bevel classes in §3.1.*
4. **No signage or period storytelling.** In about half the reference frames, text or emblems tell you where you are.
   We have one plaque. A 1959 Navy and Post Office story begs for this:
   - hull numbers and "U.S. MAIL" on the vehicles;
   - the 48-star flag;
   - runway numbers and the base sign;
   - the "UNITED STATES POST OFFICE" frieze.

   *Fix: `signTex()` (§3.3).*
5. **Material colour is wrong or absent.**
   - The hull is near-black (#060d2d).
   - The museum is two arbitrary flat colours.
   - The neutral greys of the truck and buildings shade to lilac.
   - Our frames hold 4 hue families where the reference holds 6.

   *Fix: the per-set palettes in §4, with warm-shifted neutrals.*
6. **Vegetation is a placeholder.** One straight purple stick carries 6 flat fronds. The reference palm is curved and
   tapered, with 8-9 drooping outlined blades and a nut cluster, and palms come in groups of 2-4 at different
   heights. *Fix: `palm()` (§3.4).*

---

## 3. Shared toolkit (new helpers in `build.ts` and `paint.ts`)

All dimensions are in metres, Y is up, and colours are albedo sRGB hex. Every material goes through
`lam(key, ...)`, so it gets `twoTone`.

**Ink rule** (ink.ts: creases start at 35° and are full at 50°; depth jumps start at 1 %):
- a bevel built from 3 or more segments per 90° with smooth normals gives a silhouette line but no crease line;
- a hard 90° edge or a separate inset piece gives a line.

Use this deliberately:
- round the body;
- make seams and frames real geometry steps (≥ 0.02 m proud or inset) or painted lines.

### 3.1 Bevel and detail rules

**`rbox(w, h, d, r, seg = 3)`** generalises `hedgeGeo()`. It is an exact rounded box, built as `BoxGeometry(w, h, d,
nx, ny, nz)` with the vertices pushed to the inner box plus radius `r`, and smooth normals.
- Segment counts: `nx = 2 + 2*seg` and so on, so each bevel gets `seg` steps (30° each, under the 35° crease
  threshold).
- Options: `{ flatBottom: true }` and per-axis radii (as in hedgeGeo).
- Cache by key `rbox:w:h:d:r` in `vegGeo`, or in a new `geoCache` Map.

```ts
export const rbox = (w: number, h: number, d: number, r: number, seg = 3, flatBottom = true) => {
  const k = `rbox${w}|${h}|${d}|${r}|${seg}|${flatBottom}`;
  let g = geoCache.get(k); if (g) return g;
  const n = 2 + 2 * seg;
  g = new THREE.BoxGeometry(w, h, d, n, n, n);
  const p = g.attributes.position as THREE.BufferAttribute, N = g.attributes.normal as THREE.BufferAttribute;
  const hw = [w / 2, h / 2, d / 2], v = new THREE.Vector3(), q = [0, 0, 0], e = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    for (let a = 0; a < 3; a++) {
      const c = v.getComponent(a), lim = flatBottom && a === 1 && c < 0 ? hw[1] : hw[a] - r;
      // remap the box grid so `seg` rows sit inside the bevel band (even spacing in angle, not in position)
      q[a] = THREE.MathUtils.clamp(c, -lim, lim); e.setComponent(a, (c - q[a]) / r);
    }
    const L = e.length(); if (L < 1e-6) continue;
    e.divideScalar(L);
    p.setXYZ(i, q[0] + e.x * r, q[1] + e.y * r, q[2] + e.z * r); N.setXYZ(i, e.x, e.y, e.z);
  }
  g.translate(0, h / 2, 0); geoCache.set(k, g); return g;
};
```

Before pushing, remap the grid so the outer `seg` rows of each axis sit in [hw − r, hw]. For example, set grid
coordinate `t` in the outer band to `hw - r + r*sin(t*π/2)`. Otherwise most rows land on the flat part and the bevel
gets only one facet.

**Bevel classes.** The radius is a fraction of the object's smallest dimension `m`.

| Class | r | Use |
|---|---|---|
| SOFT | 0.12 – 0.15 m·m⁻¹ x m, min 0.04 | vehicles, the mailbox, the missile wing roots, appliances, sacks, the lectern top, crates |
| MEDIUM | 0.05 – 0.07 x m, min 0.025 | the podium body, the hangar door frames, plinths, display cases, the sub hangar door, deck equipment |
| CRISP | 0.02 x m, clamped 0.03 – 0.10 | building masses, the control-tower shaft, parapets, kerbs (still not zero: a 1-px highlight survives) |

**Detail rules.** These are budget rules the builder checks per prop.

- **D1 – no bare face larger than 1.5 m² in a hero or midground prop.** Each such face gets at least one of:
  - a panel seam (painted 3-5 px line at 1080, per textures.md, or a 0.02 m inset groove);
  - a trim band (contrasting colour, 8-12 % of the face height, proud by 0.03-0.06 m);
  - a framed opening;
  - a sign or decal.
- **D2 – openings are framed.**
  - Window or door frame width = 8-12 % of the opening width, proud by 0.05 m.
  - Glass is recessed 0.08-0.12 m.
  - Sill: 0.12 m deep, 0.10 m tall, extends 0.08 m past each side.
  - A lintel or hood above.
  - Glass colour is a vertical gradient (top lighter) plus 1-2 diagonal white glints (paint).
- **D3 – overhang everything that caps.** Parapet copings, counter tops, roofs and lectern tops overhang by 4-8 % of
  the depth, minimum 0.08 m, so each casts a shadow line.
- **D4 – jewellery.** Every hero prop carries 3-8 small accents in an accent colour (red / yellow / chrome) at
  0.04-0.12 m: knobs, lights, rivets, bolts, decals, magnets.
- **D5 – chunk factor.** Thin real-world parts are thickened x1.5-2 in cross-section so they survive 4-5 px ink and the
  DOF:
  - handles, railings, masts and antenna;
  - railing tube ≥ 0.06 m;
  - stanchions ≥ 0.08 m;
  - antenna ≥ 0.05 m.

  Exaggerate distinctive volumes x1.2: tyres, bumpers, noses, domes.
- **D6 – silhouette breakers.** Every roofline or top edge longer than 6 m gets 1-3 objects that break it: vents, AC
  boxes, masts, lamps, signs, flags, antennas.
- **D7 – rivets.**
  - Within 8 m of the camera: real hemispheres r = 0.025 at a 0.18 m pitch. Use one shared `SphereGeometry(1, 8, 6)`
    scaled, merged into the batch.
  - Beyond 8 m: painted dots, 3-4 px at 1080, colour = base x 0.75.

**`lathe(key, profile: [r, y][], seg = 28)`** wraps `THREE.LatheGeometry` with smooth normals, cached. Use it for the
missile fuselage, booster bottles, buoy, oil drums, lamp posts, the tower beacon, the mailbox dome (half lathe),
microphones, stanchion posts and palm trunks (see 3.4).

**`panelTex(key, wm, hm, o)`** goes in paint.ts. It is a base colour plus:
- seams `o.seams` (u or v positions, 4 px dark lines at base x 0.7 with a 2 px light line on the lit side at
  base x 1.12);
- rivet rows along seams (`o.rivet` pitch in m, 3 px dots);
- 6-10 soft grime dabs (alpha 0.06);
- an optional stencil text.

It is 1024 px per 4 m. This is the generic "painted metal" for the hull, missile, truck, hangar doors and tower.

### 3.2 Clutter budget and layers

These are per-shot requirements. They go in `story.ts` as a `dress` list per shot, which build/world adds near the
camera.

- **≥ 8 distinct objects visible** in every shot, ≥ 12 in establishing shots.
- **Three depth layers:**
  - **FG (foreground):** one framing object at 1.5-4 m from the lens, partly out of frame and DOF-blurred. It covers
    8-20 % of the frame on one side.
  - **MG (midground):** the subject plus 3-6 props within ±5 m of it.
  - **BG (background):** a busy horizon band. It holds ≥ 5 shapes (buildings, trees, ships, masts), so that the
    empty-tile fraction in the BG band is ≤ 50 %.
- **Ground planes are never bare.** Grass gets:
  - painted clumps;
  - 3D grass tufts: 5-7 crossed blade cards (0.25-0.4 m) every 2-3 m² near the camera;
  - pebbles and small flowers.

  Tarmac or concrete gets slab joints, oil stains, paint markings, tie-downs and drain grates. The sea gets crest
  marks (per textures.md), floating objects and wakes.
- Target after the fixes (re-run `measure.py`):
  - edge density ≥ 2.2 %;
  - empty tiles ≤ 48 %;
  - regions ≥ 230;
  - hue families ≥ 5 in every shot.

### 3.3 `signTex(key, text, w, h, style)` (paint.ts)

Canvas sized at 256 px per metre of height (max 2048 wide). Parameters:
- **Styles:**
  - `stencil` (Navy): condensed bold sans, letter-spaced 8 %;
  - `slab` (Post Office): slab serif, all caps;
  - `script` (museum banner);
  - `plate` (number plates and placards).
- **Board:** background fill, inner border at 6 % of h, and an ink outline 3 % of h in #221f2e.
- **Text:**
  - cap height = 62 % of h;
  - text fill plus 1.5 % h dark stroke (ref captions and signs both outline);
  - offset drop shadow at 2 % h, colour = board x 0.7.
- **Wear:** 4-6 alpha 0.05 scuffs.
- **Placement:** sit signs on 0.04 m-thick `rbox` boards, never as a flat quad on a wall. The board edge gives a
  silhouette line.

### 3.4 `palm(b, x, y, z, h, seed, q = 0)` (build.ts vegetation)

Use **groups of 2-4** with heights h, 0.8h and 0.65h, spaced 2-4 m apart and leaning in different directions. Never
place a single palm.

**Trunk.** A lathe or tube along a bowed curve:
- centre line `P(t) = (bow * sin(πt) * dirX, t*h, bow * sin(πt) * dirZ) + lean * t² * dir`;
- `bow` = 0.05h, `lean` = 0.08-0.15h, `t` in 0..1, 12 rings x 10 sides;
- radius `r(t) = h * (0.028 - 0.011 t)`, a taper of about 1.6 : 1;
- leaf-scar rings: each ring at t_k gets a 0.15 m-tall flare of +6 % radius (a sawtooth profile, so the ink catches a
  crease every 0.35 m).
- Paint `palmBark`:
  - base **#c9a57a**;
  - rings **#a8845c**, 3 px;
  - vertical streaks **#d8b98f**, alpha 0.25.

**Crown.**
- A nut cluster: 5-7 spheres r = 0.11 at the top, **#8a5a3c**.
- Below them, a short "boot": a cone r 0.22 → 0.32, h 0.4, **#a8845c**.

**Fronds:** 9 per tree, at yaws `i*40° + U(-12°, 12°)`, alternating pitch up 35° and up 15°.
- **Spine:** a quadratic curve, length L = U(0.32, 0.40) x h. It rises at pitch, then droops so the tip ends
  0.25L-0.45L below the base height. Use 8 segments.
- **Blade:** a ribbon along the spine with width profile `w(s) = 0.36 * sin(π * s^0.8) * L * 0.3`. That gives a max
  width of about 0.11L near s = 0.55, tapering to the tip.
- **Fold:** the blade folds along the spine. The two halves are tilted 25° up (a V cross-section), which gives the
  two-tone shade a lit half and a shaded half per blade.
- **Edge:** saw-tooth notches. Every 0.07L, cut the edge in 30 % deep (alternate the vertices in and out) to suggest
  leaflets. The ink then draws a serrated outline. Keep the notches ≥ 0.12 m on hero palms, so the effect reads.
- **Colour:** per tree, pick one base from **#6fae6a**, **#7fbf74**, **#5f9f63**.
  - Lit half x 1.0.
  - Inner half x 0.85, hue −8°.
  - A painted midrib line at #4f8a50.
  - Tint near-camera blades +6 % yellow.
- **Material:** `side: DoubleSide`, smooth normals within each half.

The DOF budget allows q = 1 for palms more than 40 m away: 6 fronds, no notches, 6-sided trunk.

**Ground skirt.** Put a 1.2 m-radius patch of sandy soil (#d8c39a) under each palm group on grass, with
2-3 coconuts.

Also add `tuft()` (crossed blade cards) and `shrub()`, a Florida saw-palmetto. Build the palmetto from 7-11 fan
leaves, each a semicircle cut into 12 radiating notches, size 0.5-0.8 m, colour #6f9f6a, on a 0.2 m stalk. Scatter
shrubs along fences, building bases and runway verges.

---

## 4. Set specs for the missile short

Every set lists: the masses (primitives, dimensions, bevel class), the secondary detail, the colours, and the
dressing per layer. Positions are relative to the set's own origin. Colours are albedo. The two-tone shade and the
grade sit on top, so aim lit faces about 10 % brighter than the target screen colour.

### 4.0 Global palette for 1959 Florida

| Role | Hex | Notes |
|---|---|---|
| Navy blue (livery, letters, mailbox) | #24407a | not near-black |
| Signal red | #d8352f | bands, buoy, mailbox top, stripes |
| Warm white (paint) | #f2efe6 | the missile, truck upper, tower cab; never pure #fff |
| Navy haze grey (ship paint) | #7d8a96 | the submarine sail and casing in the lit tone |
| Submarine hull below the deck line | #4a5868 | replaces #060d2d. Lowest allowed albedo for large areas is #3a4656 (L* ≈ 29) |
| Weathered teak deck | #a08a6e, gaps #6e5a46 | warm counterweight to all the grey and blue |
| Concrete / runway | #cfc8b8, joints #a39c8c | warm, not #8b8b92 |
| Asphalt apron | #6f6f74 → use #7b7770 | warm-shifted so it does not shade to lilac |
| Florida grass | #7cb35a, dry patches #b9b46a | less acid than #58a000 |
| Sand / dune | #e6d3a3 | |
| Palm frond | #6fae6a / #7fbf74 / #5f9f63 | |
| Palm bark | #c9a57a | |
| Brass / chrome accent | #d9b45a / #c9d3dc | |
| Navy yellow (deck markings, tower check) | #e8b830 | |

**Neutral rule.** Any neutral albedo under C* 8 gets +4 to +6 C* toward hue 70° (warm). This stops the lilac
two-tone shade (the same fix as STYLES round 4).

### 4.1 Sea and sky (shots 1 s, 17 s, transitions)

Masses:
- **Sea:** keep the world.ts water.
  - Add swell geometry: a 200 x 200 m plane, 128² vertices, displaced by 3 sines (amplitude 0.25 / 0.12 / 0.06 m,
    wavelength 22 / 9 / 4 m, directions 0°, 37°, −61°). Smooth normals, so the two-tone shade paints lit and shaded
    swell faces.
  - Crest marks per textures.md (0.3 % crest area near, 2.5 % far). That replaces the uniform streaks, which
    currently inflate the edge count with noise.
- **Coastline band** at 600-1200 m (visible in 17 s and any shot with a horizon). It is the main BG layer.
  - **Dunes:** a low extruded strip. Height 4-9 m from a 3-octave noise; the sand face is #e6d3a3, the top #9fbf72
    (scrub).
  - **Palm groups:** 12-20 groups at q = 2, each 8-14 m tall.
  - **The 1859 St. Johns River lighthouse:** a lathe with radius 3.2 → 2.2 m and 25 m tall, in red brick #b8553a.
    Black lantern: a cylinder r 1.6, h 2.5, #2e3440, with a glass band #f6e7a6. Railing ring r 2.4.
  - **Two water towers:** a sphere r 4 on 4 legs, 18 m, #e8e4da.
  - **Low white buildings:** rboxes 8-20 m wide, crisp.
- **Escort ship silhouettes on the horizon,** 2 of them at 1.5-3 km:
  - hull: an extruded trapezoid 110 x 8 m, #7d8a96;
  - superstructure: 3 stacked rboxes;
  - 2 masts.

  This gives "Navy" at a glance.
- **Near-camera floating dressing (FG/MG):**
  - **Red nun buoy:** a lathe cone. Base r 0.9, flare to 1.0 at the waterline, top r 0.15. Height 2.4 m. Red
    #d8352f with a white band of 0.3 m at 60 % of the height, and a painted white number "2". The buoy bobs ±0.15 m
    at 0.4 Hz.
  - **Seagulls:** 3-6 birds. Each is a 0.6 m-span V card: a white body with grey #9aa4ae wing tips, flapping 2.5 Hz.
    They are billboards on the NOINK layer, or tiny 3D wings.
  - **Wake** behind the missile in 1 s: a foam stripe texture on the water, 2 m wide, fading over 30 m.
- **Sky:** colour is owned by the lighting and grade agents. Prop-side items:
  - 3-tone cumulus (textures.md `cloudHD`) in **2 layers**: 5-8 large clouds low on the horizon (they fill the
    1/3 above the horizon and stop the plain blue band), plus 2-3 small ones high;
  - a contrail line in 1 s and 17 s as missile motion cue (a white tapering ribbon, NOINK, alpha 0.8 → 0).

### 4.2 USS Barbero (SSG-317) deck with Regulus I on its launcher (shots 9 s, 13 s)

The real boat was a Balao-class conversion: 95 m long, 8.3 m beam, a Regulus hangar abaft the sail and a
launcher aft. Model only a **36 m slice** around the sail-hangar-launcher, plus a long low-poly remainder fading into
the sea at q = 2.

**Masses** (origin at the deck centreline under the launcher pivot; +z = forward):

| Part | Primitive | Size | Bevel | Colour |
|---|---|---|---|---|
| Pressure-hull sides above water | Lathe or extruded ellipse half, length 36 | width 8.3, freeboard 1.4 above the waterline, tapering to 4 m at the stern end | smooth (it is a tube) | #4a5868, waterline boot-top band 0.35 m #b8553a (red anti-fouling showing at the waterline) |
| Deck casing | Box under the deck, 5.0 wide, 1.1 tall | sides angled in 12° | MEDIUM r 0.06 | #7d8a96 |
| **Limber holes** along the casing side | Rows of inset dark rboxes (or a painted texture with real depth: inset 0.05) | 0.36 x 0.12, pitch 0.55, 2 staggered rows | SOFT | #2e3742 inside |
| Deck | 0.08 slab on the casing | 5.0 x 36 | CRISP | teak planks #a08a6e, plank width 0.14, gaps #6e5a46 3 px, butt joints staggered every 2.4 m (paint.ts planksHD retinted) |
| Sail (fairwater) | rbox, plan shaped as a stadium (front rounded r 1.2) | 2.6 w x 7 l x 4.6 h above the deck, at z = +14 | MEDIUM r 0.12 | #7d8a96, top 0.5 m band #6c7884 |
| Sail number "317" | `signTex` stencil, white #f2efe6 with #2e3440 shadow, on both sides | cap height 1.1 m | — | — |
| Bridge cockpit rail | tube rail around the sail top, 0.06 tube | 1.0 high | — | #c9d3dc |
| Periscope shears and masts | 3 cylinders r 0.09-0.14, heights 3.5 / 4.5 / 2.8 m above the sail; radar dish on one (a lathe paraboloid r 0.5) | | | #6c7884, dish #c9d3dc |
| **Regulus hangar** | Horizontal cylinder (lathe) on the deck, axis along z | r 1.9 (half sunk into the casing: 2.6 m visible), length 10, z = +3 to +13 | ends: the aft end is a **dome door** (half sphere r 1.9, flattened 0.45 in z) split vertically with a 0.03 m seam, two hinge knuckles | #7d8a96. 6 circumferential ribs (proud 0.04, r 1.94) every 1.6 m. Rivet rows (D7) on each rib |
| Launcher turntable | Cylinder r 1.6, h 0.35 on the deck at z = −4, plus a pedestal cylinder r 0.8, h 0.9 | | MEDIUM | #6c7884, yellow safety ring #e8b830 0.12 wide painted around the turntable edge |
| **Launcher rail** | Two I-beams (each 3 boxes: flanges 0.22 x 0.04, web 0.04 x 0.32), 7.5 long, 0.9 apart, pitched up 12° toward the stern, ending 2.6 m above the deck | | CRISP | #8b97a3 |
| Rail trusses | 4 triangular gussets per side (extruded triangles 0.05 thick) + 2 hydraulic struts (cylinders r 0.08 & r 0.06 telescoped) from the turntable to the rail mid | | | #6c7884, chrome rods #c9d3dc |
| Deck railing | Stanchions every 1.8 m: cylinder r 0.04 → D5 → **0.06**, 1.0 tall, ball cap r 0.07. Two lifelines (tube r 0.025 → **0.04**, sagging 0.05 between posts) | both deck edges | | #c9d3dc posts, #e8e4da lines |
| Deck fittings (jewellery) | Mooring cleats (2 boxes + 2 rounded horns, 0.6 long), bollards (2 cylinders r 0.15 on a plate), escape hatch (disc r 0.45, h 0.08 + hinge box + wheel torus r 0.2 #d8352f), capstan (r 0.25 drum) | 1 per 4 m of deck | SOFT | #6c7884, hatch wheel red |
| Safety markings | painted yellow lines 0.1 wide #e8b830 around the launcher swing area; non-skid "walkway" panels (darker #8f7a60 planks) | | | |
| Flag | 48-star US flag on the stern staff (1959: the 49-star flag only took effect on 4 July 1959; the flight was 8 June) | 1.5 x 0.8, staff 3 m | | `flagTex` variant |

**Regulus I missile** (the hero prop). It reuses this geometry in 1 s, 9 s, 13 s, 17 s, 36 s and 40-43 s.

| Part | Spec |
|---|---|
| Fuselage | Lathe, length **9.8 m**, max r **0.70** (1.4 m diameter). Profile `[r, y]` from nose to tail: (0.42, 0)-(0.52, 0.15) intake lip as a torus-like rounded ring (keep the current nose intake, r_in 0.36, dark interior #1f2833 with a centre-body cone r 0.18 x 0.6 so it is not a black hole); (0.66, 1.6); (0.70, 3.0) … (0.70, 6.8); boat-tail to (0.48, 9.3); exhaust nozzle ring (0.45, 9.8) with dark interior #2e2a2a. 32 radial segments, smooth normals |
| Wings | Mid-fuselage, root chord 2.6, tip chord 1.0, semi-span 2.5 (total span **6.4 m** with fuselage), leading-edge sweep **40°**, thickness 0.16 at root → 0.06 at tip. Build as `ExtrudeGeometry` of the planform with bevelEnabled (bevelSize 0.03, bevelThickness 0.05, bevelSegments 3), so edges are rounded (SOFT). Dihedral 0° |
| Vertical fin | Swept 45°, root chord 2.2, tip chord 0.8, height **1.7** above the fuselage top, extruded, same bevel. Small rudder seam 0.02 groove at 70 % chord |
| Ventral fin | Small, 0.6 tall, root 1.2 |
| **JATO boosters** (on the launcher only, dropped in flight) | 2 lathes r 0.26, length 2.3, nose hemispherical, nozzle bell r 0.2. Mounted under the rear fuselage, splayed ±20°, pitched 10° down. Strap bands: 2 tori per booster, #c9d3dc. Booster colour #6c7884 |
| Paint | Body warm white **#f2efe6**. Nose band (y 0.2-1.0) signal red **#d8352f**. Fin tip red 0.4 m. Wing tips red 0.3 m. Anti-glare panel ahead of the wing on top: navy #24407a, 1.2 x 0.4 |
| Markings (`signTex` decals, slightly curved by mapping onto a lathe-section patch) | "U.S. MAIL" in navy #24407a, slab serif, cap height 0.32, mid-fuselage both sides; "U.S. NAVY" stencil, cap 0.18, under the fin; a star-and-bar roundel (blue disc r 0.3, white star, white bars with red stripe) behind the wing; a small "REGULUS" stencil, cap 0.08 |
| Panel seams | `panelTex` on the fuselage: circumferential seams every 1.2 m (v), 2 longitudinal seams at ±50° from the top; rivet rows along every seam (painted). Hero close-up (13 s): 4 real access-panel rboxes 0.5 x 0.3 x 0.015, MEDIUM, + 4 screw dots each |
| Jewellery | Pitot probe at the nose (cylinder r 0.02 → D5 0.035, length 0.6, chrome); 2 navigation lights (spheres r 0.05, red port / green starboard) at the wing tips; antenna blade on the spine |
| Mail canisters | 2 metal mail containers loaded in place of the warhead. Only visible in a cut-in shot. Rboxes 0.8 x 0.5 x 0.5, SOFT, #6c7884 with stencil "U.S. MAIL" in yellow #e8b830 |

**Dressing for 9 s and 13 s:**
- **FG:** the sail edge and railing stanchions, blurred.
- **MG:** coiled mooring line, 2 sea bags or mail sacks, a tool box (rbox 0.6 x 0.3 x 0.3, red), a sound-powered
  phone box on the sail, a life ring (torus r 0.38/0.07, #d8352f with 4 white bands) on the sail side.
- **BG:** the escort ship and the coastline band (4.1), and 2-3 gulls.

The black hull currently fills 40 % of the frame. The fixes:
- a camera at least 1.5 m higher, looking down on the teak deck;
- the hull colour #4a5868.

### 4.3 Naval Auxiliary Air Station Mayport: runway, hangars, palms, control tower (shots 20 s, 23 s, 27 s, 36 s)

Site plan (origin at the runway centreline where the missile lands; runway along x):

**Runway.**
- Size: 46 m wide, rendered 900 m long.
- Surface: concrete slabs 7.6 x 7.6 m. Joint lines are painted 4 px dark (#a39c8c) on #cfc8b8. 5 % of slabs are
  tinted ±4 % for a patchwork look; add tyre-skid streaks (#8f8a80, alpha 0.3) in the touchdown zone.
- Markings, white #f4f1e8:
  - threshold "piano keys": 8 stripes, each 1.8 x 30 m;
  - runway number **"23"** (Mayport's main runway runs 05/23), digits 6 m wide x 18 m long, slab serif, as a
    decal quad 0.01 above the surface;
  - centreline dashes 36 m long, 0.9 m wide, with 24 m gaps;
  - edge stripes 0.9 m wide;
  - touchdown-zone bars.
- Edge lights every 60 m, offset 3 m outside the edge:
  - post: a cylinder r 0.06 → 0.08, 0.4 tall;
  - globe: a lathe r 0.12, white with a #e8b830 tint, emissive 0.3;
  - the light ring gets a small rbox base.
- Grass verge: #7cb35a with painted mow stripes (alternating 4 m bands, ±5 % luma). Dry patches #b9b46a. Tufts and
  palmettos per 3.2. Runway distance signs at 300 m: rbox 1.5 x 1.2 x 0.25, black face with white digits, SOFT.

**Apron.**
- Asphalt #7b7770, 60 x 120 m, joining the runway via a taxiway (yellow centreline #e8b830, 0.3 m).
- Tie-down rings: torus r 0.12 every 6 m.
- 3 oil-stain decals.
- Yellow parking T marks.

**Hangars: two 1950s Navy arched hangars,** at (−80, 0, 70) and (−30, 0, 70), facing the runway.

| Part | Spec |
|---|---|
| Body | Extruded arch profile: half-ellipse a = 22 (half-width 22 → 44 m wide), b = 14 m rise on 3 m walls; depth 55 m. 24 profile segments, smooth normals (silhouette line only) |
| Roof | Corrugated: paint `panelTex` with ribs every 0.6 m (vertical along the arch) on #b9c0c6; 4 translucent skylight strips #e6eef2 along the arch |
| Front gable | Flat wall filling the arch, #e8e4da, crisp |
| Doors | 6 sliding leaves, each 7 x 9 m, inset 0.25, rbox MEDIUM r 0.08; each leaf has a 4 x 3 grid of window panes in the upper third (frames 0.12, glass #9fc6d8 with glints), vertical seams every 1.75 m, a 0.6 m bottom kick band #6c7884; door track rail along the top (box 44 x 0.3 x 0.4) |
| Sign | "U.S. NAVY · MAYPORT" as individual rbox letters (D6 silhouette): navy #24407a, cap 2.2 m, on the arch face above the doors. Also "NAAS MAYPORT" stencil 0.8 m on the side |
| Breakers | 3 roof ventilators (lathe mushrooms r 0.6, h 1.2) along the crown; a windsock mast on the left hangar corner (pole 8 m, sock: lathe cone r 0.45 → 0.2, length 2.4, orange #e8763a with 3 white bands, bending with the wind) |
| Side lean-to | Flat-roof annex 10 x 4 x 4 m along each side, CRISP, #e8e4da with 4 framed windows (D2) and a door with a steel awning |

**Control tower** at (40, 0, 85). It is the hero of the BG skyline and must be visible in 20 s and 36 s.

| Part | Spec |
|---|---|
| Shaft | rbox CRISP 4.2 x 18 x 4.2 m, #f2efe6; 3 recessed horizontal reveal bands (0.15 tall, inset 0.05) every 4.5 m; a vertical strip of 5 small windows (0.8 x 1.2) up one face with frames (D2); base: a 6 x 3.5 x 6 annex with door + canopy |
| Cab | Octagonal plan (cylinder with 8 sides, r 3.4), 3.2 tall, glass sloping **outwards 15°** (top r 3.8): glass panes #7fb8d0 with a top-to-bottom gradient (to #cfe6ee) and 1 glint per pane; mullions 0.14 wide #2e3440 at each of the 8 corners + a sill band 0.4 tall below the glass, #f2efe6 |
| Catwalk | Ring deck r 4.6, 0.2 thick, just below the cab, with a rail (stanchions 1.0 tall every 1.2 m, tube 0.06), #c9d3dc |
| Roof | Flat cap r 4.0, overhang D3, 0.35 thick, #24407a (navy roof band reads at distance) |
| Breakers | Rotating airport beacon (lathe drum r 0.4, h 0.6, half green #3fae6a, half clear, emissive 0.5); anemometer mast (pole 3 m + 3 cups on arms); 2 whip antennas 4 m (D5 r 0.05); a red obstruction light |
| Check pattern | The upper 2 m of the shaft gets a red / white check (#d8352f / #f2efe6, 0.7 m squares) as a period airfield marker; it also adds a hue family |

**Palms.** 5 groups (§3.4):
- 2 groups framing the tower base;
- 2 groups at the apron corners;
- 1 group close to camera in 20 s as an FG frame, at 3 m, so its fronds cross the top of the frame and are DOF-blurred.

Heights are 9-13 m. Never place one palm alone in the middle of the grass.

**Dressing.**
- Flagpole: 12 m lathe, gold ball on top, 48-star flag 3 x 1.6 m with cloth folds as in `bannerProp`.
- 2 fire-extinguisher carts: wheeled red cylinders r 0.25, h 1.0 on 2 wheels.
- A tow tractor: a low rbox 2.4 x 1.0 x 1.6 SOFT, yellow #e8b830, 4 fat wheels, steering wheel.
- 3 oil drums: lathes r 0.29, h 0.88, with 2 rolling-hoop ribs. One red #d8352f, one blue #3a6ea8, one yellow, with
  stencil text.
- Stacked chocks.
- A sawhorse barricade in white / red stripes.
- A "WELCOME TO NAAS MAYPORT" board on 2 posts at the apron gate: `signTex` slab, 3 x 1.2 m, with navy and gold trim.
- A row of white parked cars (1950s rounded rboxes 5 x 1.9 x 1.5 SOFT, with chrome bumpers) along the hangar side.

**Podium and welcome stand (23 s).**
- **Lectern:**
  - body: a tapered rbox (bottom 0.55 x 0.45, top 0.75 x 0.55, h 1.1), MEDIUM r 0.04;
  - wood: planks texture retinted to #b0703f, with an inset front panel frame 0.06 wide #8a5530 (D2);
  - slanted top: 15°, 0.06 thick, overhang 0.06 (D3);
  - a gold seal disc r 0.18 #d9b45a on the front.
- **Bunting:** a pleated half-fan, drapery across the front. Model it as 9 radial wedges with alternating 0.04 depth
  (crease lines), colour bands navy / white / red from the top.
- **Two 1950s microphones:** each a chrome lathe capsule (r 0.05, h 0.12, ribbed with 6 grooves) on a gooseneck
  (tube r 0.012 → 0.02).
- **Platform:** 4 x 2.4 x 0.4 m rbox MEDIUM, red, white and blue skirt with 0.3 m pleats.
- **Behind it:** a 2-post sign "U.S. POST OFFICE DEPARTMENT · FIRST OFFICIAL MISSILE MAIL" (`signTex` slab,
  3.6 x 0.9) and 2 flags on stands.
- **Around it:** 8-12 folding chairs (each: rbox seat 0.42 x 0.04 x 0.42, back 0.42 x 0.3, tube legs; olive
  #6f7a4a or grey).

### 4.4 Post office (shot 29 s)

This is a 1930s stripped-classical federal building, the typical Florida post office of 1959. It replaces the grey
box with flat windows.

| Part | Spec |
|---|---|
| Mass | 30 w x 11 h x 20 d, CRISP r 0.05, limestone #e8d9b5 (paint `stoneHD` with key "limestone", cols ["#ead9b6","#e3cfa8","#efe0c2"], ashlar 1.2 x 0.6 blocks) |
| Base plinth | 0.9 tall, overhang 0.12, granite #b8ab98 |
| Pilasters | 6 between 5 bays: rbox 0.9 w x 8 h x 0.25 proud, capitals as 2 stacked boxes (0.25 tall, +0.12 overhang each) |
| Windows | 5 bays x 2 floors: tall windows 2.0 x 3.2 (ground) / 2.0 x 2.2 (upper), frames 0.18 dark green #2f5a45 (period steel sash), 3 x 4 panes, glass gradient + glints, sills and lintel blocks (D2); green awnings with white stripes over ground-floor windows (extruded wedge, 0.9 deep, scalloped hem cut in 10 tabs) |
| Entrance | Central bay: 3.2 wide x 4.2 tall bronze double doors #8a6a3a with 6 panels each; transom grille (painted Art Deco eagle); 5 granite steps (each 0.17 x 0.32, extending 1.2 beyond the door width); 2 brass handrails |
| Frieze | "UNITED STATES POST OFFICE" as carved lettering: `signTex` slab, dark #6e5a46 on stone, cap 0.7 m, across the whole width at 9 m height, between two 0.2 m cornice bands |
| Cornice + parapet | Cornice overhang 0.45 (D3), parapet 1.0 tall with a 0.15 coping. **Breakers:** 2 flagpoles on the roof (48-star flag + Post Office Department flag), a rooftop clock (lathe disc r 0.9, `clockTex`) above the entrance |
| Lamps | 2 bronze lamp posts flanking the steps: lathe post 3.2 m, base r 0.25, lantern rbox 0.4 x 0.6 with warm glass #f6e0a0 (emissive 0.25) |
| Mailbox (1959 livery) | Street collection box: body rbox 0.46 w x 0.9 h x 0.5 d SOFT r 0.05 on 4 legs (0.35, box tube 0.04), **domed top** (half-cylinder r 0.23 along the depth); body **#24407a**, dome **#d8352f**, "U.S. MAIL" white slab, cap 0.08, on the front, eagle decal disc r 0.07 white; pull-down chute handle (box 0.3 x 0.04 x 0.05 chrome) on the front; collection-time plate (white 0.15 x 0.1). This replaces our blue sign-on-a-stick |
| Dressing | Hedge (`hedgeGeo`) along the base, palmettos, 2 palms framing (q 0), bike rack with a bicycle (tori + tube frame), newspaper box (rbox 0.45 x 0.9 x 0.4, yellow #e8b830, window), bench (3 slats + cast legs), a parked mail truck (4.5), litter bin, sidewalk with 1.5 m joints #d9d0bf and a kerb (0.15 tall, CRISP) — no grass touching the wall |

### 4.5 Mail truck (shots 32 s, 34 s)

The truck is a generic 1950s postal delivery van: cab-forward with a rounded nose. In 1955 the Post Office adopted
the red, white and blue livery. The truck also replaces the potatoes floating above it (the "sacks" in 32/34 s)
with real mail sacks inside and on the roof rack.

| Part | Spec |
|---|---|
| Overall | 5.0 L x 2.0 W x 2.45 H; wheelbase 3.0 |
| Body | One rbox 3.4 x 1.95 x 2.0 (cargo box), SOFT r **0.20**, flatBottom; cab rbox 1.6 x 1.95 x 1.75 SOFT r **0.30** (front top corner bigger: use per-axis radii 0.35 front / 0.2 elsewhere) |
| Hood / nose | Rounded nose: half-cylinder r 0.45 across the width, joined to the cab bottom at the front, + grille: rbox 1.1 x 0.5 x 0.06 chrome #c9d3dc with 9 horizontal slots (painted dark #2e3440, 3 px gaps) |
| Livery | Lower 0.9 m **navy #24407a**; upper **warm white #f2efe6**; a **red #d8352f belt stripe** 0.18 tall at the split, proud 0.02 (gets crease lines); roof white |
| Lettering | "U.S. MAIL" navy slab serif cap 0.35 on both box sides; "POST OFFICE DEPARTMENT" stencil 0.12 under it; eagle emblem disc r 0.3 (navy ring, white eagle, `signTex`) on the cab door; fleet number "5-1127" stencil on the rear and hood |
| Glass | Split windshield (2 panes 0.7 x 0.6, centre post 0.08), side door window 0.6 x 0.55, framed (D2), glass #7fb8d0 + glints; open sliding cab door shows the driver seat (rbox) and big steering wheel (torus r 0.22) |
| Wheels | Tyres: torus-ish lathe r **0.44**, width 0.28, rounded tread corners (radius 0.08) #2b2d33; white hubcaps (lathe dome r 0.2, #e8e4da) with a red centre dot; wheel arches cut as dark half-discs + a proud fender lip (half torus r 0.5, tube 0.05, body colour) |
| Jewellery | Round headlights (lathe r 0.12, chrome ring + #fff3c4 lens), 2 small amber parking lights, chrome front and rear bumpers (rbox 2.1 x 0.18 x 0.12 SOFT), side mirrors on L-arms (D5 0.04 rods), rear step plate, tail lights red, a roof rack rail (tube 0.04) with 2 sacks, licence plate "U.S. GOVT" |
| Mail sacks | Replace the brown floating lumps: each sack is a squashed sphere (scale 0.45, 0.6, 0.35) with the top pinched to a 0.12 neck + a tie ring (torus), canvas #c8b48a with darker stitched seam line + stencil "U.S. MAIL" in navy on the side; heaped sacks overlap and rest on each other/the ground with contact (no floating) |

### 4.6 Museum hall (shots 40 s, 43 s)

The setting is a Beaux-Arts atrium in the spirit of a national postal museum (generic, not traced). It replaces the
flat lilac and burnt-orange planes.

| Part | Spec |
|---|---|
| Room | 32 x 22 m floor, 15 m to the skylight |
| Walls | Warm stone **#e6d3b0** ashlar (`stoneHD` "museumStone"), 1.2 m base dado band #b8a07a; pilasters every 4 m (rbox 0.8 x 11 x 0.3, capitals as in 4.4) |
| Upper gallery | Balcony ring at 5.5 m: slab 2.5 deep, 0.5 thick fascia with 2 trim bands; balustrade = 0.9 tall row of lathe balusters (profile: r 0.06 → 0.1 bulge → 0.05, 0.75 tall, pitch 0.3) + 0.15 handrail #8a6a3a |
| Ceiling | Coffered skylight: grid of 2 x 2 m coffers (inset frames 0.25 wide, 0.3 deep, #efe3c8), glazed panes glowing **#fff4d6** (emissive 0.35) — this is the main light source and justifies warm interior light |
| Floor | Terrazzo #d9c9a8 with a geometric inlay: a 12 m compass-star / border pattern in #8f6b4b and #24407a (paint, 2048 px), brass divider lines 3 px #d9b45a |
| Hero display | Regulus on a 3-post cradle (the same missile geometry, markings intact), on a plinth: rbox 11 x 0.6 x 2.6 MEDIUM, dark walnut #6e4630 with a brass edge strip; rope barrier: 6 brass stanchions (lathe: base r 0.18, post r 0.03 → D5 0.04, 0.95 tall, ball top) + red velvet ropes (catenary tube r 0.03, #b8353a) |
| Placard | Angled reading plinth 0.9 x 1.0 x 0.5 with a `signTex` plate: "REGULUS I · MISSILE MAIL · JUNE 8, 1959" (navy on cream), replacing the black "1959" square |
| Other exhibits (BG dressing, generic postal history) | A hanging biplane mail plane silhouette (fuselage lathe 7 m, 2 wings 9 m span, red #d8352f + cream) on 3 cables from the skylight; a horse-drawn mail coach (box body rbox SOFT, 4 spoked wheels r 0.7 as torus + 12 cylinders), a row of 4 vintage mail boxes in different period colours (olive #6f7a4a, red/white/blue, blue), 2 glass display cases (rbox frames 0.05 #8a6a3a, glass transparent 0.25 with glints, stamps as tiny coloured rectangles inside) |
| Banners | 2-3 hanging vertical banners 1.6 x 6 m from the gallery: navy with gold border and "MOVING THE MAIL" / dates (use `bannerProp` cloth with new colours) |
| Visitors | Character cards are cast.ts business; leave 3 standing spots by the rope |

---

## 5. Implementation order (impact per hour)

1. **`rbox` + bevel classes**, then rebuild the truck, mailbox, podium and missile wings/fins with SOFT bevels and
   the livery and lettering. This fixes the "primitive" read on 5 shots (23, 29, 32, 34, 36 s).
2. **`signTex` + markings**:
   - "U.S. MAIL" on the missile and truck;
   - "317" on the sail;
   - the runway "23";
   - "UNITED STATES POST OFFICE";
   - the museum placard;
   - "U.S. NAVY · MAYPORT".

   Expect +1 hue family and a +20-40 region count per shot.
3. **Set dressing to the clutter budget (§3.2)**, BG first:
   - the coastline band;
   - the hangars and tower skyline;
   - the escort ship.

   Then the FG framing objects per shot. This is the biggest edge-density and empty-tile gain.
4. **`palm()` groups and ground tufts or palmettos.** Re-colour the grass and the runway.
5. **Submarine rebuild:**
   - hull #4a5868;
   - teak deck;
   - limber holes;
   - hangar ribs and dome door;
   - launcher I-beams;
   - railings.
6. **Museum rebuild.**

**Acceptance check:** re-run `SCR/look/work/world/measure.py` on new stills. Every shot must reach:
- edge ≥ 2.2 %;
- empty tiles ≤ 48 %;
- regions ≥ 230;
- hue families ≥ 5;
- ≥ 8 named objects.

The prop crops must reach ≥ 11 crossings per row and per column (the fridge and police-car level).
