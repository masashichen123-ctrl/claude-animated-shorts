# The Time Lock - soundtrack cue sheet

All sound is original and synthesized in numpy/scipy: instruments in `instruments.py` (guitar pluck, upright bass, brushes, shaker, soft kick, banjo, vibes, celesta, pizzicato, woodblock, timpani, pad from the shared kit) + a soft upright piano added in `music.py`; SFX in `sfx_vault.py` (night town, owl, crowbar, tiptoe and cobble steps, the deep vault-door groan, key jingle, wheel / bolt / clack, workshop, pencil, springs, clockwork ticks, prairie town, horse, bell, snip, slaps, rope, cards, knitting, coin bags, modern hum, guard-clock steps) with helpers from `sfx_chicago.py` / `sfx_marathon.py` / `sfx_gen.py` / `sfx_emu.py` / `sfx_bat.py`; placed by `music.py` / `sfx.py` from `timeline.py` (frames from SHOTS.md), mixed by `mix.py`.
Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch, no time change). Rebuild everything + verify: `bash audio/build.sh` (a few minutes with the whisper checks; mix only: `python3 audio/mix.py --fresh`).

## Files
| file | content |
|---|---|
| `public/vault/mix.wav` = `voice/mix_final.wav` | final mix, 48 kHz, stereo, 24-bit, 2,544,000 samples = 53.000 s |
| `audio/out/stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain, after the master limiter's gain curve: voice + music + sfx = mix.wav |
| `audio/check.py` | verification: whisper transcription of voice.wav vs the mix (faster-whisper small.en), sample count |

## Master loudness (own BS.1770-4 meter)
- Integrated **-14.01 LUFS**, true peak **-1.30 dBTP**, LRA 1.6 LU, max momentary -9.7 LUFS, max short-term -12.9 LUFS; 0 samples at full scale
- Stems at mix gain: voice -14.0 LUFS (peak -0.8 dBFS, max momentary -9.8 LUFS), music -28.4 LUFS, sfx -26.0 LUFS (master gain +7.57 dB and the limiter gain curve, the same on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.3 dBTP): max gain reduction 6.96 dB, active (>0.1 dB) on 28.36 % of samples; inside speech: max 6.96 dB, 90th / 99th percentile 1.17 / 4.58 dB, active on 34.2 % of speech samples. This peak limiting is the only processing besides gain that reaches the narration (same approach as the emu and bat mixes): the TTS voice's true-peak-to-loudness ratio is too high to reach -14 LUFS at <= -1 dBTP with gain alone.
- Discontinuity check: 186 boundaries (start + end of every placed SFX event, every music cut / re-entry) checked on the SFX and music stems, 0 suspicious.

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -14.0 LUFS
    Threshold: -24.3 LUFS
  Loudness range:
    LRA:         1.6 LU
    Threshold: -34.3 LUFS
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
| night | 0.00-6.10 | -13.7 | -30.8 | -28.1 | 17.2 | 16.8 | 12.6 | 0.2 |
| plan | 6.10-9.17 | -12.9 | -29.9 | -23.2 | 17.8 | 17.3 | 11.3 | 0.5 |
| march | 9.17-12.17 | -14.8 | -31.4 | -32.3 | 17.9 | 17.8 | 14.2 | 1.6 |
| vault | 12.17-14.60 | -13.3 | -30.5 | -27.5 | 18.7 | 12.1 | 10.4 | 7.6 |
| key | 14.60-16.05 | -11.9 | -28.6 | -22.8 | 17.6 | 16.9 | 12.2 | 0.7 |
| hold | 16.05-16.90 | -15.2 | -31.2 | -37.3 | 15.6 | 14.7 | 11.9 | 10.0 |
| bloom | 16.90-17.40 | -58.2 | -15.7 | -18.1 | - | - | - | - |
| shop | 17.40-24.70 | -13.9 | -30.7 | -27.3 | 17.8 | 17.3 | 11.2 | 1.8 |
| clock | 24.70-31.17 | -13.7 | -31.1 | -38.8 | 17.3 | 17.2 | 13.7 | 0.3 |
| morrison | 31.17-37.12 | -14.2 | -31.8 | -30.0 | 17.3 | 16.9 | 13.6 | 1.6 |
| return | 37.12-41.40 | -14.6 | -31.8 | -25.3 | 18.0 | 16.7 | 6.2 | 1.1 |
| wait | 41.40-45.10 | -13.9 | -31.2 | -31.1 | 17.9 | 16.4 | 11.6 | -2.2 |
| queue | 45.10-47.67 | -13.7 | -31.6 | -25.7 | 17.4 | 17.1 | 13.1 | -1.9 |
| modern | 47.67-51.98 | -13.5 | -30.9 | -47.5 | 18.4 | 18.3 | 12.0 | 0.6 |
| end | 51.98-53.00 | -52.5 | -16.4 | -21.5 | - | - | - | - |

Music under the voice: median over the sections' speech windows **17.8 LU**; in the longer gaps (>= 0.55 s) the music's median momentary level is **10.7 LU** under the voice's integrated loudness.

Applied section gains (dB): night -16.0, plan -18.0, march -18.6, vault -12.7, key -8.8, hold -8.8, bloom -8.8, shop -16.9, clock -18.5, morrison -20.0, return -17.6, wait -11.0, queue -20.2, modern -13.9, end -13.9.

Narration gaps (measured on voice.wav), where the louder hits and the music blooms go: 2.14-2.42, 4.67-4.94, 6.13-6.72, 7.67-7.97, 8.85-9.12, 10.30-10.60, 11.74-12.18, 14.81-15.18, 16.88-17.40, 20.51-20.84, 22.82-23.18, 25.52-25.84, 29.27-29.58, 30.77-31.18, 33.01-33.36, 36.61-37.07, 38.77-39.06, 40.91-41.38, 43.71-44.04, 45.08-45.66, 47.14-47.68, 49.56-49.82.

## Music map (chill acoustic score with a light heist-comedy / Wild-West tinge: 96 bpm, D minor / Dorian by night, D major by day)
Fingerpicked nylon guitar, round upright bass (boom-chick in two, walking for the marches), brushes + shaker + soft kick, a light banjo plink, a muted staccato pizzicato 'tiptoe' motif (D D# D - A A# A) for the robbers, a soft woodblock / clave tick-tock on every beat of the clock sections (the SFX ticks sit on the same 0.625 s grid), a soft upright piano, vibes and celesta for the warm resolves. The band holds / stops just before the vault door opens (16.05 s) and blooms into a golden D6/9 in the gap after 'anything.'; a D6/9 resolve with a vibes 'ting' ends the film. All composed here (no existing melodies).

| time s | frame | music |
|---|---|---|
| 0.00 | 0 | NIGHT STREET: moonlit and sparse - fingerpicked nylon guitar + upright bass (Dm9 Bb), no drums; crickets and a far owl in the SFX |
| 4.20 | 126 | CROWBAR @126: a soft falling pizz 'toss' (D3), answered by a low pizz (G2) on the clank in the gap after 'vaults.' (4.67-4.96) |
| 4.51 | 135 | TIPTOE @126-150: the robbers' muted pizzicato motif (D D# D - A A# A, staccato, wandering L / R) over a hushed guitar |
| 5.00 | 150 | BEDROOM @150: slow half-time Dm9, a candle-flicker celesta glint (A5 D5); the banker snores |
| 6.10 | 183 | FLASH @183: a soft reversed-vibes shimmer swells into the frame; the band stops on it |
| 6.18 | 185 | THE PLAN: a conspiratorial little skip - guitar, bass, brushes, shaker (Dm7 G6), light and sneaky |
| 7.68 | 230 | SCOOP @239: a quick rising pizz run (D F# A D) in the gap before 'Grab' (7.66-7.97) and a low pizz 'flop' (D2) on the frame |
| 9.17 | 275 | NIGHT MARCH @275-330: a steady walking bass, soft kick and brushes on every beat at 96 bpm in step with the boots (Dm A7), the tiptoe motif an octave down |
| 11.80 | 354 | ARRIVAL @330: a held A7 in the gap after 'door.' (11.73-12.18) |
| 12.17 | 365 | THE VAULT @365-374: hushed and huge - a low D / A piano drone and bass, three high celesta glints, no rhythm (the door's groan is the SFX) |
| 14.84 | 445 | KEY @438-462: a trembling pizz shiver (A4 A#4 alternating 16ths) in the gap after 'key,' (14.79-15.23) |
| 15.45 | 464 | KNEES @462: four soft clave knocks (the banker's knees knocking) under 'scared banker' |
| 16.05 | 482 | HOLD @484-493: the band stops dead before the wheel turns; only a quiet low D and a thin pad hold under the groan and the door's creak |
| 16.98 | 509 | DOOR OPENS @493 (golden light): a warm D6/9 blooms in the gap after 'anything.' (16.90-17.49), rolled guitar + piano + vibes + a rising celesta run |
| 17.50 | 525 | SARGENT'S WORKSHOP (XF @522): warm and busy - guitar, bass, brushes, shaker, soft piano after-beats (G6 Em7), vibes 'gear' plinks |
| 20.61 | 618 | SPARK @594: a rising vibes 'ting' arpeggio (A5 D6 F#6 A6) in the gap after 'idea.' (20.50-20.84) |
| 21.70 | 651 | SCRIBBLE @625-658: a soft light pizz run (G5 up and down) like a pencil racing |
| 22.86 | 686 | KEYHOLE @676: a rueful two-note pizz (A3 E3) in the gap after 'open.' (22.84-23.25) |
| 24.07 | 722 | SPRINGS @722: a spill of random tiny celesta notes (the springs and gears falling) |
| 24.63 | 739 | ASSEMBLE @742-750: a quick rising pizz run (D3 F#3 A3 D4 F#4) that lands on the first tick |
| 25.00 | 750 | THE CLOCK GROOVE @750-935: a soft woodblock / clave tick-tock on every beat (96 bpm, alternating pitch), bass in two, muted guitar, brush after-beats, a few piano chords (Dm7 G6 Dm7 Asus); the SFX ticks sit on the same beats |
| 26.60 | 798 | BOLT @798: a tiny extra clave 'tok' (the bolt locks) |
| 28.04 | 841 | FAILED TURNS @840 / @887: a soft falling pizz 'wah-wah' (D3 C#3 C3 / C3 B2 Bb2) under the clacks |
| 30.82 | 925 | SIGH @910: a falling pizz sigh (F#5 D5 B4) in the gap after 'asking.' (30.76-31.20), the ticking carries on |
| 31.17 | 935 | MORRISON, ILLINOIS (XF @935): a warm D6 chord, then a bright prairie boom-chick - guitar, upright bass, brushes, shaker, soft kick, light banjo plinks (D6 G6) |
| 33.04 | 991 | a little prairie tune (F# A D B) in the gap after '1874,' (33.00-33.37) |
| 34.47 | 1034 | BOLTING ON @1034: a low D bass accent |
| 36.15 | 1084 | RIBBON SNIP @1087: a tiny bright vibes 'ting' (G7) on the snip in the micro-gap before 'Illinois' |
| 36.68 | 1100 | RESOLVE: a rising D F# A D run + a D6 chord in the gap after 'Illinois.' (36.62-37.08) |
| 37.14 | 1114 | NIGHT RETURN @1114-1151: a creeping walk again, the tiptoe motif (D D# D A A# A) an octave down under 'kidnapping no longer worked' (Dm A7) |
| 38.83 | 1165 | FAILED TURN @1172: a low falling pizz (A2 G#2 G2) in the gap before 'Unluckily' |
| 40.19 | 1206 | FACE-PALM @1210: a short pizz 'bonk' (A3 D3) in the micro-gap before 'neither' |
| 40.95 | 1228 | SAD TROMBONE: soft vibes 'wah-wah-wah-wahhh' (F E Eb D) in the gap after 'he.' (40.91-41.46) |
| 41.50 | 1245 | THE WAITING (@1241): the clock groove returns, quieter - guitar, bass, brush, soft clave (Dm7) |
| 42.00 | 1260 | FIST @1260: a soft low timpani 'dum' (D2) |
| 42.77 | 1283 | ROPE @1283: a 'bloop-bloop' pizz tie (A2 D3) |
| 43.43 | 1303 | TIME-LAPSE @1303-1325: accelerating woodblock ticks (0.20 s -> 0.04 s apart) with a rising vibes run (D up in tones) - cards, knitting, cobwebs, a bird |
| 44.73 | 1342 | SMUG TICK @1342: one tiny woodblock tick on 'care' |
| 45.12 | 1354 | a second, smugger tick + a vibes D6 in the gap after 'care.' (45.08-45.66) |
| 45.68 | 1370 | THE QUEUE @1373: a cheerful bustle - walking bass, guitar, banjo, brushes, shaker, soft kick (D6 A7) |
| 47.27 | 1418 | COINS @1403: a rising vibes run (D F# A D) + a D6/9 chord in the gap after 'one.' (47.12-47.70) |
| 47.67 | 1430 | MODERN VAULT (XF @1430): the tick-tock groove returns, brighter - clave, guitar, bass, brush, soft piano (D6/9 G6) |
| 49.58 | 1487 | a vibes glint (D6 F#6 A6) in the gap after 'locks.' (49.55-49.86) |
| 50.13 | 1504 | GUARD CLOCK @1504: stiff little pizz steps (D3 A3, eighths) under 'security guard', then a hushed G6 hold for the stare |
| 51.98 | 1559 | WINK @1551: a warm D6/9 resolve (rolled guitar, piano, vibes, low D) right after 'clock.', a vibes 'ting' on A6 over the SFX wink, a last celesta run, ringing out to the end |

## SFX events
naive = the event's level vs the voice stem (max momentary, LU); applied = naive - 8 dB + offsets; beds are integrated loudness. 'mix LUFS' = the event's max momentary at mix gain, before the -3 dB speech duck (compare: voice max momentary -9.8 LUFS, integrated -14.0 LUFS). Times chosen here (moved into measured narration gaps next to the locked frames, which stay the visual sync points; a dark or tiny part of the sound sits on the frame): crowbar clank 4.7, gasp 6.22, flash 6.1, scoop 7.68, key jingle 14.82, door shimmer 16.98, spark ping 20.61, last springs 25.52, sigh 30.82, bell 33.03, snip 36.15, face-palm slaps 40.19, second smug tick 45.12, coin chinks 47.26, wink 51.98 s.

## Speech-band masking check (key words)
For every word of words.json (window = word start .. end + 0.10 s): voice level minus SFX / music / bed (music + sfx) level, both band-passed 300-5000 Hz (the consonant / formant band), at mix gain after duck and limiter. 'worst 50 ms' = the smallest voice-minus-SFX margin over 50 ms frames inside the word. Rule from the bat short: SFX >= 12 dB under the voice in this band on every word (low sub content below 300 Hz is allowed, it does not mask consonants).

| word | time s | voice-SFX dB | worst 50 ms | voice-music dB | voice-bed dB |
|---|---|---|---|---|---|
| vaults | 4.20-4.56 | 25.6 | 18.9 | 18.6 | 17.8 |
| kidnapped | 5.22-5.50 | 35.1 | 23.3 | 24.5 | 24.2 |
| banker | 5.74-6.00 | 28.1 | 20.4 | 17.0 | 16.7 |
| open | 11.04-11.30 | 44.9 | 37.4 | 22.7 | 22.6 |
| vault | 12.48-12.76 | 42.2 | 33.5 | 24.4 | 24.3 |
| key | 14.60-14.78 | 34.4 | 27.1 | 8.8 | 8.8 |
| scared | 15.40-15.62 | 28.0 | 15.2 | 18.8 | 18.2 |
| banker | 15.62-15.94 | 26.0 | 16.2 | 16.0 | 15.5 |
| open | 16.14-16.42 | 26.1 | 14.4 | 20.3 | 19.4 |
| Sargent | 18.78-19.28 | 37.9 | 28.0 | 20.9 | 20.8 |
| idea | 20.00-20.50 | 31.5 | 21.8 | 14.6 | 14.4 |
| banker | 21.94-22.18 | 35.6 | 26.5 | 17.7 | 17.6 |
| open | 22.54-22.82 | 33.3 | 25.1 | 15.1 | 15.0 |
| parts | 24.06-24.26 | 30.7 | 23.4 | 24.6 | 23.6 |
| clocks | 25.00-25.36 | 26.9 | 19.7 | 15.7 | 15.4 |
| clock | 26.02-26.22 | 32.3 | 21.6 | 23.9 | 23.3 |
| bolt | 26.60-26.80 | 26.5 | 18.0 | 22.1 | 20.9 |
| release | 28.00-28.34 | 24.5 | 14.0 | 15.2 | 15.0 |
| one | 33.68-33.94 | 35.6 | 26.1 | 20.9 | 20.9 |
| vault | 34.48-34.64 | 24.9 | 22.8 | 25.0 | 22.2 |
| Morrison | 35.56-35.90 | 38.1 | 27.8 | 22.7 | 22.6 |
| Unluckily | 39.06-39.46 | 42.1 | 34.9 | 24.3 | 24.1 |
| banker | 39.76-40.06 | 48.2 | 39.2 | 37.3 | 37.0 |
| neither | 40.34-40.42 | 21.9 | 15.7 | 18.3 | 16.6 |
| wait | 43.46-43.68 | 30.4 | 17.9 | 19.8 | 19.4 |
| clock | 44.16-44.34 | 35.0 | 24.6 | 21.6 | 21.4 |
| care | 44.74-45.00 | 33.2 | 16.9 | 16.4 | 16.4 |
| one | 46.78-47.14 | 21.3 | 11.7 | 11.9 | 11.5 |
| security | 50.12-50.52 | 35.4 | 27.8 | 20.5 | 20.4 |
| guard | 50.52-50.92 | 33.5 | 27.5 | 20.6 | 20.5 |
| clock | 51.70-51.94 | 12.3 | 40.1 | 11.0 | 8.6 |

All 168 words: minimum voice-SFX margin 12.3 dB ('clock' @ 51.70 s); minimum voice-bed margin 8.6 dB ('clock' @ 51.70 s). No word has the SFX within 12 dB.

| # | time s | frame | cue | what | naive | applied | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0 | amb_night_town (bed) | moonlit town at night: soft crickets, a faint breeze (shots 1-2, through the march) | -33 | -33.0 | -47.0 | +0.00 |
| 2 | 2.080 | 62 | owl | a far owl hoots 'hoo, hoo-hooo' in the gap after '1860s,' (2.05-2.42) | -15 | -19.0 | -33.0 | -0.50 |
| 3 | 4.200 | 126 | crowbar_toss | @126 the robber tosses the crowbar over his shoulder: a dark whoosh (under 'vaults') | -20 | -24.0 | -38.0 | +0.20 |
| 4 | 4.480 | 134 | tiptoe_steps | @126-150 the three robbers tiptoe off: soft-soled dark steps (they sit under the music's pizzicato motif) | -24 | -28.0 | -42.0 | +0.00 |
| 5 | 4.700 | 141 | crowbar_clank | ...and it clanks onto the cobbles and bounces: iron 'clank-ank-nk' in the gap after 'vaults.' (4.67-4.96) | -1 | -5.0 | -19.0 | +0.35 |
| 6 | 5.020 | 150 | candle_flame (bed) | @150-172 a candle flame flutters over the bed (a faint dark flicker, tiny crackles) | -35 | -35.0 | -49.0 | +0.00 |
| 7 | 5.020 | 150 | snore | @150 the banker snores in his nightcap: a fluttering dark inhale and a whistly exhale (under 'They just kidnapped the banker') | -22 | -26.0 | -40.0 | -0.20 |
| 8 | 5.733 | 172 | gasp_dark | @172 the banker's eyes pop: a tiny dark intake on the frame (under 'banker.') | -26 | -30.0 | -44.0 | -0.10 |
| 9 | 6.100 | 183 | flash_pff | @183 the white FLASH: a soft muffled 'pfoomf' (sub + dark air), not a bang, at the very start of the gap (6.12-6.77) | -2 | -6.0 | -20.0 | +0.00 |
| 10 | 6.220 | 187 | gasp | ...and the full startled 'hh-aah!' gasp in the gap after 'banker.' (6.12-6.77) | -3 | -7.0 | -21.0 | +0.00 |
| 11 | 6.400 | 205 | plan_unroll | @205 a robber unrolls the plan on the bedpost: a crackly paper curl (starts in the gap 6.12-6.77, its end flops flat on the frame, dark) | -15 | -19.0 | -33.0 | +0.25 |
| 12 | 7.680 | 230 | scoop_whoosh | @239 they scoop the banker up: a cloth-and-arms whoosh in the gap before 'Grab' (7.66-7.97) | -7 | -11.0 | -25.0 | -0.10 |
| 13 | 7.987 | 240 | slipper_flop | @239 the banker's slippers dangle and flop (1/2: a soft dark 'fwp', under 'Grab the manager') | -23 | -27.0 | -41.0 | -0.40 |
| 14 | 8.307 | 249 | slipper_flop | @239 the banker's slippers dangle and flop (2/2: a soft dark 'fwp', under 'Grab the manager') | -23 | -27.0 | -41.0 | +0.30 |
| 15 | 9.167 | 275 | march_cobbles | @275-330 the night march on cobbles: two robbers' boots on every beat of the 96 bpm grid, the banker's slippers flopping on the off-beats (dark, in step with the music) | -27 | -31.0 | -45.0 | +0.00 |
| 16 | 11.800 | 354 | vault_creak_gap | @365 the vault door's upper creak (a metal hinge squeal) in the gap before 'Steel' (11.73-12.18), cut off before the word | -7 | -11.0 | -25.0 | +0.00 |
| 17 | 11.800 | 365 | vault_groan | @365-374 the huge vault door groans: a very deep, slow creak (below ~330 Hz, a sub swell) under 'Steel vault' and the pull-back | -1 | -9.0 | -23.0 | +0.00 |
| 18 | 12.100 | 363 | amb_vault_room (bed) | bank interior by candlelight: a dark low room tone and a faint candle flicker (shots 3-4) | -34 | -34.0 | -48.0 | +0.00 |
| 19 | 14.820 | 445 | key_jingle | @438 the banker's key on its string jangles: bright little metal clinks in the gap after 'key,' (14.79-15.23) | -2 | -6.0 | -20.0 | +0.30 |
| 20 | 15.420 | 463 | key_tremble | @462 the trembling key, heard dark (small clinks low-passed at 1.6 kHz, under 'scared') | -26 | -30.0 | -44.0 | +0.30 |
| 21 | 15.450 | 464 | knee_knock | @462 his knees knock (1/4, a dark dull 'tup', under 'scared banker') | -22 | -26.0 | -40.0 | -0.20 |
| 22 | 15.620 | 469 | knee_knock | @462 his knees knock (2/4, a dark dull 'tup', under 'scared banker') | -22 | -26.0 | -40.0 | +0.20 |
| 23 | 15.850 | 476 | knee_knock | @462 his knees knock (3/4, a dark dull 'tup', under 'scared banker') | -22 | -26.0 | -40.0 | -0.20 |
| 24 | 16.020 | 481 | knee_knock | @462 his knees knock (4/4, a dark dull 'tup', under 'scared banker') | -22 | -26.0 | -40.0 | +0.20 |
| 25 | 16.113 | 484 | wheel_turn | @484 he turns the big spoked wheel: a slow iron ratchet 'krk ... krk' (dark, under 'open') | -18 | -22.0 | -36.0 | +0.00 |
| 26 | 16.383 | 493 | door_creak | @493 the vault door swings open with a deep creak (dark, below ~380 Hz, a sub swell; under 'open anything') | -3 | -11.0 | -25.0 | +0.00 |
| 27 | 16.940 | 509 | door_creak_tail | ...its hinge squeal rings out in the gap after 'anything.' (16.90-17.49) | -7 | -11.0 | -25.0 | +0.00 |
| 28 | 16.980 | 509 | golden_shimmer | @493 golden light spills over the robbers: a soft airy swell with shimmering high partials in the gap after 'anything.' | -2 | -6.0 | -20.0 | +0.00 |
| 29 | 17.300 | 519 | amb_workshop (bed) | Sargent's workshop, warm: room tone, gear whirs, tinkering clinks, a wall clock (shot 5-6) | -32 | -32.0 | -46.0 | +0.00 |
| 30 | 17.400 | 522 | xf_air | soft warm-air swell through the dissolve @522 | -26 | -30.0 | -44.0 | +0.00 |
| 31 | 19.800 | 594 | pre_spark | @594 the idea lights up: a tiny dark 'pip' on the frame (under 'clever') | -26 | -30.0 | -44.0 | +0.00 |
| 32 | 20.610 | 618 | spark_ping | ...and its bright 'ting' with a rising sparkle in the gap after 'idea.' (20.50-20.84) | -3 | -7.0 | -21.0 | +0.15 |
| 33 | 20.833 | 625 | pencil | @625-658 he scribbles on the blueprint: a soft pencil scratching in strokes (quiet, dull, under 'Build a lock that even the banker') | -37 | -41.0 | -55.0 | +0.20 |
| 34 | 22.500 | 675 | pencil_x | @676 two quick pencil strokes cross the banker's face out (tiny) | -33 | -37.0 | -51.0 | +0.20 |
| 35 | 24.047 | 722 | screwdriver | @722 a screwdriver pries a clock open: a tiny metal creak and a woody 'pop' (dark, under 'parts') | -25 | -29.0 | -43.0 | -0.20 |
| 36 | 24.237 | 727 | springs | @722 clock springs and gears spill and bounce over the bench: soft low 'boing' coils (300-900 Hz) and tiny clinks (under 'parts from two kitchen clocks') | -28 | -32.0 | -46.0 | +0.00 |
| 37 | 24.733 | 742 | assemble | @742-750 Sargent fits the gears together: tiny dry clicks climbing in pitch and a soft 'chk' (under 'kitchen') | -25 | -29.0 | -43.0 | +0.10 |
| 38 | 24.950 | 748 | ticking_1 (bed) | @750-935 the steady clockwork ticking beneath, on the music's 96 bpm beat grid (tick / tock alternating, dark) | -32 | -32.0 | -46.0 | +0.00 |
| 39 | 25.520 | 766 | springs_last | ...the last coils roll off the bench in the gap after 'clocks.' (25.51-25.94) | -22 | -26.0 | -40.0 | +0.40 |
| 40 | 26.600 | 798 | bolt_click | @798 a clock arm locks the bolt: a short steel 'ka-chk' (dark, on 'bolt') | -22 | -26.0 | -40.0 | +0.00 |
| 41 | 27.300 | 819 | wheel_try1 | @840 the banker's hand strains the wheel (the first try): a slow iron ratchet starting in the gap after 'locked,' (27.28-27.59) | -17 | -21.0 | -35.0 | +0.00 |
| 42 | 28.000 | 840 | clack1 | @840 the wheel stops dead: a firm steel 'clack' (dark, on 'release') | -24 | -28.0 | -42.0 | +0.00 |
| 43 | 28.070 | 842 | rattle1 | ...and a tiny shake of the stuck mechanism (dull, quiet) | -26 | -30.0 | -44.0 | +0.20 |
| 44 | 29.280 | 878 | wheel_try2 | @887 the second try: the ratchet strains again in the gap after 'hour,' (29.26-29.59) | -17 | -21.0 | -35.0 | +0.00 |
| 45 | 29.517 | 887 | clack2 | @887 the second 'clack' (the wheel stopping dead, in the last frames of the gap before 'no matter') | -21 | -25.0 | -39.0 | +0.00 |
| 46 | 29.597 | 888 | rattle2 | ...and another tiny rattle (dull, quiet, under 'no matter') | -26 | -30.0 | -44.0 | -0.20 |
| 47 | 30.820 | 925 | sigh | @910 the banker sighs, defeated: a breathy falling 'haaah' in the gap after 'asking.' (30.76-31.20) | -8 | -12.0 | -26.0 | -0.20 |
| 48 | 31.100 | 933 | amb_prairie (bed) | Morrison, Illinois, bright day: a dry prairie breeze, a far bird phrase, a slow cart, a faint town murmur (shot 8) | -32 | -32.0 | -46.0 | +0.00 |
| 49 | 31.167 | 935 | xf_air | soft warm-air swell through the dissolve @935 | -26 | -30.0 | -44.0 | +0.00 |
| 50 | 32.450 | 974 | horse | a horse nickers somewhere on the main street (soft, dark, under the held '1874,') | -25 | -29.0 | -43.0 | -0.50 |
| 51 | 33.030 | 991 | far_bell | a far church bell tolls in the gap after '1874,' (33.00-33.37) (Morrison) | -10 | -14.0 | -28.0 | +0.50 |
| 52 | 34.467 | 1034 | bolting_clunk | @1034 Sargent bolts the great door on: a heavy iron 'THUNK' and a wrench ratchet (dark, on 'vault') | -15 | -19.0 | -33.0 | +0.00 |
| 53 | 34.667 | 1040 | door_pat | @1040 he pats it proudly: a dull 'pomp' on cold steel (dark, on 'door') | -19 | -23.0 | -37.0 | +0.10 |
| 54 | 36.150 | 1087 | ribbon_snip | @1087 the ribbon is snipped: a bright steel 'snik' in the micro-gap 36.09-36.22 before 'Illinois' (and a soft cloth fall) | -3 | -7.0 | -21.0 | +0.20 |
| 55 | 36.700 | 1101 | far_bell2 | ...and the town bell answers in the gap after 'Illinois.' (36.62-37.08) | -12 | -16.0 | -30.0 | +0.50 |
| 56 | 36.750 | 1104 | horse2 | ...and the horse whinnies back (the same gap, soft) | -17 | -21.0 | -35.0 | -0.50 |
| 57 | 37.100 | 1113 | amb_night_vault (bed) | the vault at night again: a dark room tone, a faint candle flicker, far crickets (shots 9-10) | -36 | -36.0 | -50.0 | +0.00 |
| 58 | 37.533 | 1126 | march_cobbles2 | @1126-1151 the robbers march the nightshirted banker again on cobbles (dark, on the beat grid, under 'kidnapping no longer worked') | -27 | -31.0 | -45.0 | +0.00 |
| 59 | 38.820 | 1165 | wheel_try3 | @1172 the banker turns the new wheel: a short ratchet strain in the gap before 'Unluckily' (38.76-39.07) | -17 | -21.0 | -35.0 | +0.00 |
| 60 | 38.970 | 1172 | clack3 | @1172 the wheel does not move: a steel 'clack' (the last 80 ms of the gap before 'Unluckily') | -21 | -25.0 | -39.0 | +0.00 |
| 61 | 40.165 | 1210 | face_palm | @1210 the robbers face-palm: three quick 'pap's staggered across the micro-gap before 'neither' (40.16-40.30) | -5 | -9.0 | -23.0 | -0.50 |
| 62 | 40.210 | 1210 | face_palm2 | ...second robber | -5 | -9.0 | -23.0 | +0.00 |
| 63 | 40.240 | 1210 | face_palm3 | ...third robber | -5 | -9.0 | -23.0 | +0.50 |
| 64 | 40.333 | 1210 | face_palm_dull | ...and a dull 'pomp' of palm on the frame (dark, quiet, on 'neither') | -24 | -28.0 | -42.0 | +0.00 |
| 65 | 42.000 | 1260 | fist_shake | @1260 a robber shakes his fist at the banker: a cloth swish (dark, on 'threaten') | -24 | -28.0 | -42.0 | -0.30 |
| 66 | 42.580 | 1283 | rope_tie | @1283 they tie him to the chair: a fibrous rope rustle starting in the gap after 'him,' (42.57-42.84) and a final tug 'thup' under 'tie him up' | -19 | -23.0 | -37.0 | +0.30 |
| 67 | 43.400 | 1303 | knit | @1303 the knitting needles click (tiny, dull, under 'and wait') | -31 | -35.0 | -49.0 | +0.40 |
| 68 | 43.433 | 1303 | lapse_tick | @1303-1325 the accelerating ticks of the time-lapse (1/10: tiny, dark, the first on 'wait', the rest under 'The clock did') | -33 | -37.0 | -51.0 | -0.20 |
| 69 | 43.633 | 1309 | lapse_tick | @1303-1325 the accelerating ticks of the time-lapse (2/10: tiny, dark, the first on 'wait', the rest under 'The clock did') | -33 | -37.0 | -51.0 | +0.20 |
| 70 | 43.790 | 1314 | card_shuffle | @1303-1325 the card players shuffle (a bright riffle) in the gap after 'wait.' (43.68-44.05) | -8 | -12.0 | -26.0 | -0.40 |
| 71 | 43.809 | 1314 | lapse_tick | @1303-1325 the accelerating ticks of the time-lapse (3/10: tiny, dark, the first on 'wait', the rest under 'The clock did') | -33 | -37.0 | -51.0 | -0.20 |
| 72 | 43.860 | 1316 | bird_chirp | ...and a bird chirps from its nest on a robber's head (the same gap) | -11 | -15.0 | -29.0 | +0.40 |
| 73 | 43.964 | 1319 | lapse_tick | @1303-1325 the accelerating ticks of the time-lapse (4/10: tiny, dark, the first on 'wait', the rest under 'The clock did') | -33 | -37.0 | -51.0 | +0.20 |
| 74 | 44.101 | 1323 | lapse_tick | @1303-1325 the accelerating ticks of the time-lapse (5/10: tiny, dark, the first on 'wait', the rest under 'The clock did') | -33 | -37.0 | -51.0 | -0.20 |
| 75 | 44.220 | 1327 | lapse_tick | @1303-1325 the accelerating ticks of the time-lapse (6/10: tiny, dark, the first on 'wait', the rest under 'The clock did') | -33 | -37.0 | -51.0 | +0.20 |
| 76 | 44.326 | 1330 | lapse_tick | @1303-1325 the accelerating ticks of the time-lapse (7/10: tiny, dark, the first on 'wait', the rest under 'The clock did') | -33 | -37.0 | -51.0 | -0.20 |
| 77 | 44.419 | 1333 | lapse_tick | @1303-1325 the accelerating ticks of the time-lapse (8/10: tiny, dark, the first on 'wait', the rest under 'The clock did') | -33 | -37.0 | -51.0 | +0.20 |
| 78 | 44.501 | 1335 | lapse_tick | @1303-1325 the accelerating ticks of the time-lapse (9/10: tiny, dark, the first on 'wait', the rest under 'The clock did') | -33 | -37.0 | -51.0 | -0.20 |
| 79 | 44.573 | 1337 | lapse_tick | @1303-1325 the accelerating ticks of the time-lapse (10/10: tiny, dark, the first on 'wait', the rest under 'The clock did') | -33 | -37.0 | -51.0 | +0.20 |
| 80 | 44.733 | 1342 | smug_tick | @1342 the clock's tiny smug 'tick' (one dark wooden tick on 'care') | -26 | -30.0 | -44.0 | +0.00 |
| 81 | 45.100 | 1353 | amb_street_banks (bed) | a bright street of banks: a breeze, a far cart (shot 11) | -34 | -34.0 | -48.0 | +0.00 |
| 82 | 45.120 | 1354 | smug_tick2 | ...and a second, even smugger tick in the gap after 'care.' (45.08-45.66) | -8 | -12.0 | -26.0 | +0.10 |
| 83 | 45.600 | 1368 | queue_murmur (bed) | @1382-1403 the queue of bankers outside Sargent's shop: a low murmur and shuffling (dark) | -33 | -33.0 | -47.0 | +0.00 |
| 84 | 46.100 | 1383 | coin_bag | @1382-1403 a banker plonks a heavy coin bag down (1/3: dark thump, under 'every bank wanted one') | -28 | -32.0 | -46.0 | -0.40 |
| 85 | 46.400 | 1392 | coin_bag | @1382-1403 a banker plonks a heavy coin bag down (2/3: dark thump, under 'every bank wanted one') | -28 | -32.0 | -46.0 | +0.20 |
| 86 | 46.700 | 1401 | coin_bag | @1382-1403 a banker plonks a heavy coin bag down (3/3: dark thump, under 'every bank wanted one') | -28 | -32.0 | -46.0 | +0.50 |
| 87 | 47.260 | 1418 | coin_chinks | ...the coins chink in their bags in the gap after 'one.' (47.12-47.70) | -5 | -9.0 | -23.0 | +0.30 |
| 88 | 47.600 | 1428 | hum_modern (bed) | the modern vault: a low mains hum (60 / 120 Hz) and a faint air-handler hiss, calm and bright (shot 12) | -33 | -33.0 | -47.0 | +0.00 |
| 89 | 47.667 | 1430 | ticking_2 (bed) | the guard clock's ticking under 'today, banks still use time locks', on the music's beat grid (tiny, dark) | -38 | -38.0 | -52.0 | +0.00 |
| 90 | 47.667 | 1430 | xf_air | soft warm-air swell through the dissolve @1430 | -26 | -30.0 | -44.0 | +0.00 |
| 91 | 50.153 | 1504 | guard_steps | @1504 the guard clock marches up on its stiff little legs: tiny hard 'tik' steps (dark-ish, under 'security guard') | -30 | -34.0 | -48.0 | +0.00 |
| 92 | 51.980 | 1551 | wink_ting | @1551 the guard clock winks: a small bright 'ting' on A7 (frame 51.70; in the gap right after 'clock.' 51.94-) | +0 | -4.0 | -18.0 | +0.25 |

## Verification
- Mix stream: `stream|sample_rate=48000|channels=2|bits_per_sample=24|duration_ts=2544000`
- exact length 2,544,000 samples, stereo: OK; voice/mix_final.wav identical to public/vault/mix.wav: OK
- whisper small.en (int8, cpu) on voice.wav: "In the 1860s, bank robbers stopped trying to break into vaults. They just kidnapped the banker. The plan was simple. Grab the manager, march him to the bank at night, and make him open the door. Steel vault is only as safe as the man with the key, and a scared banker will open anything. Then a lockmaker named James Sargent had a clever idea. Build a lock that even the banker can't open. He built it out of parts from two kitchen clocks. The clock kept the bolt locked, and it wouldn't release until a set hour, no matter who was asking. In 1874, the first one went onto the vault door of a bank in Morrison, Illinois. Luckily, kidnapping no longer worked. Unluckily for the banker, neither did he. The robbers could threaten him, tie him up and wait. The clock did not care. Soon, every bank wanted one. And today, banks still use time locks. The best security guard turned out to be a clock."
- whisper small.en on the mix: "In the 1860s, bank robbers stopped trying to break into vaults. They just kidnapped the banker. The plan was simple. Grab the manager, march him to the bank at night, and make him open the door. Steel vault is only as safe as the man with the key. And a scared banker will open anything. Then a lockmaker named James Sargent had a clever idea. Build a lock that even the banker can't open. He built it out of parts from two kitchen clocks. The clock kept the bolt locked, and it wouldn't release until a set hour. No matter who was asking in 1874 the first one went on to the vault door of a bank in Morrison, Illinois Luckily kidnapping no longer worked unluckily for the banker neither Did he the robbers could threaten him tie him up and wait the clock did not care Soon every bank wanted one and today banks still use time locks the best security guard turned out to be a clock"
- word-level diff voice.wav -> mix: - onto + on + to
- word-level diff voice.wav -> voice stem alone (same voice, +master gain and limiter, no music / SFX): - lockmaker + lock + maker
- word-level diff voice stem alone -> mix (what the music + SFX change): + lockmaker - lock - maker - onto + on + to
- SCRIPT.md words not literally in the voice-only transcript (whisper writes numbers as digits): ['maker']
- SCRIPT.md words not literally in the mix transcript: ['maker', 'onto']
- 'kidnapped': voice-only probs [0.99], mix probs [0.99]
- 'banker': voice-only probs [1.0, 1.0, 0.99, 1.0], mix probs [0.99, 0.99, 0.99, 0.97]
- 'key': voice-only probs [1.0], mix probs [1.0]
- 'scared': voice-only probs [0.99], mix probs [0.99]
- 'sargent': voice-only probs [0.97], mix probs [0.96]
- 'clocks': voice-only probs [0.98], mix probs [0.97]
- 'release': voice-only probs [1.0], mix probs [1.0]
- 'morrison': voice-only probs [0.96], mix probs [0.92]
- 'unluckily': voice-only probs [0.99], mix probs [0.81]
- 'neither': voice-only probs [1.0], mix probs [0.73]
- 'clock': voice-only probs [1.0, 0.97, 1.0], mix probs [1.0, 0.98, 0.96]
- 'care': voice-only probs [1.0], mix probs [1.0]
- 'security': voice-only probs [0.99], mix probs [0.99]
- 'guard': voice-only probs [1.0], mix probs [0.99]

Key-word windows (~3.5 s around each word, voice.wav vs the voice stem alone vs the mix, same cut; edges snapped to the quietest 10 ms of the voice within +-0.8 s, whisper on voice.wav vs on the mix, same cut):

| word | window s | voice.wav | voice stem (mix gain + limiter) | mix | mix vs voice stem | key-word prob voice / stem / mix |
|---|---|---|---|---|---|---|
| kidnapped | 3.40-6.31 | trying to break into vaults. They just kidnapped the banker. | trying to break into vaults. They just kidnapped the banker. | trying to break into vaults. They just kidnapped the banker. | IDENTICAL | [0.98] / [0.98] / [0.97] |
| banker | 4.73-7.74 | They just kidnapped the banker. The plan was simple. | They just kidnapped the banker. The plan was simple. | They just kidnapped the banker. The plan was simple. | IDENTICAL | [0.98] / [0.98] / [0.98] |
| key | 12.13-16.98 | Steel vault is only as safe as the man with the key, and a scared banker will open anything. | Steel vault is only as safe as the man with the key, and a scared banker will open anything. | Steel vault is only as safe as the man with the key, and a scared banker will open anything. | IDENTICAL | [1.0] / [1.0] / [0.98] |
| scared | 13.09-16.98 | only as safe as the man with the key. A scared banker will open anything. | only as safe as the man with the key, and a scared banker will open anything. | only as safe as the man with the key. The scared banker will open anything. | word OK, context differs | [0.98] / [0.99] / [0.97] |
| banker | 14.60-16.98 | key and a scared banker will open anything. | key, and a scared banker will open anything. | key and a scared banker will open anything. | IDENTICAL | [0.98] / [0.99] / [0.98] |
| sargent | 16.98-20.61 | Then a lockmaker named James Sargent had a clever idea. | Then a lockmaker named James Sargent had a clever idea. | And a lockmaker named James Sargent had a clever idea. | word OK, context differs | [0.98] / [0.97] / [0.96] |
| banker | 20.61-23.01 | Build a lock that even the banker can't open. | Build a lock that even the banker can't open. | Build a lock that even the banker can't open. | IDENTICAL | [0.95] / [0.94] / [0.95] |
| clocks | 22.92-26.48 | He built it out of parts from two kitchen clocks. The clock kept | He built it out of parts from two kitchen clocks. The clock kept | He built it out of parts from two kitchen clocks. | word OK, context differs | [0.94] / [0.93] / [0.94] |
| clock | 23.58-27.23 | it out of parts from two kitchen clocks. The clock kept the bolt locked. | it out of parts from two kitchen clocks. The clock kept the bolt locked. | It out of parts from two kitchen clocks. The clock kept the bolt locked. | IDENTICAL | [1.0] / [0.99] / [1.0] |
| release | 25.62-29.36 | The clock kept the bolt locked, and it wouldn't release until a set hour. | The clock kept the bolt locked, and it wouldn't release until a set hour. | The clock kept the bolt locked, and it wouldn't release until a set hour. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| morrison | 33.35-36.74 | The first one went onto the vault door of a bank in Morrison, Illinois. | The first one went on to the vault door of a bank in Morrison, Illinois. | The first one went onto the vault door of a bank in Morrison, Illinois. | word OK, context differs | [0.98] / [0.98] / [0.97] |
| unluckily | 36.74-40.99 | Luckily, kidnapping no longer worked. Unluckily for the banker, neither did he. | Luckily, kidnapping no longer worked. Unluckily for the banker, neither did he. | Luckily, kidnapping no longer worked. Unluckily for the banker, neither did he. | IDENTICAL | [0.98] / [0.98] / [0.98] |
| banker | 38.84-40.99 | Unluckily for the banker, neither did he. | Unluckily for the banker, neither did he. | Unluckily for the banker, neither did he. | IDENTICAL | [0.99] / [0.99] / [0.99] |
| neither | 38.84-41.33 | Unluckily for the banker, neither did he. | Unluckily for the banker, neither did he. | Unluckily for the banker, neither did he. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| clock | 42.82-45.20 | Tie him up and wait. The clock did not care. | Tie him up and wait. The clock did not care. | tie him up and wait. The clock did not care. | IDENTICAL | [0.96] / [0.95] / [0.98] |
| care | 43.83-47.19 | The clock did not care. Soon, every bank wanted one. | The clock did not care. Soon every bank wanted one. | The clock did not care. Soon every bank wanted one. | IDENTICAL | [1.0] / [1.0] / [1.0] |
| security | 48.84-52.13 | time locks. The best security guard turned out to be a clock. | time locks, the best security guard turned out to be a clock. | time -locks, the best security guard turned out to be a clock. | IDENTICAL | [0.98] / [0.98] / [0.98] |
| guard | 49.63-52.13 | The best security guard turned out to be a clock. | The best security guard turned out to be a clock. | The best security guard turned out to be a clock. | IDENTICAL | [1.0] / [1.0] / [0.99] |
| clock | 49.63-52.77 | the best security guard turned out to be a clock. | the best security guard turned out to be a clock. | the best security guard turned out to be a clock. | IDENTICAL | [0.98] / [0.98] / [0.82] |
