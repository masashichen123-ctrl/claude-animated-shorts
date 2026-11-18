# Look-gap study: missile short vs premium reference (shared brief)

## Goal
Our short "missile" (US Navy delivered mail by cruise missile, 1959) looks cheap, flat and dull next to the premium
reference shorts. The user wants ours to look as close as possible in QUALITY and STYLE:
- colourful, high contrast, "targeted" colours
- real shading and lighting
- black ink outlines on the 3D world
- painted textures
- blurred depth in backgrounds
- lively movement
- better character shapes: heads not perfect circles, better body structure

Story, characters and voice stay OURS: derive general rules and NUMBERS, never trace or copy specific reference characters/props/shots.
Reference material is private study only: never upload or send it anywhere.

## Files (SCR = /tmp/claude-0/-home-user-claude-animated-shorts/212da511-fe09-584c-9279-f550ba5fa642/scratchpad)
- OUR frames (540x960, PNG): `SCR/look/ours/missile_<t>s.png` (1 sea+missile, 9 sailor on submarine deck with missile,
  13 sailor holding letters, 17 missile over land, 20 runway+palm tree, 23 postmaster at podium, 27 plane with mail sacks,
  29 building + kid, 32 mail truck, 34 postman + truck, 36 missile + postman, 40 museum, 43 museum close-up).
  Full video: `SCR/v/missile.mp4` (also a polished re-grade `SCR/out/missile_polished.mp4`, same art).
- REFERENCE frames (720x1280 PNG): `SCR/look/ref/{jar_empire,burglar,window}_<t>s.png`. Full videos: `SCR/v/{jar_empire,burglar,window}.mp4`.
  Older reference frames, 540x960 JPEG: `SCR/look/ref/shortNN_*.jpg`. Contact sheets: `/home/user/claude-animated-shorts/references/sheets/`.
  The references burn in captions (one white bold word, black outline, ~60-74 % height). MASK that band before statistics.
- Earlier measured reports, the source of truth to confirm or update: `/home/user/claude-animated-shorts/references/reports/*.md`.
  Also `references/STYLE_BIBLE.md` and `references/reports/polish_study.md`.
- OUR renderer (three.js inside Remotion), the code your recommendations must target: `/home/user/claude-animated-shorts/templates/bridge/`.
  - `lights.ts`: LIGHTS/LOOK presets.
  - `shade.ts`: two-tone shading.
  - `world.ts`: sky, fog, sun, water, posing.
  - `build.ts`: buildings/props.
  - `paint.ts`: Canvas2D painted textures.
  - `toon.ts`: Canvas2D character drawing, `Pen` API, 600x1000 canvas.
  - `cast.ts`: billboard characters, animation.
  - `cardshade.ts`: card lighting.
  - `ink.ts`: outline pass.
  - `lensblur.ts`: DOF.
  - `grade.ts`: colour grade.
  - `story.ts`: shots, cameras, DOF table.
  - `Bridge.tsx`: composer.
  - `/home/user/claude-animated-shorts/SKILL.md` has the final look values the bridge reached.
- Tools available: python3 with numpy + opencv (cv2), PIL, ffmpeg. Put scratch files in `SCR/look/work/<your topic>/`.

## Rules
- Do NOT edit anything under /home/user/claude-animated-shorts. Analysis only.
- Measure numbers, not adjectives: pixel widths, luma/chroma percentiles, hue angles, ratios, blur radii in px at 1080 width, etc.
- Compare like with like (close-up vs close-up, exterior day vs exterior day).
- Write your full report to `SCR/look/reports/<topic>.md`, structured as:
  1. measured gap table (ours vs ref);
  2. why ours reads cheap (ranked);
  3. concrete implementation spec for OUR code: file, function or constant, and the new values or algorithm, precise enough that an engineer can implement it without seeing the references.
- Your final message: ≤ 200 words, the top 5 fixes with numbers.
