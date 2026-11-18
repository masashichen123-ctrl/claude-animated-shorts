# Verify r1: rebuilt missile short (m1) vs the premium references

Independent art-direction check of `out/missile/m1/s_<frame>.png` (18 stills plus `sheet.jpg`) against the reference frames (jar_empire, burglar, short*). I also compared the original cheap version (`look/ours/*.png`).

Working images are in `SCR/verify/`:
- side-by-sides: `a.jpg`, `b.jpg`, `c.jpg`, `d.jpg`
- zoomed crops: `z.jpg`
- original version: `orig.jpg`

SCR is the session scratchpad.

## Verdict

The rebuild is a large step up from the original. It now has:
- painted textures on the missile, deck, brick and concrete
- ink outlines on the world
- warm/cool two-tone light
- real DOF on the medium shots
- a mood arc from morning to day, golden, dusk and the gallery

Shots 2 (148), 9a (690), 10 (816), 11 (889) and 12 (992) are within reach of the reference. Three things still pull the film well below the reference:
1. **The ending is broken.** Shots 14-15 are blown out into a milky cream veil.
2. **Day exteriors are under-saturated and over-bright.** Shots 7-10 come out as pale cream concrete under a pale sky.
3. **Several shots have staging bugs:**
   - a railing post through the face (418)
   - a giant lectern (720)
   - ink speed-line bars over a blown-out missile (1121)
   - a hook with no character and a mushy haze sky (0, 60)

## Scores (out of 10, reference = 10)

| Area | Score | Why |
|---|---|---|
| Colour | 6.0 | Mood arc and golden/dusk shots are good. Day shots median HSV-S .23-.28 against ref .36-.44. Museum S .20-.27 and cream-on-cream. The morning sky is one peach smear. |
| Lighting | 5.0 | Two-tone and cast shadows read well on 690/816/992. The museum is grossly overexposed: median Y' .71-.75, black point p2 .22-.41 against ref .10-.13, 4-5 % of pixels clipped. 1121's missile is burned to white by the flame glow. |
| Ink | 6.0 | Outlines are present on the world and the cards. They are sparse on mid and far detail (ink.md: about 2.7x fewer lines than the ref). The speed-line fx are crude 5-8 px black bars. |
| Textures | 6.5 | Missile panels, deck planks, brick, sacks and concrete tiles are good. The sea in 0/60/535 is flat teal with white dashes, and its horizon is mush. The museum walls and floor drown in light, so their texture can't be seen. |
| Characters | 6.0 | Clean, expressive and on-model. Heads are still near-perfect circles. Bodies are thin stick limbs with flat fills and little card shading compared with the ref (bean heads, cloth shading, volume). The hook has no character at all. |
| Depth | 6.0 | DOF on MS/CU (720, 816, 148) is good. The wides (616, 0, 311) have no foreground layer. The morning haze flattens the top 30 % of sea frames into a featureless band. |
| Composition | 5.5 | Good: 148, 690, 816, 992. Bad: 418 (post in the face), 720 (lectern fills the lower 45 %), 1121 (subject hidden), 0/60 (empty sea, subject small in the bottom-left), 616 (flat, distant, no figure). |
| Overall polish | 5.5 | Middle of the film about 7. The ending (14-15) about 3. The hook about 4.5. The first and last impressions drag the whole film down. |

### Measurements (540x960, Y' = Rec.709 luma of sRGB)

Reference medians (caption band masked):
- jar_empire: Y'med .35, p2 .10, p98 .91, sat .44, clip .4 %
- burglar: Y'med .61, p2 .13, p98 .95, sat .36, clip 1.7 %

| frame | Y'med | p2 | p98 | sat | clip>.95 |
|---|---|---|---|---|---|
| 0 | .39 | .24 | .88 | .66 | 0 |
| 311 | .55 | .08 | .88 | .35 | 0 |
| 418 | .58 | .07 | .92 | .27 | 0 |
| 616 | .69 | .37 | .89 | **.23** | 0 |
| 690 | .69 | .07 | .93 | .27 | .7 % |
| 720 | .55 | .07 | .95 | .24 | 3.1 % |
| 816 | .68 | .08 | .93 | .28 | 1.5 % |
| 1121 | .40 | .06 | .79 | .45 | .2 % |
| 1228 | **.71** | **.22** | .96 | .27 | **3.9 %** |
| 1309 | **.75** | **.41** | .96 | **.20** | **4.2 %** |
| 1351 | **.75** | **.24** | .96 | .25 | **4.8 %** |

## Fix list (most impactful first)

1. **Museum overexposure and milky veil (1228, 1309, 1351). Owner: light (world.ts, lights.ts) and post (Missile.tsx).**
   - **Confirmed.** Everything is cream-on-cream. The black point is lifted to .24-.41, and a uniform additive veil sits over the frame. The "dim violet hall" that `lights.ts` describes never appears.
   - **Cause:**
     - cream albedos everywhere:
       - walls: ashlar `#e6d3b0`
       - ceiling: `#f4ead8`
       - gallery slabs and balusters: `#efe3c8`
     - a 7x7 grid of emissive skylight panes (`glow("#fff4d6", 1.25)`), plus window glow at 1.08
     - `sunI 2.4` at `el 78`, with `prac 2.0`
     - five lamps at `I 70` with 2.4 m halos
     - an exhibit spot at `I 2200`
     - bloom: `bloomI .9`, `bloomR .75` on the MAX-channel threshold 1.45. The lit floor and missile cross the threshold, so the whole frame blooms, and that is the veil.
   - **Fix, lights.ts `LIGHTS.gallery`:**
     - `sunI 2.4 → 0.9`
     - `lit [0.86,.75,.6] → [0.7,0.6,0.5]`
     - `prac 2.0 → 1.0`
     - `hemiI .3 → .18`
     - `bloomI .9 → .35`
     - `bloomR .75 → .5`
   - **Fix, world.ts:**
     - lamps `I 70 → 25`, `halo 2.4 → 1.2`
     - exhibit spot `I 2200 → 900`
     - plaque spot `600 → 250`
     - goal: a pool of light on the missile with the hall falling off around it
   - **Fix, Missile.tsx:** for gallery, raise `BLOOM_T` to about 2.0 (add a per-light threshold), so only the skylight, bulbs and halos bloom.
   - **Fix, sets (build.ts):**
     - Darken and colour the hall:
       - walls `#e6d3b0 → #a88a6a` (or a deep teal/navy plaster, e.g. `#3d5a6e`, above the dado)
       - ceiling `→ #c9b89a`
       - gallery `#efe3c8 → #cbb592`
     - Lay a red carpet runner (`#8c2b35`) from the camera to the plinth.
     - Darken the terrazzo by about 35 %.
     - Skylight glow `1.25 → 1.05`.
   - **Targets:** Y'med .40-.50, p2 ≤ .10, clip < 1 %, sat ≥ .35.

2. **Day exteriors pale and washed (616, 690, 720, 816; also 480). Owner: light (lights.ts) and sets (paint.ts).**
   - Saturation is .23-.28 against ref .36-.44, and Y'med is about .69.
   - **Fix, lights.ts `LIGHTS.day`:**
     - `lit [1.6,1.43,1.14] → [1.38,1.24,1.0]`
     - `hemiI .55 → .4`
     - `LOOK.day.sat 1.0 → 1.12`
   - **Fix, paint.ts / build.ts:**
     - Runway concrete: drop it to a mid-grey-warm `#a49a8a`.
     - Add colour to the set: painted yellow taxi lines, darker expansion joints, an orange/white checker water-tower or hangar trim, green grass bands.
   - **Fix, grade.ts:** `GRADE_DAY2.sat` mids `1.0 → 1.08`.
   - **Target:** Y'med about .55.

3. **Shot 5b, railing post through the sailor's face (418). Owner: cam (story.ts) and sets (build.ts).**
   - **Confirmed.** The ball-cap stanchion sits dead centre on his chin and mouth.
   - **Cause:** the stanchion at x = -18, z = +1.55 lies between the lens and `SAILOR5 [-16.6, 2, 1.25]`. With `F5b az 100`, the camera sits on the -x side, just outboard of the rail.
   - **Fix, story.ts:**
     - `F5b.az 100 → 76`, which puts the camera inboard of the rail line so the rail falls behind and to the right
     - or keep the az and move `SAILOR5` to `[-16.9, 2, 0.8]`
   - **Belt and braces, build.ts:** in the rail loop, skip the starboard post at x = -18 (`if (s > 0 && x === -18) continue`). It is not visible in shot 4.

4. **Shot 13b, heavy black speed lines and a burned-out missile (1121). Owner: char (cast.ts, toon.ts fxSpeed) and post (lights/Missile.tsx).**
   - **Confirmed.** Six 5-8 px INK bars are drawn across the missile body. The missile flies away from the lens, so the projected direction is short and the 7 m card covers the airframe. The flame glow then burns the airframe to white/yellow, so the missile can't be read.
   - **Fix, cast.ts:**
     - drop `id === 13` from the speed-fx condition
     - or, when `|projected dir| < 0.5`, skip the fx; otherwise offset the card behind the tail by `-4.5` (not `-2.2`)
   - **Fix, toon.ts `fxSpeed`:**
     - stroke `5+3j → 2+1.5j`
     - 4 lines, not 6
     - colour: use a translucent white (`rgba(255,255,255,.7)`) on dark/dusk skies instead of INK
   - **Fix, world.ts `practicals` (flame):**
     - in shot 13, flame halo `7*flame → 3*flame`, `hk 1.6 → 1.0`
     - flame scale in cast.ts `2.6*flame+0.6 → 1.6*flame+0.4`
   - **Target:** the cream body with red bands stays readable, and the glow stays behind the tail.

5. **Shot 1 hook: no character, smeary sky (0, 60, also 84). Owner: cam (story.ts), char (cast.ts) and light (lights.ts/world.ts).**
   - **Confirmed.** These are empty sea chases. The missile sits small in the lower-left. The top 30 % is a featureless peach blur (haze at `max .8` × `HAZE_K.sea 3.2`), and the coast and lighthouse are invisible. The thick black speed bars read as scratches.
   - **Every reference hook opens on a character.** Fix:
     - add a character beat in the first 56 f. Example: a sailor or pilot card riding astride or clinging to the missile with a mail sack, letters streaming.
     - or a CU of the postmaster card in the FG, with the missile streaking behind at the 1/3 line
   - **Fix, story.ts S1a:**
     - pitch `23 → 12`, so the horizon sits at about 22 % from the top
     - missile framed at 40-50 % of the width
   - **Fix, lights.ts `morning.haze`:**
     - `max .8 → .5`
     - `len 160 → 220`
     - `HAZE_K.sea 3.2 → 2.2`
   - **Fix, world.ts:** force-show 2-3 clouds in the top band for shot 1, and raise `LOOK.morning.skyTex .06 → .09`.
   - **Fix, cast.ts:** drop speed lines in 1 (same as #4).
   - **Also:** the same smear is at the top of 311. Apply the haze fix to subdeck too: `HAZE_K.subdeck 2.4 → 1.6`.

6. **Shot 9b, lectern too big (720). Owner: cam (story.ts).**
   - **Confirmed.** The lectern and its gold seal fill the bottom 45 % at fov 30, pitch 6. The face is squeezed into the top third, and the head is cut by the frame top.
   - **Fix:** `F9b = { q 0.22 → 0.18, top 0.30 → 0.24, pitch 6 → 11, fov 30 → 34, az 200 → 206 }`. This puts the lectern top at about 70-75 % of the height, with only its slanted lid and mics in frame.
   - **Optional:** lower the punch from 0.006 to 0.004.

7. **Character cards: flat, circular heads, weak volume (all character shots). Owner: char (toon.ts, cardshade.ts).**
   - **Heads:**
     - squash to an egg/bean: `0.92` width-to-height
     - a 4-6 % wider jaw on the adult males
     - a slight brow flattening
   - **Bodies:**
     - add a 10-12 % darker cloth shade band on the side away from the key (cardshade `bodyGrad .2 → .32`)
     - put a fold/seam line on the shirts
     - thicken the leg strokes about 1.3x for the adults
   - The reference cards read as volumes; ours read as stickers.

8. **Ink density on the world (all, especially 616, 1228, 535). Owner: post (ink.ts) and sets (build.ts).**
   - **Fix, ink.ts:** raise the crease/normal-edge sensitivity, so panel seams, tile joints and set-dressing outlines get lines. Thin lines (≤3 px at 1080) are about 4x too rare.
   - **Fix, ink.ts:** keep the depth-faded far lines at no less than 0.45 opacity (not 0), so the hangars in 616 and the museum gallery keep their drawing.

9. **Shot 8 wide (616) and shot 3/7 sea wides: composition with no FG and no figure. Owner: cam (story.ts) and sets (build.ts).**
   - **Fix, 616:** add a FG layer: a palm frond or a signal flagpole cutting one edge, and a ground-crew card waving bats on the left third.
   - **Fix, sea wides (212, 535):** add an FG element, e.g. a buoy or gull in focus near the lens (`cInf 0 → 6`).
   - **Fix, sea texture (paint.ts):** add darker wave-trough bands and fewer, larger crest glints. Right now it is a uniform white-dash scatter.

10. **Museum composition and texture (1228, 1351). Owner: sets (build.ts, paint.ts) and cam (story.ts).**
    - After #1, the hall needs targeted colour, the way the references use red drapes and gold:
      - red/navy banners lit by their own small spots
      - warm pools on the floor under each pendant
      - a navy sign band
    - **Fix, S14a:**
      - pitch `17 → 12`
      - put a visitor card large in the FG left third (the shot currently reads as an empty floor in its lower 40 %)
    - **Fix, 1351:** the crane-out end frame should land on the missile at 50-60 % of the width, not as a small object far away. Change the final orbit to radius `13.5 → 10`.

### Smaller notes
- 418: the hat crown on the sailor clips into the frame top under the punch. Set `top .28 → .31`.
- 480 (launch): the sky is pale lavender and the launcher is tiny on the bottom edge. Give the smoke column more frame (fov 56 → 48).
- 148 (post office) and 992 (golden truck) are the strongest frames and closest to the reference. Use them as the bar.
- The grain toggle is off. The references have a light texture and grain; consider `grain: true` at a low amount once the exposure is fixed.
