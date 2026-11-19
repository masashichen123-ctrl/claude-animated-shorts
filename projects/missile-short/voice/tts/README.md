# Narration v2 (re-voiced)
- TTS: Kokoro-82M (onnx, `kokoro-onnx`), voice `am_michael`, speed 1.25 (lines that must fit their slot go up to 1.37; line 5 fixed at 1.22 for clarity).
- `fit2.py` generates each line of `m13_lines.json` (the original script, with "Barbero" and "van" corrected) and places it at the original line start, shifting at most ±0.23 s so the picture stays in sync. `layout.json` = final start/end per line.
- Music: original bed separated from the old mix with UVR-MDX-NET-Inst_HQ_3 (audio-separator), no voice leakage (envelope corr ≈ 0).
- Mix: voice HPF 70 Hz, +1.5 dB at 3.2 kHz, de-ess, 2.2:1 comp; voice -16 LUFS, music -25 LUFS after a sidechain duck (≈9 LU under); master loudnorm -14 LUFS, TP -1 dB → `voice/mix_v2.wav` (gitignored). Word timings: `voice/words_v2.json`.
