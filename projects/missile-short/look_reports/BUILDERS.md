# Look pass, round 1: shared brief for the 5 specialist builders

Project: `/home/user/claude-animated-shorts/projects/missile-short` (Remotion + three.js). The composition `MissileShort` is the rebuilt missile short.
- Main source: `src/videos/missile/` (do NOT edit it).
- Your sandbox: `src/videos/missile_<you>/`, a full copy. Edit ONLY the files you own, in YOUR sandbox:

| owner | files |
|---|---|
| sets | build.ts, paint.ts |
| char | toon.ts, cast.ts, cardshade.ts |
| light | world.ts, lights.ts, shade.ts, grade.ts |
| post | ink.ts, lensblur.ts, Missile.tsx |
| cam | story.ts |

- Contracts between files are their exported names and signatures; read the current files first. You may ADD exports. Never remove or rename an export another file imports, and never change its signature. If you truly need another owner's file changed, describe the exact change in your final message and the lead will forward it. Work around it in your own files when you can.
- Goal: make our frames as close as possible in quality and style to the premium references:
  - colourful, high contrast, targeted colours;
  - real shading and lighting;
  - ink outlines on the 3D world;
  - painted textures;
  - blurred depth;
  - lively motion;
  - appealing characters, with heads that are not perfect circles and good body structure.
- Story, characters and voice stay OURS: never trace or copy a specific reference character, prop or shot.
- Specs: the 10 measured reports in `look_reports/*.md`. Read the ones listed for your role, fully; they hold exact numbers and code-level specs. Where reports conflict, these decisions hold:
  - Character heads and skin are near-white #fbf7f2 (charshade.md wins over charshape.md's peach), so the scene light can tint them.
  - Grade: the split tone flips to rose shadows and cream highlights (grade.md). Use one small hero colour per shot; grass and sea are calmer, not lime or cyan.
  - The submarine hull is slate #4a5868, never near-black. The missile is warm white #e7e1d6 with red bands, panel lines and stencils.
- Shot list: `SHOTS.md`. Word timings: `voice/words.json`.
- Reference frames (private study, never upload): `/tmp/claude-0/-home-user-claude-animated-shorts/212da511-fe09-584c-9279-f550ba5fa642/scratchpad/look/ref/*.png`. Full reference videos: `.../scratchpad/v/{jar_empire,burglar,window}.mp4`. The original cheap render: `.../scratchpad/v/missile.mp4`.
- Stills of YOUR sandbox:
  `STILLS_ENTRY=src/sandboxes/<you>/index.tsx node scripts/stills.mjs out/missile/<you>/r1_ <frames|shots> 0.5`
  - About 15 s per still after a ~40 s bundle; the machine has only 4 cores shared by 5 builders, so render what you need, not everything every time.
  - Mid-frames of the shots ("shots"): 60,148,212,311,418,480,535,616,722,816,889,992,1121,1228,1309.
  - Build side-by-sides with PIL (ours next to reference frames) and LOOK at them.
- `npx tsc --noEmit` must show no new errors (the `Element | null` noise in *.tsx is known).
- Iterate at least 3 render→look→fix rounds. Stop when your area is clearly at the reference level or you hit diminishing returns.
- Final message (≤ 200 words):
  - what you changed;
  - before/after numbers where you measured;
  - 2-3 best still paths;
  - any cross-file change requests.
