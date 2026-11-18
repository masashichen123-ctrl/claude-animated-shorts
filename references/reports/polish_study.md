# Polish study: 4 shorts measured frame by frame (2026-11-18)

Shorts studied (720x1280, 30 fps):

| Short | Length | Words | Words/s | Avg shot | Hard cuts | Freezes ≥8 f |
|---|---|---|---|---|---|---|
| The Ancient Jar That Warned an Empire (**Empire**) | 64.9 s | 235 | 3.63 | 4.1 s | 2 | 0 |
| The Burglar Who Only Moved Furniture (**Burglar**) | 58.5 s | 237 | 4.07 | 4.9 s | 0 | 0 |
| The Window That Breaks Japan's Gambling Law (**Window**) | 45.1 s | 161 | 3.58 | 5.6 s | 1 | 0 |
| The Jar That Hid Two Nobel Prizes (**Nobel**) | 60.2 s | 254 | 4.26 | ~1.6 s | ~10 | 3 (11, 11, 10 f) |

How it was measured: faster-whisper word timings, per-frame optical flow (Farneback) and phase correlation,
HSV/Lab colour stats, colour-histogram scene detection, frame-by-frame strips around every transition, and EBU R128 loudness.

**Headline:** Empire, Burglar and Window are one tier: few long shots, anchored dissolves, a camera that never stops,
and lighting that changes with the story. Nobel is a tier below on picture (flat lighting, smear whips, hard cuts,
freezes) but its script has some of the best ideas of the four (the "And waited." beat, sleepy gold atoms).
Bring Nobel's picture up to the other three and keep its script tricks.

---

## 1. Hook (first 3 s)

| Short | Line | Hook length | Strange part lands at | Picture in the first 3 s |
|---|---|---|---|---|
| Empire | "He put a bronze ball in a dragon's mouth and told the Emperor, if this ever falls out, run!" | 19 w / 5.0 s | 0 s (action) | Inventor already doing it at frame 0. Push-in to an extreme close-up of the dragon's mouth at 0.8 s ("ball in a dragon's mouth"). Pans to the throne room at 2.2 s ("told the Emperor"). **3 picture changes in 3 s.** |
| Burglar | "A man snuck into a family's house every night and moved every single thing one inch to the left." | 19 w / 5.3 s | 4.5 s ("one inch") | Burglar mid-sneak at frame 0, camera arcs. Anchored dissolve AC unit → windowsill at 1.7 s. Insert of a ruler under the couch leg at "inch". |
| Window | "Gambling is illegal in Japan, yet there's a gambling hall on almost every street." | 14 w / 4.2 s | 2.0 s ("yet") | **Opens on the payoff location** (the token window, a man cashing in), then dissolves to the neon street on "there's". The ending is planted in frame 0. |
| Nobel | "When the Nazis marched into Copenhagen, a chemist hid two gold Nobel Prize medals by dropping them into a jar of acid." | 21 w / 5.6 s | **4.5 s ("acid")** | 1.6 s of static marching soldiers (generic picture, no hint of the jar), then a smear whip. The acid jar first appears at 3.7 s. |

**Rules from this:**
- Frame 0 shows the main character **already doing the strange thing**, never scenery or context. Nobel opens on context ("When the Nazis marched…"), so its strange part arrives last.
- Better Nobel opener: *"A chemist dissolved two Nobel Prizes in acid so the Nazis couldn't find them."* (14 words, strange in the first 3 words), with the jar on screen at frame 0.
- Change the picture every ~1 s during the hook (push-in, insert, pan), then settle to ~4-5 s shots.
- Planting the ending location in frame 0 (Window) gives the loop/callback for free.
- Keep the hook to ≤ 4.5 s and ≤ 16 words. Two of the four go over 5 s.

## 2. Script structure (beats with timestamps)

| Beat | Empire | Burglar | Window | Nobel |
|---|---|---|---|---|
| Hook | 0-5 | 0-5.3 | 0-4.2 | 0-5.6 |
| Doubters / mockery | 5.3 "whole court burst out laughing", 22.4 "laughed even harder", 40.5 guards' dialogue | 15.2 officer dialogue, "laughs all the way back to his car" | — (the police "stroll right past") | — |
| Escalation (3+ steps) | ball falls, nothing → thrown out → exiled → all 8 balls drop | 1 inch → fridge blocks door → bed against wall → dad on the couch | win bucket → no cash → prizes → follow the man | acid → waited → search → fled → war ends |
| Pause / comic beat | "Then another, then all eight at once." | "with him still on it." | — | **"And waited."** (0.54 s gap, a clock insert) |
| "You see," pivot | 7.3 s (used for setup) | 51.0 s (twist reveal) | 30.0 s (mechanism) | 38.6 s (mechanism) |
| Mechanism / analogy | pendulum inside the jar (48.6-60) | the seller kept a key | separate shop buys the tokens | gold is "lazy", acids pry atoms loose |
| Callback ending | "…right underneath them." | "…buy it back at half the price." | "on paper, nobody gambles." (echoes "illegal") | "…the gold the soldiers had walked right past." (echoes the search) |
| Silence after last word | 0.12 s | 0.26 s | 0.09 s | 0.53 s |

**Rules from this:**
- **Mockery is the engine** in the two strongest stories: someone laughs at the hero 2-3 times, each bigger, and the payoff punishes them. Nobel and Window have no doubter. Nobel could give the soldiers a smug line ("Just a lot of old bottles.").
- **One line of character dialogue per ~20 s** (Empire: "Hey, it's the toy guy! Did your frogs get hungry again?"). Dialogue gives the face a reaction to animate.
- Personify the science: Nobel's "gold is so lazy" with sleeping gold-atom faces and angry HNO₃/HCl balls is the best explainer of the four. Reuse that pattern (lazy, stubborn, greedy molecules) for every mechanism beat.
- Write one deliberate pause beat per short ("And waited.", "Then another…"), a 2-3 word sentence with a ~0.5 s gap and a visual gag on it. It is the only breath in a 3.6-4.3 word/s read.
- End on the last word: ≤ 0.15 s of tail. Nobel's 0.53 s tail and Burglar's 0.26 s tail cost the loop.
- Sentences are short and spoken. The weakest stretch of the four is Nobel 10-14 s ("Smuggling gold out of Germany was a crime, so if the soldiers found those medals, all three men were finished."), which is exposition the picture explains with a **text sign**. Show it with action instead (a soldier checking a suitcase) and cut the sentence by half.

## 3. Transitions (the biggest polish gap)

Every place change was checked frame by frame. Catalogue:

1. **Anchored dissolve, 4-6 frames.** This is the house style, about 70 % of transitions in Empire, Burglar and Window. The **subject stays in the same screen spot** across the dissolve, so the eye never jumps:
   - Burglar 1636-1645: the key held in the same screen spot while the street dissolves into the living room.
   - Burglar 52-58: the burglar crouched on the AC unit → the same pose on the windowsill.
   - Empire 608-614 (**shape match**): the round ball in the frog's mouth → the round wine cup with the Emperor's reflection.
   - Empire 1665-1669: the white light disc → the ball in the dragon's mouth.
   - Empire 1456-1460 (**colour match**): orange smoke → warm golden pendulum interior.
2. **Push through an opening (fly-through).** Window 137-141: camera pushes through a glass door panel into the hall. Burglar 656-660: the scene irises into the fisheye peephole POV, and 696-704 dissolves back out. Empire 0.8 s: push into the dragon's mouth.
3. **Real 3D whip pan, about 5 frames** (Empire 155-164, inventor → court). The camera actually swings, so the image stays readable mid-whip.
4. **Hard cut:** only for an angle change **inside the same location** (Empire 91→92, 1256→1257). Never for a place change.

**Timing:** in 30 of 33 transitions the dissolve midpoint is within ±3 frames of a word onset, and most land on a phrase boundary ("You see," → "there…", "and" → "threw", "The next morning,").

**Nobel's problems:** about 10 hard cuts between places, and 3 "whip" transitions that are 2D smears (whole frame motion-blurred for 6-8 f: 46-53, 243-248, 347-351) that read as a glitch, not a camera move. Several transitions sit 5-8 frames off the word.

**Rules:**
- Place/time change → 5-frame dissolve (6 for a big time jump), centred on the first word of the new phrase, **with a shared anchor**: same subject position, same shape, or same dominant colour. Plan the anchor in the shot list.
- Use 1-2 fly-throughs per short (window, door, peephole, mouth, jar opening) as the "wow" transitions, saved for act changes.
- Whips only as real camera rotations (≤ 6 f, motion blur from the 3D camera), never a 2D smear.
- Hard cuts only within one location.

For this skill: `XFADE` in story.ts should default to 5 f anchored dissolves. SKILL.md currently says "Hard cuts on big jumps". On these shorts a place jump is a dissolve, not a cut.

## 4. Camera and smoothness

| | Empire | Burglar | Window | Nobel |
|---|---|---|---|---|
| Frames with near-zero camera motion (< 0.5 px/f) | 30 % | 25 % | 34 % | **70 %** |
| Frames pushing in / pulling out | 49 / 45 % | 65 / 28 % | **81 / 17 %** | 56 / 28 % |
| Flow p90 / peak (px/f at 720p) | 8.0 / 35 | 8.3 / 28 | 3.8 / 8 | 2.2 / 42 |
| Frozen spans ≥ 8 f | 0 | 0 | 0 | 3 (27.2 s, 49.0 s, 49.4 s) |
| Mean frame-to-frame change | .035 | .031 | .022 | .018 |

- **The camera never stops.** In the top three every shot has a slow push-in (Window is pushing in on 81 % of frames) and the characters animate constantly (blinks, sweat drops, Zzz, arm gestures, prop motion). Nobel holds still for 70 % of frames and freezes outright for 11 frames twice.
- Window is the smoothest of the four: peak only 8 px/f, made entirely of slow push-ins and dissolves. Calm, expensive-looking.
- Empire and Burglar spend their motion budget on big moves (camera arcs around the burglar, pull-up from the slippers to the couch at 42.9 s, a 6-direction swing around the jar at 8-12 s) and then settle.
- A camera move follows the action: Burglar 1286-1296 tilts up with the couch as it slides. Motivate every move by something moving.

## 5. Lighting and colour

| | Mean luma | Saturation | Lab C* p90 | p2 / p98 |
|---|---|---|---|---|
| Empire | .44 | .42 | 44 | .13 / .91 |
| Burglar | .55 | .45 | 65 | .13 / .95 |
| Window | .34 | .52 | 45 | .05 / .92 |
| Nobel | .59 | .46 | 50 | .14 / .93 |

**Lighting arcs with the story** (the strongest polish signal):
- **Empire:** warm candle-lit throne room (setup) → bright blue-sky day (the army, pride) → pink sunset backlight (exile up the hill) → **deep blue moonlight** (the balls drop, the warning) → golden morning haze (rubble) → warm interior glow (pendulum explanation) → magenta cross-section (earthquake).
- **Burglar:** blue night (break-in) → bright warm day (normal life, police) → saturated blue night (creepy 3 am beat) → day (sale) → violet night (reveal).
- **Window:** neon night street → warm fluorescent hall (inside the system) → blue alley with one warm window (the loophole; the only warm light is the answer).
- **Nobel:** nearly the same flat daylight for the whole lab section, one night shot (escape to Sweden). The light does not tell the story.

**Look details the top three share, Nobel lacks:**
- A **motivated key light in every shot**: candles, moon, a desk lantern, a glowing window, light pools on the floor. The characters pick up that light (blue-lit dad at night, warm-lit inventor by the fire).
- Warm key vs cool shadow, every scene. Blacks never crushed (p2 ≈ .13) except Window's night (.05).
- **Shallow depth of field on close-ups and inserts** (the dragon CU, the wine cup, the key, the slippers) with sharp wides.
- Ink outlines on the 3D world and cast shadows under the characters. Nobel's 3D is unlit and unoutlined (flat-shaded walls, no contact shadows), which is why it reads "cheaper" even with good colours.
- One saturated "hero colour" per world: gold dragons on grey-blue, the red couch, the neon pink sign, the orange acid. Nobel's orange jar is a good hero; give it a light source (backlight through the liquid).

## 6. Sound

- All four are mastered to **-14.0 to -14.3 LUFS**, LRA 1.7-2.4 LU (heavily compressed).
- Music bed under the voice, measured in word gaps: speech ≈ -17 dB RMS, bed ≈ -23 to -27 dB, so the **bed sits 6-10 dB under the voice**. Empire's bed sits lowest (-10 dB) and sounds the most cinematic. Burglar and Window sit -6 dB, louder and more energetic.
- Endings: Empire fades to -53 dB within 0.12 s of the last word (clean button). Nobel keeps music at -20 dB for 0.53 s after the last word, a soft ending that weakens the loop.

## 7. Captions (observation only)

All four burn in one-to-three-word captions: white bold rounded sans with a black outline, centred at ~70 % of frame height, hard swaps per word. Empire, Burglar and Window use a heavy weight. Nobel uses a thin, smaller font that disappears on bright backgrounds. The skill's rule is "No captions". If you ever add them, copy the heavy-weight version, not Nobel's.

---

## Polish checklist (apply to every new short)

**Script**
- [ ] Strange thing in the first 3 words; hook ≤ 16 words / 4.5 s; no "When…" context opener.
- [ ] 2-3 mockery beats that escalate, paid off by the ending.
- [ ] ≥ 1 line of character dialogue; 1 deliberate pause beat ("And waited.").
- [ ] Mechanism told with personified objects (lazy gold, stubborn rod).
- [ ] Last line echoes a word or image from the hook; ≤ 0.15 s of audio after the last word.

**Picture**
- [ ] Frame 0: the hero mid-action (or the payoff location).
- [ ] Hook: a picture change every ~1 s; then 4-5 s average shots.
- [ ] Place changes are 5 f anchored dissolves (position, shape or colour match), centred ±3 f on a word onset.
- [ ] 1-2 fly-through transitions per short; whips only as real camera rotations.
- [ ] Hard cuts only inside one location.
- [ ] Every shot pushes in or moves. Zero frozen spans ≥ 8 f (run `short_qa.py`).
- [ ] Lighting changes per act (day → sunset → night → morning), and the explanation gets its own world.
- [ ] A motivated light source in every shot; characters lit by it; contact shadows; ink on the 3D.
- [ ] Depth of field on every close-up and insert; wides sharp.
- [ ] Explain with action, not on-screen signs and labels.

**Sound**
- [ ] -14 LUFS, bed 6-10 dB under the voice, a hard button on the last word.
