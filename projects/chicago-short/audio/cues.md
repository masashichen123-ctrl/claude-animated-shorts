# Chicago Lifts a Hotel - soundtrack cue sheet

All sound is original and synthesized in numpy/scipy: instruments in `instruments.py` (guitar pluck, upright bass, brushes, shaker, soft kick, banjo, vibes, celesta, pizzicato from the shared kit) + a soft honky-tonk upright piano added in `music.py`; SFX in `sfx_chicago.py` (hook timber groan, swamp, mud, puddle, coughs, gavel, council gasp, shovels, carriages, paper, handshakes, jackscrew clunk, marching boots, pea whistle, ratchet clicks + creaks, board ticks + chime, sign flip, lift hum, soup / snore / desk bell, glass tap, steam, coin, rails, train whistle) with helpers from `sfx_marathon.py` / `sfx_gen.py` / `sfx_emu.py` / `sfx_bat.py`; placed by `music.py` / `sfx.py` from `timeline.py` (frames from SHOTS.md), mixed by `mix.py`.
Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch, no time change). Rebuild everything + verify: `bash audio/build.sh` (about 3 min with the whisper checks; mix only: `python3 audio/mix.py --fresh`, about 1 min).

## Files
| file | content |
|---|---|
| `public/chicago/mix.wav` = `voice/mix_final.wav` | final mix, 48 kHz, stereo, 24-bit, 2,832,000 samples = 59.000 s |
| `audio/out/stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain, after the master limiter's gain curve: voice + music + sfx = mix.wav |
| `audio/check.py` | verification: whisper transcription of voice.wav vs the mix (faster-whisper small.en), sample count |

## Master loudness (own BS.1770-4 meter)
- Integrated **-14.01 LUFS**, true peak **-1.30 dBTP**, LRA 1.5 LU, max momentary -9.7 LUFS, max short-term -13.1 LUFS; 0 samples at full scale
- Stems at mix gain: voice -13.9 LUFS (peak -0.8 dBFS, max momentary -9.7 LUFS), music -30.0 LUFS, sfx -34.3 LUFS (master gain +7.53 dB and the limiter gain curve, the same on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.3 dBTP): max gain reduction 7.91 dB, active (>0.1 dB) on 27.20 % of samples; inside speech: max 7.91 dB, 90th / 99th percentile 1.07 / 4.11 dB, active on 32.4 % of speech samples. This peak limiting is the only processing besides gain that reaches the narration (same approach as the emu and bat mixes): the TTS voice's true-peak-to-loudness ratio is too high to reach -14 LUFS at <= -1 dBTP with gain alone.
- Discontinuity check: 163 boundaries (start + end of every placed SFX event, every music cut / re-entry) checked on the SFX and music stems, 0 suspicious.

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -14.0 LUFS
    Threshold: -24.4 LUFS
  Loudness range:
    LRA:         1.5 LU
    Threshold: -34.4 LUFS
    LRA low:   -15.0 LUFS
    LRA high:  -13.5 LUFS
  True peak:
    Peak:       -1.3 dBFS
```

## Voice on top: per-section loudness
Key: words.json spans, widened by the voice's own measured activity. Music: -3 dB gentle duck under speech (attack 250 ms, release 600 ms) + +4 dB bloom in gaps >= 0.55 s; section gain set so the music sits -18.0 LU (+ per-section offset) under the voice over the spoken parts. SFX: -3 dB duck under speech (attack 30 ms, release 250 ms).
Columns: integrated LUFS per stem at mix gain; then over 400 ms windows centred on speech: median voice-music, median and 10th percentile voice-bed (bed = music + sfx); bloom = median music level in the gaps minus in speech (LU).

| section | time s | voice | music | sfx | voice-music (speech, med) | voice-bed med | voice-bed p10 | bloom |
|---|---|---|---|---|---|---|---|---|
| hook | 0.00-6.53 | -14.1 | -31.0 | -47.7 | 16.9 | 16.7 | 12.4 | 1.5 |
| swamp | 6.53-10.00 | -13.5 | -30.3 | -35.5 | 17.8 | 17.2 | 13.4 | -0.2 |
| mud | 10.00-12.97 | -13.7 | -31.0 | -34.2 | 17.7 | 16.7 | 13.3 | 0.8 |
| sick | 12.97-15.63 | -14.5 | -31.2 | -34.9 | 17.1 | 16.2 | 11.7 | 2.2 |
| council | 15.63-20.60 | -14.0 | -29.5 | -31.2 | 18.6 | 18.5 | 13.1 | 5.1 |
| dig | 20.60-23.83 | -13.1 | -30.7 | -34.9 | 16.9 | 15.9 | 13.3 | -1.1 |
| hotel | 23.83-27.23 | -14.4 | -31.4 | -42.1 | 17.3 | 17.2 | 13.1 | 2.7 |
| office | 27.23-31.23 | -14.1 | -31.1 | -35.2 | 17.3 | 16.8 | 14.7 | 2.1 |
| jack | 31.23-35.73 | -14.5 | -31.8 | -35.5 | 17.5 | 16.6 | 13.7 | -0.3 |
| signal | 35.73-40.77 | -13.9 | -28.2 | -33.0 | 16.8 | 15.7 | 11.7 | 3.6 |
| board | 40.77-43.37 | -13.8 | -30.2 | -31.7 | 17.0 | 16.1 | 11.6 | 4.7 |
| lobby | 43.37-49.63 | -13.9 | -30.7 | -38.2 | 17.4 | 16.6 | 12.1 | 3.0 |
| window | 49.63-52.33 | -13.9 | -27.6 | -30.8 | 18.1 | 17.3 | 13.5 | 10.1 |
| train | 52.33-53.97 | -13.4 | -31.2 | -36.7 | 17.5 | 16.2 | 14.8 | - |
| sleeper | 53.97-57.88 | -14.2 | -31.3 | -43.6 | 16.3 | 16.2 | 12.6 | 1.0 |
| end | 57.88-59.00 | -55.0 | -24.6 | -31.4 | - | - | - | - |

Music under the voice: median over the sections' speech windows **17.3 LU**; in the longer gaps (>= 0.55 s) the music's median momentary level is **11.7 LU** under the voice's integrated loudness.

Applied section gains (dB): hook -16.9, swamp -15.1, mud -18.8, sick -15.9, council -17.7, dig -19.3, hotel -20.6, office -19.8, jack -21.2, signal -9.4, board -17.6, lobby -17.8, window -15.3, train -18.3, sleeper -17.1, end -17.1. Music rides: 48.65-49.05 s -6.0 dB, 24.60-25.00 s -3.0 dB SFX rides: 14.20-14.65 s -7.0 dB, 46.90-47.30 s -14.0 dB, 48.65-49.05 s -8.0 dB, 24.60-25.00 s -3.0 dB (60 ms ramps).

Narration gaps (measured on voice.wav), where the louder hits and the music blooms go: 1.96-2.37, 6.57-7.23, 8.62-9.04, 10.40-10.72, 12.22-12.66, 14.60-14.86, 16.51-16.82, 18.35-18.60, 19.98-20.60, 21.71-21.90, 23.42-23.82, 26.74-27.17, 30.76-31.22, 33.62-33.94, 35.32-35.74, 36.29-36.52, 38.41-38.77, 39.42-39.70, 40.26-40.78, 42.88-43.36, 44.81-45.12, 49.10-49.61, 51.56-52.18, 54.91-55.16.

## Music map (chill score with a ragtime-period wink: laid-back acoustic bed, 88 bpm, swung eighths, F major)
Soft honky-tonk upright piano (own additive model) comping lazy after-beats and playing a little tune and short answers only inside narration gaps; fingerpicked nylon guitar, round upright bass in two (walking for the work shots), brushes + shaker + soft kick, a light banjo plink, celesta / vibes / pizz for the soft comedy beats; a rocking 6/8 (bar 1.5 s, rails pulse 0.75 s) for the sleeping car, a warm G6/9 resolve after 'them.' All composed here (no existing melodies).

| time s | frame | music |
|---|---|---|
| 0.00 | 0 | HOOK: fingerpicked guitar + soft upright piano after-beats + upright bass (G6 - E7 - C6), no drums; the hotel starts to rise @100 |
| 2.02 | 61 | a tiny 3-note piano answer (G E D) in the gap after '1861,' (1.99-2.37) |
| 5.04 | 151 | a rising 3-note lift (G B D) in the gap after 'air,' (5.01-5.35): the building goes up |
| 6.53 | 196 | FLASH @196: a soft reversed-vibes shimmer swells into the frame; the band stops on it |
| 6.60 | 198 | SWAMP-EDGE STREETS: a half-time, slightly woozy loop - guitar, bass, piano, shaker (Em7 Am7 B7 Em7) |
| 6.66 | 200 | the 3-note piano answer in the gap after 'inside.' (6.59-7.23) |
| 8.33 | 250 | FROG @250: a soft low pizz 'bloop' (G3); a banjo 'plink-plink' (D6 B5) in the gap after 'swamp.' (8.73-9.04) |
| 10.00 | 300 | MUDDY STREET: a slouching walk - the bass walks, brushes, woozy piano after-beats (Em7 - B7) |
| 10.99 | 330 | @328 the puddle bubbles: three soft low pizz 'bloops' (E3 G3 D3) with the burps (11.0, 11.56, 12.06) |
| 12.32 | 370 | @358 the dog snorts: a two-note pizz 'uh-oh' (E4 D4) in the gap after 'go.' (12.26-12.66) |
| 12.97 | 389 | SICKROOM: woozy half-time - piano out of tune with a slow pitch sway (Am7 D7 G6 Cdim7) |
| 14.62 | 439 | @427 the doctor shakes his head: a falling 3-note pizz (E D B) in the gap after 'out,' (14.55-14.96) |
| 15.63 | 469 | COUNCIL HALL: a stately loop under 'so the city made a wild decision' (G6 D7), guitar + bass + piano |
| 16.58 | 497 | GAVEL @496: a soft D7 stab with a low D 'dun' (D2 + D3) in the gap after 'decision,' (16.55-16.86) |
| 18.38 | 551 | THE EASEL @541: a low piano octave 'dun' (D2 + D3) as the council gasps (gap after 'feet,' 18.35-18.66) |
| 20.14 | 604 | a warm resolve on G6/9 (rolled guitar, piano, low G) in the gap after 'underneath.' (20.09-20.69) |
| 20.60 | 618 | RAISING THE STREET: the work groove - guitar, bass, piano after-beats, brushes, shaker, soft kick + a light banjo plink (G6 E7 A7 D7) |
| 22.83 | 685 | BONK @685: a dull low piano 'plonk' (E2 + E3) and a falling pizz |
| 23.50 | 705 | the 3-note answer (G E D) in the gap after 'up too.' (23.46-23.86) |
| 23.83 | 715 | THE TREMONT HOUSE (XF @715): the full groove brightens - guitar, bass, piano, brushes, shaker, soft kick (G6 C6 G6 D7) |
| 26.80 | 804 | the TUNE's opening (G A B D) in the gap after 'hotel.' (26.77-27.17) |
| 27.23 | 817 | THE CONTRACTORS' OFFICE: a plucky walk with a light banjo (G6 E7 A7 D7) |
| 29.73 | 892 | HANDSHAKES @890-912: a rising pizz chain (G B D G) as the partners shake hands, then a soft G6 in the gap after 'job.' (30.72-31.23) |
| 31.23 | 937 | UNDER THE HOTEL: a purposeful loop (C6 D7), guitar + bass + piano + brushes |
| 32.47 | 974 | CLUNK @974: a low G bass accent + a low piano G |
| 34.43 | 1033 | MARCH @1033: the workers march in - a steady walking bass, soft kick and brushes on every beat at 88 bpm, in step with the boots (G6 D7) |
| 35.73 | 1072 | THE SIGNAL: sparse and a little tense - half-time guitar + bass (Em7 A7 Em7 D7) |
| 38.47 | 1154 | @1142 / 1168 / 1194 each turn lifts the music a step: piano B4, D5, then G5 + B5 in the gaps after 'turn.' / 'another,' / 'another.' |
| 40.77 | 1223 | HOTEL WIDE: the groove builds as the board flag climbs - guitar + bass, then piano + brushes |
| 42.88 | 1286 | FANFARE @1276: a warm G6/9 chord with a rising celesta run (G B D) in the gap after 'six feet,' (42.88-43.46) |
| 43.50 | 1305 | THE HOTEL NEVER CLOSED: a warm lazy loop (G6 C6 G6 D7) - guitar, bass, piano after-beats, brushes, shaker |
| 46.17 | 1385 | SLEEPER @1385: a half-time lullaby (guitar + bass, G6 C6) with three falling celesta 'Z's (G5 B... D G) |
| 46.97 | 1409 | CLERK @1409: the groove pops back, a warm G6/9 chord on the bell frame (G6 D7) |
| 48.07 | 1442 | PULL BACK @1442: all three scenes rising together - fuller groove (C6 D7) |
| 49.05 | 1472 | G6/9 + a rising celesta run (G B D G) in the gap after 'them.' (49.03-49.61) |
| 49.63 | 1489 | THE WINDOW: delicate - half-time guitar + bass (G6/9 Cmaj7), a celesta glint |
| 50.87 | 1526 | TAP @1526: a tiny high pizz 'tick' (G6) |
| 51.60 | 1548 | WINK @1550: a warm G6/9 chord with a pizz 'ting' (D6), in the gap after 'broke.' (51.59-52.18) |
| 52.33 | 1570 | THE PLATFORM (XF @1570): the 6/8 begins - a rocking fingerpicked arpeggio, bass on 1 and 4, soft piano chords (G6 Em7 C6 D7), 80 dotted-quarter bpm |
| 53.97 | 1619 | SLEEPING CAR @1619: the rails' 'ta-dak' joins - brushes + shaker on the 0.75 s pulse; the loop lulls (G6 C6 G6 D7 Em7 C6 G6 D7), lowering with every bar |
| 54.95 | 1648 | celesta lullaby glints (G5 B5 D6) / (D6 B5 G5) in the gaps after 'cars,' (54.91-55.22) and 'sleep,' (56.19-56.49) |
| 57.90 | 1737 | RESOLVE: a warm G6/9 (rolled guitar, piano, low G) with a celesta 'ting' (G7 B7) after 'them.' (57.89), under the far train whistle |

## SFX events
naive = the event's level vs the voice stem (max momentary, LU); applied = naive - 8 dB + offsets; beds are integrated loudness. 'mix LUFS' = the event's max momentary at mix gain, before the -3 dB speech duck (compare: voice max momentary -9.7 LUFS, integrated -13.9 LUFS). Frames not pinned in SHOTS.md, chosen here (mostly inside measured gaps): flash 6.62, droplets 8.76, schlorp 10.45, snort 12.3, tut 14.66, gavel 16.57, gasps 18.38 / 20.12, gravel 21.71, bonk stars 23.47, iron ring 33.66, whistle 36.29, chime 42.9, desk bell 47.38, wink 51.62, train whistle 57.93 s (each moved off a key word into the measured gap next to its locked frame; the frame stays the visual sync point and a dark or above-band part of the sound - or the cut itself, for the cheer @752 - sits on the frame).

## Speech-band masking check (key words)
For every word of words.json (window = word start .. end + 0.10 s): voice level minus SFX / music / bed (music + sfx) level, both band-passed 300-5000 Hz (the consonant / formant band), at mix gain after duck and limiter. 'worst 50 ms' = the smallest voice-minus-SFX margin over 50 ms frames inside the word. Rule from the bat short: SFX >= 12 dB under the voice in this band on every word (low sub content below 300 Hz is allowed, it does not mask consonants).

| word | time s | voice-SFX dB | worst 50 ms | voice-music dB | voice-bed dB |
|---|---|---|---|---|---|
| lifted | 2.72-3.14 | 42.2 | 31.0 | 25.3 | 25.3 |
| hotel | 3.94-4.40 | 31.5 | 23.3 | 18.5 | 18.3 |
| guests | 5.54-5.74 | 37.6 | 28.8 | 26.2 | 25.9 |
| swamp | 8.34-8.62 | 20.7 | 9.1 | 16.9 | 15.4 |
| mud | 10.10-10.34 | 15.2 | 5.8 | 28.8 | 15.0 |
| sewage | 10.94-11.20 | 27.7 | 14.3 | 22.1 | 21.1 |
| cholera | 13.28-13.68 | 24.0 | 13.7 | 21.0 | 19.2 |
| wild | 15.78-16.06 | 42.1 | 34.8 | 30.3 | 30.0 |
| sewers | 19.14-19.50 | 41.0 | 33.3 | 20.9 | 20.8 |
| Tremont | 24.68-24.96 | 42.7 | 30.0 | 23.0 | 22.9 |
| hotel | 26.28-26.74 | 31.6 | 26.7 | 18.8 | 18.5 |
| Pullman | 28.64-29.02 | 45.3 | 41.1 | 23.0 | 23.0 |
| jackscrews | 32.48-33.10 | 23.4 | 10.3 | 20.8 | 18.9 |
| signal | 35.96-36.26 | 22.4 | 40.1 | 18.5 | 17.0 |
| another | 38.94-39.28 | 18.1 | 9.3 | 22.0 | 16.6 |
| another | 39.80-40.10 | 18.3 | 8.4 | 17.8 | 15.1 |
| inch | 41.12-41.42 | 18.5 | 9.2 | 22.0 | 16.9 |
| hotel | 41.74-42.04 | 18.4 | 10.2 | 25.4 | 17.5 |
| rose | 42.04-42.28 | 17.9 | 13.1 | 16.7 | 14.3 |
| six | 42.28-42.54 | 39.2 | 28.3 | 14.5 | 14.5 |
| hotel | 43.62-43.96 | 20.4 | 8.9 | 21.9 | 18.1 |
| closed | 44.22-44.70 | 38.5 | 26.0 | 18.3 | 18.3 |
| rose | 48.06-48.40 | 38.9 | 27.9 | 21.0 | 20.9 |
| beneath | 48.40-48.72 | 38.4 | 30.7 | 15.3 | 15.3 |
| window | 50.86-51.16 | 17.0 | 10.1 | 19.0 | 14.8 |
| Pullman | 52.32-52.46 | 21.1 | 16.0 | 15.8 | 14.8 |
| railway | 53.58-53.96 | 23.7 | 11.0 | 17.6 | 16.7 |
| beneath | 57.28-57.58 | 40.4 | 33.1 | 16.8 | 16.8 |

All 173 words: minimum voice-SFX margin 12.1 dB ('decision' @ 16.06 s); minimum voice-bed margin 4.6 dB ('in' @ 46.96 s). No word has the SFX within 12 dB.

| # | time s | frame | cue | what | naive | applied | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0 | amb_street_hook (bed) | Chicago street, bright day: a far crowd murmur, a breeze, sparrows, a far cart (shot 1) | -37 | -37.0 | -50.9 | +0.00 |
| 2 | 3.250 | 98 | cheer_hook (bed) | @100-198 the workers cheer below (dark crowd cheer swelling as the hotel rises; under the narration, blooms in the flash gap) | -34 | -34.0 | -47.9 | +0.00 |
| 3 | 3.300 | 99 | groan_hook (bed) | @100-198 the whole hotel creaking up on its jackscrews: a slow, deep timber + brick groan rising in rate and weight (dark, below ~1.1 kHz, under 'lifted a giant brick hotel into the air ... guests still inside') | -30 | -30.0 | -43.9 | +0.00 |
| 4 | 6.550 | 196 | amb_swamp (bed) | swamp-edge streets, overcast: soft lake lapping, cattails hissing in a breeze, far frogs, flies (shot 2) | -36 | -36.0 | -49.9 | +0.00 |
| 5 | 6.620 | 196 | flash_pff | @196 the white FLASH: a soft muffled 'pfoomf' (sub + dark air), not a bang (in the gap after 'inside.' 6.59-7.23) | -8 | -12.0 | -25.9 | +0.00 |
| 6 | 8.333 | 250 | frog_plop | @250 a frog plops from the puddle: a soft dark 'bloop' (below 900 Hz, under 'swamp') | -17 | -21.0 | -34.9 | -0.30 |
| 7 | 8.760 | 263 | droplets | ...and its three tiny droplet 'plip's in the gap after 'swamp.' (8.73-9.04) | -17 | -21.0 | -34.9 | -0.30 |
| 8 | 9.360 | 281 | mud_slurp | the street is a river of mud: a sticky wet suction 'shlupp' (1/3, dark, under 'streets were rivers') | -18 | -22.0 | -35.9 | -0.40 |
| 9 | 9.720 | 292 | mud_slurp | the street is a river of mud: a sticky wet suction 'shlupp' (2/3, dark, under 'streets were rivers') | -18 | -22.0 | -35.9 | +0.35 |
| 10 | 9.950 | 298 | amb_mud (bed) | the muddy street: sticky slop, flies, a faint far crowd (shot 3) | -38 | -38.0 | -51.9 | +0.00 |
| 11 | 10.000 | 300 | mud_slurp | the street is a river of mud: a sticky wet suction 'shlupp' (3/3, dark, under 'streets were rivers') | -18 | -22.0 | -35.9 | -0.10 |
| 12 | 10.450 | 314 | boot_schlorp | @303 the man loses his boot: a long wet suction + the bright 'schlorp' pop lands in the gap after 'mud,' (10.43-10.73) | -9 | -13.0 | -26.9 | +0.30 |
| 13 | 10.850 | 326 | puddle_bubbling (bed) | @328 the puddle bubbling and burping (dark slow green bubbles; under 'sewage had nowhere to go') | -34 | -34.0 | -47.9 | +0.00 |
| 14 | 10.980 | 329 | puddle_burp | a green burp-bubble pops in the puddle (1/3, dark) | -17 | -21.0 | -34.9 | +0.20 |
| 15 | 11.550 | 346 | puddle_burp | a green burp-bubble pops in the puddle (2/3, dark) | -17 | -21.0 | -34.9 | -0.30 |
| 16 | 12.050 | 362 | puddle_burp | a green burp-bubble pops in the puddle (3/3, dark) | -17 | -21.0 | -34.9 | +0.10 |
| 17 | 12.300 | 369 | dog_snort | @358 the passing dog holds its nose and snorts 'pfft-pfft' (gap after 'go.' 12.26-12.66) | -13 | -17.0 | -30.9 | +0.35 |
| 18 | 12.920 | 388 | amb_sickroom (bed) | sickroom and street, overcast: dark room tone, a slow wall clock, a far murmur (shot 4) | -38 | -38.0 | -51.9 | +0.00 |
| 19 | 13.000 | 389 | sneeze_soft | @389 a green-faced townsman sneezes 'ah-ah-choo' (muffled, dark: it sits under 'Diseases like cholera') | -15 | -19.0 | -32.9 | -0.50 |
| 20 | 13.620 | 409 | cough_soft | a 'COUGH' puff, muffled and dark (under 'kept breaking') | -15 | -19.0 | -32.9 | +0.45 |
| 21 | 13.950 | 418 | thermo_tink | a thermometer tinks on a cup (tiny, bright, sparse) | -20 | -24.0 | -37.9 | +0.50 |
| 22 | 14.660 | 427 | doctor_tut | @427 the doctor shakes his head: a dry 'tsk, tsk' (in the gap after 'out,' 14.55-14.96) | -11 | -15.0 | -28.9 | -0.15 |
| 23 | 14.800 | 444 | cough_last | one last small cough from the back of the row (same gap, soft) | -17 | -21.0 | -34.9 | +0.50 |
| 24 | 15.600 | 468 | amb_council (bed) | the council hall, warm interior: room tone, a murmuring council, creaking floorboards (shot 5) | -37 | -37.0 | -50.9 | +0.00 |
| 25 | 15.633 | 469 | xf_air | soft warm-air swell through the dissolve @469 | -26 | -30.0 | -43.9 | +0.00 |
| 26 | 16.570 | 496 | gavel | @496 the mayor bangs the gavel: a crisp dry 'tok' + the oak table (in the gap after 'decision,' 16.55-16.86; the frame is 16.53) | -7 | -11.0 | -24.9 | +0.00 |
| 27 | 18.380 | 551 | council_gasp | @541-585 the councilmen gasp 'ooooh' at the easel picture (gap after 'feet,' 18.35-18.66) | -12 | -16.0 | -29.9 | +0.00 |
| 28 | 18.500 | 555 | gasp_soft | @555 a murmuring 'ooh' under 'build the sewers' (dark, quiet) | -18 | -22.0 | -35.9 | -0.20 |
| 29 | 20.120 | 604 | council_gasp2 | ...and a second, smaller 'oooh' after 'underneath.' (gap 20.09-20.69) | -15 | -19.0 | -32.9 | +0.15 |
| 30 | 20.550 | 616 | amb_dig (bed) | the street being raised: a breeze, sparrows, workers murmuring, a far wagon (shot 6) | -38 | -38.0 | -51.9 | +0.00 |
| 31 | 20.817 | 624 | shovel | @623-650 a shovel bites into earth and scrapes (1/3; dark, under 'streets were easy') | -17 | -21.0 | -34.9 | -0.40 |
| 32 | 21.120 | 634 | shovel | @623-650 a shovel bites into earth and scrapes (2/3; dark, under 'streets were easy') | -17 | -21.0 | -34.9 | +0.30 |
| 33 | 21.400 | 642 | shovel | @623-650 a shovel bites into earth and scrapes (3/3; dark, under 'streets were easy') | -17 | -21.0 | -34.9 | -0.20 |
| 34 | 21.710 | 650 | gravel_dump | @650 the wagon dumps its load: a pouring rush, tumbling stones, a deep thump (gap after 'easy,' 21.71-22.01; the frame is 21.67) | -12 | -16.0 | -29.9 | +0.20 |
| 35 | 22.833 | 685 | head_bonk | @685 the man bonks his head on the low window: a hollow wooden 'bonk' (dark, under 'go up') | -12 | -16.0 | -29.9 | -0.20 |
| 36 | 23.470 | 704 | bonk_stars | ...and the little wobbling 'bwoi-oi-oing' of seeing stars in the gap after 'too.' (23.46-23.86) | -14 | -18.0 | -31.9 | -0.20 |
| 37 | 23.780 | 713 | amb_hotel_front (bed) | the grand hotel front: a bright street, a carriage on cobbles (clip-clop + wheels), a far crowd (shot 7) | -35 | -35.0 | -48.9 | +0.00 |
| 38 | 23.833 | 715 | xf_air | soft warm-air swell through the dissolve @715 | -26 | -30.0 | -43.9 | +0.00 |
| 39 | 23.933 | 715 | doorman | @715 a carriage pulls up at the hotel: a leather-and-brass jingle of harness (dark, quiet) | -26 | -30.0 | -43.9 | -0.40 |
| 40 | 26.000 | 780 | flag_hotel (bed) | @788 the flag on the roof fluttering (dark, quiet) | -41 | -41.0 | -54.9 | +0.00 |
| 41 | 26.800 | 823 | blueprint_unroll | @823 Pullman unrolls the blueprint on the table: a crackly paper curl, its end flopping flat on the frame (starts in the gap 26.77-27.17) | -14 | -18.0 | -31.9 | +0.25 |
| 42 | 27.180 | 815 | amb_office (bed) | the contractors' office: quiet room tone, a wall clock, a pen scratching, a far street (shot 8) | -38 | -38.0 | -51.9 | +0.00 |
| 43 | 29.700 | 891 | handshake | @890-912 the partners shake hands in a chain (1/4): a firm 'pap' of palms + cloth | -16 | -20.0 | -33.9 | -0.50 |
| 44 | 29.910 | 897 | handshake | @890-912 the partners shake hands in a chain (2/4): a firm 'pap' of palms + cloth | -16 | -20.0 | -33.9 | -0.15 |
| 45 | 30.120 | 904 | handshake | @890-912 the partners shake hands in a chain (3/4): a firm 'pap' of palms + cloth | -16 | -20.0 | -33.9 | +0.20 |
| 46 | 30.320 | 910 | handshake | @890-912 the partners shake hands in a chain (4/4): a firm 'pap' of palms + cloth | -16 | -20.0 | -33.9 | +0.55 |
| 47 | 31.180 | 935 | amb_yard (bed) | under the hotel, daylight: a breeze, a far street, flags, a far bird (shot 9) | -38 | -38.0 | -51.9 | +0.00 |
| 48 | 32.467 | 974 | jackscrew_clunk | @974 the worker sets the big iron jackscrew under the beam: a heavy low 'CLUNK' (dark; on 'jackscrews') | -10 | -14.0 | -27.9 | +0.00 |
| 49 | 33.660 | 1010 | iron_ring | ...and the iron ringing on a moment, bright, in the gap after 'building,' (33.65-34.00) | -18 | -22.0 | -35.9 | +0.15 |
| 50 | 34.433 | 1033 | marching (bed) | @1033 hundreds of workers march in and take their positions (a growing column of boots on packed earth, soft and dark) | -33 | -33.0 | -46.9 | +0.00 |
| 51 | 35.900 | 1077 | amb_yard2 (bed) | the signal and the turns: a breeze, a hush over the yard, flags (shot 10) | -39 | -39.0 | -52.9 | +0.00 |
| 52 | 36.290 | 1079 | whistle | @1079 the foreman blows his pea whistle: a short 'tweeet' (in the narrow gap after 'signal,' 36.29-36.52; the frame is 35.97) | -9 | -13.0 | -26.9 | -0.30 |
| 53 | 37.667 | 1130 | ratchet_ripple | @1130-1142 the ripple of ratchet 'clicks' running down the line (1/3: tiny dry transients) | -12 | -16.0 | -29.9 | +0.00 |
| 54 | 37.717 | 1131 | timber_creak | ...each with a small timber creak as the beam takes the turn (1/3, dark) | -17 | -21.0 | -34.9 | +0.00 |
| 55 | 38.933 | 1168 | ratchet_ripple | @1168 the ripple of ratchet 'clicks' running down the line (2/3: tiny dry transients) | -11 | -15.0 | -28.9 | +0.00 |
| 56 | 38.983 | 1169 | timber_creak | ...each with a small timber creak as the beam takes the turn (2/3, dark) | -16 | -20.0 | -33.9 | +0.00 |
| 57 | 39.800 | 1194 | ratchet_ripple | @1194 the ripple of ratchet 'clicks' running down the line (3/3: tiny dry transients) | -10 | -14.0 | -27.9 | +0.00 |
| 58 | 39.850 | 1195 | timber_creak | ...each with a small timber creak as the beam takes the turn (3/3, dark) | -15 | -19.0 | -32.9 | +0.00 |
| 59 | 40.700 | 1221 | amb_yard3 (bed) | hotel wide: breeze, far street (shot 11) | -38 | -38.0 | -51.9 | +0.00 |
| 60 | 40.800 | 1224 | groan_wide (bed) | @1223-1301 the whole hotel creaking slowly up, inch by inch (dark timber groan) | -36 | -36.0 | -49.9 | +0.00 |
| 61 | 41.133 | 1234 | board_tick | @1234 the board flag clicks up one mark (a dry wooden 'tok', tiny) | -13 | -17.0 | -30.9 | +0.40 |
| 62 | 41.600 | 1248 | board_tick | @1248 the board flag clicks up one mark (a dry wooden 'tok', tiny) | -12 | -16.0 | -29.9 | +0.40 |
| 63 | 42.033 | 1261 | board_tick | @1261 the board flag clicks up one mark (a dry wooden 'tok', tiny) | -11 | -15.0 | -28.9 | +0.40 |
| 64 | 42.900 | 1287 | fanfare_chime | @1276 the flag tops six marks: a little three-note fanfare chime (G C E + sparkle) in the gap after 'six feet,' (42.88-43.46) | -9 | -13.0 | -26.9 | +0.20 |
| 65 | 43.300 | 1299 | amb_lobby (bed) | hotel cutaway interior, warm: a lobby and dining-room murmur, a clock, cutlery tinks (shot 12) | -37 | -37.0 | -50.9 | +0.00 |
| 66 | 43.350 | 1300 | lift_hum (bed) | @1301-1570 the gentle hum of the whole building rising (low drones 54 / 82 / 108 Hz beating softly, a faint timber creak) | -34 | -34.0 | -47.9 | +0.00 |
| 67 | 43.633 | 1309 | sign_flip | @1309 the bellhop flips the little key sign: a wooden 'clack-clack' + a settling jingle | -17 | -21.0 | -34.9 | -0.30 |
| 68 | 45.333 | 1360 | soup_slurp | @1360 the diner slurps his soup (a soft 'shlrp', dark; under 'Guests kept') | -16 | -20.0 | -33.9 | +0.30 |
| 69 | 46.167 | 1385 | snore | @1385 the sleeper snores in his nightcap: a fluttering dark inhale (under 'sleeping') | -15 | -19.0 | -32.9 | -0.20 |
| 70 | 46.720 | 1402 | snore_out | ...and the whistly exhale (dark, quiet, under 'checking in') | -25 | -29.0 | -42.9 | -0.20 |
| 71 | 47.380 | 1409 | desk_bell | @1409 the clerk rings the desk bell: one bright 'ding' (in the gap after 'in,' 47.21-47.56; the frame is 46.97) | -12 | -16.0 | -29.9 | +0.30 |
| 72 | 49.600 | 1488 | amb_window (bed) | window close-up, bright day: a light breeze and a far street (shot 13) | -39 | -39.0 | -52.9 | +0.00 |
| 73 | 50.867 | 1526 | glass_tap | @1526 the inspector taps the glass with a knuckle: a small dry 'tok' + a glassy ring (tiny, on 'window') | -14 | -18.0 | -31.9 | +0.10 |
| 74 | 51.620 | 1550 | wink_ting | @1550 the inspector winks: a small bright 'ting' on A7 (gap after 'broke.' 51.59-52.18) | -9 | -13.0 | -26.9 | +0.25 |
| 75 | 52.280 | 1568 | amb_platform (bed) | the platform at golden dusk: an idling steam engine (soft chuffs), a far station crowd, a breeze (shot 14a) | -36 | -36.0 | -49.9 | +0.00 |
| 76 | 52.333 | 1570 | xf_air | soft warm-air swell through the dissolve @1570 | -26 | -30.0 | -43.9 | +0.00 |
| 77 | 52.933 | 1588 | steam_hiss | @1588 the locomotive lets off steam beside rich Pullman: a soft dark 'pssshh' (below ~1.8 kHz, under 'rich') | -15 | -19.0 | -32.9 | -0.20 |
| 78 | 53.200 | 1596 | coin_spin | @1596 a gold coin spins on the platform: a bright quickening ring + a rattle as it settles (under 'building') | -17 | -21.0 | -34.9 | +0.35 |
| 79 | 53.967 | 1619 | amb_sleeper (bed) | @1619+ inside the sleeping car: rails clatter 'ta-dak ta-dak' soft and lulling at a slow 0.75 s cycle (the music rocks with it), a low carriage rumble, panels creaking | -33 | -33.0 | -46.9 | +0.00 |
| 80 | 55.867 | 1676 | snore2 | @1676 push in on a sleeper: a soft, slow snore (dark) | -17 | -21.0 | -34.9 | +0.30 |
| 81 | 57.930 | 1727 | train_whistle | @1727 a soft far train whistle at the very end (after 'them.' 57.89; the frame is 57.57) | -12 | -16.0 | -29.9 | +0.10 |

## Verification
- Mix stream: `stream|sample_rate=48000|channels=2|bits_per_sample=24|duration_ts=2832000`
- exact length 2,832,000 samples, stereo: OK; voice/mix_final.wav identical to public/chicago/mix.wav: OK
- whisper small.en (int8, cpu) on voice.wav: "In 1861, Chicago lifted a giant brick hotel into the air, with the guests still inside. Chicago was built on a swamp, the streets were rivers of mud, and the sewage had nowhere to go. Diseases like cholera kept breaking out, so the city made a wild decision, raised the whole city several feet, and built the sewers underneath. The streets were easy, but the buildings had to go up too. The biggest one was the Tremont House, a huge brick hotel. A young engineer named George Pullman and his partners took the job. They put about 5 ,000 jackscrews under the building and hired hundreds of men. On a signal, every man gave his screws a tiny turn. Then another, and another. Inch by inch, the hotel rose six feet, and the hotel never closed. Guests kept eating, sleeping, and checking in, while the building rose beneath them. Reportedly, not a single window broke. Pullman later got rich building railway sleeping cars, so people could sleep while the The world moved beneath them."
- whisper small.en on the mix: "In 1861, Chicago lifted a giant brick hotel into the air, with the guests still inside. Chicago was built on a swamp, the streets were rivers of mud, and the sewage had nowhere to go. Diseases like cholera kept breaking out, so the city made a wild decision, raised the whole city several feet, and built the sewers underneath. The streets were easy, but the buildings had to go up too. The biggest one was the Tremont House, a huge brick hotel. A young engineer named George Pullman and his partners took the job. They put about 5 ,000 jackscrews under the building and hired hundreds of men. On a signal, every man gave his screws a tiny turn. Then another, and another. Inch by inch, the hotel rose six feet, and the hotel never closed. Guests kept eating, sleeping, and checking in, while the building rose beneath them. Reportedly, not a single window broke. Pullman later got rich building railway sleeping cars, so people could sleep while the The world moved beneath them."
- word-level diff voice.wav -> mix: IDENTICAL
- word-level diff voice.wav -> voice stem alone (same voice, +master gain and limiter, no music / SFX): IDENTICAL
- word-level diff voice stem alone -> mix (what the music + SFX change): IDENTICAL
- SCRIPT.md words not literally in the voice-only transcript (whisper writes numbers as digits): ['raise', 'build']
- SCRIPT.md words not literally in the mix transcript: ['raise', 'build']
- 'lifted': voice-only probs [1.0], mix probs [0.99]
- 'guests': voice-only probs [0.98, 0.97], mix probs [0.96, 0.97]
- 'swamp': voice-only probs [1.0], mix probs [1.0]
- 'sewage': voice-only probs [0.99], mix probs [0.98]
- 'cholera': voice-only probs [0.97], mix probs [0.97]
- 'wild': voice-only probs [0.99], mix probs [0.99]
- 'sewers': voice-only probs [1.0], mix probs [1.0]
- 'tremont': voice-only probs [0.96], mix probs [0.94]
- 'pullman': voice-only probs [0.97, 0.99], mix probs [0.97, 0.99]
- 'jackscrews': voice-only probs [0.82], mix probs [0.83]
- 'signal': voice-only probs [1.0], mix probs [0.99]
- 'another': voice-only probs [0.87, 1.0], mix probs [0.9, 1.0]
- 'six': voice-only probs [0.75], mix probs [0.64]
- 'closed': voice-only probs [1.0], mix probs [1.0]
- 'window': voice-only probs [1.0], mix probs [1.0]
- 'railway': voice-only probs [0.92], mix probs [0.9]
- 'beneath': voice-only probs [1.0, 1.0], mix probs [1.0, 1.0]

Key-word windows (~3.5 s around each word, voice.wav vs the voice stem alone vs the mix, same cut; edges snapped to the quietest 10 ms of the voice within +-0.8 s, whisper on voice.wav vs on the mix, same cut):

| word | window s | voice.wav | voice stem (mix gain + limiter) | mix | mix vs voice stem | key-word prob voice / stem / mix |
|---|---|---|---|---|---|---|
| lifted | 1.57-5.12 | Chicago lifted a giant brick hotel into the air. | Chicago lifted a giant brick hotel into the air. | Chicago lifted a giant brick hotel into the air. | IDENTICAL | [0.99] / [0.99] / [0.99] |
| guests | 3.11-6.66 | a giant brick hotel into the air, with the guests still inside. | a giant brick hotel into the air, with the guests still inside. | a giant brick hotel into the air, with the guests still inside. | IDENTICAL | [0.98] / [0.98] / [0.97] |
| swamp | 6.66-10.46 | Chicago was built on a swamp. The streets were rivers of mud. | Chicago was built on a swamp. The streets were rivers of mud. | Chicago was built on a swamp. The streets were rivers of mud. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| sewage | 8.80-12.33 | The streets were rivers of mud, and the sewage had nowhere to go. | The streets were rivers of mud, and the sewage had nowhere to go. | The streets were rivers of mud, and the sewage had nowhere to go. | IDENTICAL | [1.0] / [1.0] / [0.99] |
| cholera | 12.33-14.62 | Diseases like cholera kept breaking out. | Diseases like cholera kept breaking out. | Diseases like cholera kept breaking out. | IDENTICAL | [0.97] / [0.97] / [0.97] |
| wild | 14.62-18.39 | So the city made a wild decision, raised the whole city several feet. | So the city made a wild decision, raised the whole city several feet. | So the city made a wild decision, raised the whole city several feet. | IDENTICAL | [0.97] / [0.98] / [0.98] |
| sewers | 16.77-20.27 | raise the whole city several feet, and build the sewers underneath. | raise the whole city several feet, and build the sewers underneath. | Raise the whole city several feet, and build the sewers underneath. | IDENTICAL | [1.0] / [1.0] / [0.99] |
| tremont | 23.53-26.84 | The biggest one was the Tremont House, a huge brick hotel. | The biggest one was the Tremont House, a huge brick hotel. | The biggest one was the Tremont House, a huge brick hotel. | IDENTICAL | [0.94] / [0.93] / [0.93] |
| pullman | 26.84-30.89 | A young engineer named George Pullman and his partners took the job. | A young engineer named George Pullman and his partners took the job. | A young engineer named George Pullman and his partners took the job. | IDENTICAL | [0.96] / [0.96] / [0.96] |
| jackscrews | 30.89-33.74 | They put about 5 ,000 jackscrews under the building. | They put about 5 ,000 jackscrews under the building. | They put about 5 ,000 jackscrews under the building. | IDENTICAL | [0.84] / [0.84] / [0.84] |
| signal | 33.69-38.54 | and hired hundreds of men. On a signal, every man gave his screws a tiny turn. | and hired hundreds of men. On a signal, every man gave his screws a tiny turn. | and hired hundreds of men. On a signal, every man gave his screws a tiny turn. | IDENTICAL | [0.99] / [0.99] / [0.99] |
| another | 37.47-40.33 | screws a tiny turn, then another, and another. | screws a tiny turn, then another, and another. | grooves a tiny turn, then another, and another. | word OK, context differs | [0.99, 1.0] / [0.99, 1.0] / [0.99, 0.99] |
| another | 38.54-41.60 | Then another, and another, inch by inch. | Then another, and another, inch by inch. | Then another, and another, inch by inch. | IDENTICAL | [0.95, 1.0] / [0.93, 1.0] / [0.95, 1.0] |
| six | 40.33-43.36 | Inch by inch, the hotel rows 6 feet. | Inch by inch, the hotel rows 6 feet. | Inch by inch the hotel rows six feet | IDENTICAL | [0.51] / [0.57] / [0.68] |
| closed | 42.95-45.71 | and the hotel never closed. Guests kept... | and the hotel never closed. Guests kept | And the hotel never closed, guests kept | IDENTICAL | [1.0] / [1.0] / [1.0] |
| guests | 42.95-46.42 | and the hotel never closed. Guests kept eating, sleep... | And the hotel never closed. Guests kept eating, sleeping. | And the hotel never closed guests kept eating sleep | word OK, context differs | [0.95] / [0.96] / [0.08] |
| beneath | 46.42-49.51 | and checking in while the building rose beneath them. | and checking in, while the building rose beneath them. | and checking in while the building rose beneath them. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| window | 49.10-51.96 | Reportedly, not a single window broke. | Reportedly, not a single window broke. | Reportedly, not a single window broke. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| pullman | 50.27-54.93 | Not a single window broke. Pullman later got rich building railway sleeping cars. | Not a single window broke. Pullman later got rich building railway sleeping cars. | Not a single window broke. Pullman later got rich building railway sleeping cars. | IDENTICAL | [0.97] / [0.97] / [0.96] |
| railway | 51.67-54.98 | Pullman later got rich building railway sleeping cars. | Pullman later got rich building railway sleeping cars. | Pullman later got rich building railway sleeping cars. | IDENTICAL | [0.89] / [0.89] / [0.89] |
| beneath | 54.98-58.38 | so people could sleep while the world moved beneath them. | so people could sleep while the world moved beneath them. | so people could sleep while the world moved beneath them. | IDENTICAL | [1.0] / [1.0] / [1.0] |
