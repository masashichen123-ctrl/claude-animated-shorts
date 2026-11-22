# The 1904 Olympic Marathon - soundtrack cue sheet

All sound is original and synthesized in numpy/scipy: instruments in `instruments.py` (guitar pluck, upright bass, brushes, shaker, soft kick, vibes, celesta, pizzicato from the shared kit) + a soft honky-tonk upright piano added in `music.py`; SFX in `sfx_marathon.py` (heat buzz / cicadas, the bottle + gulp + swirl boing, a 1904 one-cylinder car + bulb horn, the pistol pop, stadium crowd murmur / cheers / held breath, dust, coughs, well winch + drip, tape snaps, boaters, record scratch, apple pick + crunch, blergh, snores, dogs + frantic feet, egg, glug, clink, lift, medal plonk, drop-out thuds / sighs / wagon / splash, Boston spring birds, the wink ting) with helpers from `sfx_gen.py` / `sfx_emu.py` / `sfx_bat.py` (`sfx_whale.py` stays for reference, unused); placed by `music.py` / `sfx.py` from `timeline.py` (frames from SHOTS.md), mixed by `mix.py`.
Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch, no time change). Rebuild everything + verify: `bash audio/build.sh` (about 3 min with the whisper checks; mix only: `python3 audio/mix.py --fresh`, about 1 min).

## Files
| file | content |
|---|---|
| `public/marathon/mix.wav` = `voice/mix_final.wav` | final mix, 48 kHz, stereo, 24-bit, 2,688,000 samples = 56.000 s |
| `audio/out/stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain, after the master limiter's gain curve: voice + music + sfx = mix.wav |
| `audio/check.py` | verification: whisper transcription of voice.wav vs the mix (faster-whisper small.en), sample count |

## Master loudness (own BS.1770-4 meter)
- Integrated **-14.01 LUFS**, true peak **-1.30 dBTP**, LRA 1.4 LU, max momentary -9.3 LUFS, max short-term -12.9 LUFS; 0 samples at full scale
- Stems at mix gain: voice -14.0 LUFS (peak -0.8 dBFS, max momentary -9.3 LUFS), music -30.9 LUFS, sfx -38.2 LUFS (master gain +7.65 dB and the limiter gain curve, the same on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.3 dBTP): max gain reduction 9.06 dB, active (>0.1 dB) on 30.72 % of samples; inside speech: max 9.06 dB, 90th / 99th percentile 1.10 / 3.51 dB, active on 35.6 % of speech samples. This peak limiting is the only processing besides gain that reaches the narration (same approach as the emu and bat mixes): the TTS voice's true-peak-to-loudness ratio is too high to reach -14 LUFS at <= -1 dBTP with gain alone.
- Discontinuity check: 152 boundaries (start + end of every placed SFX event, every music cut / re-entry) checked on the SFX and music stems, 0 suspicious.

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -14.0 LUFS
    Threshold: -24.4 LUFS
  Loudness range:
    LRA:         1.4 LU
    Threshold: -34.4 LUFS
    LRA low:   -15.0 LUFS
    LRA high:  -13.6 LUFS
  True peak:
    Peak:       -1.3 dBFS
```

## Voice on top: per-section loudness
Key: words.json spans, widened by the voice's own measured activity. Music: -3 dB gentle duck under speech (attack 250 ms, release 600 ms) + +4 dB bloom in gaps >= 0.55 s; section gain set so the music sits -18.0 LU (+ per-section offset) under the voice over the spoken parts. SFX: -3 dB duck under speech (attack 30 ms, release 250 ms).
Columns: integrated LUFS per stem at mix gain; then over 400 ms windows centred on speech: median voice-music, median and 10th percentile voice-bed (bed = music + sfx); bloom = median music level in the gaps minus in speech (LU).

| section | time s | voice | music | sfx | voice-music (speech, med) | voice-bed med | voice-bed p10 | bloom |
|---|---|---|---|---|---|---|---|---|
| hook | 0.00-4.37 | -14.2 | -31.3 | -36.3 | 16.4 | 16.2 | 13.7 | 1.4 |
| car | 4.37-6.80 | -13.6 | -29.4 | -38.0 | 16.7 | 15.6 | 13.8 | 4.5 |
| start | 6.80-11.33 | -14.1 | -30.8 | -43.7 | 17.0 | 16.8 | 11.5 | 1.3 |
| dust | 11.33-14.97 | -14.1 | -31.1 | -39.3 | 17.1 | 16.5 | 13.9 | 0.2 |
| well | 14.97-18.43 | -14.9 | -32.2 | -40.6 | 16.0 | 15.9 | 13.2 | -5.0 |
| finish | 18.43-22.87 | -13.2 | -30.1 | -39.7 | 16.8 | 16.7 | 12.1 | -0.1 |
| flashback | 22.87-25.07 | -14.2 | -31.9 | -45.3 | 17.3 | 17.2 | 13.3 | - |
| dropout | 25.07-25.50 | -19.5 | -38.2 | -37.3 | 15.6 | 14.8 | 14.4 | -1.2 |
| orchard | 25.50-29.53 | -14.0 | -31.2 | -42.0 | 16.6 | 16.2 | 13.4 | 0.6 |
| nap | 29.53-31.57 | -13.5 | -33.1 | -38.4 | 22.5 | 22.2 | 13.9 | 2.0 |
| fourth | 31.57-32.93 | -12.3 | -29.2 | -57.4 | 17.0 | 16.9 | 12.9 | 0.5 |
| dogs | 32.93-35.93 | -13.8 | -31.4 | -39.3 | 17.2 | 16.7 | 15.2 | -0.5 |
| hicks | 35.93-42.43 | -13.7 | -32.0 | -45.2 | 18.0 | 18.0 | 15.8 | -3.3 |
| breath | 42.43-44.40 | -13.6 | -37.1 | -48.0 | 23.4 | 23.0 | 19.2 | -3.4 |
| carried | 44.40-47.17 | -14.4 | -31.0 | -40.0 | 17.1 | 17.1 | 12.6 | 4.8 |
| dropouts | 47.17-50.23 | -14.2 | -30.6 | -37.7 | 17.1 | 16.9 | 14.5 | 3.1 |
| boston | 50.23-56.00 | -13.6 | -29.5 | -33.3 | 17.8 | 17.6 | 13.8 | 1.8 |

Music under the voice: median over the sections' speech windows **17.1 LU**; in the longer gaps (>= 0.55 s) the music's median momentary level is **11.1 LU** under the voice's integrated loudness.

Applied section gains (dB): hook -18.6, car -14.9, start -19.8, dust -18.2, well -18.1, finish -18.7, flashback -19.4, dropout -19.4, orchard -17.4, nap -16.0, fourth -18.9, dogs -19.2, hicks -17.0, breath -17.0, carried -17.6, dropouts -19.1, boston -18.3. Music rides: 6.12-6.38 s -14.0 dB, 14.80-15.15 s -10.0 dB, 22.70-23.05 s -10.0 dB, 41.40-42.05 s -9.0 dB, 50.22-50.55 s -8.0 dB SFX rides: 6.12-6.38 s -10.0 dB, 14.80-15.15 s -10.0 dB, 22.70-23.05 s -10.0 dB, 50.25-50.55 s -6.0 dB (60 ms ramps).

Narration gaps (measured on voice.wav), where the louder hits and the music blooms go: 1.77-2.09, 4.13-4.50, 6.26-6.89, 8.09-8.30, 10.84-11.24, 12.62-12.84, 14.58-15.02, 18.12-18.56, 21.39-21.68, 22.52-22.74, 25.24-25.68, 29.50-29.72, 31.20-31.56, 32.58-33.06, 35.66-36.06, 38.40-38.84, 40.73-41.02, 42.01-42.41, 44.05-44.36, 46.96-47.38, 49.77-50.38, 51.72-52.10, 54.20-54.56.

## Music map (chill score with a ragtime-period wink: laid-back acoustic bed, 92 bpm, swung eighths, F major)
A soft honky-tonk upright piano (own additive model: two strings per note detuned a few cents, felt-soft hammer, damper) comping lazy after-beats on 2 and 4 and playing a little syncopated RAG motif (A4 C5 . D5 . F5 E5 D5 C5) and its 3-note answer only inside narration gaps; fingerpicked nylon guitar, round upright bass in two (walking for the dogs), brushes + shaker + soft kick (no snare, no crashes, no rolls), celesta / vibes / pizz for the soft comedy beats. Loops: the ragtime circle F6 D7 G7 C7, lazy F6 Bb6 F6 C7, sunny F6 Dm7 Gm7 C9sus, woozy Gm7 C7 F6 Abdim7 (piano further out of tune, slow pitch sway, half-time), Boston Bb6 Bdim7 F6 D7 G7 C7; resolve on F6/9 at the wink. All composed here (no existing melodies: not Maple Leaf Rag, not The Entertainer). The emu short's brass march stays in `music_march.py` for reference (not used).

| time s | frame | music |
|---|---|---|
| 0.00 | 0 | HOOK: fingerpicked guitar + soft upright piano after-beats + upright bass (F6 - D7), no drums |
| 1.80 | 54 | a tiny 3-note piano answer (F E-flat... F D C) in the gap after 'Olympics,' (1.77-2.09) |
| 3.30 | 99 | BOTTLE @99: a soft 'uh-oh' (A-flat - G) on the piano, high and quiet |
| 4.37 | 131 | FLASH @131: a soft reversed-vibes shimmer swells into the frame; the band stops on it |
| 4.43 | 133 | THE CAR @133: a lazy vamp (F6 - C7) under 'And that wasn't even the strangest part.' |
| 6.38 | 191 | the 3-note piano answer in the gap after 'part.' (6.22-6.89) |
| 6.80 | 204 | STADIUM START (XF @204): the groove starts - guitar, upright bass, piano after-beats, brushes + shaker + soft kick (F6 D7 G7 C7) |
| 10.86 | 326 | the RAG motif's first half (A C D F) in the gap after 'roads.' (10.84-11.24) |
| 11.33 | 340 | CARS + DUST: the groove carries on (F6 Dm7 Gm7 C9sus) |
| 17.63 | 529 | THE DROP @529: the band lets go (250 ms), one low bass C holds... |
| 18.21 | 546 | ...and a lone high piano plink (C7) after the drop lands (gap after 'course.') |
| 18.43 | 553 | FINISH LINE: full groove on the ragtime circle |
| 20.31 | 609 | TAPE @607: a two-note piano lift (C F) in the small gap after 'line' (20.31-20.50) |
| 22.56 | 677 | CROWD CHEERS: a little piano 'ta-da' (C E A, octaves) in the gap after 'cheered,' (22.55-22.87) |
| 25.07 | 752 | CHEERING STOPS DEAD @752: soft drop-out (150 ms fade), silence under the end of 'car.' |
| 25.36 | 761 | a flat two-note pizz 'hmph' (F - E) in the gap after 'car.' (25.26-25.69) |
| 25.60 | 768 | ORCHARD: the band comes back gently - guitar, bass, piano, shaker (F6 Bb6 F6 C7) |
| 27.40 | 822 | APPLE PICK @822: a tiny two-note celesta glint |
| 28.90 | 867 | ROTTEN @867: the band stops, a soured, badly out-of-tune piano cluster wobbles (E bass) |
| 29.84 | 895 | NAP: a half-time lullaby - guitar + bass (F6 - Bb6) |
| 31.35 | 940 | Z bubbles (@926): three soft descending celesta notes (C A F) in the gap after 'nap.' |
| 31.57 | 947 | CUT @947 to the finish: the groove pops back in |
| 32.17 | 965 | FOURTH @965: a cheerful soft F6/9 chord on the four fingers; the motif's tail (E D C) after 'fourth.' |
| 32.93 | 988 | DOGS: the bass walks, triplet shaker, piano after-beats - skittering but soft (D7 G7 C7) |
| 35.62 | 1069 | the band lets go after 'dogs' so the bark volley has the gap (35.66-36.07) |
| 36.25 | 1088 | HICKS: woozy half-time - piano more out of tune with a slow pitch sway, brushes swish (Gm7 C7 F6 Abdim7) |
| 40.13 | 1204 | EGG @1204 / FLASK @1235: a soft pizz blip on each hand-off, climbing (G A); the bottle @1246 gets none (keeps 'strychnine' clear) |
| 42.09 | 1263 | a woozy chromatic slide down (F E Eb D) in the gap after 'strychnine.' (42.01-42.41) |
| 42.43 | 1273 | THE LONG LENS: bass pedal on C + a soft repeated piano C, slowly growing |
| 43.47 | 1304 | HELD BREATH @1304: the band stops, one quiet held C7 shell on the piano, then near-silence to 'Unluckily' |
| 44.40 | 1332 | CARRIED: a lumbering half-time (F6 - C7), guitar, bass, piano, brushes |
| 45.93 | 1378 | LIFT @1378: a little piano step up (F A C) |
| 46.63 | 1399 | TAPE @1399: a warm F6/9 chord; MEDAL: a low piano octave 'plonk' (C2+C3) + a celesta glint in the gap after 'it.' |
| 47.25 | 1418 | DROP-OUTS: thin band (F6 E7 Bbm6 F6 C7), a deflating line |
| 48.45 | 1454 | piano 'deflate' C B Bb (gap after 'runners,'), then A Ab G F after 'finished.' (49.90-50.33) |
| 50.23 | 1507 | BOSTON (XF @1507): bright, full groove (Bb6 Bdim7 F6 D7 G7 C7) |
| 51.78 | 1553 | the RAG motif's opening in the gap after 'car?' (51.76-52.15); the answer after 'Marathon.' (54.20-54.58) |
| 55.33 | 1660 | WINK @1660: warm resolve on F6/9 (rolled guitar, piano, low F) with a celesta 'ting' (A7 - C8) |

## SFX events
naive = the event's level vs the voice stem (max momentary, LU); applied = naive - 8 dB + offsets; beds are integrated loudness. 'mix LUFS' = the event's max momentary at mix gain, before the -3 dB speech duck (compare: voice max momentary -9.3 LUFS, integrated -14.0 LUFS). Frames not pinned in SHOTS.md, chosen here (mostly inside measured gaps): swirl boing 4.17 s, coughs [12.64, 14.59], drip lands 18.21, boater fwips [22.56, 22.61, 22.67], record scratch 25.34, blergh 29.55, snore 31.34, bark volley [35.67, 35.74, 35.8, 35.86], medal 46.97, sighs [48.46, 50.08], splash 49.9, final honk 55.08 s (each moved off a key word into the measured gap next to its locked frame; the frame stays the visual sync point and a dark or above-band part of the sound - or the cut itself, for the cheer @752 - sits on the frame).

## Speech-band masking check (key words)
For every word of words.json (window = word start .. end + 0.10 s): voice level minus SFX / music / bed (music + sfx) level, both band-passed 300-5000 Hz (the consonant / formant band), at mix gain after duck and limiter. 'worst 50 ms' = the smallest voice-minus-SFX margin over 50 ms frames inside the word. Rule from the bat short: SFX >= 12 dB under the voice in this band on every word (low sub content below 300 Hz is allowed, it does not mask consonants).

| word | time s | voice-SFX dB | worst 50 ms | voice-music dB | voice-bed dB |
|---|---|---|---|---|---|
| poison | 3.68-4.08 | 23.7 | 39.9 | 17.1 | 16.2 |
| race | 6.96-7.16 | 28.5 | 16.2 | 30.4 | 26.5 |
| heat | 8.98-9.34 | 36.3 | 27.7 | 10.6 | 10.6 |
| dust | 14.24-14.50 | 28.4 | 33.9 | 24.5 | 23.1 |
| course | 17.64-17.96 | 33.5 | 29.5 | 20.0 | 19.8 |
| finish | 19.76-19.94 | 40.5 | 28.8 | 19.6 | 19.6 |
| Lorz | 20.90-21.36 | 37.0 | 30.9 | 21.7 | 21.6 |
| cheered | 22.02-22.38 | 34.3 | 21.2 | 19.6 | 19.5 |
| car | 25.00-25.24 | 33.4 | 25.0 | 22.2 | 22.0 |
| apples | 27.46-27.80 | 33.4 | 24.1 | 18.3 | 18.1 |
| rotten | 29.04-29.36 | 53.2 | 44.1 | 23.4 | 23.4 |
| nap | 31.00-31.20 | 21.0 | 13.0 | 13.7 | 13.0 |
| fourth | 32.16-32.54 | 45.4 | 35.9 | 13.9 | 13.8 |
| course | 34.68-34.90 | 25.4 | 14.7 | 19.0 | 18.3 |
| dogs | 35.16-35.46 | 28.6 | 20.2 | 22.0 | 21.2 |
| egg | 40.12-40.32 | 23.9 | 11.9 | 16.5 | 15.6 |
| brandy | 41.16-41.40 | 23.5 | 12.3 | 18.8 | 17.6 |
| strychnine | 41.52-42.00 | 25.5 | 17.6 | 26.2 | 22.9 |
| finish | 43.48-43.66 | 48.7 | 35.2 | 20.5 | 20.5 |
| Unluckily | 44.38-44.82 | 45.6 | 37.7 | 22.6 | 22.6 |
| carry | 46.02-46.22 | 29.0 | 14.6 | 18.3 | 17.8 |
| 14 | 48.82-49.22 | 28.2 | 15.8 | 23.3 | 22.0 |
| car | 51.44-51.72 | 44.7 | 36.4 | 19.9 | 19.9 |
| Boston | 53.34-53.64 | 30.5 | 18.0 | 19.3 | 18.9 |
| foot | 54.74-54.96 | 45.8 | 34.0 | 22.2 | 22.2 |

All 179 words: minimum voice-SFX margin 11.3 dB ('it' @ 46.64 s); minimum voice-bed margin 6.0 dB ('it' @ 46.64 s). Words with voice-SFX < 12 dB: 'it' 46.64 s (11.3 dB).

| # | time s | frame | cue | what | naive | applied | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0 | amb_road_hook (bed) | dusty country road, hot: a dry breeze, Hicks' exhausted shuffle, a faint far heat buzz (shot 1) | -40 | -40.0 | -54.0 | +0.00 |
| 2 | 3.300 | 99 | bottle_tink | @99 the skull bottle held up: a tiny high glass 'tink' (6 kHz, above the speech band) | -12 | -20.0 | -34.0 | +0.25 |
| 3 | 3.667 | 110 | gulp | @110 Hicks gulps it: a low round 'glunk' (dark, under 'poison') | -14 | -22.0 | -36.0 | +0.00 |
| 4 | 4.170 | 125 | swirl_boing | the swirly-eyes 'boing' (wobbly spring sliding down) in the gap after 'poison.' (4.17-4.50) | -9 | -17.0 | -31.0 | -0.10 |
| 5 | 4.367 | 131 | flash_pff | @131 the white FLASH: a soft muffled 'pfoomf' (sub + dark air), not a bang (in the gap) | -8 | -16.0 | -30.0 | +0.00 |
| 6 | 4.380 | 131 | amb_road_car (bed) | the same road after the flash: dry breeze, faint heat buzz (shot 2) | -42 | -42.0 | -56.0 | +0.00 |
| 7 | 4.433 | 133 | car_putter | @133+ the open 1904 car putters past the runners (one-cylinder putt-putt, body rattle; dark, L to R, closest @162) | -13 | -21.0 | -35.0 | +0.00 |
| 8 | 5.340 | 162 | honk_soft | near @162 Lorz waves: a soft rubber-bulb 'parp-parp' (low B-flat, dark: under 'strangest') | -15 | -23.0 | -37.0 | +0.10 |
| 9 | 6.760 | 203 | amb_stadium_start (bed) | 1904 stadium at the start: a crowd murmuring in the stands (dark), a breeze in the bunting (shot 3a) | -40 | -40.0 | -54.0 | +0.00 |
| 10 | 6.800 | 204 | xf_air | soft warm-air swell through the dissolve @204 | -20 | -28.0 | -42.0 | +0.00 |
| 11 | 7.000 | 210 | cheer_start (bed) | @210 the crowd cheers the start (dark, under 'race was in Saint Louis'), cut with the picture @262 | -37 | -37.0 | -51.0 | +0.00 |
| 12 | 7.000 | 210 | pistol_pop | @210 the starter's pistol, softened: a dark 'pok' + smoke puff (under 'race') | -10 | -18.0 | -32.0 | -0.30 |
| 13 | 7.250 | 218 | start_feet | 32 runners set off: a soft patter of feet on the cinder track (dark) | -22 | -30.0 | -44.0 | +0.00 |
| 14 | 8.690 | 261 | amb_heat (bed) | @262 the blazing road: HEAT BUZZ - cicada choruses swelling (above the speech band), a dry breeze (shot 3b) | -37 | -37.0 | -51.0 | +0.00 |
| 15 | 11.167 | 344 | cars_ahead | @344 two open cars drive ahead of the runners (two putters, dark), into the dust | -14 | -22.0 | -36.0 | +0.00 |
| 16 | 11.280 | 338 | amb_road_cars (bed) | dirt road: breeze, cicadas (shot 4) | -40 | -40.0 | -54.0 | +0.00 |
| 17 | 12.640 | 379 | cough | a runner coughs in the dust (1/2, in the gaps 12.62-12.90 / 14.58-14.75) | -16 | -24.0 | -38.0 | -0.50 |
| 18 | 12.817 | 398 | dust_roll | @398-427 huge brown dust clouds roll back over the runners (dark swell of grit and air) | -15 | -23.0 | -37.0 | +0.00 |
| 19 | 14.590 | 438 | cough | a runner coughs in the dust (2/2, in the gaps 12.62-12.90 / 14.58-14.75) | -12 | -20.0 | -34.0 | +0.35 |
| 20 | 14.920 | 448 | amb_well (bed) | the roadside well: cicadas, a dry breeze (shot 5) | -40 | -40.0 | -54.0 | +0.00 |
| 21 | 16.950 | 509 | well_winch | the bucket is wound up: the well's wooden winch + rope creak (dark, low) | -16 | -24.0 | -38.0 | -0.20 |
| 22 | 18.210 | 546 | drip | @529 the bucket comes up with a single drop - it lands in the tin with a tiny 'plip' (gap after 'course.' 18.12-18.70) | -12 | -20.0 | -34.0 | -0.15 |
| 23 | 18.380 | 551 | amb_stadium_finish (bed) | stadium finish: the crowd murmuring, expectant (dark) (shot 6) | -39 | -39.0 | -53.0 | +0.00 |
| 24 | 20.233 | 607 | tape_snap | @607 Lorz breaks the tape: a soft dark 'thwip' (under 'line was') | -12 | -20.0 | -34.0 | +0.00 |
| 25 | 21.983 | 660 | cheer_finish (bed) | @661 the crowd leaps up and CHEERS (dark under 'cheered, then they found out...'), and STOPS DEAD @752 | -36 | -36.0 | -50.0 | +0.00 |
| 26 | 22.560 | 677 | hat_fwip | straw boaters fly into the air (1/3, gap after 'cheered,' 22.55-22.87) | -15 | -23.0 | -37.0 | -0.50 |
| 27 | 22.610 | 678 | hat_fwip | straw boaters fly into the air (2/3, gap after 'cheered,' 22.55-22.87) | -15 | -23.0 | -37.0 | +0.40 |
| 28 | 22.670 | 680 | hat_fwip | straw boaters fly into the air (3/3, gap after 'cheered,' 22.55-22.87) | -15 | -23.0 | -37.0 | -0.05 |
| 29 | 22.800 | 684 | amb_road_flash (bed) | flashback road: breeze, cicadas (shot 7, under the cheer) | -43 | -43.0 | -57.0 | +0.00 |
| 30 | 23.950 | 740 | car_pass | @740-750 flashback: Lorz's car putters past (dark, R to L) | -15 | -23.0 | -37.0 | +0.00 |
| 31 | 25.340 | 760 | record_scratch | @752 the cheer stops dead (the crowd bed is cut on the frame); the soft record-scratch 'zzwip' lands in the gap after 'car.' (25.26-25.69) | -12 | -20.0 | -34.0 | +0.00 |
| 32 | 25.550 | 766 | amb_orchard (bed) | apple orchard: leaves rustling, softer cicadas, a far bird (shot 8) | -40 | -40.0 | -54.0 | +0.00 |
| 33 | 27.400 | 822 | apple_pick | @822 he picks a shiny apple: twig snap + leaf rustle (dark) | -16 | -24.0 | -38.0 | +0.30 |
| 34 | 27.667 | 830 | apple_crunch | @830 he bites it: a crunchy bite kept below 1.8 kHz (under 'apples') | -13 | -21.0 | -35.0 | +0.10 |
| 35 | 29.480 | 884 | amb_orchard_nap (bed) | orchard, the nap: leaves, soft cicadas (shot 9a) | -42 | -42.0 | -56.0 | +0.00 |
| 36 | 29.550 | 886 | blergh | @867-871 his face turns green; the sour 'bleh-uh' lands in the gap after 'rotten,' (29.50-29.82) | -11 | -19.0 | -33.0 | +0.10 |
| 37 | 30.867 | 926 | snore_in | @926 Z bubbles: a dark fluttering snore inhale (lp 600 Hz, under 'a nap') | -18 | -26.0 | -40.0 | -0.10 |
| 38 | 31.340 | 940 | snore_out | ...and the snore proper with a whistly exhale in the gap after 'nap.' (31.28-31.58) | -12 | -20.0 | -34.0 | -0.10 |
| 39 | 31.520 | 946 | amb_finish4 (bed) | @947 the finish: a small crowd murmur (shot 9b) | -42 | -42.0 | -56.0 | +0.00 |
| 40 | 32.580 | 977 | cheer_fourth (bed) | the small finish crowd cheers him in after 'fourth.' (gap 32.65-33.10) | -39 | -39.0 | -53.0 | +0.00 |
| 41 | 32.880 | 986 | amb_cornfield (bed) | cornfield: dry stalks rustling in gusts, cicadas (shot 10) | -40 | -40.0 | -54.0 | +0.00 |
| 42 | 33.767 | 1013 | frantic_feet | @1013 the runner sprints flat out (quick scuffy steps on dirt, dark) through the cornfield | -16 | -24.0 | -38.0 | +0.00 |
| 43 | 33.867 | 1013 | barks_far | @1013-1055 the dogs barking at his heels, far and dark (lp 900 Hz) under the words | -18 | -26.0 | -40.0 | +0.00 |
| 44 | 35.670 | 1070 | barks | @1055 the bark volley: 3 scrappy dogs, clear, in the gap after 'dogs.' (35.66-36.07) | -11 | -19.0 | -33.0 | +0.00 |
| 45 | 35.880 | 1076 | amb_road_hicks (bed) | the road with the trainers' car: breeze, cicadas, the car idling along beside him (dark), Hicks' shuffle (shot 11) | -38 | -38.0 | -52.0 | +0.00 |
| 46 | 40.133 | 1204 | egg_crack | @1204 an egg cracked into a cup: small dull crack + the white slipping in (dark, under 'egg') | -18 | -26.0 | -40.0 | +0.30 |
| 47 | 41.167 | 1235 | flask_glug | @1235 the brandy flask: three low hollow glugs (dark, under 'brandy') | -16 | -24.0 | -38.0 | +0.25 |
| 48 | 41.533 | 1246 | bottle_tok | @1246 the little skull bottle handed over: a dull glass 'tok' in the palm (dark, under 'strychnine') | -20 | -28.0 | -42.0 | +0.30 |
| 49 | 42.040 | 1261 | bottle_clink | ...and its bright glass 'tink' (6.6 kHz) in the gap after 'strychnine.' (it would sit on the word's 's') | -14 | -22.0 | -36.0 | +0.30 |
| 50 | 42.380 | 1271 | amb_stadium_hush (bed) | stadium, long lens: the crowd murmur thins and goes quiet for the held breath @1304 (shot 12) | -40 | -40.0 | -53.5 | +0.00 |
| 51 | 43.047 | 1304 | held_breath | @1304 the crowd's collective sharp intake of breath (far, dark), then hush | -20 | -28.0 | -42.0 | +0.00 |
| 52 | 44.320 | 1330 | amb_stadium_carry (bed) | stadium: the crowd murmur creeps back, anxious (shot 13) | -42 | -42.0 | -56.0 | +0.00 |
| 53 | 45.933 | 1378 | lift | @1378 two trainers hoist him: a dark cloth swish + shoe scuff (under 'to carry') | -20 | -28.0 | -42.0 | +0.00 |
| 54 | 46.633 | 1399 | tape_snap | @1399 carried through the tape: a soft dark 'thwip' (end of 'across') | -19 | -27.0 | -41.0 | +0.10 |
| 55 | 46.900 | 1407 | cheer_carried (bed) | the crowd cheers as he's carried through @1399 - held for the gap after 'it.' (46.90-47.40) | -38 | -38.0 | -52.0 | +0.00 |
| 56 | 46.970 | 1409 | medal_plonk | the gold medal 'plonks' onto his limp neck (gap after 'it.' 46.86-47.42) | -10 | -18.0 | -32.0 | +0.05 |
| 57 | 47.120 | 1414 | amb_course_high (bed) | high over the course: breeze, cicadas, a far crowd (shot 14) | -40 | -40.0 | -54.0 | +0.00 |
| 58 | 48.000 | 1440 | flop | @1440 a runner flops into the shade (soft dark thud) | -12 | -20.0 | -34.0 | -0.40 |
| 59 | 48.460 | 1454 | sigh | an exhausted 'haaah' as he lies there (gap after 'runners,' 48.45-48.62) | -18 | -26.0 | -40.0 | -0.40 |
| 60 | 48.500 | 1455 | wagon_creak | @1455 a runner rides off on a hay wagon: wooden axle creaks + clops far off (dark) | -17 | -25.0 | -39.0 | +0.45 |
| 61 | 48.933 | 1468 | flop | @1468 another drops onto a fence rail to sleep (soft dark thud) | -15 | -23.0 | -37.0 | +0.25 |
| 62 | 49.900 | 1497 | creek_splash | a runner sits down in the creek: a small round splash (gap after 'finished.' 49.77-50.41) | -12 | -20.0 | -34.0 | -0.30 |
| 63 | 50.080 | 1502 | sigh | ...and a contented sigh from the creek (same gap, dark) | -20 | -28.0 | -42.0 | -0.30 |
| 64 | 50.150 | 1504 | amb_boston_spring (bed) | @1507 Boston, spring 1905: sparrows + blackbirds, a soft breeze, a far street crowd (shot 15) | -37 | -37.0 | -51.0 | +0.00 |
| 65 | 50.233 | 1507 | xf_air | soft warm-air swell through the dissolve @1507 | -20 | -28.0 | -42.0 | +0.00 |
| 66 | 53.467 | 1604 | cheer_boston (bed) | @1604 the Boston street crowd cheers Lorz in (dark under 'Boston Marathon') | -39 | -39.0 | -53.0 | +0.00 |
| 67 | 53.467 | 1604 | tape_snap | @1604 Lorz breaks the Boston tape: a soft dark 'thwip' (under 'Boston') | -14 | -22.0 | -36.0 | +0.00 |
| 68 | 55.080 | 1650 | honk | @1650 the old car behind him honks: one rubber-bulb 'parp' (B-flat), right after 'foot.' ends | -9 | -17.0 | -31.0 | +0.40 |
| 69 | 55.333 | 1660 | wink_ting | @1660 the WINK: a small bright 'ting' on A7 (the 3rd of the final F6/9) | -9 | -17.0 | -31.0 | +0.25 |

## Verification
- Mix stream: `stream|sample_rate=48000|channels=2|bits_per_sample=24|duration_ts=2688000`
- exact length 2,688,000 samples, stereo: OK; voice/mix_final.wav identical to public/marathon/mix.wav: OK
- whisper small.en (int8, cpu) on voice.wav: "At the 1904 Olympics, the marathon winner was given rat poison, and that wasn't even the strangest part. The race was in St. Louis, in 90 -degree heat, on dusty dirt roads. Cars drove ahead of the runners, kicking up huge clouds of dust, and there were only two places to get water on the entire course. The first man across the finish line was Fred Lors. The crowd cheered, then they found out he'd ridden 10 miles of it in a car. One runner from Cuba stopped to eat apples from an orchard. They were rotten, so he lay down and took a nap. He still finished fourth. Another runner was chased a mile off course by dogs, and the real winner, Thomas Hicks, was barely alive. His trainers kept him going with egg whites, brandy and strictening. Luckily, he made it to the finish line. Unluckily, his trainers had to carry him across it. Of 32 runners, only 14 finished, and the man who rode in the car. The next year he won the Boston Marathon on foot."
- whisper small.en on the mix: "At the 1904 Olympics, the marathon winner was given rat poison, and that wasn't even the strangest part. The race was in St. Louis, in 90 degree heat, on dusty dirt roads. Cars drove ahead of the runners, kicking up huge clouds of dust. There were only two places to get water on the entire course. The first man across the finish line was Fred Lors. The crowd cheered, then they found out he'd ridden 10 miles of it in a car. One runner from Cuba stopped to eat apples from an orchard. They were rotten, so he lay down and took a nap. He still finished fourth. Another runner was chased a mile off course by dogs, and the real winner Thomas Hicks was barely alive. His trainers kept him going with egg whites, brandy and strictening. Luckily he made it to the finish line. Unluckily, his trainers had to carry him across it. Of 32 runners, only 14 finished, and the man who rode in the car. The next year he won the Boston Marathon, on foot."
- word-level diff voice.wav -> mix: - and
- word-level diff voice.wav -> voice stem alone (same voice, +master gain and limiter, no music / SFX): - and
- word-level diff voice stem alone -> mix (what the music + SFX change): IDENTICAL
- SCRIPT.md words not literally in the voice-only transcript (whisper writes numbers as digits): ['saint', 'lorz', 'strychnine']
- SCRIPT.md words not literally in the mix transcript: ['saint', 'lorz', 'strychnine']
- 'poison': voice-only probs [1.0], mix probs [1.0]
- 'lorz': voice-only probs [], mix probs []
- 'car': voice-only probs [1.0, 1.0], mix probs [1.0, 1.0]
- 'rotten': voice-only probs [0.94], mix probs [0.92]
- 'nap': voice-only probs [1.0], mix probs [1.0]
- 'fourth': voice-only probs [0.81], mix probs [0.76]
- 'dogs': voice-only probs [0.98], mix probs [0.98]
- 'strychnine': voice-only probs [], mix probs []
- 'unluckily': voice-only probs [0.98], mix probs [0.98]
- 'carry': voice-only probs [1.0], mix probs [1.0]
- 'fourteen': voice-only probs [0.99], mix probs [0.99]
- 'foot': voice-only probs [0.98], mix probs [0.99]
- 'race': voice-only probs [1.0], mix probs [1.0]
- 'heat': voice-only probs [1.0], mix probs [1.0]
- 'dust': voice-only probs [1.0], mix probs [1.0]
- 'water': voice-only probs [1.0], mix probs [1.0]
- 'cheered': voice-only probs [1.0], mix probs [1.0]
- 'apples': voice-only probs [1.0], mix probs [1.0]
- 'egg': voice-only probs [0.74], mix probs [0.77]
- 'brandy': voice-only probs [0.98], mix probs [0.97]
- 'boston': voice-only probs [0.99], mix probs [0.99]

Key-word windows (~3.5 s around each word, voice.wav vs the voice stem alone vs the mix, same cut; edges snapped to the quietest 10 ms of the voice within +-0.8 s, whisper on voice.wav vs on the mix, same cut):

| word | window s | voice.wav | voice stem (mix gain + limiter) | mix | mix vs voice stem | key-word prob voice / stem / mix |
|---|---|---|---|---|---|---|
| poison | 2.07-6.33 | The marathon winner was given rat poison, and that wasn't even the strangest part. | The marathon winner was given rat poison, and that wasn't even the strangest part. | The marathon winner was given rat poison, and that wasn't even the strangest part. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| race | 5.96-9.60 | part. The race was in St. Louis, in 90 degree heat. | part. The race was in St. Louis, in 90 degree heat. | park. The race was in St. Louis in 90 degree heat. | word OK, context differs | [1.0] / [0.99] / [1.0] |
| heat | 6.61-10.91 | The race was in St. Louis in 90 -degree heat on dusty dirt roads. | The race was in St. Louis in 90 degree heat on dusty dirt roads. | The race was in St. Louis in 90 degree heat on dusty dirt roads. | IDENTICAL | [1.0] / [1.0] / [0.99] |
| dust | 12.88-16.27 | kicking up huge clouds of dust. There were only two places | kicking up huge clouds of dust. There were only two places | kicking up huge clouds of dust. There were only two places | IDENTICAL | [1.0] / [1.0] / [1.0] |
| water | 14.70-18.19 | There were only two places to get water on the entire cores. | There were only two places to get water on the entire course. | There were only two places to get water on the entire course. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| lorz | 18.57-22.64 | The first man across the finish line was Fred Lors. The crowd cheered. | The first man across the finish line was Fred Lors. The crowd cheered. | The first man across the finish line was Fred Lorz. The crowd cheered. | word OK, context differs | [] / [] / [0.56] |
| cheered | 20.45-23.97 | was Fred Lors. The crowd cheered, then they found out he'd written | was Fred Lors. The crowd cheered. Then they found out he'd written | was Fred Lorz. The crowd cheered, then they found out he'd written | word OK, context differs | [1.0] / [1.0] / [1.0] |
| car | 22.64-27.19 | Then they found out he'd ridden 10 miles of it in a car. One runner from Cuba stopped... | Then they found out he'd ridden 10 miles of it in a car. One runner from Cuba stopped... | Then they found out he'd ridden 10 miles of it in a car. One runner from Cuba stopped | IDENTICAL | [1.0] / [1.0] / [1.0] |
| apples | 25.36-28.59 | One runner from Cuba stopped to eat apples from an orchard. | One runner from Cuba stopped to eat apples from an orchard. | One runner from Cuba stopped to eat apples from an orchard. | IDENTICAL | [1.0] / [0.99] / [1.0] |
| rotten | 27.19-31.34 | to eat apples from an orchard. They were rotten, so he lay down and took a nap. | to eat apples from an orchard. They were rotten, so he laid down and took a nap. | to eat apples from an orchard. They were rotten, so he laid down and took a nap. | IDENTICAL | [0.99] / [0.99] / [0.98] |
| nap | 28.59-32.76 | They were rotten, so he laid down and took a nap. He still finished fourth. | They were rotten, so he lay down and took a nap. He still finished fourth. | They were rotten, so he laid down and took a nap. He still finished fourth. | word OK, context differs | [1.0] / [1.0] / [1.0] |
| fourth | 31.34-34.13 | He still finished fourth. Another runner was chased | He still finished 4th, another runner was chased | He still finished 4th, another runner was chased | IDENTICAL | [0.71] / [] / [] |
| dogs | 32.76-37.52 | Another runner was chased a mile off course by dogs and the real winner Thomas Hicks | Another runner was chased a mile off course by dogs and the real winner Thomas Hicks | Another runner was chased a mile off course by dogs and the real winner Thomas Hicks | IDENTICAL | [0.93] / [0.95] / [0.87] |
| egg | 38.61-42.08 | His trainers kept him going with egg whites, brandy and strychnine. | His trainers kept him going with egg whites, brandy and strictening. | His trainers kept him going with egg whites, brandy and strychnine. | word OK, context differs | [0.62] / [0.67] / [0.62] |
| brandy | 38.73-42.23 | His trainers kept him going with egg whites, brandy and strychnine. | His trainers kept him going with egg whites, brandy and strychnine. | His trainers kept him going with egg whites, brandy and strychnine. | IDENTICAL | [0.96] / [0.97] / [0.95] |
| strychnine | 39.57-44.13 | him going with egg whites, brandy and strictening. Luckily, he made it to the finish line. | him going with egg whites, brandy and strychnine. Luckily he made it to the finish line. | him going with egg whites, brandy and strictening. Luckily he made it to the finish line. | same as voice.wav (whisper spells it differently on voice.wav itself) | [] / [0.77] / [] |
| unluckily | 42.08-46.95 | Luckily, he made it to the finish line. Unluckily, his trainers had to carry him across it. | Luckily, he made it to the finish line. Unluckily, his trainers had to carry him across it. | Luckily, he made it to the finish line. Unluckily, his trainers had to carry him across it. | IDENTICAL | [0.98] / [0.98] / [0.97] |
| carry | 44.13-47.07 | Unluckily, his trainers had to carry him across it. | Unluckily, his trainers had to carry him across it. | Unluckily, his trainers had to carry him across it. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| fourteen | 46.95-49.97 | Of 32 runners, only 14 finished. | Of 32 runners, only 14 finished. | Of 32 runners, only 14 finished. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| car | 49.90-52.89 | and the man who rode in the car, the next year | and the man who rode in the car the next year | and the man who rode in the car the next year | IDENTICAL | [1.0] / [1.0] / [1.0] |
| boston | 51.81-54.44 | The next year, he won the Boston Marathon. | The next year, he won the Boston Marathon. | The next year, he won the Boston Marathon. | IDENTICAL | [1.0] / [0.99] / [0.99] |
| foot | 52.89-55.80 | he won the Boston Marathon, on foot. | he won the Boston Marathon, on foot. | He won the Boston Marathon, on foot. | IDENTICAL | [0.97] / [0.96] / [0.98] |
