# Character shading and integration: missile vs reference

Scope: how the scene lights the characters (tint, head and torso form shading, rim, contact and cast shadow, AO). The aim is to explain why ours look pasted on.
Scripts: `SCR/look/work/charshade/{meas.py,prof.py,grid.py}`. Crops: `refcrops.png`, `ourcrops.png`, `feet2.png`.

Method:
- Each head and torso was hand-boxed. Stats come from an inscribed ellipse (0.85 of the box for heads, 0.8 for torsos), with captions masked.
- Head pixels: luma Y > 0.6·p90 and S < 0.5. This drops ink, eyes and hair.
- Torso pixels: the dominant-chromaticity cluster.
- `lr` / `tb`: a plane fit Y = c0 + c1·u + c2·v over normalised coordinates u, v ∈ [-1, 1]; lr = 2·c1/c0 and tb = 2·c2/c0. tb < 0 means darker toward the bottom.
- Environment: a ring 0.8 W / 0.5 H around the character box.
- Lab a\*b\* are of the mean colour.

References: jar_empire 0.3/34, burglar 6.5/18 (two figures)/49, window 15/41.
Ours: missile 9, 13, 23 (two figures), 29, 36, 43.

## 1. Measured gap table

### 1a. Per shot

| shot | head hex | head Y | head S | head p5/p95 | head lr | torso lr | torso tb | torso p95/p5 | env Y | head a\*,b\* | env a\*,b\* |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ref jar34 night | #efd7f6 | .87 | .13 | .90 | −.02 | −.51 | +.04 | 1.68 | .29 | +14,−12 | +14,−31 |
| ref jar0.3 interior | #f5f7fa | .97 | .02 | .97 | −.01 | −.35 | +.05 | 1.67 | .47 | 0,−2 | +6,+2 |
| ref burg6.5 interior day | #f0ebf3 | .93 | .04 | .90 | +.02 | −.43 | −.04 | 1.55 | .61 | +3,−3 | +18,+16 |
| ref burg49 exterior day | #fbe9d5 | .93 | .15 | .91 | −.07 | −.42 | −.08 | 1.42 | .60 | +3,+12 | −7,+19 |
| ref burg18 cop | #fcf6f5 | .97 | .03 | .93 | +.03 | −.66 | +.05 | 1.80 | .89 | +2,+1 | +4,+10 |
| ref burg18 small | #f7f2f0 | .95 | .03 | .75 | +.02 | −.41 | −.01 | 1.50 | .86 | +1,+2 | −6,+20 |
| ref win41 night, side key | #e5cdd2 | .83 | .12 | .62 | **+1.19** | +.36 | −.79 | 1.66 | .19 | +9,+1 | +4,−9 |
| ref win15 casino warm | #faf3ea | .96 | .06 | .77 | −.08 | −.19 | −.04 | 1.53 | .26 | +1,+5 | +8,+11 |
| ours 9 deck | #ecd7c5 | .86 | .17 | .72 | +.08 | +.31 | **−.16** | 1.38 | .48 | +4,+11 | +2,−11 |
| ours 13 deck | #f0dac5 | .87 | .18 | .84 | +.11 | +.28 | **−.27** | 1.40 | .39 | +4,+13 | +6,−18 |
| ours 23 sailor | #e6cdba | .82 | .19 | .78 | +.17 | +.31 | **−.20** | 1.38 | .55 | +6,+13 | −1,−11 |
| ours 23 postmaster | #edd8c6 | .86 | .17 | .81 | +.13 | – | – | – | .83 | +4,+11 | −2,−9 |
| ours 29 lawn | #e3c7b4 | .80 | .21 | .70 | +.30 | +.41 | **−.25** | 1.50 | .52 | +7,+13 | −15,+12 |
| ours 36 runway | #eac3a1 | .79 | .31 | .76 | +.21 | +.53 | **−.36** | 1.63 | .52 | +9,+22 | −25,+35 |
| ours 43 museum (warm) | #f8bf82 | .78 | **.48** | .91 | +.10 | +.64 | **−.33** | 1.87 | .59 | +13,+38 | +20,+45 |

### 1b. Summary

| metric | reference | ours | gap |
|---|---|---|---|
| head luma Y (lit plateau) | **.93 median** (.83–.97); stays .83–.87 even at night (head/env 3–4.3×) | .83 median (.78–.87) | heads 0.10 too dark |
| head saturation | **.06 median** (.02–.15) | .19 median (.17–.48) | 3× too saturated (peach base) |
| head tint vs scene: fit head b\* = k·env b\* + c | **k = 0.30, c = −0.9** (white base, picks up 30 % of the scene's chroma) | **k = 0.34, c = +15.2** | coupling is right; the **+15 b\* peach offset** is the problem. Blue-deck heads stay warm (b\* +13 against env −18) |
| warm-scene head | casino #faf3ea, S .06 | museum #f8bf82, S .48 (orange) | tint on peach goes orange |
| head luma profile across the head | flat plateau (±3 %) over ~75 % of the width; falls only in the last ~12 % on the far side to **.72–.87×** (jar34 87→76→62) | a linear ramp across the whole head, e.g. ours13 57→76→85 … 89 | ours is a sphere ramp, not a crescent |
| head plane slope lr | median **|.02|** (≤.08 except the hard side-key night shot, 1.19) | **+.08…+.30** (median .15) | 7× too much broad head gradient |
| head p5/p95 | .90 median | .77 median | |
| torso profile (horizontal, mid height) | **rim** just inside the lit edge, +25–60 % (median ~+30 %) over the plateau, **5–8 % of body width** wide → **plateau** ±3 % across the middle ~50 % → far ~30 % falls to **.60–.70** | linear ramp edge to edge (lit→far .73, .53, .50), **no rim** | |
| torso lr (magnitude) | .19–.66 (median .42) | .28–.64 (median .36) | the amount is OK, the shape is wrong |
| torso vertical tb | **−.08…+.05** (≈0) | **−.16…−.36** | ours darken toward the hem (fake top light); refs do not |
| torso p95/p5 | 1.42–1.80 (median 1.6) | 1.38–1.87 (median 1.45) | OK |
| head:torso luma | 1.8–4.6× (white head, saturated mid-dark clothes) | ≈1.0 for white sailors, 1.4–3 coloured | white-on-white sailors flatten the read (design) |
| contact pool under the feet, core Y ratio | .52–.74 where present (lighting.md); many close shots show **none** (burglar 9.5 floor: legs just touch) | **.42–.45** (ours 9, 23); **.96 = none** on the lawn (29) | ~1.5× too dark, inconsistent |
| contact pool colour, ratio per channel (R,G,B) | ~neutral, slightly warm/violet: (.54, .48, .49) day ratios (lighting.md) | **(.44, .44, .56)**, (.39, .40, .60): saturated blue | blue cast reads as a sticker |
| contact pool width | ≈0.5 W × 0.06 W blob (characters.md) | **1.0–1.3× body width** (68–99 px at 540 w), a hard dense pool | ~2× too wide |
| contact edge softness | 3–12 px @720 (4.5–18 @1080) | dense core with a 3–5 px edge | too hard |
| AO on characters | none (contact = ink + blob) | none | OK |

## 2. Why ours read pasted on (ranked)

1. **Peach heads ignore the scene.**
   - Head b\* sits at +11…+38 whatever the environment, a +15 offset against the reference's ≈0.
   - Under a blue deck the face stays warm. Under the warm museum light it goes orange (S .48 against the casino reference at .06).
   - The references use a near-white head as a light probe: 30 % of the scene's a\*b\* shows on it, and nothing else does. This one property says "lit by this world".
2. **The form shading has the wrong shape.**
   - Ours: a linear ramp across the whole head (lr ~.15) and across the whole torso, plus a strong top-to-bottom darkening (tb −.16…−.36). The cards read as gradient-filled stickers.
   - Reference heads: flat and bright, with a narrow far-edge crescent.
   - Reference torsos: a lit-edge **rim**, a flat plateau and a far-side falloff, with no vertical gradient.
3. **No rim or edge light outside golden.**
   - Every reference torso has a 5–8 %-wide bright band (+25–60 %) inside the lit edge, in day, night and interior shots. It is the light wrapping the silhouette.
   - Ours only has a 2 px warm rim, at golden only.
4. **The contact shadow is too dark, too blue, too wide and too hard**, and it is missing on grass.
   - Core .42–.45 Y ratio, B/R ratio 1.3–1.5, width 1–1.3 W.
   - The reference blob is .52–.74, near-neutral, about 0.5 W, soft, or absent in close shots.
5. **Heads are 0.1 too dark** (.83 against .93). With the peach base they read as a dull, grey-ish skin, not lit white.

## 3. Implementation spec (templates/bridge)

**Principle:** `toon.ts` paints the form (it is cached per 45° light key). `cardshade.ts` does only scene tint, brightness, the shadow floor and the rim. This stops the double gradient (shader ramp × painted ramp) that produced the linear ramps measured above.

### 3.1 `toon.ts`: head base and crescent
- Skin constant: base **`#fbf7f2`** (L\* 97.5, b\* +2.5). Shadow = `mul(base, SH_WHITE)` with `SH_WHITE = [0.92, 0.90, 0.96]`, which gives about `#e7deea`.
  - If a story character must keep a skin tone, cap it at **`#fbeadb`** (b\* ≤ +8, S ≤ .12).
  - Replace `SH_SKIN` use on heads with `SH_WHITE`.
- `Pen.shadedFill(...)` for heads: call it with `shift = 0.30`, `r0 = 1.10`, `r1 = 1.30`. This makes the plateau ±3 % over ~75 % of the width. The far-edge minimum lands at ×0.85 (the measured ref range is .72–.87).
  - Acceptance on a still: head plane |lr| ≤ .08, p5/p95 ≥ .88.

### 3.2 `toon.ts`: torso `gradFill` → plateau + falloff + lit rim
- Light vector for torsos: horizontal only, `dx = Math.sign(Math.cos(light)) || 1, dy = 0`. This removes the measured tb −.16…−.36; the target is |tb| ≤ .08.
- Gradient stops from the lit edge (0) to the far edge (1):

  | stop | colour |
  |---|---|
  | 0 | `mix(base, "#ffffff", 0.22)` (the rim) |
  | 0.07 | `mix(base, "#ffffff", 0.22)` |
  | 0.12 | `base` |
  | 0.62 | `base` (the plateau) |
  | 1.0 | `mul(base, [0.64, 0.66, 0.74])` (keep `SH_CLOTH`) |

  - On the measured scale this gives a rim of about +30 % luma over the plateau (refs +25–60 %), 5–8 % of the body width, and a far edge at ×0.65 (refs .60–.70).
- The `p.rimLight` described in characters.md (rim on the *shadow* side) is **contradicted** by these frames. In all 7 reference torsos the rim is on the *lit* side, so skip the shadow-side rim.

### 3.3 `cardshade.ts`: stop the shader ramp, keep tint, brightness and rim
- `GRAD_K = 0` and `GRAD_KB = 0` (the toon paint carries the form). Delete `lift`, keep `top` (head-only, 5 %).
  - Alternative if per-frame light matters more than caching: keep the shader, set toon to flat, and use `dark = smoothstep(0.55, 0.95, -t) * head + smoothstep(0.24, 1.0, -t) * (1.0 - head)` with g_head = .15 and g_body = .35. Never use both.
- Tint: replace the preset `uCharTint` source with a per-shot **environment tint**:
  - In `world.ts` per shot: `env = mean(linear(L.hor), linear(L.fog), linear(L.ground))`, or a per-shot `charEnv?: string` override in `story.ts` SHOTS for interiors and night.
  - Then `uCharTint = normLuma(mix(1, env / luma(env), 0.30))`.
  - Set `uTintK = 1.0` (`TINT_K` 0.55 → 1.0). Its strength now lives in the 0.30 above, the measured k.
  - Acceptance: head b\* ≈ 0.3·env b\* ± 4, head a\* ≈ 0.3·env a\* + 2 ± 4, head S ≤ .15 everywhere, head C\* ≤ 15.
  - Night targets: lavender head about `#efd7f6` (+14, −12) on a blue scene (env a\*b\* +14, −31). Warm interior: `#faf3ea`.
- Brightness: with the white base, set `uGain` so the lit head plateau lands at Y **.93–.96** sRGB after grade and tone-map, never above .97. Night heads ≥ .83.
  - Today the uGain is 1.03 and heads sit at .83 because of peach × tint. Expect uGain ≈ 1.0 with the white base; calibrate on one day still and one night still.
  - Keep `uCharShade` (.86 / .88) as the cast-shadow floor.
- Rim for all presets, not golden only: in the existing USE_MAP block, drop the `warm` gate for a **multiplicative** lit-edge rim.
  - Code: `float rimK = edge(sample at 6 % of torso width toward the sun: duv = 0.018 in u) * torso * 0.25;` then `outgoingLight *= 1.0 + rimK;` (heads: × 0.04 only).
  - Keep the additive warm rim (0.95, 0.52, 0.16) for golden.
  - Skip this if the toon rim from 3.2 is used: one or the other.

### 3.4 `cast.ts` / `toon.ts`: contact and tail shadows
- `CONTACT.day = [0.62, 0.60, 0.66]`, `CONTACT.golden = [0.58, 0.54, 0.66]` (linear multiply at the core).
  - Target on-screen core Y ratio **.62–.70** (now .42–.45) and B/R ≤ 1.12 (now 1.3–1.5).
- In `blob()`: contact `w: 0.52*sc → 0.34*sc` and `h: 0.4*sc → 0.12*sc`. Measured target: pool width 0.6–0.8 × body width (now 1.0–1.3), depth ≈0.25 W.
- In `fxContact`: soften the ramp to `[[0,0],[0.25,0.05],[0.5,0.35],[0.75,0.75],[1,1]]` and draw with `g.filter = "blur(4px)"`. The edge should be 4.5–18 px at 1080 w.
- Day `TAIL = [0.42, 0.44, 0.62]` → **`[0.72, 0.70, 0.78]`**, with the fxShadow blur at 9 px kept. The tail must stay lighter than the contact core.
- Lawn and grass: shot 29 measured no visible pool (ratio .96). Make sure `blob()` is called for every standing placement, including side-view walkers and the museum/lawn figures. Raise y to `+0.03` on grass so tufts do not z-fight it.

### 3.5 Not this topic, but they affect the read
- White sailors (white torso under a white head) have a head:torso luma ratio of 1.0 against 1.8–4.6 in the refs. Give the sailor torso a mid tone (Y .45–.6), e.g. navy-trimmed `#d9dde6` is too light; the references put the colour on the clothes. Coordinate with the characters report.
- 45° light quantisation in `light2D` is fine, since refs read light direction only coarsely.

### Acceptance checklist (rerun `work/charshade/meas.py` on new stills)
- Head: Y ≥ .90 (day) / ≥ .83 (night), S ≤ .15, |lr| ≤ .08, p5/p95 ≥ .88, b\* within ±4 of 0.3·env b\*.
- Torso: |tb| ≤ .08; lit-edge rim +20–40 % over 5–8 % of width; far edge .60–.70.
- Contact: core ratio .62–.70, B/R ≤ 1.12, width ≤ 0.8 W, present in every standing shot.
