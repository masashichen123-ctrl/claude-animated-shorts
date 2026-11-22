# The Bat Bomb - soundtrack cue sheet

All sound is original and synthesized in numpy/scipy: instruments in `instruments.py` (guitar pluck, Rhodes, upright bass, brushes, shaker, soft kick, vibes from the shared kit + celesta and pizzicato added here), SFX in `sfx_bat.py` (bats, fire, timers, stamp, whoomp...) with helpers from `sfx_gen.py` / `sfx_emu.py`; placed by `music.py` / `sfx.py` from `timeline.py` (frames from SHOTS.md), mixed by `mix.py`.
Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch, no time change). Rebuild everything + verify: `bash audio/build.sh` (about 1.5 min; mix only: `python3 audio/mix.py --fresh`).

## Files
| file | content |
|---|---|
| `public/bat/mix.wav` = `voice/mix_final.wav` | final mix, 48 kHz, stereo, 24-bit, 2,640,000 samples = 55.000 s |
| `audio/out/stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain, after the master limiter's gain curve: voice + music + sfx = mix.wav |
| `audio/check.py` | verification: whisper transcription of voice.wav vs the mix (faster-whisper small.en), sample count |

## Master loudness (own BS.1770-4 meter)
- Integrated **-14.01 LUFS**, true peak **-1.30 dBTP**, LRA 1.5 LU, max momentary -9.5 LUFS, max short-term -13.2 LUFS; 0 samples at full scale
- Stems at mix gain: voice -14.0 LUFS (peak -0.9 dBFS, max momentary -9.5 LUFS), music -29.7 LUFS, sfx -30.8 LUFS (master gain +8.06 dB and the limiter gain curve, the same on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.3 dBTP): max gain reduction 6.61 dB, active (>0.1 dB) on 32.05 % of samples; inside speech: max 6.61 dB, 90th / 99th percentile 1.26 / 4.34 dB, active on 38.5 % of speech samples. This peak limiting is the only processing besides gain that reaches the narration (same approach as the emu mix): the TTS voice's true-peak-to-loudness ratio is too high to reach -14 LUFS at <= -1 dBTP with gain alone.
- Discontinuity check: 181 boundaries (start + end of every placed SFX event, every music cut / re-entry) checked on the SFX and music stems, 0 suspicious.

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -14.0 LUFS
    Threshold: -24.4 LUFS
  Loudness range:
    LRA:         1.5 LU
    Threshold: -34.3 LUFS
    LRA low:   -15.0 LUFS
    LRA high:  -13.5 LUFS
  True peak:
    Peak:       -1.3 dBFS
```

## Voice on top: per-section loudness
Key: words.json spans, widened by the voice's own measured activity. Music: -3 dB gentle duck under speech (attack 250 ms, release 600 ms) + +6 dB bloom in gaps >= 0.55 s; section gain set so the music sits -17.6 LU (+ per-section offset) under the voice over the spoken parts. SFX: -3 dB duck under speech (attack 30 ms, release 250 ms).
Columns: integrated LUFS per stem at mix gain; then over 400 ms windows centred on speech: median voice-music, median and 10th percentile voice-bed (bed = music + sfx); bloom = median music level in the gaps minus in speech (LU).

| section | time s | voice | music | sfx | voice-music (speech, med) | voice-bed med | voice-bed p10 | bloom |
|---|---|---|---|---|---|---|---|---|
| hook | 0.00-3.73 | -14.3 | -30.8 | -32.3 | 16.7 | 16.0 | 10.4 | 0.7 |
| base | 3.73-5.70 | -13.1 | -29.9 | -26.9 | 17.6 | 14.4 | 9.8 | 3.5 |
| cave | 5.70-10.93 | -14.2 | -31.0 | -42.2 | 16.6 | 16.6 | 12.9 | -1.6 |
| workshop | 10.93-18.23 | -14.3 | -30.7 | -37.3 | 16.5 | 16.2 | 12.2 | 0.3 |
| attic | 18.23-21.77 | -13.5 | -30.3 | -29.1 | 16.7 | 15.9 | 9.5 | 0.7 |
| president | 21.77-24.43 | -13.9 | -29.0 | -21.9 | 16.6 | 16.3 | 4.3 | 0.5 |
| lab | 24.43-28.43 | -13.3 | -30.2 | -38.4 | 16.2 | 16.1 | 12.1 | 1.2 |
| escape | 28.43-32.27 | -13.9 | -30.2 | -30.7 | 15.9 | 15.2 | 10.9 | -0.3 |
| search | 32.27-37.00 | -13.7 | -30.1 | -40.6 | 16.5 | 16.2 | 10.7 | 0.6 |
| tank | 37.00-38.33 | -12.5 | -30.3 | -36.1 | 18.6 | 17.6 | 14.1 | 0.7 |
| luckily | 38.33-39.53 | -13.2 | -29.9 | -55.1 | 17.0 | 16.1 | 9.6 | 1.4 |
| oops | 39.53-40.50 | -15.8 | -53.5 | -24.4 | 44.7 | 9.2 | 5.3 | 17.2 |
| buckets | 40.50-43.40 | -14.6 | -31.3 | -37.8 | 17.1 | 16.1 | 11.6 | 0.9 |
| smoke | 43.40-47.27 | -13.7 | -29.4 | -29.3 | 16.8 | 16.7 | 8.5 | 1.4 |
| office | 47.27-50.50 | -14.2 | -28.6 | -31.3 | 16.1 | 14.9 | 8.5 | 6.2 |
| ending | 50.50-55.00 | -13.3 | -27.7 | -29.0 | 17.7 | 17.3 | 11.4 | 3.8 |

Music under the voice: median over the sections' speech windows **16.7 LU**; in the longer gaps (>= 0.55 s) the music's median momentary level is **11.8 LU** under the voice's integrated loudness.

Applied section gains (dB): hook -18.6, base -17.3, cave -19.0, workshop -19.8, attic -18.3, president -18.5, lab -18.0, escape -18.7, search -18.7, tank -14.5, luckily -19.2, oops -19.2, buckets -17.1, smoke -17.8, office -16.0, ending -18.2. Music rides: 3.76-4.03 s -20.0 dB, 40.32-41.12 s -4.0 dB SFX rides: 3.76-4.03 s -20.0 dB, 40.32-41.12 s -9.0 dB (60 ms ramps), to keep the short 'Then' and 'Unluckily' clear.

Narration gaps (measured on voice.wav), where the louder hits and the music blooms go: 1.39-1.70, 3.55-3.86, 5.13-5.78, 7.95-8.30, 10.65-11.02, 11.71-12.08, 15.61-15.86, 17.92-18.32, 19.75-20.04, 21.27-21.85, 22.43-22.65, 24.19-24.56, 30.47-30.71, 31.94-32.42, 36.87-37.12, 38.04-38.50, 40.36-40.68, 43.08-43.58, 45.41-45.64, 46.84-47.48, 50.10-50.70, 52.11-52.40.

## Music map (chill score: laid-back acoustic / lo-fi bed, 88 bpm, swung eighths; D-dorian night colour, F-major day)
Fingerpicked nylon guitar, warm Rhodes, round upright bass, brushes + shaker + soft kick (no snare, no crashes, no rolls), vibes sparkles; for the bats a light pizzicato BAT figure (D5 F5 E5 D5 A4 . B4 C5, swung) and a soft celesta. Loops: night Dm9 Bbmaj7 Gm9 A7b9, day Fmaj7 Am7 Bbmaj7 C9, lab Gm9 C9 Fmaj7 Dm9; resolve on Fmaj9 at the wink. All composed here. The emu short's brass march stays in `music_march.py` for reference (not used).

| time s | frame | music |
|---|---|---|
| 0.00 | 0 | HOOK: night colour - fingerpicked nylon guitar + Rhodes (Dm9 - Bbmaj7), no drums; the pizzicato BAT figure peeks in |
| 2.67 | 80 | CASING POPS @80: soft celesta spiral up D dorian (left to right) with the swarm |
| 3.73 | 112 | FLASH @112: soft shimmer - reversed vibes swell into the frame, a light high vibes chord on it |
| 4.03 | 121 | AIR BASE: bass + Rhodes + shaker (Gm9) enter on 'bats' @121, after the short 'Then'; pizz notes dive with the swarm @121; a soft low vibes dyad on the kick @139 |
| 5.70 | 171 | CAVE (XF @171): the groove starts - guitar, upright bass, Rhodes, brushes + shaker + soft kick on the night loop (Dm9 Bbmaj7 Gm9 A7b9) |
| 9.67 | 290 | BAT COLUMN @290: celesta arpeggio climbing with the column |
| 10.93 | 328 | WORKSHOP: warm day loop (Fmaj7 Am7 Bbmaj7 C9); one high vibes note answers the bulb @331 |
| 14.07 | 422 | the bat is unimpressed (@413): a flat little two-note pizz 'hmph' (A - G#) |
| 15.55 | 466 | toy bats sprinkle on the diorama: four falling celesta notes |
| 18.23 | 547 | ATTIC: night loop, no drums - guitar, bass, Rhodes; the BAT figure flutters in with the bat @553 |
| 20.23 | 607 | TIMER @607: the band thins to bass + Rhodes (A7b9, held) so the ticking reads; a celesta pop-sparkle on the POOF @628 |
| 21.77 | 653 | PRESIDENT: warm groove (Fmaj7 - C9sus) |
| 23.42 | 703 | the President pauses: the band holds its breath (120 ms fade, ~0.28 s of near silence)... |
| 23.70 | 711 | STAMP @711: ...and lands on a warm Fmaj9 (rolled guitar, Rhodes, low F) with a soft vibes glint |
| 24.43 | 733 | LAB: Gm9 C9 Fmaj7 Dm9, guitar, bass, Rhodes, brushes + shaker; a high celesta glint on the tweezers @800 |
| 28.17 | 845 | FLEX @845: a small vibes 'ta-da' (C - F) |
| 28.43 | 853 | TEST BASE (XF @853): full day groove |
| 31.57 | 947 | ESCAPE @947: the BAT figure (pizz + celesta) flits out with the bats |
| 32.27 | 968 | SEARCH: night loop again, lighter (no kick, no brushes) - the bat looking for a dark place |
| 37.00 | 1110 | UNDER THE TANK: held A7b9 (bass + Rhodes) under the five ticking timers; a little celesta grin after 'tank.' |
| 38.33 | 1150 | LUCKILY: day groove (Fmaj7 - C9) |
| 39.47 | 1184 | WHOOMP @1186: the music simply stops (60 ms fade) for the fireball |
| 40.34 | 1210 | 'oops' after 'perfectly.': soft vibes C - A falling third + a low pizz G#, damped before 'Unluckily' |
| 41.12 | 1234 | BUCKETS: the groove creeps back in after 'Unluckily,' - guitar, bass, Rhodes, shaker (Dm9 - Gm9), unbothered |
| 43.40 | 1302 | SMOKE: Bbmaj7 Am7 Gm9, brushes + shaker, no kick |
| 46.47 | 1394 | CAR PUFF @1394: a little descending pizz 'deflate' (F E Eb D, low D) |
| 47.27 | 1418 | OFFICE (XF @1418): guitar, bass, Rhodes, no drums (Gm9 - C9); a low pizz 'plunk' on the folder @1489 |
| 50.50 | 1515 | NIGHT CAVE (XF @1515): night again - guitar, bass, Rhodes, rubato (Bbmaj7 - Gm9 - C9sus), the BAT figure once more |
| 53.67 | 1610 | WINK @1610: warm resolve on Fmaj9 (rolled guitar, Rhodes, low F) with a celesta 'ting' (E7 - A7); rings out to 55.0 |

## SFX events
naive = the event's level vs the voice stem (max momentary, LU); applied = naive - 8 dB + offsets; beds are integrated loudness. 'mix LUFS' = the event's max momentary at mix gain, before the -3 dB speech duck (compare: voice max momentary -9.5 LUFS, integrated -14.0 LUFS). Frames not pinned in SHOTS.md, chosen here: sniffs [998, 1044, 1106], head shake 1053, buckets [1222, 1236, 1262, 1291], polish squeaks ~(1366, 1392), and the small squeaks placed in narration gaps (frames listed).

| # | time s | frame | cue | what | naive | applied | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0 | amb_night_sky (bed) | moonlit desert sky: soft high wind, faint crickets far below (shot 1) | -39 | -39.0 | -53.0 | +0.00 |
| 2 | 1.150 | 35 | bomb_fall | the olive-drab bomb casing falls past the camera (air whoosh, peaks @60) | -14 | -22.0 | -37.1 | -0.20 |
| 3 | 2.667 | 80 | casing_pop | CASING POPS OPEN @80: latch 'tchk', hollow metal bonk, four panels springing out | -2 | -10.0 | -24.0 | -0.10 |
| 4 | 2.687 | 80 | swarm_burst | hundreds of bats burst out in a spiral: airy whoosh opening into wings + cute squeaks | -10 | -18.0 | -33.2 | +0.00 |
| 5 | 3.440 | 103 | bat_grin_eek | the bat at the lens (grin @95) gives a tiny 'eek-eek' as 'bats.' ends | -13 | -21.0 | -35.0 | +0.10 |
| 6 | 3.720 | 112 | amb_base_dusk (bed) | army air base at dusk: breeze, flag lines on the pole, far generator hum (shot 2) | -39 | -39.0 | -53.0 | +0.00 |
| 7 | 3.733 | 112 | flash_swell | reverse air swell into the white FLASH @112 (peaks on the frame) | -13 | -21.0 | -35.0 | +0.00 |
| 8 | 3.933 | 121 | swarm_dive | the swarm dives on the air base @121 (wings + squeaks swooping in; kept low under 'Then the bats') | -16 | -24.0 | -40.4 | +0.00 |
| 9 | 4.250 | 128 | fire_rooftops (bed) | little rooftop fires crackling (after the pops @128-139) | -38 | -38.0 | -52.0 | +0.00 |
| 10 | 4.267 | 128 | fire_pop | little rooftop fire pops on (1/4, @128-139) | -13 | -21.0 | -35.6 | -0.50 |
| 11 | 4.367 | 131 | fire_pop | little rooftop fire pops on (2/4, @128-139) | -13 | -21.0 | -35.6 | +0.40 |
| 12 | 4.500 | 135 | fire_pop | little rooftop fire pops on (3/4, @128-139) | -13 | -21.0 | -35.7 | -0.15 |
| 13 | 4.633 | 139 | fire_pop | little rooftop fire pops on (4/4, @128-139) | -13 | -21.0 | -35.6 | +0.25 |
| 14 | 4.633 | 139 | kick | KICK @139: soft round low thump under the picture kick | +0 | -8.0 | -22.0 | +0.00 |
| 15 | 4.667 | 140 | cap_flies | the soldier's cap flies off as his jaw drops (little fwip) | -17 | -25.0 | -41.7 | +0.30 |
| 16 | 5.620 | 169 | amb_cave_dusk (bed) | desert cave mouth at sunset: warm breeze over the rocks, first crickets (shot 3) | -39 | -39.0 | -53.0 | +0.00 |
| 17 | 5.700 | 171 | xf_air | soft air swell through the dissolve @171 | -18 | -26.0 | -40.0 | +0.00 |
| 18 | 9.417 | 290 | bat_column | @290 a vast column of bats spirals out of the cave: rushing wing-roar + far squeaks, swelling in | -12 | -20.0 | -35.4 | +0.00 |
| 19 | 10.900 | 327 | amb_workshop (bed) | Adams' workshop: warm room tone, a slow wall clock (shot 4) | -42 | -42.0 | -56.0 | +0.00 |
| 20 | 11.033 | 331 | bulb_plink | @331 the idea light bulb pops on: glassy plink + filament buzz | -6 | -14.0 | -28.0 | +0.10 |
| 21 | 12.033 | 367 | strap_buckle | @367 the harness strap pulled snug and buckled on the bat (creak + two clinks) | -11 | -19.0 | -33.0 | -0.10 |
| 22 | 14.067 | 422 | bat_hmph | the bat looks at its bomb, unimpressed (@413): one flat little squeak after 'bat' | -16 | -24.0 | -38.0 | -0.10 |
| 23 | 14.550 | 436 | toy_swoosh | Adams 'flies' the toy bomber on its stick over the diorama (1/2) | -17 | -25.0 | -40.2 | -0.40 |
| 24 | 15.520 | 466 | toy_bats_sprinkle | toy bats sprinkle down on the paper houses (tiny wooden pitter-patter after 'Japan,') | -15 | -23.0 | -37.0 | +0.00 |
| 25 | 15.750 | 472 | toy_swoosh | Adams 'flies' the toy bomber on its stick over the diorama (2/2) | -17 | -25.0 | -40.2 | +0.40 |
| 26 | 18.180 | 545 | amb_attic (bed) | cutaway model house: dark attic hush (shot 5) | -44 | -44.0 | -58.0 | +0.00 |
| 27 | 18.433 | 553 | attic_flutter | @553 a bat flutters into the dark attic | -13 | -21.0 | -36.0 | +0.00 |
| 28 | 18.833 | 565 | hang_settle | @565 it hangs upside down, cosy: wings folding | -18 | -26.0 | -40.0 | +0.10 |
| 29 | 19.800 | 594 | bat_content | a contented little squeak in the gap after 'attics.' | -19 | -27.0 | -41.0 | +0.10 |
| 30 | 20.233 | 607 | timer_tick | push-in on the belly timer ticking @607-628 | -13 | -21.0 | -35.0 | +0.05 |
| 31 | 20.933 | 628 | kick | KICK @628: soft round low thump under the picture kick | +0 | -8.0 | -22.0 | +0.00 |
| 32 | 20.933 | 628 | poof | @628 'off': cartoon POOF spark puff (soft pff + pop + sparkle fizz) | -3 | -11.0 | -25.0 | +0.00 |
| 33 | 21.360 | 641 | bat_eek | the bat's eyes pop: surprised 'eek!' in the gap after 'off.' | -13 | -21.0 | -35.0 | +0.05 |
| 34 | 21.720 | 652 | amb_office (bed) | presidential office: quiet room, a stately clock (shot 6) | -42 | -42.0 | -56.0 | +0.00 |
| 35 | 22.300 | 669 | paper_rustle | the President picks up the bat drawing (paper rustle, gap after 'Incredibly,') | -17 | -25.0 | -39.0 | +0.20 |
| 36 | 23.700 | 711 | stamp | @711 the big approval stamp slams down (desk thunk, paper slap, ink squish) | +1 | -7.0 | -21.0 | +0.00 |
| 37 | 23.767 | 713 | kick | KICK @713: soft round low thump under the picture kick | +0 | -8.0 | -22.0 | +0.00 |
| 38 | 24.380 | 731 | amb_lab (bed) | chemistry lab: flasks bubbling softly, a gas-burner hiss (shot 7) | -39 | -39.0 | -53.0 | +0.00 |
| 39 | 26.667 | 800 | tweezers | @800 the chemist holds up the tiny capsule in tweezers (delicate clinks) | -12 | -20.0 | -34.0 | -0.20 |
| 40 | 27.620 | 829 | capsule_click | the bat clicks a capsule onto its belly | -17 | -25.0 | -39.0 | +0.20 |
| 41 | 28.167 | 845 | flex | @845 the bat flexes a tiny bicep (cute rising rubbery squeak) | -10 | -18.0 | -32.0 | +0.20 |
| 42 | 28.380 | 851 | amb_desert_day (bed) | test base, bright desert day: dry wind, a flag flapping on the pole (shots 8-9) | -40 | -40.0 | -54.0 | +0.00 |
| 43 | 28.433 | 853 | xf_air | soft air swell through the dissolve @853 | -18 | -26.0 | -40.0 | +0.00 |
| 44 | 28.620 | 859 | wing_thumbsup | thumbs-up wing (a single soft flap) | -17 | -25.0 | -39.0 | +0.25 |
| 45 | 29.333 | 880 | crate_carry | @880 soldiers carry the bat crate (wood creak + rope, a few steps on dirt) | -17 | -25.0 | -41.7 | -0.20 |
| 46 | 31.333 | 940 | crate_lid_pop | @940 the crate lid pops (nail squeak, thock, lid clattering down) | -2 | -10.0 | -24.0 | +0.10 |
| 47 | 31.467 | 947 | bats_escape | @947 a handful of armed bats flutter out (wings + cute squeaks) | -10 | -18.0 | -32.9 | +0.00 |
| 48 | 32.150 | 964 | grab_air | a soldier grabs at the air (swish) | -15 | -23.0 | -37.0 | -0.30 |
| 49 | 32.400 | 972 | bat_cruise | one bat cruising over the base, peeking into shadows (soft wingbeats panning across) | -18 | -26.0 | -41.1 | +0.00 |
| 50 | 33.267 | 998 | sniff | the bat sniffs at a shadow (1/3) | -17 | -25.0 | -39.0 | -0.20 |
| 51 | 34.800 | 1044 | sniff | the bat sniffs at a shadow (2/3) | -12 | -20.0 | -34.0 | +0.15 |
| 52 | 35.100 | 1053 | head_shake | shakes its head: nope (ears flapping) | -16 | -24.0 | -38.0 | +0.15 |
| 53 | 36.867 | 1106 | sniff | the bat sniffs at a shadow (3/3) | -12 | -20.0 | -34.0 | +0.30 |
| 54 | 36.950 | 1108 | amb_tank_shade (bed) | under the fuel tank: hollow shade, wind outside (shots 10-11) | -41 | -41.0 | -55.0 | +0.00 |
| 55 | 37.050 | 1110 | five_timers | five bats in a row under the tank, five timers ticking out of phase (L to R) | -12 | -20.0 | -34.0 | +0.00 |
| 56 | 38.120 | 1144 | bats_giggle | they all grin: a tiny chorus of squeaks after 'tank.' | -13 | -21.0 | -35.0 | +0.00 |
| 57 | 39.533 | 1186 | kick | KICK @1186: soft round low thump under the picture kick | -3 | -11.0 | -25.0 | +0.00 |
| 58 | 39.533 | 1186 | whoomp | @1186 the fuel tank goes WHOOMP: suck-in, round low boom, fireball roar, crackle (built under 1.5 kHz) | +2 | -6.0 | -20.0 | +0.00 |
| 59 | 39.550 | 1186 | fire_base (bed) | the base burning after the WHOOMP: fire roar + crackle (shots 11-12) | -37 | -37.0 | -51.0 | +0.00 |
| 60 | 39.750 | 1199 | bats_flutter_out | the bats flutter out of the smoke unharmed | -15 | -23.0 | -38.1 | +0.00 |
| 61 | 40.000 | 1200 | bats_cheer | ...and cheer: a happy squeak chorus under 'perfectly' (clear of 'Unluckily') | -15 | -23.0 | -38.5 | +0.00 |
| 62 | 40.733 | 1222 | bucket | tin bucket clank + slosh | -14 | -22.0 | -36.8 | -0.50 |
| 63 | 40.900 | 1227 | running | soldiers run in a bucket line (quick steps on dirt, across the stereo field) | -15 | -23.0 | -37.1 | +0.00 |
| 64 | 41.200 | 1236 | bucket | tin bucket clank + slosh | -14 | -22.0 | -36.7 | +0.20 |
| 65 | 41.200 | 1236 | roof_catches | fire spreads to a roof (soft fwump) | -16 | -24.0 | -39.2 | +0.50 |
| 66 | 42.067 | 1262 | bucket | tin bucket clank + slosh | -14 | -22.0 | -36.8 | -0.20 |
| 67 | 42.267 | 1268 | roof_catches | fire spreads to a roof (soft fwump) | -16 | -24.0 | -39.1 | -0.50 |
| 68 | 43.033 | 1291 | bucket_empty | the empty bucket: hollow clonk, no water | -14 | -22.0 | -36.6 | +0.45 |
| 69 | 43.350 | 1300 | fire_smoke (bed) | smoky glide past the burnt hangar: dying fire, crackle, wind (shot 13) | -39 | -39.0 | -53.0 | +0.00 |
| 70 | 44.000 | 1320 | hangar_creak | the burnt hangar frame groans as the camera glides past | -18 | -26.0 | -44.2 | -0.30 |
| 71 | 45.330 | 1360 | polish_squeak | the General polishes his shiny car (1/4) | -15 | -23.0 | -37.7 | +0.20 |
| 72 | 45.550 | 1366 | polish_squeak | the General polishes his shiny car (2/4) | -15 | -23.0 | -37.8 | +0.20 |
| 73 | 45.900 | 1377 | polish_squeak | the General polishes his shiny car (3/4) | -19 | -27.0 | -41.7 | +0.20 |
| 74 | 46.467 | 1394 | car_puff | @1394 'puff': the car becomes a charred shell (soft pfoomf, body sag creak, tyres hissing flat) | -20 | -28.0 | -42.8 | +0.10 |
| 75 | 46.567 | 1397 | kick | KICK @1397: soft round low thump under the picture kick | +0 | -8.0 | -22.0 | +0.00 |
| 76 | 46.950 | 1409 | moustache_sizzle | the General's singed moustache smoking (tiny sizzle) | -20 | -28.0 | -42.0 | +0.10 |
| 77 | 47.220 | 1417 | amb_war_office (bed) | War Department office at dusk: dull room tone, a wall clock (shot 14) | -43 | -43.0 | -57.0 | +0.00 |
| 78 | 47.267 | 1418 | xf_air | soft air swell through the dissolve @1418 | -18 | -26.0 | -40.0 | +0.00 |
| 79 | 47.733 | 1432 | money_bags | the officer weighs the folder on the money bags (soft cloth bags + a coin chink) | -17 | -25.0 | -39.0 | -0.20 |
| 80 | 48.250 | 1448 | money_settle | the bags settle (gap after 'million,') | -15 | -23.0 | -37.0 | -0.20 |
| 81 | 49.633 | 1489 | folder_thunk | @1489 the folder drops into the wastebasket (paper thunk + tin bin ring) | -1 | -9.0 | -23.3 | +0.15 |
| 82 | 50.280 | 1508 | bat_snore | the bat asleep in the filing tray: a tiny whistling snore | -19 | -27.0 | -42.2 | -0.35 |
| 83 | 50.450 | 1514 | amb_night_cave (bed) | moonlit cave mouth: night crickets, soft wind (shot 15) | -37 | -37.0 | -51.0 | +0.00 |
| 84 | 50.500 | 1515 | bat_ribbon | bats streaming out in a ribbon across the moon (far, soft wing-roar + distant squeaks) | -19 | -27.0 | -42.7 | +0.00 |
| 85 | 50.500 | 1515 | xf_air | soft air swell through the dissolve @1515 | -18 | -26.0 | -40.0 | +0.00 |
| 86 | 53.333 | 1600 | medal_turn | @1600 the bat with the tiny medal turns to camera (wing rustle + medal clink) | -17 | -25.0 | -39.0 | +0.10 |
| 87 | 53.667 | 1610 | wink_ting | @1610 the WINK: a small bright 'ting' | +0 | -8.0 | -22.0 | +0.10 |

## Verification
- Mix stream: `stream|sample_rate=48000|channels=2|bits_per_sample=24|duration_ts=2640000`
- exact length 2,640,000 samples, stereo: OK; voice/mix_final.wav identical to public/bat/mix.wav: OK
- whisper small.en (int8, cpu) on voice.wav: "In 1943, America built a bomb made of bats. Then the bats bombed America. It started with a dentist named Little Adams who visited a cave in New Mexico full of bats. His idea, strap a tiny firebomb to every bat and drop them over Japan where many houses were made of wood and paper. The bats would hide in the attics. Then the timers would go off. Incredibly, President Roosevelt said yes. The man who invented napalm designed bombs small enough for a bat to carry. Then during a test in New Mexico, some armed bats escaped and they did exactly what they were designed to do. They found the nearest dark hiding place, under a fuel tank. Luckily, the bat bomb worked perfectly. Unluckily, it worked on the army's own airbase. The fire burned down the test range and even the general's car. After two million dollars, the project was cancelled. The bats never fought in the war, but they did win one battle."
- whisper small.en on the mix: "In 1943, America built a bomb made of bats. Then the bats bombed America. It started with a dentist named Little Adams, who visited a cave in New Mexico full of bats. His idea, strap a tiny firebomb to every bat and drop them over Japan, where many houses were made of wood and paper. The bats would hide in the attics, then the timers would go off. Incredibly, President Roosevelt said yes. The man who invented napalm designed bombs small enough for a bat to carry. Then, during a test in New Mexico, some armed bats escaped, and they did exactly what they were designed to do. They found the nearest dark hiding place, under a fuel tank. Luckily, the bat bomb worked perfectly. Unluckily, it worked on the army's own air base. The fire burned down the test range, and even the general's car. After $2 million, the project was canceled. The bats never fought in the war, but they did win one battle."
- word-level diff voice -> mix: IDENTICAL
- SCRIPT.md words not literally in the voice-only transcript (whisper writes numbers as digits): ['lytle']
- SCRIPT.md words not literally in the mix transcript: ['lytle']
- 'bats': voice-only probs [0.99, 0.99, 0.99, 0.99, 0.99, 0.99], mix probs [0.99, 0.99, 1.0, 1.0, 0.96, 0.99]
- 'bombed': voice-only probs [1.0], mix probs [1.0]
- 'napalm': voice-only probs [0.92], mix probs [0.92]
- 'escaped': voice-only probs [1.0], mix probs [1.0]
- 'perfectly': voice-only probs [1.0], mix probs [1.0]
- 'unluckily': voice-only probs [0.97], mix probs [0.91]
- 'cancelled': voice-only probs [0.53], mix probs [0.55]
- 'battle': voice-only probs [1.0], mix probs [1.0]
