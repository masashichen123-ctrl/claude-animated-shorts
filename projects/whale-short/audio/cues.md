# The Exploding Whale - soundtrack cue sheet

All sound is original and synthesized in numpy/scipy: instruments in `instruments.py` (guitar pluck, Rhodes, upright bass, brushes, shaker, soft kick, vibes, celesta, pizzicato, whistle from the shared kit + a ukulele added in `music.py`), SFX in `sfx_whale.py` (surf, gulls, dynamite, rope, truck, crates, camera, plunger, BOOM, splats, car crunch, bulldozer, park...) with helpers from `sfx_gen.py` / `sfx_emu.py` / `sfx_bat.py`; placed by `music.py` / `sfx.py` from `timeline.py` (frames from SHOTS.md), mixed by `mix.py`.
Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch, no time change). Rebuild everything + verify: `bash audio/build.sh` (about 1.5 min; mix only: `python3 audio/mix.py --fresh`).

## Files
| file | content |
|---|---|
| `public/whale/mix.wav` = `voice/mix_final.wav` | final mix, 48 kHz, stereo, 24-bit, 2,544,000 samples = 53.000 s |
| `audio/out/stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain, after the master limiter's gain curve: voice + music + sfx = mix.wav |
| `audio/check.py` | verification: whisper transcription of voice.wav vs the mix (faster-whisper small.en), sample count |

## Master loudness (own BS.1770-4 meter)
- Integrated **-14.02 LUFS**, true peak **-1.30 dBTP**, LRA 1.6 LU, max momentary -9.3 LUFS, max short-term -13.2 LUFS; 0 samples at full scale
- Stems at mix gain: voice -14.0 LUFS (peak -0.9 dBFS, max momentary -9.3 LUFS), music -30.1 LUFS, sfx -31.9 LUFS (master gain +7.68 dB and the limiter gain curve, the same on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.3 dBTP): max gain reduction 7.02 dB, active (>0.1 dB) on 27.78 % of samples; inside speech: max 7.02 dB, 90th / 99th percentile 1.08 / 3.55 dB, active on 33.0 % of speech samples. This peak limiting is the only processing besides gain that reaches the narration (same approach as the emu and bat mixes): the TTS voice's true-peak-to-loudness ratio is too high to reach -14 LUFS at <= -1 dBTP with gain alone.
- Discontinuity check: 181 boundaries (start + end of every placed SFX event, every music cut / re-entry) checked on the SFX and music stems, 0 suspicious.

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -14.0 LUFS
    Threshold: -24.4 LUFS
  Loudness range:
    LRA:         1.6 LU
    Threshold: -34.4 LUFS
    LRA low:   -15.1 LUFS
    LRA high:  -13.5 LUFS
  True peak:
    Peak:       -1.3 dBFS
```

## Voice on top: per-section loudness
Key: words.json spans, widened by the voice's own measured activity. Music: -3 dB gentle duck under speech (attack 250 ms, release 600 ms) + +6 dB bloom in gaps >= 0.55 s; section gain set so the music sits -18.0 LU (+ per-section offset) under the voice over the spoken parts. SFX: -3 dB duck under speech (attack 30 ms, release 250 ms).
Columns: integrated LUFS per stem at mix gain; then over 400 ms windows centred on speech: median voice-music, median and 10th percentile voice-bed (bed = music + sfx); bloom = median music level in the gaps minus in speech (LU).

| section | time s | voice | music | sfx | voice-music (speech, med) | voice-bed med | voice-bed p10 | bloom |
|---|---|---|---|---|---|---|---|---|
| hook | 0.00-4.47 | -14.0 | -30.7 | -39.9 | 16.1 | 15.8 | 13.5 | 0.0 |
| after | 4.47-6.60 | -13.2 | -28.0 | -29.4 | 17.5 | 15.5 | 10.0 | 5.5 |
| coast | 6.60-11.13 | -13.7 | -30.9 | -46.2 | 17.4 | 17.3 | 13.5 | 0.3 |
| rope | 11.13-14.07 | -13.2 | -30.6 | -34.4 | 17.9 | 17.4 | 9.3 | 1.6 |
| highway | 14.07-16.53 | -14.0 | -29.5 | -34.8 | 16.9 | 16.5 | 11.7 | 5.3 |
| plan | 16.53-21.60 | -13.7 | -31.2 | -37.6 | 16.0 | 15.5 | 13.4 | -3.4 |
| easel | 21.60-25.60 | -13.9 | -30.2 | -48.8 | 16.0 | 16.0 | 11.0 | 0.1 |
| dunes | 25.60-29.30 | -13.8 | -31.0 | -46.6 | 17.6 | 17.5 | 9.9 | -1.1 |
| thin | 29.30-29.93 | -17.1 | -34.1 | -47.2 | 17.7 | 17.6 | 16.2 | -3.1 |
| hold | 29.93-35.00 | -13.5 | -55.9 | -25.4 | - | 19.2 | 12.1 | - |
| rain | 35.00-38.00 | -13.5 | -30.4 | -35.0 | 17.6 | 17.1 | 13.9 | -1.6 |
| car | 38.00-41.00 | -14.4 | -31.1 | -29.5 | 16.7 | 15.6 | 11.7 | 1.4 |
| still | 41.00-44.07 | -13.8 | -31.4 | -44.5 | 17.9 | 17.8 | 13.6 | 4.3 |
| buried | 44.07-48.50 | -14.1 | -30.6 | -37.5 | 17.5 | 17.3 | 11.4 | 2.4 |
| park | 48.50-53.00 | -14.3 | -28.4 | -34.0 | 17.4 | 17.3 | 13.3 | 6.1 |

Music under the voice: median over the sections' speech windows **17.5 LU**; in the longer gaps (>= 0.55 s) the music's median momentary level is **10.7 LU** under the voice's integrated loudness.

Applied section gains (dB): hook -16.1, after -12.8, coast -19.8, rope -19.5, highway -18.3, plan -19.1, easel -18.0, dunes -19.0, thin -21.4, hold -21.4, rain -17.5, car -18.4, still -18.0, buried -17.9, park -19.8. Music rides: 21.42-22.24 s -24.0 dB, 40.86-41.24 s -24.0 dB SFX rides: 21.60-21.80 s -6.0 dB, 33.02-33.60 s -6.0 dB, 40.80-41.24 s -15.0 dB (60 ms ramps): the BOOM tail steps back for 'Unluckily,', and the beds dip for the soft 'And'.

Narration gaps (measured on voice.wav), where the louder hits and the music blooms go: 1.43-1.77, 4.40-4.66, 6.03-6.68, 7.62-8.01, 10.84-11.25, 13.83-14.20, 16.05-16.66, 21.42-21.74, 22.23-22.55, 27.76-28.06, 29.57-29.94, 31.01-31.41, 32.75-33.06, 34.96-35.51, 37.68-38.08, 40.50-41.10, 43.80-44.24, 47.25-47.54, 48.34-48.88.

## Music map (chill seaside score: laid-back acoustic bed, 84 bpm, swung eighths, G major)
Fingerpicked nylon guitar, warm Rhodes, round upright bass, brushes + shaker + soft kick (no snare, no crashes, no rolls), vibes sparkles; seaside colour: a light ukulele chopping the & of 2 and 4, and a soft whistled WHALE motif (D5 E5 A5 . G5 E5 D5, swung; only ever inside narration gaps). Loops: day Gmaj7 Em9 Cmaj9 D9sus, dunes Cmaj9 Bm7 Em9 D9sus, soft Am7 Fmaj7 Cadd9; held D7 before the hold; resolve on Gmaj9 at the wink. All composed here (no existing melodies). The emu short's brass march stays in `music_march.py` for reference (not used).

| time s | frame | music |
|---|---|---|
| 0.00 | 0 | HOOK: fingerpicked nylon guitar + Rhodes + a soft ukulele chop (Gmaj7 - Cmaj9), no drums |
| 3.80 | 114 | DYNAMITE POPS UP @114: four short damped vibes pops climbing left to right, one per stick |
| 4.47 | 134 | FLASH @134: a soft reversed-vibes shimmer swells into the frame; the band stops on it |
| 4.70 | 141 | AFTER: a soft held Am7 colour on 'It did not' (the Engineer, soot-black) |
| 6.08 | 182 | a flat two-note pizz 'hmph' (G - F#) in the gap after 'whale.' |
| 6.60 | 198 | COAST (XF @198): the groove starts - guitar, upright bass, Rhodes, brushes + shaker + soft kick, uke offbeats (Gmaj7 Em9 Cmaj9 D9sus) |
| 12.20 | 366 | ROPE SNAP @366: a pizz tumble down (D B G D G) in the gap after 'move it,' |
| 13.43 | 403 | SMELL @403: a queasy wobbling Rhodes cluster, the band thins to bass + Rhodes (Am7) |
| 14.07 | 422 | HIGHWAY DEPARTMENT: full groove again (Cmaj9 - D9sus) as the truck pulls up |
| 16.08 | 482 | whistled D-E-A in the gap after 'Department.' (the Engineer steps forward) |
| 18.60 | 558 | THOUGHT BUBBLE @558: a soft two-note vibes bubble (B - F#) |
| 19.33 | 580 | CRATES @580-625: a soft pizz note climbs the G major arpeggio with each crate stacked |
| 21.83 | 655 | EASEL TAP @655: one high vibes glint just after 'plan?' |
| 22.27 | 668 | THE PLAN: the previous groove rings out under 'The plan?', the band comes back in the gap after it - guitar, bass, Rhodes, shaker, uke (no drums) - Cmaj9 D9sus Bm7 Em9 |
| 25.60 | 768 | DUNES: full groove (Cmaj9 Bm7 Em9 D9sus) under the gathering crowd |
| 25.82 | 775 | GULLS IN BIBS: a cheeky little ukulele lick (D E G . E G) in the gap after 'rest.' |
| 29.30 | 879 | the band thins to bass + Rhodes (D7) after 'filming.' |
| 29.93 | 898 | TENSE HOLD @898: the music stops (120 ms fade) and stays silent through the plunger @914 and the BOOM @960 |
| 35.00 | 1050 | OOPS: soft vibes E - C falling third + a low pizz F#, in the gap after 'everyone.' (34.96-35.51) |
| 35.45 | 1064 | BLUBBER RAIN: the groove creeps back in on 'Huge' - guitar, bass, Rhodes, shaker, uke (Am7 - D9sus), no drums |
| 38.00 | 1140 | CAR: Cmaj9 - D9sus with brushes; the band lifts off at 40.45 for... |
| 40.52 | 1216 | ...a little descending pizz 'deflate' (D C# C B, low G) in the gap after 'away.' |
| 40.95 | 1228 | STILL THERE: the day groove returns, faded up under 'most' (it stays out of the soft 'And'), unbothered |
| 44.07 | 1322 | BURIED: guitar, bass, Rhodes, no drums (Am7 Fmaj7 Cadd9) |
| 47.30 | 1419 | FACE-PALM: a low pizz 'plunk' in the gap after 'avoid.' |
| 48.33 | 1450 | whistled D-E-A through the dissolve to the park, in the gap after 'buried it.' (48.30-48.93) |
| 48.60 | 1458 | PARK (XF @1458): bright, full groove (Cmaj9 D9sus Em9 D9sus), uke and shaker sunny |
| 51.87 | 1556 | WINK @1556: warm resolve on Gmaj9 (rolled guitar, Rhodes, low G) with a celesta 'ting' (D7 - G7) |
| 52.02 | 1561 | the whole WHALE motif, whistled softly over the resolve after the last word; rings out to 53.0 |

## SFX events
naive = the event's level vs the voice stem (max momentary, LU); applied = naive - 8 dB + offsets; beds are integrated loudness. 'mix LUFS' = the event's max momentary at mix gain, before the -3 dB speech duck (compare: voice max momentary -9.3 LUFS, integrated -14.0 LUFS). Frames not pinned in SHOTS.md, chosen here (mostly inside measured gaps): tumble [376, 380, 384], gull thud 419, truck doors [486, 492], crates [580, 589, 598, 605, 613, 619, 625], oops 1050, hubcap (1216, 1226), far gull calls [45, 232, 327, 1321], plus the shovels, whoas and squishes listed below.

## Speech-band masking check (key words)
For every word of words.json (window = word start .. end + 0.10 s): voice level minus SFX / music / bed (music + sfx) level, both band-passed 300-5000 Hz (the consonant / formant band), at mix gain after duck and limiter. 'worst 50 ms' = the smallest voice-minus-SFX margin over 50 ms frames inside the word. Rule from the bat short: SFX >= 12 dB under the voice in this band on every word (low sub content below 300 Hz is allowed, it does not mask consonants).

| word | time s | voice-SFX dB | worst 50 ms | voice-music dB | voice-bed dB |
|---|---|---|---|---|---|
| whale | 3.28-3.58 | 47.6 | 37.6 | 16.4 | 16.4 |
| dynamite | 3.86-4.40 | 17.3 | 11.7 | 11.4 | 10.4 |
| whale | 5.70-6.00 | 27.2 | 21.7 | 18.0 | 17.5 |
| whale | 8.68-8.94 | 45.2 | 38.7 | 19.4 | 19.4 |
| beach | 9.78-9.98 | 44.7 | 36.7 | 17.6 | 17.6 |
| move | 12.10-12.28 | 22.7 | 13.3 | 17.2 | 16.0 |
| smell | 13.50-13.78 | 21.8 | 12.3 | 16.6 | 16.3 |
| boulder | 18.66-18.96 | 26.9 | 13.9 | 23.0 | 21.8 |
| dynamite | 20.84-21.42 | 30.2 | 18.3 | 18.0 | 17.7 |
| plan | 21.84-22.14 | 30.6 | 16.2 | 53.7 | 30.6 |
| whale | 22.94-23.12 | 51.3 | 45.1 | 20.2 | 20.2 |
| seagulls | 24.86-25.28 | 27.6 | 14.6 | 13.4 | 13.3 |
| crowd | 26.32-26.64 | 43.3 | 32.5 | 21.9 | 21.9 |
| filming | 29.08-29.44 | 35.3 | 27.3 | 20.2 | 20.2 |
| plunger | 30.54-30.96 | 35.8 | 27.5 | 83.5 | 35.8 |
| whale | 31.96-32.10 | 30.1 | 25.0 | 182.3 | 30.1 |
| exploded | 32.10-32.64 | 43.7 | 35.7 | 179.7 | 43.7 |
| exploded | 33.78-34.16 | 26.2 | 15.2 | 183.3 | 26.2 |
| everyone | 34.46-34.88 | 23.5 | 16.7 | 176.3 | 23.5 |
| blubber | 36.24-36.56 | 30.3 | 17.8 | 23.5 | 22.8 |
| crowd | 37.38-37.68 | 28.6 | 32.2 | 18.7 | 18.2 |
| car | 38.66-38.88 | 23.5 | 12.4 | 18.9 | 17.6 |
| whale | 41.62-41.82 | 47.2 | 33.0 | 21.6 | 21.6 |
| beach | 43.44-43.70 | 40.3 | 33.1 | 14.0 | 14.0 |
| avoid | 46.88-47.24 | 33.4 | 20.4 | 16.3 | 16.2 |
| buried | 47.80-48.12 | 29.7 | 19.2 | 24.8 | 23.6 |
| beach | 49.56-49.80 | 44.1 | 35.6 | 18.8 | 18.8 |
| park | 50.16-50.38 | 50.8 | 40.0 | 27.2 | 27.2 |
| whale | 51.56-51.90 | 19.5 | 7.2 | 13.3 | 12.4 |

All 174 words: minimum voice-SFX margin 14.6 dB ('it' @ 48.12 s); minimum voice-bed margin 6.0 dB ('A' @ 25.74 s). No word has the SFX within 12 dB.

| # | time s | frame | cue | what | naive | applied | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0 | amb_beach_overcast (bed) | Oregon beach, overcast: Pacific surf + a steady sea wind (shot 1) | -40 | -40.0 | -54.0 | +0.00 |
| 2 | 1.500 | 45 | gull_far | a far seagull call in the gap (@45) | -15 | -23.0 | -37.0 | -0.60 |
| 3 | 3.800 | 114 | dynamite_pops | @114 sticks of dynamite pop up along the whale's back (five soft cork 'thup's, L to R) | -13 | -21.0 | -35.0 | +0.00 |
| 4 | 3.850 | 114 | fuse_sparkle | the lit fuses fizz and sparkle until the flash (kept low under 'dynamite') | -23 | -31.0 | -45.0 | +0.00 |
| 5 | 4.400 | 132 | amb_beach_after (bed) | the same beach after the flash: surf, wind, the whale smoking (soft sizzle) (shot 2) | -41 | -41.0 | -55.0 | +0.00 |
| 6 | 4.467 | 134 | flash_swell | reverse air swell into the white FLASH @134 (peaks on the frame, in the gap) | -9 | -17.0 | -31.0 | +0.00 |
| 7 | 4.487 | 134 | flash_pff | on the flash: a soft muffled 'pfoomf' (sub + dark air), not a bang | -6 | -14.0 | -28.0 | +0.00 |
| 8 | 5.633 | 169 | blubber_plop | @169 a blubber chunk plops onto the Engineer's hat (wet round 'blop', dark - under 'whale.') | -9 | -17.0 | -31.0 | +0.05 |
| 9 | 5.700 | 171 | kick | KICK @171: soft round low thump under the picture kick | -2 | -10.0 | -24.0 | +0.00 |
| 10 | 6.100 | 183 | hat_crack | the cracked hard hat gives a little creak in the gap after 'whale.' | -16 | -24.0 | -38.0 | +0.05 |
| 11 | 6.550 | 196 | amb_coast_wide (bed) | the coast wide: bigger grey-green surf, wind over the dunes and beach grass (shot 3) | -38 | -38.0 | -52.0 | +0.00 |
| 12 | 6.600 | 198 | xf_air | soft sea-air swell through the dissolve @198 | -18 | -26.0 | -40.0 | +0.00 |
| 13 | 7.733 | 232 | gull_far | a far seagull call in the gap (@232) | -15 | -23.0 | -37.0 | +0.50 |
| 14 | 10.900 | 327 | gull_far | a far seagull call in the gap (@327) | -15 | -23.0 | -37.0 | -0.30 |
| 15 | 11.100 | 333 | amb_beach_rope (bed) | on the beach by the tail: surf, wind (shot 4) | -40 | -40.0 | -54.0 | +0.00 |
| 16 | 12.200 | 366 | rope_snap | @366 the rope strains and SNAPS (dark thwack + whip; the strain creak leads in) - under 'move' | -11 | -19.0 | -33.0 | +0.15 |
| 17 | 12.533 | 376 | tumble | the locals tumble onto the sand (1/3, gap after 'move it,') | -9 | -17.0 | -31.0 | -0.40 |
| 18 | 12.667 | 380 | tumble | the locals tumble onto the sand (2/3, gap after 'move it,') | -9 | -17.0 | -31.0 | +0.30 |
| 19 | 12.800 | 384 | tumble | the locals tumble onto the sand (3/3, gap after 'move it,') | -14 | -22.0 | -36.0 | -0.10 |
| 20 | 13.433 | 403 | stink_wobble | @403 green stink lines rise: a queasy low 'wah-wah' wobble (dark, under 'smell') | -14 | -22.0 | -36.0 | +0.00 |
| 21 | 13.840 | 403 | gull_faint | a seagull faints off its post: weak falling 'kyo-oww' + feathers (gap after 'smell.') | -13 | -21.0 | -35.0 | +0.45 |
| 22 | 13.867 | 440 | truck_arrive | @440 the orange 1970s highway truck pulls up: V8 coming down, brakes + gravel at the stop, idle (dark) | -10 | -18.0 | -32.0 | +0.00 |
| 23 | 13.967 | 419 | gull_thud | ...and lands softly on the sand | -15 | -23.0 | -37.0 | +0.45 |
| 24 | 14.020 | 421 | amb_car_park (bed) | beach car park: wind, the surf further off (shot 5) | -42 | -42.0 | -56.0 | +0.00 |
| 25 | 16.200 | 486 | truck_door | the crew hop out: truck door slams (1/2, gap after 'Department.') | -10 | -18.0 | -32.0 | +0.35 |
| 26 | 16.400 | 492 | truck_door | the crew hop out: truck door slams (2/2, gap after 'Department.') | -13 | -21.0 | -35.0 | -0.25 |
| 27 | 16.480 | 494 | amb_beach_plan (bed) | beach: surf + wind (shot 6) | -41 | -41.0 | -55.0 | +0.00 |
| 28 | 18.600 | 558 | bubble_bloop | @558 the thought bubble appears: a short round 'bloop' | -16 | -24.0 | -38.0 | +0.30 |
| 29 | 19.080 | 572 | boulder_clonk | the whale in the bubble turns to stone: a dry stone 'clonk' (gap after 'boulder') | -11 | -19.0 | -33.0 | +0.30 |
| 30 | 19.333 | 580 | crate | a dynamite crate stacked on the pile (1/7, @580-625) | -11 | -19.0 | -33.0 | -0.30 |
| 31 | 19.633 | 589 | crate | a dynamite crate stacked on the pile (2/7, @580-625) | -17 | -25.0 | -39.0 | +0.20 |
| 32 | 19.933 | 598 | crate | a dynamite crate stacked on the pile (3/7, @580-625) | -17 | -25.0 | -39.0 | -0.10 |
| 33 | 20.167 | 605 | crate | a dynamite crate stacked on the pile (4/7, @580-625) | -17 | -25.0 | -39.0 | +0.30 |
| 34 | 20.433 | 613 | crate | a dynamite crate stacked on the pile (5/7, @580-625) | -17 | -25.0 | -39.0 | -0.25 |
| 35 | 20.633 | 619 | crate | a dynamite crate stacked on the pile (6/7, @580-625) | -17 | -25.0 | -39.0 | +0.10 |
| 36 | 20.833 | 625 | crate | a dynamite crate stacked on the pile (7/7, @580-625) | -17 | -25.0 | -39.0 | +0.00 |
| 37 | 21.550 | 646 | amb_beach_easel (bed) | beach: surf + wind (shot 7) | -41 | -41.0 | -55.0 | +0.00 |
| 38 | 21.833 | 655 | easel_tap | @655 the Engineer taps the easel (dry wooden tok-tok, dark, the 2nd one after 'plan?') | -20 | -28.0 | -42.0 | -0.15 |
| 39 | 24.800 | 744 | beak_lick | @744 the gulls in bibs lick their beaks (tiny wet smacks, kept low under 'seagulls') | -19 | -27.0 | -41.0 | +0.00 |
| 40 | 25.550 | 766 | amb_dunes (bed) | dune top: wind in the beach grass, the surf below (shot 8) | -40 | -40.0 | -54.0 | +0.00 |
| 41 | 25.860 | 776 | fork_clink | forks tapped on the log, eager (gap after 'rest.') | -15 | -23.0 | -37.0 | +0.00 |
| 42 | 26.033 | 781 | crowd_chatter (bed) | @790 a cheerful crowd chatting on the dune top (far, dark); hushes for the hold @898 | -39 | -39.0 | -53.0 | +0.00 |
| 43 | 28.167 | 845 | film_camera | @845 the 16 mm news camera starts whirring (motor + 24 fps claw), runs through the hold until the BOOM | -25 | -33.0 | -47.0 | +0.35 |
| 44 | 28.517 | 856 | lens_glint | the camera lens catches a glint (tiny high shimmer) | -24 | -32.0 | -46.0 | +0.35 |
| 45 | 29.650 | 890 | amb_plunger_hush (bed) | plunger close-up: a hushed wind, the sea far off - the held breath (shot 9) | -46 | -46.0 | -60.0 | +0.00 |
| 46 | 30.467 | 914 | plunger | @914 the plunger is pushed down: short rod slide into a solid box clunk (dark) | -14 | -22.0 | -36.0 | +0.00 |
| 47 | 31.220 | 937 | amb_beach_wide (bed) | beach wide before the blast: surf, wind (shot 10) | -43 | -43.0 | -57.0 | +0.00 |
| 48 | 32.000 | 960 | boom_hit | @960 BOOM transient: a short low-passed sub punch only (under 'whale exploded') | -4 | -12.0 | -26.0 | +0.00 |
| 49 | 32.000 | 960 | kick | KICK @960: soft round low thump under the picture kick | -6 | -14.0 | -28.0 | +0.00 |
| 50 | 32.760 | 983 | boom_tail | ...the big BOOM body after 'exploded' ends (32.75 s): blast 'whoomph', sand + debris roar, rolling rumble decaying dark | +6 | -2.0 | -16.0 | +0.00 |
| 51 | 32.950 | 989 | amb_dunes_panic (bed) | dunes: wind, grass (shot 11) | -42 | -42.0 | -56.0 | +0.00 |
| 52 | 33.100 | 1020 | fall_whistle | @1020 blubber chunks whistle down (1/3) | -19 | -27.0 | -41.0 | -0.30 |
| 53 | 33.220 | 1020 | fall_whistle | @1020 blubber chunks whistle down (2/3) | -19 | -27.0 | -41.0 | +0.35 |
| 54 | 33.350 | 1020 | fall_whistle | @1020 blubber chunks whistle down (3/3) | -19 | -27.0 | -41.0 | +0.00 |
| 55 | 34.467 | 1034 | panic_scatter | @1034 the crowd scatters in panic: running feet in soft sand in all directions (dark) | -17 | -25.0 | -39.0 | +0.00 |
| 56 | 34.487 | 1035 | umbrella_pop | an umbrella pops open (1/3; the 2nd and 3rd in the gap after 'everyone.') | -19 | -27.0 | -41.0 | -0.50 |
| 57 | 34.987 | 1050 | umbrella_pop | an umbrella pops open (2/3; the 2nd and 3rd in the gap after 'everyone.') | -14 | -22.0 | -36.0 | +0.45 |
| 58 | 35.050 | 1051 | whoa_far | a couple of far 'whoa!'s from the fleeing crowd (gap after 'everyone.') | -19 | -27.0 | -41.0 | +0.00 |
| 59 | 35.107 | 1053 | umbrella_pop | an umbrella pops open (3/3; the 2nd and 3rd in the gap after 'everyone.') | -15 | -23.0 | -37.0 | +0.10 |
| 60 | 35.220 | 1057 | basket_splat | the picnic basket gets splatted (gap after 'everyone.') | -8 | -16.0 | -30.0 | +0.25 |
| 61 | 35.300 | 1059 | amb_dunes_reporter (bed) | dunes: wind (shot 12) | -43 | -43.0 | -57.0 | +0.00 |
| 62 | 36.333 | 1090 | splat | @1090 a blubber chunk splats beside the reporter (dark, under the words) | -9 | -17.0 | -31.0 | -0.45 |
| 63 | 36.833 | 1105 | splat | @1105 a blubber chunk splats behind him (dark, under the words) | -15 | -23.0 | -37.0 | +0.40 |
| 64 | 37.267 | 1118 | splat | @1118 a blubber chunk splats on his head (dark, under the words) | -12 | -20.0 | -34.0 | +0.00 |
| 65 | 37.720 | 1132 | head_squish | the chunk on the reporter's head settles: a slow wet squish (gap after 'crowd.') | -14 | -22.0 | -36.0 | +0.00 |
| 66 | 37.950 | 1138 | amb_far_lot (bed) | the distant parking lot: open wind, a faint far sea (shot 13) | -43 | -43.0 | -57.0 | +0.00 |
| 67 | 38.600 | 1158 | car_crunch | @1158 the sedan is flattened: deep dark body crunch (lp 700 Hz) - kept low under 'car' | -11 | -19.0 | -33.0 | +0.10 |
| 68 | 38.667 | 1160 | kick | KICK @1160: soft round low thump under the picture kick | -2 | -10.0 | -24.0 | +0.00 |
| 69 | 40.503 | 1216 | glass_tinkle | a little glass tinkles down (gap after 'away.') | -24 | -32.0 | -46.0 | +0.20 |
| 70 | 40.533 | 1216 | hubcap_roll | @1216 a hubcap rolls away wobbling and settles (gap after 'away.') | -19 | -27.0 | -41.0 | -0.20 |
| 71 | 40.880 | 1226 | amb_beach_smoke (bed) | beach, smoke clearing: surf, wind, a little smoulder (shot 14) | -40 | -40.0 | -54.0 | +0.00 |
| 72 | 41.733 | 1255 | gulls_flee | @1255 the seagulls flee in the background (heavy wingbeats, dark, far) | -16 | -24.0 | -38.0 | +0.00 |
| 73 | 43.333 | 1300 | blink | @1300 the sooty Engineer blinks (tiny plip-plip) | -22 | -30.0 | -44.0 | +0.10 |
| 74 | 44.020 | 1321 | amb_beach_buried (bed) | beach: surf + wind (shot 15) | -41 | -41.0 | -55.0 | +0.00 |
| 75 | 44.033 | 1321 | gull_far | a far seagull call in the gap (@1321) | -15 | -23.0 | -37.0 | +0.60 |
| 76 | 46.867 | 1406 | face_palm | @1406 the Engineer face-palms (soft dark slap, under 'avoid') | -12 | -20.0 | -34.0 | +0.05 |
| 77 | 47.330 | 1420 | shovel | a shovel of sand thrown on the mound (1/3, in the gaps) | -14 | -22.0 | -36.0 | -0.40 |
| 78 | 47.347 | 1424 | bulldozer | @1424-1444 a bulldozer pushes sand over the whale (low diesel chug, track clank; dark under 'buried') | -13 | -21.0 | -35.0 | +0.00 |
| 79 | 48.383 | 1451 | flag_pop | the little sand-castle flag pops up on the mound (tiny fwip) | -18 | -26.0 | -40.0 | +0.20 |
| 80 | 48.420 | 1453 | shovel | a shovel of sand thrown on the mound (2/3, in the gaps) | -14 | -22.0 | -36.0 | +0.35 |
| 81 | 48.500 | 1455 | amb_park_sunny (bed) | the sunny beach park today: birds, soft breeze, far surf, kids playing far off (shot 16) | -38 | -38.0 | -52.0 | +0.00 |
| 82 | 48.600 | 1458 | xf_air | soft sea-air swell through the dissolve @1458 | -18 | -26.0 | -40.0 | +0.00 |
| 83 | 48.660 | 1460 | shovel | a shovel of sand thrown on the mound (3/3, in the gaps) | -14 | -22.0 | -36.0 | -0.20 |
| 84 | 51.567 | 1547 | gull_land | @1547 a seagull lands on the park sign (wingbeats braking + claw tap, dark) | -20 | -28.0 | -42.0 | +0.30 |
| 85 | 51.867 | 1556 | wink_ting | @1556 the seagull WINKS: a small, very high 'ting' (E8 over a soft E7: above the speech band, it sits on the final Gmaj9 as the 13th) | -6 | -14.0 | -28.0 | +0.30 |
| 86 | 52.350 | 1571 | gull_happy | a happy little gull 'kyow' after the wink | -17 | -25.0 | -39.0 | +0.35 |

## Verification
- Mix stream: `stream|sample_rate=48000|channels=2|bits_per_sample=24|duration_ts=2544000`
- exact length 2,544,000 samples, stereo: OK; voice/mix_final.wav identical to public/whale/mix.wav: OK
- whisper small.en (int8, cpu) on voice.wav: "In 1970, Oregon tried to get rid of a dead whale with dynamite. It did not get rid of the whale. A 45 -foot, 8 -ton sperm whale had washed up on a beach near Florence. Nobody knew how to move it, and it was starting to smell. So the job went to the highway department. Their engineer decided to treat it like a boulder and blow it up with half a ton of dynamite. The plan? Blast the whale into tiny pieces and let the seagulls eat the rest. A crowd gathered on the dunes. A TV crew started filming. Then they pushed the plunger. Luckily the whale exploded. Unluckily it exploded on everyone. Huge chunks of blubber rained down on the crowd. One crushed a car parked nearly a quarter mile away. And most of the whale was still lying right there on the beach. So the highway crew did the one thing they'd been trying to avoid. They buried it. Today, that beach is a park named after the exploding whale."
- whisper small.en on the mix: "In 1970, Oregon tried to get rid of a dead whale with dynamite. It did not get rid of the whale. A 45 -foot, 8 -ton sperm whale had washed up on a beach near Florence. Nobody knew how to move it, and it was starting to smell. So the job went to the highway department. Their engineer decided to treat it like a boulder and blow it up with half a ton of dynamite. The plan? Blast the whale into tiny pieces and let the seagulls eat the rest. A crowd gathered on the dunes. A TV crew starred filming. Then they pushed the plunger. Luckily, the whale exploded. Unluckily, it exploded on everyone. Huge chunks of blubber rained down on the crowd. One crushed a car parked nearly a quarter mile away. And most of the whale was still lying right there on the beach. So the highway crew did the one thing they'd been trying to avoid. They buried it. Today, that beach is a park named after the exploding whale."
- word-level diff voice.wav -> mix: - started + starred
- word-level diff voice.wav -> voice stem alone (same voice, +master gain and limiter, no music / SFX): - started + starred
- word-level diff voice stem alone -> mix (what the music + SFX change): IDENTICAL
- SCRIPT.md words not literally in the voice-only transcript (whisper writes numbers as digits): ['forty', 'five']
- SCRIPT.md words not literally in the mix transcript: ['forty', 'five', 'started']
- 'dynamite': voice-only probs [1.0, 1.0], mix probs [1.0, 1.0]
- 'whale': voice-only probs [1.0, 1.0, 1.0, 1.0, 0.99, 1.0, 1.0], mix probs [1.0, 1.0, 1.0, 1.0, 0.99, 1.0, 1.0]
- 'move': voice-only probs [1.0], mix probs [1.0]
- 'smell': voice-only probs [1.0], mix probs [1.0]
- 'highway': voice-only probs [0.94, 0.98], mix probs [0.95, 0.99]
- 'boulder': voice-only probs [1.0], mix probs [1.0]
- 'plan': voice-only probs [1.0], mix probs [1.0]
- 'seagulls': voice-only probs [0.99], mix probs [0.99]
- 'filming': voice-only probs [1.0], mix probs [1.0]
- 'plunger': voice-only probs [1.0], mix probs [1.0]
- 'exploded': voice-only probs [1.0, 1.0], mix probs [1.0, 1.0]
- 'everyone': voice-only probs [1.0], mix probs [1.0]
- 'blubber': voice-only probs [1.0], mix probs [1.0]
- 'crowd': voice-only probs [0.99, 1.0], mix probs [1.0, 0.98]
- 'car': voice-only probs [1.0], mix probs [1.0]
- 'beach': voice-only probs [1.0, 1.0, 0.99], mix probs [1.0, 1.0, 0.99]
- 'avoid': voice-only probs [1.0], mix probs [1.0]
- 'buried': voice-only probs [1.0], mix probs [1.0]
- 'park': voice-only probs [1.0], mix probs [1.0]

Key-word windows (~3.5 s around each word, voice.wav vs the voice stem alone vs the mix, same cut; edges snapped to the quietest 10 ms of the voice within +-0.8 s, whisper on voice.wav vs on the mix, same cut):

| word | window s | voice.wav | voice stem (mix gain + limiter) | mix | mix vs voice stem | key-word prob voice / stem / mix |
|---|---|---|---|---|---|---|
| whale | 1.74-4.42 | Oregon tried to get rid of a dead whale with dynamite. | Oregon tried to get rid of a dead whale with dynamite. | Oregon tried to get rid of a dead whale with dynamite. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| dynamite | 1.74-6.11 | Oregon tried to get rid of a dead whale with dynamite. It did not get rid of the whale. | Oregon tried to get rid of a dead whale with dynamite. It did not get rid of the whale. | Oregon tried to get rid of a dead whale with dynamite. It did not get rid of the whale. | IDENTICAL | [1.0] / [1.0] / [0.99] |
| whale | 4.42-7.99 | It did not get rid of the whale. A 45 -foot... | It did not get rid of the whale. A 45 -foot... | It did not get rid of the whale. A 45 foot... | IDENTICAL | [0.99] / [0.99] / [0.99] |
| whale | 6.25-10.91 | A 45 -foot, 8 -ton sperm whale had washed up on a beach near Florence. | A 45 -foot, 8 -ton sperm whale had washed up on a beach near Florence. | A 45 -foot, 8 -ton sperm whale had washed up on a beach near Florence. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| beach | 7.99-10.91 | Eight -ton sperm whale had washed up on a beach near Florence. | Eight -ton sperm whale had washed up on a beach near Florence. | Eight -ton sperm whale had washed up on a beach near Florence. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| move | 10.91-13.93 | Nobody knew how to move it, and it was starting to smell. | Nobody knew how to move it, and it was starting to smell. | Nobody knew how to move it, and it was starting to smell. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| smell | 11.09-16.15 | Nobody knew how to move it, and it was starting to smell, so the job went to the highway department. | Nobody knew how to move it, and it was starting to smell, so the job went to the highway department. | Nobody knew how to move it and it was starting to smell so the job went to the highway department | IDENTICAL | [1.0] / [1.0] / [1.0] |
| highway | 13.93-16.34 | So the job went to the highway department. | So the job went to the highway department. | So the job went to the highway department. | IDENTICAL | [0.85] / [0.86] / [0.89] |
| boulder | 16.26-20.02 | Their engineer decided to treat it like a boulder and blow it up | Their engineer decided to treat it like a boulder and blow it up | Their engineer decided to treat it like a boulder and blow it up | IDENTICAL | [0.99] / [0.99] / [0.99] |
| dynamite | 20.02-22.26 | with half a ton of dynamite. The plan. | with half a ton of dynamite. The plan. | with half a ton of dynamite. The plan. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| plan | 20.02-23.77 | with half a ton of dynamite. The plan, blast the whale into tiny... | with half a ton of dynamite. | with half a ton of dynamite. | IDENTICAL | [0.99] / [] / [] |
| whale | 21.43-25.28 | The plan, blast the whale into tiny pieces, and let the seagulls e - | The plan, blast the whale into tiny pieces, and let the seagulls eat. | The plan. Blast the whale into tiny pieces and let the seagulls eat. | IDENTICAL | [0.95] / [0.95] / [0.95] |
| seagulls | 22.53-26.02 | Blast the whale into tiny pieces and let the seagulls eat the rest. | Blast the whale into tiny pieces and let the seagulls eat the rest. | Blast the whale into tiny pieces and let the seagulls eat the rest. | IDENTICAL | [0.98] / [0.98] / [0.97] |
| crowd | 25.28-27.83 | eat the rest. A crowd gathered on the dunes. | eat the rest. A crowd gathered on the dunes. | eat the rest. A crowd gathered on the dunes. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| filming | 27.83-31.08 | A TV crew started filming, then they pushed the plunger. | A TV crew starred filming, then they pushed the plunger. | A TV crew started filming, then they pushed the plunger. | word OK, context differs | [1.0] / [0.99] / [1.0] |
| plunger | 29.63-32.83 | Then they pushed the plunger. Luckily the whale exploded. | Then they pushed the plunger. Luckily the whale exploded. | Then they pushed the plunger, luckily the whale exploded. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| whale | 29.63-32.98 | Then they pushed the plunger. Luckily the whale exploded. | Then they pushed the plunger. Luckily the whale exploded. | Then they pushed the plunger, luckily the whale exploded. | IDENTICAL | [0.98] / [0.98] / [0.98] |
| exploded | 29.82-33.62 | Then they pushed the plunger. Luckily, the whale exploded. Unluckily? | then they pushed the plunger. Luckily the whale exploded. Unluckily? | then they pushed the plunger. Luckily, the whale exploded. Unluckily? | IDENTICAL | [1.0] / [1.0] / [0.99] |
| exploded | 32.83-35.03 | Unluckily, it exploded on everyone. | Unluckily, it exploded on everyone. | Unluckily, it exploded on everyone. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| everyone | 32.83-35.82 | Unluckily, it exploded on everyone. | Unluckily, it exploded on everyone. | Unluckily, it exploded on everyone. | IDENTICAL | [0.99] / [0.99] / [0.99] |
| blubber | 35.03-37.86 | Huge chunks of blubber rained down on the crowd. | Huge chunks of blubber rained down on the crowd. | Huge chunks of blubber rained down on the crowd. | IDENTICAL | [0.99] / [0.99] / [0.99] |
| crowd | 35.03-39.25 | Huge chunks of blubber rained down on the crowd. One crushed a car parked | Huge chunks of blubber rained down on the crowd. One crushed a car parked | Huge chunks of blubber rained down on the crowd, one crushed a car parked | IDENTICAL | [1.0] / [1.0] / [0.98] |
| car | 37.38-40.61 | crowd. One crushed a car parked nearly a quarter mile away. | crowd. One crushed a car parked nearly a quarter mile away. | crowd. One crushed a car parked nearly a quarter mile away. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| whale | 40.61-43.87 | And most of the whale was still lying right there on the beach. | And most of the whale was still lying right there on the beach. | And most of the whale was still lying right there on the beach. | IDENTICAL | [0.99] / [0.98] / [0.98] |
| beach | 41.02-45.51 | and most of the whale was still lying right there on the beach. So the highway crew | and most of the whale was still lying right there on the beach, so the highway crew | Most of the whale was still lying right there on the beach, so the highway crew | word OK, context differs | [1.0] / [1.0] / [1.0] |
| highway | 43.03-47.29 | there on the beach, so the highway crew did the one thing they'd been trying to avoid. | there on the beach, so the highway crew did the one thing they had been trying to avoid. | there on the beach, so the highway crew did the one thing they'd been trying to avoid. | word OK, context differs | [0.98] / [0.98] / [0.98] |
| avoid | 45.51-48.42 | did the one thing they'd been trying to avoid. They buried it. | did the one thing they'd been trying to avoid. They buried it. | did the one thing they'd been trying to avoid. They buried it. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| buried | 45.51-48.91 | did the one thing they'd been trying to avoid. They buried it. | did the one thing they'd been trying to avoid. They buried it. | did the one thing they'd been trying to avoid. They buried it. | IDENTICAL | [0.99] / [0.99] / [0.99] |
| beach | 47.45-52.09 | They buried it. Today, that beach is a park named after the exploding whale. | They buried it. Today, that beach is a park named after the exploding whale. | They buried it. Today, that beach is a park named after the exploding whale. | IDENTICAL | [0.99] / [0.99] / [0.99] |
| park | 48.42-52.09 | Today, that beach is a park named after the exploding whale. | Today, that beach is a park named after the exploding whale. | Today, that beach is a park named after the exploding whale. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| whale | 49.97-52.68 | is a park named after the exploding whale. | is a park named after the exploding whale. | is a park named after the exploding whale. | IDENTICAL | [1.0] / [1.0] / [1.0] |
