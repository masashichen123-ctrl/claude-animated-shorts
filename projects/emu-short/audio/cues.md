# The Great Emu War - soundtrack cue sheet

All sound is original and synthesized in numpy/scipy: instruments in `instruments.py` (brass, snare, glock, timpani from the shared kit + banjo, accordion, lagerphone, bass drum, woodblock, slide whistle, reed added here), SFX in `sfx_emu.py` / `sfx_gen.py`; placed by `music.py` / `sfx.py` from `timeline.py` (frames from SHOTS.md), mixed by `mix.py`.
Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch, no time change). Rebuild everything + verify: `bash audio/build.sh` (about 1.5 min; mix only: `python3 audio/mix.py --fresh`).

## Files
| file | content |
|---|---|
| `public/emu/mix.wav` = `voice/mix_final.wav` | final mix, 48 kHz, stereo, 24-bit, 2,832,000 samples = 59.000 s |
| `audio/out/stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain, after the master limiter's gain curve: voice + music + sfx = mix.wav |
| `audio/check.py` | verification: transcription of voice.wav vs the mix (faster-whisper small.en), clicks, duration, loudness |

## Master loudness (own BS.1770-4 meter)
- Integrated **-14.01 LUFS**, true peak **-1.30 dBTP**, LRA 1.6 LU, max momentary -9.6 LUFS, max short-term -12.9 LUFS; 0 samples at full scale
- Stems at mix gain: voice -14.3 LUFS (peak -0.5 dBFS), music -22.1 LUFS, sfx -31.3 LUFS (master gain +7.48 dB and the limiter gain curve, the same on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.3 dBTP): max gain reduction 6.58 dB, active (>0.1 dB) on 27.70 % of samples; inside speech: max 6.58 dB, 90th / 99th percentile 0.93 / 3.64 dB, active on 32.6 % of speech samples. This peak limiting is the only processing besides gain that reaches the narration: the TTS voice has an 18.3 dB true-peak-to-loudness ratio, so -14 LUFS at <= -1 dBTP cannot be reached with gain alone.
- Discontinuity check: 240 boundaries (start + end of every placed SFX event, every music cut-off) checked in the final mix, 0 suspicious.

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -14.0 LUFS
    Threshold: -24.0 LUFS
  Loudness range:
    LRA:         1.6 LU
    Threshold: -34.0 LUFS
    LRA low:   -14.9 LUFS
    LRA high:  -13.2 LUFS
  True peak:
    Peak:       -1.3 dBFS
```

## Voice on top: per-section loudness
Key: words.json spans, widened by the voice's own measured activity (TTS word times drift by up to 0.25 s). Music: -5 dB duck under speech (attack 50 ms, release 250 ms), section gain set so the music sits -9.0 LU (+ per-section offset) under the voice over the spoken parts. SFX: -2 dB duck under speech.
Columns: integrated LUFS per stem at mix gain; then over 400 ms windows centred on speech: median voice-music, median and 10th percentile voice-bed (bed = music + sfx); bloom = median music level in the gaps minus in speech (LU).

| section | time s | voice | music | sfx | voice-music (speech, med) | voice-bed med | voice-bed p10 | bloom |
|---|---|---|---|---|---|---|---|---|
| hook | 0.00-3.97 | -14.1 | -22.9 | -34.5 | 8.3 | 8.0 | 5.7 | 0.7 |
| lost | 3.97-5.23 | -12.8 | -20.3 | -32.6 | 8.4 | 8.1 | -1.4 | 3.0 |
| farm | 5.23-10.17 | -14.2 | -22.3 | -41.0 | 8.2 | 8.2 | 4.7 | 2.1 |
| emus | 10.17-12.97 | -13.8 | -22.8 | -33.8 | 9.3 | 8.9 | 3.0 | 0.6 |
| phone | 12.97-15.00 | -13.4 | -21.5 | -28.4 | 8.5 | 8.1 | 3.8 | 5.7 |
| army | 15.00-20.07 | -14.0 | -23.4 | -34.1 | 9.1 | 8.8 | 5.1 | 0.9 |
| firstday | 20.07-23.17 | -13.2 | -22.0 | -28.9 | 9.6 | 9.5 | 4.1 | 2.1 |
| dam | 23.17-26.70 | -14.1 | -22.6 | -38.9 | 9.3 | 9.3 | 3.1 | 6.0 |
| jam | 26.70-27.50 | -15.1 | -28.8 | -31.4 | 10.0 | 8.4 | 5.1 | -14.3 |
| truck | 27.50-31.23 | -13.8 | -21.8 | -27.9 | 9.0 | 8.6 | 3.5 | 3.0 |
| camp | 31.23-37.83 | -14.8 | -23.6 | -35.8 | 9.1 | 8.8 | 5.1 | 0.3 |
| dump | 37.83-40.03 | -14.8 | -24.4 | -33.7 | 8.5 | 8.3 | 6.5 | -0.2 |
| unlucky | 40.03-42.33 | -14.4 | -23.6 | -29.7 | 10.2 | 9.1 | 7.5 | 2.4 |
| toy | 42.33-46.07 | -14.1 | -23.3 | -32.1 | 8.7 | 8.3 | 5.4 | 1.9 |
| scatter | 46.07-50.13 | -14.7 | -22.6 | -31.0 | 9.1 | 8.5 | 3.8 | 3.1 |
| parade | 50.13-55.20 | -14.6 | -23.6 | -38.3 | 8.8 | 8.7 | 4.6 | 5.5 |
| home | 55.20-56.47 | -13.5 | -22.1 | -31.1 | 7.9 | 7.5 | 2.8 | -1.0 |
| ending | 56.47-59.00 | -12.2 | -18.2 | -35.5 | 9.0 | 8.9 | 4.1 | 3.2 |

Applied section gains (dB): hook -9.2, lost -4.6, farm -7.6, emus -6.7, phone -2.5, army -11.8, firstday -7.5, dam -3.7, jam +7.7, truck -7.9, camp -6.7, dump -10.1, unlucky -6.8, toy -5.2, scatter -6.7, parade -7.9, home -5.8, ending -4.1. Music rides: 4.14-4.80 s -2.0 dB, 40.15-40.70 s -3.0 dB.

Narration gaps (measured on voice.wav), where the loud hits and the music blooms go: 1.43-1.75, 4.75-5.39, 6.48-6.87, 9.84-10.28, 14.57-15.17, 17.31-17.65, 19.81-20.16, 20.91-21.12, 22.92-23.32, 27.13-27.56, 30.94-31.39, 34.43-34.72, 37.46-37.99, 39.90-40.20, 41.86-42.44, 45.86-46.21, 48.04-48.24, 49.71-50.29, 54.68-55.22, 56.31-56.60.

## Music map (original: comic 1930s military march with a bush-band flavour, F major, 120 bpm = 15 frames a beat)
Themes, both composed here: ARMY theme (pompous dotted march: C-A-F-A-C-F-E | D-C-Bb-D-C ...) and EMU motif (staccato, D minor: D-D-F-E-D-C#-D-A ...). No borrowed melodies (no Waltzing Matilda, no anthems, no known marches); the bugle call is a plain C-C-F arpeggio.

| time s | frame | music |
|---|---|---|
| 0.00 | 0 | HOOK: army theme bars 1-2, cornet + tuba/after-beats + snare + lagerphone, pompous and sure of itself |
| 3.27 | 98 | on 'emus': the band stops dead, held E-dim tremolo (accordion) + snare and timpani rolls crescendo (the stare-down) |
| 3.97 | 119 | STINGER on the white flash @119: Db-major brass stab + bass drum + timpani + cymbal |
| 4.30 | 129 | 'And lost.' @128: the DEFLATE, a muted trombone sliding down a fifth (Bb -> Eb) with a plunger wah and wobble, soft tuba under it |
| 5.23 | 157 | FARM (XF @157): pastoral bush band in F - banjo forward rolls, accordion tune (original), lagerphone on 2 and 4, soft tuba |
| 10.17 | 305 | EMUS ARRIVE: the EMU motif (original, D minor): staccato bassoon-reed + tuba, woodblock tiptoes, timpani rumble |
| 11.93 | 358 | cut to the farmer (jaw drop) @358: low trombone 'bwah' bend; glock pecks right after 'ate it.'; low stab on the cut to the verandah |
| 12.97 | 389 | PHONE: accordion bellows-tremolo Dm -> A7, snare roll creeping up; little bugle call (C-C-F) right after 'army.' |
| 15.00 | 450 | ARMY ARRIVES: full band, army theme bars 1-3 (cornet + trombone an octave down), bass drum, lagerphone |
| 15.20 | 456 | cymbal crash on the truck stop @456; light crash on the salute @502; bass drum + crash on the crate @582 |
| 21.00 | 630 | theme bar 4 sags; muted banjo trot as the emus jog over the rise; trombone fall right after 'range.' @674 |
| 23.17 | 695 | DAM (XF @695): tiptoe ambush - EMU motif on reed + muted banjo, tuba pizz, woodblock, timpani rumble |
| 25.98 | 779 | DRAMATIC HOLD: Adim7 tremolo (accordion + low brass) with snare and timpani rolls crescendo, reverse cymbal into the gun close-up @797 |
| 26.70 | 801 | CUT-OFF dead on the jam @801 - silence for the clack, the spring and 'jammed.' |
| 27.50 | 825 | TRUCK: tuba + light snare restart under the hammering (rests left for the hits) |
| 29.17 | 875 | CHASE @875: galop - theme in the cornet, tuba bouncing octave eighths with the truck, banjo 16ths, lagerphone every beat |
| 30.07 | 902 | 'outran' @902: chromatic run up (reed + banjo) as the emus pull away; trombone fall after 'truck.' |
| 31.23 | 937 | CAMP (XF @937): dusk - solo cornet plays the army theme slow and proud (vibrato), accordion pad, soft tuba |
| 32.10 | 963 | pen flourish @963: glock run up |
| 34.67 | 1040 | casings reveal @1040: Bb pad swells, timpani + snare roll, glock glints all over the stereo field |
| 36.23 | 1087 | @1087 ('bullets'): arrives (soft attack, under the word) on a full F chord in the low brass; cymbal + bass drum + triangle glint right after 'bullets.' (37.47) |
| 37.83 | 1135 | DUMP: army theme bar 1 again, pompous; F stab + bass drum right after 'bullets.' |
| 40.03 | 1201 | UNLUCKILY: band out; a lone reed plods down chromatically (D-C#-C-B) with muted banjo; trombone 'bwah-bwaah' after 'ten.' |
| 42.50 | 1275 | TOY MARCH: glock + fife (an octave up) play the army theme strictly in time, light oom-pah + snare; boots on every beat |
| 46.07 | 1382 | SCATTER @1382: crash + bass drum, glock/banjo runs flung up and down across the stereo field, tuba chromatic scramble, snare 16ths |
| 48.33 | 1450 | spin cut @1450: slide-whistle swirls round and round (dizzy); wobbling trombone + accordion deflate after 'once.' |
| 50.13 | 1504 | PARADE (XF @1504): mock-heroic chorale, the army theme at half speed (cornet, vibrato) over low brass, snare roll pp |
| 54.43 | 1633 | 'world' @1633: the crescendo peaks with the word; the grand F chord (full brass + cymbal + timpani) hits as it ends (54.66, f1640), released before 'The army went home.' |
| 55.20 | 1656 | HOME: the theme's head (C-A-F) on a lonely trombone, the last note sagging flat like the gun on the truck |
| 56.47 | 1694 | ENDING: warm and golden - accordion sings the EMU motif's opening turned major (A-C-Bb-G-E), soft horns Bb -> C7, banjo |
| 57.95 | 1738 | resolves on F after 'there.' (57.8): soft brass + accordion + banjo strum; glock + triangle 'ting' on the blink @1756; fade to 59.0 |

## SFX events
naive = the event's level vs the voice stem (max momentary, LU); applied = naive - 6 dB + offsets; beds are integrated loudness. 'mix LUFS' = max momentary in the final mix (before the speech duck). Frames marked * are chosen here (not pinned in SHOTS.md): emu steps [24, 38, 52], crank [(389, 402), (436, 449)], pats [1166, 1180], toy march 1275+15k, head turn (1736, 1750), blink 1756.

| # | time s | frame | cue | what | naive | applied | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0 | amb_morning (bed) | stubble field, morning: breeze, wheat rustle, flies round the sweating soldier, magpies far off (shots 1-2) | -28 | -28.0 | -42.3 | +0.00 |
| 2 | 0.667 | 20 | wheat_part | wheat stalks pushed aside as the emu steps out | -16 | -22.0 | -36.3 | +0.15 |
| 3 | 0.800 | 24 | emu_step | the big emu steps out of the wheat (1/3) | -11 | -17.0 | -31.4 | +0.15 |
| 4 | 1.267 | 38 | emu_step | the big emu steps out of the wheat (2/3) | -11 | -17.0 | -31.4 | +0.15 |
| 5 | 1.733 | 52 | emu_step | the big emu steps out of the wheat (3/3) | -11 | -17.0 | -31.4 | +0.15 |
| 6 | 3.300 | 99 | emu_boom | emu leans in on 'emus' @98: low drumming boom from its chest (stare-down) | -10 | -16.0 | -30.3 | +0.10 |
| 7 | 3.967 | 119 | flash_swell | reverse swell into the white FLASH @119 (peaks on the frame) | -9 | -15.0 | -29.3 | +0.00 |
| 8 | 4.200 | 126 | kick_impact | KICK @126: the Lewis gun goes over - dull thump + metal clatter in the stubble | -11 | -17.0 | -31.3 | -0.20 |
| 9 | 4.800 | 144 | emu_boom | the emu on the crate puffs its chest: short proud boom after 'lost.' | -10 | -16.0 | -30.3 | +0.20 |
| 10 | 5.150 | 154 | amb_farm (bed) | farm, day: wheat swaying in the wind, windmill squeak every 2.4 s, magpies carolling, a fly (shots 3-4) | -27 | -27.0 | -41.3 | +0.00 |
| 11 | 5.233 | 157 | xf_whoosh | soft air swell through the dissolve @157 | -16 | -22.0 | -36.3 | +0.00 |
| 12 | 10.167 | 305 | emu_herd | 100+ emus pour over the hill into the wheat: running feet thunder (swells in), booms and grunts | -10 | -16.0 | -30.4 | +0.00 |
| 13 | 12.267 | 368 | pecking | close emus peck the wheat away ('ate' @370): beak pecks + stalks crunching | -12 | -18.0 | -32.3 | +0.00 |
| 14 | 12.930 | 388 | amb_verandah (bed) | verandah: breeze, flies, emus pecking and grunting in the yard (shot 5) | -30 | -30.0 | -44.3 | +0.00 |
| 15 | 12.967 | 389 | phone_crank | wall telephone: magneto crank + generator whine + bells ringing (burst 1/2) | -9 | -15.0 | -29.3 | -0.30 |
| 16 | 14.533 | 436 | phone_crank | wall telephone: magneto crank + generator whine + bells ringing (burst 2/2) | -8 | -14.0 | -28.3 | -0.30 |
| 17 | 14.550 | 436 | truck_arrive | army truck rushing in (1930s 4-cylinder, off the throttle) into the stop @456 | -12 | -18.0 | -32.3 | -0.30 |
| 18 | 14.640 | 456 | truck_skid | SKID to a stop in red dust, ending exactly on @456 (dirt crunch + scrub, body rock) | -6 | -12.0 | -26.3 | -0.20 |
| 19 | 15.000 | 450 | amb_road (bed) | red dirt road: hot breeze, a far magpie (shot 6) | -31 | -31.0 | -45.3 | +0.00 |
| 20 | 15.200 | 456 | truck_idle | engine idling (low putter, under the line) until the cut @527 | -14 | -20.0 | -36.6 | -0.30 |
| 21 | 16.733 | 502 | salute | two soldiers salute @502: heel clicks + hand swish | -12 | -18.0 | -32.3 | +0.20 |
| 22 | 18.100 | 543 | gun_cock | Lewis gun on its tripod cocked @543 | -13 | -19.0 | -33.3 | +0.10 |
| 23 | 19.400 | 582 | crate_thud | one more ammo crate on the stack @582: box thud + rounds rattling inside | -7 | -13.0 | -27.4 | +0.15 |
| 24 | 20.030 | 601 | amb_paddock (bed) | open paddock: wind (shot 7) | -31 | -31.0 | -45.3 | +0.00 |
| 25 | 20.075 | 602 | lewis_burst | Lewis gun burst, 2 rounds at 9.4/s (cracks + drum rattle + casings) | -4 | -10.0 | -24.3 | -0.10 |
| 26 | 20.355 | 611 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -22.0 | -36.3 | +0.34 |
| 27 | 20.400 | 612 | emus_trot_far | the emus trot calmly away over the rise (far, fading) | -16 | -22.0 | -36.6 | +0.00 |
| 28 | 20.461 | 614 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -22.0 | -36.3 | -0.41 |
| 29 | 20.920 | 628 | lewis_burst | Lewis gun burst, 3 rounds at 9.4/s (cracks + drum rattle + casings) | -4 | -10.0 | -24.3 | -0.10 |
| 30 | 21.200 | 636 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -22.0 | -36.3 | -0.32 |
| 31 | 21.306 | 639 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -22.0 | -36.3 | +0.47 |
| 32 | 21.413 | 642 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -22.0 | -36.3 | -0.04 |
| 33 | 21.580 | 647 | lewis_burst | Lewis gun burst, 5 rounds at 9.4/s (cracks + drum rattle + casings) - soft, under the line | -4 | -19.0 | -35.1 | -0.10 |
| 34 | 21.860 | 656 | dust_puff_far | dust puff falling short, far out in the paddock | -25 | -31.0 | -45.3 | -0.44 |
| 35 | 21.966 | 659 | dust_puff_far | dust puff falling short, far out in the paddock | -25 | -31.0 | -45.3 | +0.11 |
| 36 | 22.073 | 662 | dust_puff_far | dust puff falling short, far out in the paddock | -25 | -31.0 | -45.3 | -0.16 |
| 37 | 22.179 | 665 | dust_puff_far | dust puff falling short, far out in the paddock | -25 | -31.0 | -45.3 | +0.31 |
| 38 | 22.286 | 669 | dust_puff_far | dust puff falling short, far out in the paddock | -25 | -31.0 | -45.3 | -0.28 |
| 39 | 22.930 | 688 | lewis_burst | Lewis gun burst, 3 rounds at 9.4/s (cracks + drum rattle + casings) | -4 | -10.0 | -24.3 | -0.10 |
| 40 | 23.100 | 693 | amb_dam (bed) | farm dam, golden afternoon: water lapping, emus drinking and grunting, magpies (shot 8) | -28 | -28.0 | -42.3 | +0.00 |
| 41 | 23.167 | 695 | xf_whoosh | soft air swell through the dissolve @695 | -16 | -22.0 | -36.3 | +0.00 |
| 42 | 23.210 | 696 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -22.0 | -36.3 | +0.26 |
| 43 | 23.316 | 699 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -22.0 | -36.3 | +0.43 |
| 44 | 23.423 | 703 | dust_puff_far | dust puff falling short, far out in the paddock | -16 | -22.0 | -36.3 | -0.44 |
| 45 | 26.700 | 801 | jam_clack | the gun JAMS @801: bolt slams and stops dead (clack) + thunk + smoke puff | -4 | -10.0 | -24.3 | +0.00 |
| 46 | 26.720 | 801 | spring_boing | the drum spring pops out @801: 'sproing' + wobbling twang | -9 | -15.0 | -29.3 | +0.15 |
| 47 | 27.450 | 824 | amb_paddock2 (bed) | paddock: wind (shot 9) | -32 | -32.0 | -46.3 | +0.00 |
| 48 | 27.900 | 837 | hammer_metal | Meredith hammers the gun mount onto the truck tray (1/4) | -9 | -15.0 | -29.3 | +0.25 |
| 49 | 28.033 | 841 | hammer_metal | Meredith hammers the gun mount onto the truck tray (2/4) | -9 | -15.0 | -29.3 | +0.25 |
| 50 | 28.200 | 846 | hammer_metal | Meredith hammers the gun mount onto the truck tray (3/4) | -9 | -15.0 | -29.3 | +0.25 |
| 51 | 28.333 | 850 | hammer_metal | Meredith hammers the gun mount onto the truck tray (4/4) | -9 | -15.0 | -29.3 | +0.25 |
| 52 | 29.187 | 875 | gear_crunch | crash gearbox: teeth grind then the gear clunks in @875 | -6 | -12.0 | -26.3 | -0.10 |
| 53 | 29.267 | 878 | emu_herd_run | the emus sprint ahead and pull away by 'outran' @902 | -12 | -18.0 | -32.4 | +0.30 |
| 54 | 29.317 | 880 | truck_engine | truck engine flat out across the paddock (revs climbing) | -10 | -16.0 | -30.3 | -0.10 |
| 55 | 29.417 | 882 | truck_bounce | truck bounces on the rough paddock (suspension thud, leaf-spring creak, tray + gun rattle) | -14 | -19.8 | -34.1 | -0.10 |
| 56 | 29.790 | 894 | truck_bounce | truck bounces on the rough paddock (suspension thud, leaf-spring creak, tray + gun rattle) | -14 | -20.0 | -34.4 | -0.10 |
| 57 | 30.083 | 902 | truck_bounce | truck bounces on the rough paddock (suspension thud, leaf-spring creak, tray + gun rattle) | -14 | -20.2 | -34.6 | -0.10 |
| 58 | 30.384 | 912 | truck_bounce | truck bounces on the rough paddock (suspension thud, leaf-spring creak, tray + gun rattle) | -13 | -18.6 | -33.1 | -0.10 |
| 59 | 30.666 | 920 | truck_bounce | truck bounces on the rough paddock (suspension thud, leaf-spring creak, tray + gun rattle) | -13 | -19.4 | -33.8 | -0.10 |
| 60 | 30.930 | 928 | lewis_wild | the bouncing gunner lets off a wild burst (into the sky) | -9 | -15.0 | -29.3 | -0.10 |
| 61 | 31.032 | 931 | truck_bounce | truck bounces on the rough paddock (suspension thud, leaf-spring creak, tray + gun rattle) | -15 | -20.7 | -35.2 | -0.10 |
| 62 | 31.150 | 934 | amb_dusk (bed) | army camp at dusk: crickets, the oil lamp's hiss, a soft breeze (shot 10) | -30 | -30.0 | -44.3 | +0.00 |
| 63 | 31.233 | 937 | xf_whoosh | soft air swell through the dissolve @937 | -16 | -22.0 | -36.3 | +0.00 |
| 64 | 31.550 | 946 | pen_scratch | Meredith writing the report: nib scratching | -16 | -22.0 | -36.3 | +0.20 |
| 65 | 32.050 | 963 | pen_flourish | the proud pen FLOURISH @963 ending in a full stop | -11 | -17.0 | -31.3 | +0.20 |
| 66 | 32.750 | 982 | pen_tally | tally marks: five quick strokes | -19 | -25.0 | -39.3 | +0.20 |
| 67 | 34.667 | 1040 | casings | pull-back reveals the MOUNTAIN of brass casings @1040-1087: casings trickling and glinting, sliding hiss | -11 | -17.0 | -31.3 | +0.30 |
| 68 | 37.500 | 1125 | casings_slide | a little avalanche of casings after 'bullets.' | -12 | -18.0 | -32.3 | +0.40 |
| 69 | 37.800 | 1134 | amb_dump (bed) | supply dump, day: breeze, magpie (shot 11) | -32 | -32.0 | -46.3 | +0.00 |
| 70 | 38.867 | 1166 | crate_pat | soldier proudly pats the crate wall (1/2) | -12 | -18.0 | -32.3 | +0.25 |
| 71 | 39.333 | 1180 | crate_pat | soldier proudly pats the crate wall (2/2) | -12 | -18.0 | -32.3 | +0.25 |
| 72 | 40.000 | 1200 | amb_paddock3 (bed) | paddock: breeze, flies (shot 12) | -32 | -32.0 | -46.3 | +0.00 |
| 73 | 40.100 | 1203 | lewis_far | the gun chattering away off screen (distant, low) | -16 | -22.0 | -36.3 | -0.60 |
| 74 | 40.150 | 1204 | emu_step | the emu strolls on, unbothered | -15 | -21.0 | -35.7 | -0.30 |
| 75 | 40.167 | 1205 | dust_puff | bullet dust puff 1/10 popping round the emu's feet (every 4 f from @1205) | -14 | -20.0 | -37.4 | -0.50 |
| 76 | 40.300 | 1209 | dust_puff | bullet dust puff 2/10 popping round the emu's feet (every 4 f from @1205) | -14 | -20.0 | -37.5 | -0.40 |
| 77 | 40.433 | 1213 | dust_puff | bullet dust puff 3/10 popping round the emu's feet (every 4 f from @1205) | -14 | -20.0 | -37.2 | -0.30 |
| 78 | 40.567 | 1217 | dust_puff | bullet dust puff 4/10 popping round the emu's feet (every 4 f from @1205) | -14 | -20.0 | -37.2 | -0.20 |
| 79 | 40.600 | 1218 | emu_step | the emu strolls on, unbothered | -15 | -21.0 | -35.6 | -0.10 |
| 80 | 40.700 | 1221 | dust_puff | bullet dust puff 5/10 popping round the emu's feet (every 4 f from @1205) | -10 | -16.0 | -31.7 | -0.10 |
| 81 | 40.833 | 1225 | dust_puff | bullet dust puff 6/10 popping round the emu's feet (every 4 f from @1205) | -10 | -16.0 | -31.7 | +0.00 |
| 82 | 40.967 | 1229 | dust_puff | bullet dust puff 7/10 popping round the emu's feet (every 4 f from @1205) | -10 | -16.0 | -31.7 | +0.10 |
| 83 | 41.050 | 1232 | emu_step | the emu strolls on, unbothered | -15 | -21.0 | -35.7 | +0.10 |
| 84 | 41.100 | 1233 | dust_puff | bullet dust puff 8/10 popping round the emu's feet (every 4 f from @1205) | -10 | -16.0 | -31.7 | +0.20 |
| 85 | 41.233 | 1237 | dust_puff | bullet dust puff 9/10 popping round the emu's feet (every 4 f from @1205) | -10 | -16.0 | -31.7 | +0.30 |
| 86 | 41.367 | 1241 | dust_puff | bullet dust puff 10/10 popping round the emu's feet (every 4 f from @1205) | -10 | -16.0 | -31.7 | +0.40 |
| 87 | 41.500 | 1245 | emu_step | the emu strolls on, unbothered | -15 | -21.0 | -35.6 | +0.30 |
| 88 | 41.967 | 1259 | emu_peck | the emu pecks once (after 'ten.') | -9 | -15.0 | -29.3 | +0.30 |
| 89 | 42.300 | 1269 | amb_parade (bed) | flat parade ground: light breeze (shot 13) | -35 | -35.0 | -49.3 | +0.00 |
| 90 | 42.500 | 1275 | boots_step | enemy line marching in step: boots on hard ground, all together (1/8) | -9 | -15.0 | -29.4 | +0.00 |
| 91 | 43.000 | 1290 | boots_step | enemy line marching in step: boots on hard ground, all together (2/8) | -9 | -17.0 | -31.4 | +0.00 |
| 92 | 43.500 | 1305 | boots_step | enemy line marching in step: boots on hard ground, all together (3/8) | -9 | -15.0 | -29.4 | +0.00 |
| 93 | 44.000 | 1320 | boots_step | enemy line marching in step: boots on hard ground, all together (4/8) | -9 | -17.0 | -31.6 | +0.00 |
| 94 | 44.500 | 1335 | boots_step | enemy line marching in step: boots on hard ground, all together (5/8) | -9 | -15.0 | -29.4 | +0.00 |
| 95 | 45.000 | 1350 | boots_step | enemy line marching in step: boots on hard ground, all together (6/8) | -9 | -17.0 | -31.3 | +0.00 |
| 96 | 45.500 | 1365 | boots_step | enemy line marching in step: boots on hard ground, all together (7/8) | -9 | -15.0 | -29.6 | +0.00 |
| 97 | 46.000 | 1380 | boots_step | enemy line marching in step: boots on hard ground, all together (8/8) | -9 | -17.0 | -31.5 | +0.00 |
| 98 | 46.030 | 1381 | amb_paddock4 (bed) | paddock: wind (shot 14) | -33 | -33.0 | -47.3 | +0.00 |
| 99 | 46.067 | 1382 | emu_stampede | running thunder of the herd radiating in every direction (wide stereo) | -8 | -14.0 | -28.4 | +0.00 |
| 100 | 46.067 | 1382 | scatter_whoosh | SCATTER @1382: big outward whoosh as 60+ emus burst from the centre | -4 | -10.0 | -24.3 | +0.00 |
| 101 | 48.333 | 1450 | spin_whoosh | the gunner spins on the spot (whoosh 1/4, panning round) | -10 | -16.0 | -30.3 | +0.00 |
| 102 | 48.753 | 1463 | spin_whoosh | the gunner spins on the spot (whoosh 2/4, panning round) | -15 | -21.0 | -35.3 | +0.00 |
| 103 | 49.173 | 1475 | spin_whoosh | the gunner spins on the spot (whoosh 3/4, panning round) | -15 | -21.0 | -35.3 | +0.00 |
| 104 | 49.593 | 1488 | spin_whoosh | the gunner spins on the spot (whoosh 4/4, panning round) | -15 | -21.0 | -35.3 | +0.00 |
| 105 | 50.080 | 1502 | amb_golden (bed) | golden parade ground: soft breeze, far magpie (shot 15) | -32 | -32.0 | -46.3 | +0.00 |
| 106 | 50.133 | 1504 | xf_whoosh | soft air swell through the dissolve @1504 | -16 | -22.0 | -36.3 | +0.00 |
| 107 | 50.200 | 1506 | emu_boom | helmeted emus in formation boom, low | -14 | -20.0 | -34.3 | -0.40 |
| 108 | 52.100 | 1563 | emu_boom | helmeted emus in formation boom, low | -16 | -22.0 | -36.3 | -0.16 |
| 109 | 53.120 | 1594 | emu_boom | helmeted emus in formation boom, low | -15 | -21.0 | -35.3 | +0.14 |
| 110 | 54.700 | 1641 | emu_boom_chorus | the whole emu army booms back after 'world.' (a chorus of drumming) | -8 | -14.0 | -28.3 | +0.00 |
| 111 | 55.170 | 1655 | amb_sunset (bed) | sunset road: breeze (shot 16) | -32 | -32.0 | -46.3 | +0.00 |
| 112 | 55.220 | 1657 | gear_crunch | gear crunch as the truck pulls away | -12 | -18.0 | -32.3 | +0.10 |
| 113 | 55.300 | 1659 | truck_away | truck driving away down the road into the sunset (engine receding, getting duller) | -10 | -16.0 | -33.0 | +0.10 |
| 114 | 56.330 | 1690 | gun_sag | the gun on the back sags: slow metal creak (in the gap before 'The emus...') | -14 | -20.0 | -36.9 | +0.10 |
| 115 | 56.430 | 1693 | amb_wheat (bed) | golden wheat: rustle, breeze, a magpie, a fly (shot 17) | -29 | -29.0 | -43.3 | +0.00 |
| 116 | 57.867 | 1736 | head_turn | the foreground emu slowly turns its head to camera: feather rustle | -14 | -20.0 | -34.3 | +0.05 |
| 117 | 58.200 | 1746 | emu_grunt | a contented little grunt | -16 | -22.0 | -37.3 | +0.05 |
| 118 | 58.533 | 1756 | blink | ...and BLINKS @1756: tiny soft double plip | -12 | -18.0 | -32.3 | +0.05 |

## Verification
- Mix stream: `stream|sample_rate=48000|channels=2|bits_per_sample=24|duration_ts=2832000`
- whisper small.en (int8, cpu) on voice.wav: "In 1932, Australia went to war against emus and lost. After World War I, veterans were given farms in Western Australia to grow wheat. Then 20 ,000 emus showed up and ate it, so the farmers called in the army. Major Meredith arrived with two soldiers, two machine guns, and 10 ,000 bullets. On the first day, the emus simply ran out of range. Two days later, a thousand emus walked up to a dam, and the gun jammed. So he bolted a gun onto a truck. The emus outran the truck. After a month, he claimed 986 emus with 9 ,860 bullets. Luckily, the army had plenty of bullets. Unluckily, every emu took 10. You see, a machine gun is made for an enemy that marches in a line. Emus run 50 kilometers an hour in every direction at once. Meredith said an army that could take bullets like these birds could face any army in the world. The army went home. The emus are still there."
- whisper small.en on the mix: "In 1932, Australia went to war against emus and lost. After World War I, veterans were given farms in Western Australia to grow wheat. Then 20 ,000 emus showed up and ate it, so the farmers called in the army. Major Meredith arrived with two soldiers, two machine guns, and 10 ,000 bullets. On the first day, the emus simply ran out of range. Two days later, a thousand emus walked up to a dam, and the gun jammed. So he bolted a gun onto a truck. The emus outran the truck. After a month he claimed 986 emus, with 9 ,860 bullets. Luckily, the army had plenty of bullets. Unluckily, every emu took 10. You see, a machine gun is made for an enemy that marches in a line. Emus run 50 km an hour, in every direction at once. Meredith said an army that could take bullets like these birds could face any army in the world. The army went home. The emus are still there."
- word-level diff voice -> mix: IDENTICAL
- SCRIPT.md words not literally in the voice-only transcript (whisper writes numbers as digits): ['one', 'twenty', 'ten', 'nine', 'hundred', 'eighty', 'six', 'nine', 'eight', 'hundred', 'sixty', 'ten', 'fifty']
- SCRIPT.md words not literally in the mix transcript: ['one', 'twenty', 'ten', 'nine', 'hundred', 'eighty', 'six', 'nine', 'eight', 'hundred', 'sixty', 'ten', 'fifty']
- 'unluckily': voice-only probs [0.97], mix probs [0.98]
- 'lost': voice-only probs [1.0], mix probs [1.0]
- 'jammed': voice-only probs [1.0], mix probs [1.0]
- 'emus': voice-only probs [0.86, 0.99, 0.99, 1.0, 0.73, 0.99, 0.98, 1.0], mix probs [0.83, 0.99, 0.96, 1.0, 0.73, 0.99, 0.94, 1.0]
- 'outran': voice-only probs [0.92], mix probs [0.92]
- 'bullets': voice-only probs [1.0, 0.99, 1.0, 1.0], mix probs [1.0, 0.99, 1.0, 0.99]
