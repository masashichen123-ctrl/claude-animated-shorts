// usage: npx tsx scripts/key_frames.ts <slug>  -> one frame per camera setup (a little after each key starts)
import path from "node:path";
const [slug] = process.argv.slice(2);
const { TL } = await import(path.resolve(`src/videos/${slug}/timeline.ts`));
const out: number[] = [];
for (const s of TL.SHOTS) {
  const starts: number[] = [s.a];
  for (let f = s.a + 1; f < s.b; f++) if (TL.keyAt(s.id, f) !== TL.keyAt(s.id, f - 1)) starts.push(f);
  starts.forEach((a, i) => { const b = i + 1 < starts.length ? starts[i + 1] : s.b; out.push(Math.round(a + (b - a) * 0.6)); });
}
console.log(out.join(","));
