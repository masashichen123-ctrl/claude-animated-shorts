// usage: npx tsx scripts/dump_sound.ts <slug> <out.json>
// Writes the film's sound cue sheet (frames) from its timeline module, so sound_kit.py lands every effect on the picture.
import fs from "node:fs";
import path from "node:path";
const [slug, out] = process.argv.slice(2);
const mod = await import(path.resolve(`src/videos/${slug}/timeline.ts`));
const tl = mod.TL;
const clock = mod.CLOCK;
fs.writeFileSync(out, JSON.stringify({
  TOTAL: tl.TOTAL, SENT: clock.SENT, SPOKEN: clock.SPOKEN, flashes: tl.FLASHES,
  shots: tl.SHOTS.map((s: { a: number; b: number; amb: string; light: string }) => ({ a: s.a, b: s.b, amb: s.amb, light: s.light })),
  ...tl.sound,
}, null, 1));
console.log(`${slug}: ${tl.TOTAL} frames, ${tl.sound.events.length} events, ${tl.sound.cuts.length} cuts, ${tl.sound.glides.length} glides`);
