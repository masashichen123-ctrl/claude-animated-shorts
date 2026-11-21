# The Great Emu War - soundtrack cue sheet

All sound is original and synthesized in numpy/scipy: instruments in `instruments.py` (brass, snare, glock, timpani from the shared kit + banjo, Rhodes, soft kick, shaker and more added here), SFX in `sfx_emu.py` / `sfx_gen.py`; placed by `music.py` / `sfx.py` from `timeline.py` (frames from SHOTS.md), mixed by `mix.py`.
Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch, no time change). Rebuild everything + verify: `bash audio/build.sh` (about 1.5 min; mix only: `python3 audio/mix.py --fresh`).

## Files
| file | content |
|---|---|
| `public/emu/mix.wav` = `voice/mix_final.wav` | final mix, 48 kHz, stereo, 24-bit, 2,832,000 samples = 59.000 s |
| `audio/out/stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain, after the master limiter's gain curve: voice + music + sfx = mix.wav |
| `audio/check.py` | verification: transcription of voice.wav vs the mix (faster-whisper small.en), clicks, duration, loudness |

## Master loudness (own BS.1770-4 meter)
- Integrated **-14.02 LUFS**, true peak **-1.30 dBTP**, LRA 1.6 LU, max momentary -9.6 LUFS, max short-term -13.2 LUFS; 0 samples at full scale
- Stems at mix gain: voice -14.0 LUFS (peak -0.9 dBFS), music -30.8 LUFS, sfx -33.8 LUFS (master gain +7.81 dB and the limiter gain curve, the same on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.3 dBTP): max gain reduction 6.13 dB, active (>0.1 dB) on 28.02 % of samples; inside speech: max 6.13 dB, 90th / 99th percentile 0.93 / 3.74 dB, active on 33.0 % of speech samples. This peak limiting is the only processing besides gain that reaches the narration: the TTS voice has an 18.3 dB true-peak-to-loudness ratio, so -14 LUFS at <= -1 dBTP cannot be reached with gain alone.
- Discontinuity check: 240 boundaries (start + end of every placed SFX event, every music cut-off) checked in the final mix, 0 suspicious.

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -14.0 LUFS
    Threshold: -24.4 LUFS
  Loudness range:
    LRA:         1.6 LU
    Threshold: -34.4 LUFS
    LRA low:   -15.2 LUFS
    LRA high:  -13.6 LUFS
  True peak:
    Peak:       -1.3 dBFS
```

## Voice on top: per-section loudness
Key: words.json spans, widened by the voice's own measured activity (TTS word times drift by up to 0.25 s). Music: -3 dB gentle duck under speech (attack 250 ms, release 600 ms) + +4 dB bloom in gaps >= 0.55 s; section gain set so the music sits -18.5 LU (+ per-section offset) under the voice over the spoken parts. SFX: -3 dB duck under speech.
Columns: integrated LUFS per stem at mix gain; then over 400 ms windows centred on speech: median voice-music, median and 10th percentile voice-bed (bed = music + sfx); bloom = median music level in the gaps minus in speech (LU).

| section | time s | voice | music | sfx | voice-music (speech, med) | voice-bed med | voice-bed p10 | bloom |
|---|---|---|---|---|---|---|---|---|
| hook | 0.00-3.97 | -13.8 | -31.3 | -35.6 | 17.9 | 17.1 | 11.9 | -0.2 |
| lost | 3.97-5.23 | -12.6 | -28.9 | -35.5 | 16.9 | 16.0 | 9.3 | 2.0 |
| farm | 5.23-10.17 | -14.0 | -30.9 | -45.9 | 17.6 | 17.5 | 13.1 | 0.1 |
| emus | 10.17-12.97 | -13.4 | -31.8 | -39.1 | 18.6 | 18.0 | 11.0 | -0.3 |
| phone | 12.97-15.00 | -13.2 | -30.8 | -31.0 | 17.8 | 17.6 | 13.8 | 3.6 |
| army | 15.00-20.07 | -13.8 | -31.9 | -37.8 | 18.5 | 17.8 | 13.3 | -0.7 |
| firstday | 20.07-23.17 | -12.9 | -31.0 | -29.7 | 18.1 | 16.4 | 11.8 | -1.2 |
| dam | 23.17-26.70 | -13.7 | -31.9 | -40.8 | 18.8 | 17.8 | 13.7 | 1.9 |
| jam | 26.70-27.50 | -14.4 | -50.8 | -30.6 | 32.7 | 14.1 | 13.1 | 9.6 |
| truck | 27.50-31.23 | -13.5 | -30.8 | -31.0 | 16.7 | 15.0 | 10.7 | 1.2 |
| camp | 31.23-37.83 | -14.5 | -32.2 | -38.5 | 18.6 | 17.6 | 12.9 | 2.9 |
| dump | 37.83-40.03 | -14.6 | -31.8 | -36.5 | 16.2 | 15.9 | 14.0 | 4.1 |
| unlucky | 40.03-42.33 | -14.1 | -32.3 | -32.4 | 18.6 | 16.1 | 14.2 | 1.6 |
| toy | 42.33-46.07 | -13.9 | -32.0 | -34.9 | 18.0 | 16.2 | 13.8 | 0.9 |
| scatter | 46.07-50.13 | -14.4 | -31.7 | -36.7 | 17.5 | 16.5 | 12.9 | -0.2 |
| parade | 50.13-55.20 | -14.3 | -32.2 | -40.8 | 18.0 | 17.6 | 11.2 | 1.1 |
| home | 55.20-56.47 | -13.2 | -30.7 | -35.6 | 17.6 | 16.5 | 10.5 | -2.3 |
| ending | 56.47-59.00 | -11.8 | -24.7 | -35.6 | 22.4 | 22.3 | 18.3 | 10.0 |

Music under the voice: median over the sections' speech windows 18.0 LU; in the longer gaps (>= 0.55 s) the music's median momentary level is 12.3 LU under the voice's integrated loudness.

Applied section gains (dB): hook -17.5, lost -15.5, farm -19.3, emus -19.6, phone -20.7, army -19.9, firstday -18.5, dam -19.7, jam -19.7, truck -19.8, camp -19.9, dump -21.0, unlucky -15.5, toy -21.2, scatter -21.6, parade -19.7, home -16.6, ending -16.1. Music rides: 40.15-40.70 s -2.0 dB.

Narration gaps (measured on voice.wav), where the loud hits and the music blooms go: 1.43-1.75, 4.75-5.39, 6.48-6.87, 9.84-10.28, 14.57-15.17, 17.31-17.65, 19.81-20.16, 20.91-21.12, 22.92-23.32, 27.13-27.56, 30.94-31.39, 34.43-34.72, 37.46-37.99, 39.90-40.20, 41.86-42.44, 45.86-46.21, 48.04-48.24, 49.71-50.29, 54.68-55.22, 56.31-56.60.

## Music map (chill re-score: laid-back acoustic / lo-fi bed, F major, 88 bpm, swung eighths)
Fingerpicked nylon guitar, warm Rhodes, round upright bass, brushes + shaker + soft kick (no snare, no crashes, no rolls), vibes sparkles, and a small playful EMU figure (A-D-C-A..G-A, muted banjo), all composed here; progressions Fmaj7-Dm7-Gm7-C9 and Dm7-Bbmaj7-Gm7-C9. The first brass-march score is kept for reference in `music_march.py` (not used).

| time s | frame | music |
|---|---|---|
| 0.00 | 0 | HOOK: fingerpicked nylon guitar + warm Rhodes (Fmaj7 - Dm7), no drums; the emu figure peeks in on 'emus' |
| 3.97 | 119 | FLASH @119: soft shimmer - reversed vibes swell into the frame, a light high vibes chord on it |
| 4.32 | 130 | 'And lost.' @128: one soft muted-trombone 'wah' sliding down a tritone |
| 5.23 | 157 | FARM (XF @157): the laid-back groove starts - guitar, upright bass, Rhodes, brushes + shaker + soft kick (Fmaj7 Dm7 Bbmaj7 Gm7, one bar each, through shot 5) |
| 10.17 | 305 | EMUS ARRIVE: the groove carries on; the little muted-banjo emu figure hops in (and again after 'ate it.') |
| 15.00 | 450 | ARMY ARRIVES / FIRST DAY: loop A, unhurried - no fanfare; emu figure after 'range.' as they trot off |
| 23.17 | 695 | DAM (XF @695): thinner - guitar, bass, Rhodes, shaker; emu figure |
| 26.70 | 801 | JAM @801: the music simply stops (30 ms fade) - silence for the clack, the spring and 'jammed.' |
| 27.50 | 825 | TRUCK @825: the groove comes back as if nothing happened; emu figure on 'outran' |
| 31.23 | 937 | CAMP (XF @937): dusk, no drums - guitar, bass, Rhodes (Fmaj7 Bbmaj7); vibes sparkle on the pen flourish @963 |
| 34.67 | 1040 | CASINGS reveal @1040: mellow chord change to Dbmaj7 -> C9, vibes glints across the stereo field |
| 37.83 | 1135 | DUMP: groove (loop A) |
| 40.03 | 1201 | UNLUCKILY: only bass + Rhodes under the line; the emu figure after 'ten.' |
| 42.33 | 1270 | TOY MARCH: groove back; the toy soldiers' boots fall on 42.5 + k/2 (SFX), the music stays relaxed underneath |
| 46.07 | 1382 | SCATTER: emu figure flung left / right / centre (transposed) over the minor loop |
| 50.13 | 1504 | PARADE (XF @1504): no drums, Bbmaj7 - Am7, warm; vibes sparkle as 'world.' ends |
| 55.20 | 1656 | HOME: guitar + Rhodes only (Gm7 - C9), unresolved |
| 57.93 | 1738 | ENDING: warm resolve on Fmaj9 (guitar strum, Rhodes, low F) landing with the blink @1756, vibes chime on the blink; fade to 59.0 |

## SFX events
naive = the event's level vs the voice stem (max momentary, LU); applied = naive - 6 dB + offsets; beds are integrated loudness. 'mix LUFS' = max momentary in the final mix (before the speech duck). Frames marked * are chosen here (not pinned in SHOTS.md): emu steps [24, 38, 52], crank [(389, 402), (436, 449)], pats [1166, 1180], toy march 1275+15k, head turn (1736, 1750), blink 1756.

| # | time s | frame | cue | what | naive | applied | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0 | amb_morning (bed) | stubble field, morning: breeze, wheat rustle, flies round the sweating soldier, magpies far off (shots 1-2) | -34 | -34.0 | -48.0 | +0.00 |
| 2 | 0.667 | 20 | wheat_part | wheat stalks pushed aside as the emu steps out | -16 | -24.0 | -38.0 | +0.15 |
| 3 | 0.800 | 24 | emu_step | the big emu steps out of the wheat (1/3) | -11 | -19.0 | -33.1 | +0.15 |
| 4 | 1.267 | 38 | emu_step | the big emu steps out of the wheat (2/3) | -11 | -19.0 | -33.1 | +0.15 |
| 5 | 1.733 | 52 | emu_step | the big emu steps out of the wheat (3/3) | -11 | -19.0 | -33.1 | +0.15 |
| 6 | 3.300 | 99 | emu_boom | emu leans in on 'emus' @98: low drumming boom from its chest (stare-down) | -10 | -18.0 | -32.0 | +0.10 |
| 7 | 3.967 | 119 | flash_swell | reverse swell into the white FLASH @119 (peaks on the frame) | -13 | -21.0 | -35.0 | +0.00 |
| 8 | 4.200 | 126 | kick_impact | KICK @126: the Lewis gun goes over - dull thump + metal clatter in the stubble | -11 | -19.0 | -33.0 | -0.20 |
| 9 | 4.800 | 144 | emu_boom | the emu on the crate puffs its chest: short proud boom after 'lost.' | -10 | -18.0 | -32.0 | +0.20 |
| 10 | 5.150 | 154 | amb_farm (bed) | farm, day: wheat swaying in the wind, windmill squeak every 2.4 s, magpies carolling, a fly (shots 3-4) | -33 | -33.0 | -47.0 | +0.00 |
| 11 | 5.233 | 157 | xf_whoosh | soft air swell through the dissolve @157 | -16 | -24.0 | -38.0 | +0.00 |
| 12 | 10.167 | 305 | emu_herd | 100+ emus pour over the hill into the wheat: running feet thunder (swells in), booms and grunts | -13 | -21.0 | -35.1 | +0.00 |
| 13 | 12.267 | 368 | pecking | close emus peck the wheat away ('ate' @370): beak pecks + stalks crunching | -12 | -20.0 | -34.0 | +0.00 |
| 14 | 12.930 | 388 | amb_verandah (bed) | verandah: breeze, flies, emus pecking and grunting in the yard (shot 5) | -36 | -36.0 | -50.0 | +0.00 |
| 15 | 12.967 | 389 | phone_crank | wall telephone: magneto crank + generator whine + bells ringing (burst 1/2) | -12 | -20.0 | -34.0 | -0.30 |
| 16 | 14.533 | 436 | phone_crank | wall telephone: magneto crank + generator whine + bells ringing (burst 2/2) | -11 | -19.0 | -33.0 | -0.30 |
| 17 | 14.550 | 436 | truck_arrive | army truck rushing in (1930s 4-cylinder, off the throttle) into the stop @456 | -12 | -20.0 | -34.0 | -0.30 |
| 18 | 14.640 | 456 | truck_skid | SKID to a stop in red dust, ending exactly on @456 (dirt crunch + scrub, body rock) | -6 | -12.0 | -26.0 | -0.20 |
| 19 | 15.000 | 450 | amb_road (bed) | red dirt road: hot breeze, a far magpie (shot 6) | -37 | -37.0 | -51.0 | +0.00 |
| 20 | 15.200 | 456 | truck_idle | engine idling (low putter, under the line) until the cut @527 | -14 | -22.0 | -38.3 | -0.30 |
| 21 | 16.733 | 502 | salute | two soldiers salute @502: heel clicks + hand swish | -12 | -20.0 | -34.0 | +0.20 |
| 22 | 18.100 | 543 | gun_cock | Lewis gun on its tripod cocked @543 | -13 | -21.0 | -35.0 | +0.10 |
| 23 | 19.400 | 582 | crate_thud | one more ammo crate on the stack @582: box thud + rounds rattling inside | -10 | -18.0 | -32.1 | +0.15 |
| 24 | 20.030 | 601 | amb_paddock (bed) | open paddock: wind (shot 7) | -37 | -37.0 | -51.0 | +0.00 |
| 25 | 20.075 | 602 | lewis_burst | Lewis gun burst, 2 rounds at 9.4/s (cracks + drum rattle + casings) | -4 | -10.0 | -24.0 | -0.10 |
| 26 | 20.355 | 611 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -24.0 | -38.0 | +0.34 |
| 27 | 20.400 | 612 | emus_trot_far | the emus trot calmly away over the rise (far, fading) | -16 | -24.0 | -38.3 | +0.00 |
| 28 | 20.461 | 614 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -24.0 | -38.0 | -0.41 |
| 29 | 20.920 | 628 | lewis_burst | Lewis gun burst, 3 rounds at 9.4/s (cracks + drum rattle + casings) | -4 | -10.0 | -24.0 | -0.10 |
| 30 | 21.200 | 636 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -24.0 | -38.0 | -0.32 |
| 31 | 21.306 | 639 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -24.0 | -38.0 | +0.47 |
| 32 | 21.413 | 642 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -24.0 | -38.0 | -0.04 |
| 33 | 21.580 | 647 | lewis_burst | Lewis gun burst, 5 rounds at 9.4/s (cracks + drum rattle + casings) - soft, under the line | -4 | -19.0 | -34.8 | -0.10 |
| 34 | 21.860 | 656 | dust_puff_far | dust puff falling short, far out in the paddock | -25 | -33.0 | -47.0 | -0.44 |
| 35 | 21.966 | 659 | dust_puff_far | dust puff falling short, far out in the paddock | -25 | -33.0 | -47.0 | +0.11 |
| 36 | 22.073 | 662 | dust_puff_far | dust puff falling short, far out in the paddock | -25 | -33.0 | -47.0 | -0.16 |
| 37 | 22.179 | 665 | dust_puff_far | dust puff falling short, far out in the paddock | -25 | -33.0 | -47.0 | +0.31 |
| 38 | 22.286 | 669 | dust_puff_far | dust puff falling short, far out in the paddock | -25 | -33.0 | -47.0 | -0.28 |
| 39 | 22.930 | 688 | lewis_burst | Lewis gun burst, 3 rounds at 9.4/s (cracks + drum rattle + casings) | -4 | -10.0 | -24.0 | -0.10 |
| 40 | 23.100 | 693 | amb_dam (bed) | farm dam, golden afternoon: water lapping, emus drinking and grunting, magpies (shot 8) | -34 | -34.0 | -48.0 | +0.00 |
| 41 | 23.167 | 695 | xf_whoosh | soft air swell through the dissolve @695 | -16 | -24.0 | -38.0 | +0.00 |
| 42 | 23.210 | 696 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -24.0 | -38.0 | +0.26 |
| 43 | 23.316 | 699 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -24.0 | -38.0 | +0.43 |
| 44 | 23.423 | 703 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -24.0 | -38.0 | -0.44 |
| 45 | 26.700 | 801 | jam_clack | the gun JAMS @801: bolt slams and stops dead (clack) + thunk + smoke puff | -4 | -10.0 | -24.0 | +0.00 |
| 46 | 26.720 | 801 | spring_boing | the drum spring pops out @801: 'sproing' + wobbling twang | -9 | -17.0 | -31.0 | +0.15 |
| 47 | 27.450 | 824 | amb_paddock2 (bed) | paddock: wind (shot 9) | -38 | -38.0 | -52.0 | +0.00 |
| 48 | 27.900 | 837 | hammer_metal | Meredith hammers the gun mount onto the truck tray (1/4) | -9 | -17.0 | -31.0 | +0.25 |
| 49 | 28.033 | 841 | hammer_metal | Meredith hammers the gun mount onto the truck tray (2/4) | -9 | -17.0 | -31.0 | +0.25 |
| 50 | 28.200 | 846 | hammer_metal | Meredith hammers the gun mount onto the truck tray (3/4) | -9 | -17.0 | -31.0 | +0.25 |
| 51 | 28.333 | 850 | hammer_metal | Meredith hammers the gun mount onto the truck tray (4/4) | -9 | -17.0 | -31.0 | +0.25 |
| 52 | 29.187 | 875 | gear_crunch | crash gearbox: teeth grind then the gear clunks in @875 | -9 | -17.0 | -31.0 | -0.10 |
| 53 | 29.267 | 878 | emu_herd_run | the emus sprint ahead and pull away by 'outran' @902 | -12 | -20.0 | -34.1 | +0.30 |
| 54 | 29.317 | 880 | truck_engine | truck engine flat out across the paddock (revs climbing) | -10 | -18.0 | -32.0 | -0.10 |
| 55 | 29.417 | 882 | truck_bounce | truck bounces on the rough paddock (suspension thud, leaf-spring creak, tray + gun rattle) | -14 | -21.8 | -35.8 | -0.10 |
| 56 | 29.790 | 894 | truck_bounce | truck bounces on the rough paddock (suspension thud, leaf-spring creak, tray + gun rattle) | -14 | -22.0 | -36.1 | -0.10 |
| 57 | 30.083 | 902 | truck_bounce | truck bounces on the rough paddock (suspension thud, leaf-spring creak, tray + gun rattle) | -14 | -22.2 | -36.3 | -0.10 |
| 58 | 30.384 | 912 | truck_bounce | truck bounces on the rough paddock (suspension thud, leaf-spring creak, tray + gun rattle) | -13 | -20.6 | -34.8 | -0.10 |
| 59 | 30.666 | 920 | truck_bounce | truck bounces on the rough paddock (suspension thud, leaf-spring creak, tray + gun rattle) | -13 | -21.4 | -35.5 | -0.10 |
| 60 | 30.930 | 928 | lewis_wild | the bouncing gunner lets off a wild burst (into the sky) | -9 | -17.0 | -31.0 | -0.10 |
| 61 | 31.032 | 931 | truck_bounce | truck bounces on the rough paddock (suspension thud, leaf-spring creak, tray + gun rattle) | -15 | -22.7 | -36.9 | -0.10 |
| 62 | 31.150 | 934 | amb_dusk (bed) | army camp at dusk: crickets, the oil lamp's hiss, a soft breeze (shot 10) | -36 | -36.0 | -50.0 | +0.00 |
| 63 | 31.233 | 937 | xf_whoosh | soft air swell through the dissolve @937 | -16 | -24.0 | -38.0 | +0.00 |
| 64 | 31.550 | 946 | pen_scratch | Meredith writing the report: nib scratching | -16 | -24.0 | -38.0 | +0.20 |
| 65 | 32.050 | 963 | pen_flourish | the proud pen FLOURISH @963 ending in a full stop | -11 | -19.0 | -33.0 | +0.20 |
| 66 | 32.750 | 982 | pen_tally | tally marks: five quick strokes | -19 | -27.0 | -41.0 | +0.20 |
| 67 | 34.667 | 1040 | casings | pull-back reveals the MOUNTAIN of brass casings @1040-1087: casings trickling and glinting, sliding hiss | -11 | -19.0 | -33.0 | +0.30 |
| 68 | 37.500 | 1125 | casings_slide | a little avalanche of casings after 'bullets.' | -12 | -20.0 | -34.0 | +0.40 |
| 69 | 37.800 | 1134 | amb_dump (bed) | supply dump, day: breeze, magpie (shot 11) | -38 | -38.0 | -52.0 | +0.00 |
| 70 | 38.867 | 1166 | crate_pat | soldier proudly pats the crate wall (1/2) | -12 | -20.0 | -34.0 | +0.25 |
| 71 | 39.333 | 1180 | crate_pat | soldier proudly pats the crate wall (2/2) | -12 | -20.0 | -34.0 | +0.25 |
| 72 | 40.000 | 1200 | amb_paddock3 (bed) | paddock: breeze, flies (shot 12) | -38 | -38.0 | -52.0 | +0.00 |
| 73 | 40.100 | 1203 | lewis_far | the gun chattering away off screen (distant, low) | -16 | -24.0 | -38.0 | -0.60 |
| 74 | 40.150 | 1204 | emu_step | the emu strolls on, unbothered | -15 | -23.0 | -37.4 | -0.30 |
| 75 | 40.167 | 1205 | dust_puff | bullet dust puff 1/10 popping round the emu's feet (every 4 f from @1205) | -14 | -22.0 | -39.1 | -0.50 |
| 76 | 40.300 | 1209 | dust_puff | bullet dust puff 2/10 popping round the emu's feet (every 4 f from @1205) | -14 | -22.0 | -39.2 | -0.40 |
| 77 | 40.433 | 1213 | dust_puff | bullet dust puff 3/10 popping round the emu's feet (every 4 f from @1205) | -14 | -22.0 | -38.9 | -0.30 |
| 78 | 40.567 | 1217 | dust_puff | bullet dust puff 4/10 popping round the emu's feet (every 4 f from @1205) | -14 | -22.0 | -38.9 | -0.20 |
| 79 | 40.600 | 1218 | emu_step | the emu strolls on, unbothered | -15 | -23.0 | -37.3 | -0.10 |
| 80 | 40.700 | 1221 | dust_puff | bullet dust puff 5/10 popping round the emu's feet (every 4 f from @1205) | -10 | -18.0 | -33.4 | -0.10 |
| 81 | 40.833 | 1225 | dust_puff | bullet dust puff 6/10 popping round the emu's feet (every 4 f from @1205) | -10 | -18.0 | -33.4 | +0.00 |
| 82 | 40.967 | 1229 | dust_puff | bullet dust puff 7/10 popping round the emu's feet (every 4 f from @1205) | -10 | -18.0 | -33.4 | +0.10 |
| 83 | 41.050 | 1232 | emu_step | the emu strolls on, unbothered | -15 | -23.0 | -37.4 | +0.10 |
| 84 | 41.100 | 1233 | dust_puff | bullet dust puff 8/10 popping round the emu's feet (every 4 f from @1205) | -10 | -18.0 | -33.4 | +0.20 |
| 85 | 41.233 | 1237 | dust_puff | bullet dust puff 9/10 popping round the emu's feet (every 4 f from @1205) | -10 | -18.0 | -33.4 | +0.30 |
| 86 | 41.367 | 1241 | dust_puff | bullet dust puff 10/10 popping round the emu's feet (every 4 f from @1205) | -10 | -18.0 | -33.4 | +0.40 |
| 87 | 41.500 | 1245 | emu_step | the emu strolls on, unbothered | -15 | -23.0 | -37.3 | +0.30 |
| 88 | 41.967 | 1259 | emu_peck | the emu pecks once (after 'ten.') | -9 | -17.0 | -31.0 | +0.30 |
| 89 | 42.300 | 1269 | amb_parade (bed) | flat parade ground: light breeze (shot 13) | -41 | -41.0 | -55.0 | +0.00 |
| 90 | 42.500 | 1275 | boots_step | enemy line marching in step: boots on hard ground, all together (1/8) | -9 | -17.0 | -31.1 | +0.00 |
| 91 | 43.000 | 1290 | boots_step | enemy line marching in step: boots on hard ground, all together (2/8) | -9 | -19.0 | -33.1 | +0.00 |
| 92 | 43.500 | 1305 | boots_step | enemy line marching in step: boots on hard ground, all together (3/8) | -9 | -17.0 | -31.1 | +0.00 |
| 93 | 44.000 | 1320 | boots_step | enemy line marching in step: boots on hard ground, all together (4/8) | -9 | -19.0 | -33.3 | +0.00 |
| 94 | 44.500 | 1335 | boots_step | enemy line marching in step: boots on hard ground, all together (5/8) | -9 | -17.0 | -31.1 | +0.00 |
| 95 | 45.000 | 1350 | boots_step | enemy line marching in step: boots on hard ground, all together (6/8) | -9 | -19.0 | -33.0 | +0.00 |
| 96 | 45.500 | 1365 | boots_step | enemy line marching in step: boots on hard ground, all together (7/8) | -9 | -17.0 | -31.3 | +0.00 |
| 97 | 46.000 | 1380 | boots_step | enemy line marching in step: boots on hard ground, all together (8/8) | -9 | -19.0 | -33.2 | +0.00 |
| 98 | 46.030 | 1381 | amb_paddock4 (bed) | paddock: wind (shot 14) | -39 | -39.0 | -53.0 | +0.00 |
| 99 | 46.067 | 1382 | emu_stampede | running thunder of the herd radiating in every direction (wide stereo) | -12 | -20.0 | -34.1 | +0.00 |
| 100 | 46.067 | 1382 | scatter_whoosh | SCATTER @1382: big outward whoosh as 60+ emus burst from the centre | -9 | -17.0 | -31.0 | +0.00 |
| 101 | 48.333 | 1450 | spin_whoosh | the gunner spins on the spot (whoosh 1/4, panning round) | -10 | -18.0 | -32.0 | +0.00 |
| 102 | 48.753 | 1463 | spin_whoosh | the gunner spins on the spot (whoosh 2/4, panning round) | -15 | -23.0 | -37.0 | +0.00 |
| 103 | 49.173 | 1475 | spin_whoosh | the gunner spins on the spot (whoosh 3/4, panning round) | -15 | -23.0 | -37.0 | +0.00 |
| 104 | 49.593 | 1488 | spin_whoosh | the gunner spins on the spot (whoosh 4/4, panning round) | -15 | -23.0 | -37.0 | +0.00 |
| 105 | 50.080 | 1502 | amb_golden (bed) | golden parade ground: soft breeze, far magpie (shot 15) | -38 | -38.0 | -52.0 | +0.00 |
| 106 | 50.133 | 1504 | xf_whoosh | soft air swell through the dissolve @1504 | -16 | -24.0 | -38.0 | +0.00 |
| 107 | 50.200 | 1506 | emu_boom | helmeted emus in formation boom, low | -14 | -22.0 | -36.0 | -0.40 |
| 108 | 52.100 | 1563 | emu_boom | helmeted emus in formation boom, low | -16 | -24.0 | -38.0 | -0.16 |
| 109 | 53.120 | 1594 | emu_boom | helmeted emus in formation boom, low | -15 | -23.0 | -37.0 | +0.14 |
| 110 | 54.700 | 1641 | emu_boom_chorus | the whole emu army booms back after 'world.' (a chorus of drumming) | -12 | -20.0 | -34.0 | +0.00 |
| 111 | 55.170 | 1655 | amb_sunset (bed) | sunset road: breeze (shot 16) | -38 | -38.0 | -52.0 | +0.00 |
| 112 | 55.220 | 1657 | gear_crunch | gear crunch as the truck pulls away | -12 | -20.0 | -34.0 | +0.10 |
| 113 | 55.300 | 1659 | truck_away | truck driving away down the road into the sunset (engine receding, getting duller) | -10 | -18.0 | -34.7 | +0.10 |
| 114 | 56.330 | 1690 | gun_sag | the gun on the back sags: slow metal creak (in the gap before 'The emus...') | -14 | -22.0 | -38.6 | +0.10 |
| 115 | 56.430 | 1693 | amb_wheat (bed) | golden wheat: rustle, breeze, a magpie, a fly (shot 17) | -35 | -35.0 | -49.0 | +0.00 |
| 116 | 57.867 | 1736 | head_turn | the foreground emu slowly turns its head to camera: feather rustle | -14 | -22.0 | -36.0 | +0.05 |
| 117 | 58.200 | 1746 | emu_grunt | a contented little grunt | -16 | -24.0 | -39.0 | +0.05 |
| 118 | 58.533 | 1756 | blink | ...and BLINKS @1756: tiny soft double plip | -12 | -20.0 | -34.0 | +0.05 |

## Verification
- Mix stream: `stream|sample_rate=48000|channels=2|bits_per_sample=24|duration_ts=2832000`
- whisper small.en (int8, cpu) on voice.wav: "In 1932, Australia went to war against emus and lost. After World War I, veterans were given farms in Western Australia to grow wheat. Then 20 ,000 emus showed up and ate it, so the farmers called in the army. Major Meredith arrived with two soldiers, two machine guns, and 10 ,000 bullets. On the first day, the emus simply ran out of range. Two days later, a thousand emus walked up to a dam, and the gun jammed. So he bolted a gun onto a truck. The emus outran the truck. After a month, he claimed 986 emus with 9 ,860 bullets. Luckily, the army had plenty of bullets. Unluckily, every emu took 10. You see, a machine gun is made for an enemy that marches in a line. Emus run 50 kilometers an hour in every direction at once. Meredith said an army that could take bullets like these birds could face any army in the world. The army went home. The emus are still there."
- whisper small.en on the mix: "In 1932, Australia went to war against emus and lost. After World War I, veterans were given farms in Western Australia to grow wheat. Then 20 ,000 emus showed up and ate it. So the farmers called in the army. Major Meredith arrived with two soldiers, two machine guns and 10 ,000 bullets. On the first day, the emus simply ran out of range. Two days later, a thousand emus walked up to a dam and the gun jammed. So he bolted a gun onto a truck. The emus outran the truck. After a month, he claimed 986 emus, with 9 ,860 bullets. Luckily, the army had plenty of bullets. Unluckily, every emu took 10. You see, a machine gun is made for an enemy that marches in a line. Emus run 50 km an hour, in every direction at once. Meredith said an army that could take bullets like these birds could face any army in the world. The army went home. The emus are still there."
- word-level diff voice -> mix: IDENTICAL
- SCRIPT.md words not literally in the voice-only transcript (whisper writes numbers as digits): ['one', 'twenty', 'nine', 'hundred', 'eighty', 'six', 'nine', 'eight', 'hundred', 'sixty', 'fifty']
- SCRIPT.md words not literally in the mix transcript: ['one', 'twenty', 'nine', 'hundred', 'eighty', 'six', 'nine', 'eight', 'hundred', 'sixty', 'fifty']
- 'unluckily': voice-only probs [0.97], mix probs [0.98]
- 'lost': voice-only probs [1.0], mix probs [1.0]
- 'jammed': voice-only probs [1.0], mix probs [1.0]
- 'emus': voice-only probs [0.86, 0.99, 0.99, 1.0, 0.73, 0.99, 0.98, 1.0], mix probs [0.86, 0.99, 0.96, 1.0, 0.74, 0.99, 0.98, 1.0]
- 'outran': voice-only probs [0.92], mix probs [0.92]
- 'bullets': voice-only probs [1.0, 0.99, 1.0, 1.0], mix probs [1.0, 0.99, 1.0, 0.99]
