# Verify r2: missile short (m2) vs the premium references

For each frame I compared the round-1 still (`out/missile/m1/s_<f>.png`) with the round-2 still (`out/missile/m2/s_<f>.png`). For 212, 535, 616 and 889 I used `fix_<f>.png`.

Working images are in the scratchpad `v2/`:
- side-by-sides, m1 on top and m2 below: `g0`–`g4.jpg`
- zoomed crops: `z.jpg`
- against the references: `ref.jpg`

No renders were made.

## Verdict

Round 2 fixes the two biggest problems from round 1:
- **The museum ending.** The cream veil is gone. Y'med was .71-.75 and is now .21-.38. p2 is now .03-.06 and clipping is 0 %. There is a red runner, brass, a banner and a navy sign band, and 1351 lands the missile at about 50 % width. It now sits next to the burglar and jar_empire interiors.
- **The hook.** Shot 1 now opens on the sailor riding the missile, waving a letter. There are clouds in the top band, and the black speed bars are gone.

Other round-1 issues are also fixed:
- **418 post.** The railing post no longer sits through the sailor's face.
- **1121.** The missile now reads: cream and red, with a contained flame.
- **Day saturation.** 720 went from .24 to .38, 816 from .28 to .47 and 616 from .23 to .36. Clipping is gone.

148, 992, 816 and 1351 are now at reference level.

What's left is mainly staging and composition in the middle act, plus one new intersection bug in the museum.

## Scores (out of 10, reference = 10)

| Area | r1 | r2 | Note |
|---|---|---|---|
| Colour | 6.0 | 7.5 | Mood arc intact, museum now warm/dark with red-gold accents. The launch frame (480) is still pale lavender, sat .25. |
| Lighting | 5.0 | 7.5 | Museum pools of light read well. 1121 is fixed. 616 and 480 are still flat and over-lit (p2 .35/.20). |
| Ink | 6.0 | 6.5 | World lines are slightly denser, and the speed-line bars are gone. Mid and far detail is still lighter than the ref. |
| Textures | 6.5 | 7.0 | The museum terrazzo, carpet and wall texture are now visible. The sea is still a white-dash scatter. |
| Characters | 6.0 | 6.5 | The hook rider and the museum visitors add life. Heads are still near-perfect circles, and the cloth has little shade. |
| Depth | 6.0 | 7.0 | Good FG layers in 816 (sack), 148 (paper stack) and 1228 (rope). The wides 616/640/889 still have no FG. |
| Composition | 5.5 | 6.5 | 0/60/110/418/1351 are much better. 720, 480, 616/640 and 889 are still weak, and 1228 has a new bug. |
| Overall polish | 5.5 | 7.0 | The first and last impressions now hold up. The middle act (480-720) is the weakest stretch. |

### Measurements (Y' median / p2 / p98 / sat / clip%)

| frame | m1 | m2 |
|---|---|---|
| 0 | .39/.24/.88/.66/0 | .65/.11/.89/.43/0 |
| 480 | .63/.21/.88/.25/.1 | **.64/.20/.88/.25/.1** (unchanged) |
| 616 | .69/.37/.89/.23/0 | .56/**.35**/.89/.36/0 |
| 720 | .55/.07/.95/.24/3.1 | .46/.07/.94/.38/.7 |
| 816 | .68/.08/.93/.28/1.5 | .55/.07/.93/.47/.2 |
| 1228 | .71/.22/.96/.27/3.9 | .21/.03/.89/.44/0 |
| 1309 | .75/.41/.96/.20/4.2 | .38/.06/.87/.38/0 |
| 1351 | .75/.24/.96/.25/4.8 | .36/.05/.87/.40/0 |

## Remaining defects (by impact)

1. **BLOCKER: velvet rope cuts through the visitor's head (1228, shot 14a, frames about 1190-1267).**
   - **Owner:** cam/sets, in story.ts FG-kit table line 479 (`velvet_rope`, `pos [0.9,-1.1,2.8]`, `space: "cam"`).
   - **Problem:** the camera-space rope rises from bottom-right and crosses the woman's bun and forehead at about y = 0.55 of the frame. It is the same class of bug as round 1's post through the face, in the closing shot.
   - **Fix:** drop the kit to `pos [1.1,-1.55,2.6]`, so the rope sags below her shoulders and only the stanchion cuts the right edge.
   - **Alternative fix:** move the visitor in cast.ts about 0.6 m left, so her head clears the rope's arc.
   - **Check:** the rope sits under every head across the shot's whole orbit (170 to 166.5).

2. **MAJOR: shot 9b lectern still dominates (720).**
   - **Owner:** cam, story.ts:357 `F9b`.
   - **Problem:** the head is no longer cut, but the lectern and seal still fill the lower 50 %. The PMG reads as a small head behind a box.
   - **Fix:** `q .18 → .26`, `top .24 → .20`, `pitch 11 → 16`, `fov 34 → 30`. The lectern lid should fall at about 75 % of the height, with the seal mostly out of frame.

3. **MAJOR: launch shot (480) is unchanged from r1.**
   - **Owner:** cam (story.ts:329) and light.
   - **Problem:** pale lavender sky (sat .25, p2 .20). The launcher and missile are a thin strip near the lower third, the missile nose is cropped at the right edge, and there is no figure. It's the dramatic beat and it reads as a postcard.
   - **Fix:** `fov 56 → 46` and aim the look 1.5 m lower, so the launcher fills about 45 % of the width.
   - **Fix:** deepen the sky to warm orange-to-blue (raise saturation on this shot's look by about 1.15).
   - **Fix:** add a deck-crew card in the FG left third, with an arm up or ears covered.

4. **MAJOR: Mayport wides (616, 640): empty lower half, no figure.**
   - **Owner:** cam (story.ts S8) and sets.
   - **Problem:**
     - The props were cleaned up (good), and the 640 flag, trolley and sacks help.
     - The bottom 45 % is still blank concrete, and the black point is lifted (p2 .35, haze).
     - There is a white strip along the bottom edge.
   - **Fix:** pitch down about 6° (or raise the camera) so the runway plus missile sit on the lower third.
   - **Fix:** put a ground-crew card at about 1/3 width in the FG.
   - **Fix:** cut the airport haze (`HAZE_K`) for this set by about 35 % so the hangar darks reach p2 ≤ .15.

5. **MAJOR: dark shadow slabs on the sea (212, 535).**
   - **Owner:** light/world (shadow receive on the water material).
   - **Problem:** the sub and missile cast hard, opaque blue-black diagonal shapes on the water. In 535 the shadow blob sits far from the missile and reads as a hole or rock, not a shadow. 212 also has a hard light-streak line at the bottom.
   - **Fix:** turn shadow receive off for the sea (or multiply it at 0.25 strength).
   - **Alternative fix:** use only a soft contact blob under the hull.
   - **Also:** the peach haze band still flattens the top 25 % of 212/311. Use `HAZE_K.sea/subdeck` about −30 %.

6. **MAJOR: shot 11 (889) composition.**
   - **Owner:** cam (story.ts S11).
   - **Problem:** after the prop removal, the kid stands in the middle with the lower 40 % as flat grey road and curb. The crashing missile is cropped off the top-left.
   - **Fix:** tilt down and in. Put the kid's feet at about 85 % of the height and the head at 45 %, with the missile tail and the impact on the upper third.

7. **MINOR: the 148 FG paper stack is a large, unreadable cream blur over the lower-left 35 %.**
   - **Owner:** story.ts FG kit.
   - **Fix:** shrink it about 30 % and push it further left, so only an edge shows. The frame is otherwise the best in the film.

8. **MINOR: character heads are still perfect circles, and the cloth is flat (all character shots).**
   - **Owner:** toon.ts / cardshade.ts.
   - **Fix:** carry over r1 #7 (egg heads 0.92 w/h, cloth shade band `bodyGrad → .32`).

9. **MINOR: stray sparkle star floating beside the plinth (1309).**
   - **Owner:** cast.ts:576.
   - **Problem:** the sparkle lands mid-air between the post and the visitor, so it reads as a glitch.
   - **Fix:** move it onto the missile nose, or drop it.

10. **MINOR: hook geometry tangencies.**
    - **Owner:** cast.ts.
    - **Problem:**
      - In frame 0 the tail fin sits right behind the sailor's hat, so the two outlines merge.
      - In 60/110 the sailor's legs vanish into the fuselage, so he reads as a sticker behind the hull.
    - **Fix:** sit him 0.3 m further forward of the fin, and add a leg overlap on the near side of the hull.

11. **MINOR: 1121 missile is soft or slightly out of focus.**
    - **Owner:** story.ts DOF focus.
    - **Fix:** set the DOF focus on the missile for shot 13b.

12. **MINOR: sea texture is a uniform white-dash scatter (0, 60, 212, 535).**
    - **Owner:** paint.ts.
    - **Fix:** as in r1 #9: trough bands and fewer, larger glints.
