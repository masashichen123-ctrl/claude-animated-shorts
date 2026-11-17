// Who stands where in "The War Australia Lost to Birds": the emu drawing, soldiers, farmers, and the 2D effects.
import { Pen, INK, SKINS, Outfit, Expr, fxPuff } from "../kit/toon";
import { beginStage, put, putSide, creature, fx, step, FOLK, CamInfo, Stage, hh } from "../kit/cast";
import { FPS, V3, add, clamp01 } from "../kit/timeline";
import { TL, F, CAMP, GUN, FARM, BOARD, SIGN50, PLAQUE, truckAt } from "./timeline";

type P2 = [number, number];
/** an emu facing screen-right in the 600 x 1000 card (feet at y = 975). mode: stand / run / peck. */
export const drawEmu = (p: Pen, phase: number, mode: "stand" | "run" | "peck", mood: "calm" | "smug" | "alarm", cap = false) => {
  const run = mode === "run", bob = run ? 18 * Math.cos(phase * Math.PI * 4) : 0;
  const bx = 280, by = 500 + bob;
  // legs (behind the body)
  for (const k of [0, 1]) {
    const ph = phase + k / 2, sx = run ? 150 * Math.sin(ph * Math.PI * 2) : (k ? -30 : 30), lift = run ? Math.max(0, 70 * Math.cos(ph * Math.PI * 2)) : 0;
    const hip: P2 = [bx + 10, by + 70], foot: P2 = [bx + 20 + sx, 975 - lift], knee: P2 = [(hip[0] + foot[0]) / 2 - 45, (hip[1] + foot[1]) / 2 - 10];
    p.line([hip, knee, foot], k ? "#7d8088" : "#8f939b", 18);
    for (const a of [-0.5, 0, 0.5]) p.stroke([foot, [foot[0] + 34 * Math.cos(a), foot[1] + 4 + 6 * Math.sin(a)]], 7);
  }
  // body: shaggy oval
  const pts: P2[] = [];
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, r = 1 + 0.08 * Math.sin(i * 2.7) + (i % 2 ? 0.05 : 0); pts.push([bx + 165 * r * Math.cos(a), by + 115 * r * Math.sin(a) - 15 * Math.cos(a)]); }
  p.poly(pts, "#6b4e36", 11);
  for (let i = 0; i < 9; i++) p.stroke([[bx - 110 + i * 26, by - 50 + (i % 3) * 30], [bx - 128 + i * 26, by + 10 + (i % 3) * 30]], 6, "#4a3424");
  // neck + head
  const head: P2 = mode === "peck" ? [bx + 250, 900] : [bx + 175, 175 + bob * 0.5];
  const neckMid: P2 = mode === "peck" ? [bx + 250, 640] : [bx + 190, 330 + bob * 0.7];
  p.line([[bx + 120, by - 50], neckMid, head], "#7f8ea0", 44);
  p.ell(head[0], head[1], 42, 34, "#6d7a8a", 10);
  p.poly([[head[0] + 34, head[1] - 4], [head[0] + 84, head[1] + 8], [head[0] + 34, head[1] + 14]], "#3a3438", 7);
  p.ell(head[0] + 10, head[1] - 8, 11, 11, "#f2c14a", 4);
  p.dot(head[0] + 13, head[1] - 8, 6, INK);
  if (mood === "smug") p.stroke([[head[0] - 6, head[1] - 26], [head[0] + 26, head[1] - 18]], 8);
  if (mood === "alarm") p.ell(head[0] + 10, head[1] - 8, 16, 16, null, 5);
  if (cap) { p.ell(head[0] - 2, head[1] - 34, 48, 22, "#8a7a4a", 8, 180, 360); p.poly([[head[0] + 30, head[1] - 34], [head[0] + 80, head[1] - 26], [head[0] + 30, head[1] - 24]], "#6e6038", 6); }
};

const SOLDIER = (i: number): Outfit => ({ jacket: "#8a7a4a", pants: "#6e6038", boots: "#3a2a22", hat: "cap", cap: "#7a6a3e", skin: SKINS[i % 4], belt: "#5a4a2a", ...(i % 3 === 1 ? { moustache: "#3a2a1c" } : {}) });
const MAJOR: Outfit = { jacket: "#7a6a3e", pants: "#5a4a2a", boots: "#2a1d16", hat: "cap", cap: "#5a4a2a", skin: SKINS[0], moustache: "#5a3b2a", build: "stout", buttons: "#e8c45a", sash: "#b33a3a" };
const FARMER: Outfit = { jacket: "#3f6fb5", pants: "#6e5a3a", boots: "#4a3426", hat: "cap", cap: "#c9a24a", skin: SKINS[1], moustache: "#8a8d94" };
const FARMWIFE: Outfit = { ...FOLK[7], hat: "hair", hair: "#a04a2a" };

const flash = (p: Pen, t: number) => { for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 + t; p.poly([[150, 150], [150 + 140 * Math.cos(a - 0.15), 150 + 140 * Math.sin(a - 0.15)], [150 + 140 * Math.cos(a + 0.15), 150 + 140 * Math.sin(a + 0.15)]], "#ffe28a", 0); } p.ell(150, 150, 50, 50, "#ffffff", 0); };
const speed = (p: Pen) => { for (let i = 0; i < 6; i++) p.stroke([[20, 40 + i * 44], [280 - (i % 3) * 50, 40 + i * 44]], 10, "rgba(255,255,255,0.85)"); };
const dust = (out: Stage, at: V3, f: number, k: number, size = 1.6) => { const u = step(((f / FPS) * 1.6 + k * 0.37) % 1, 12); fx(out, `puff${u}`, 300, 300, (q) => fxPuff(q, u), add(at, 0, 0.4, 0), size, size, { soft: true }); };

const emuKey = (mode: string, ph: number, mood: string, cap: boolean) => `emu|${mode}|${step(ph, 8)}|${mood}|${cap ? 1 : 0}`;
const emu = (out: Stage, cam: CamInfo, at: V3, mirror: boolean, mode: "stand" | "run" | "peck", ph: number, mood: "calm" | "smug" | "alarm" = "calm", cap = false, sc = 1) =>
  creature(out, cam, emuKey(mode, ph, mood, cap), (p) => drawEmu(p, step(ph, 8), mode, mood, cap), at, mirror, sc);
/** a running herd: n emus starting around c, all running along +x (or -x) at speed v m/s from frame f0 */
const herd = (out: Stage, cam: CamInfo, f: number, c: V3, n: number, v: number, f0: number, spread = 10, mood: "calm" | "smug" | "alarm" = "calm") => {
  const t = (f - f0) / FPS;
  for (let i = 0; i < n; i++) {
    const at: V3 = [c[0] + (hh(i, 1) - 0.5) * spread + v * t * (0.85 + 0.3 * hh(i, 2)), 0, c[2] + (hh(i, 3) - 0.5) * spread];
    emu(out, cam, at, v < 0, "run", (t * 2.2 + hh(i, 4)) % 1, mood);
  }
};

export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const s = TL.SHOTS[id - 1], out = beginStage(s.light, cam), k = TL.keyAt(id, f), t = f / FPS;
  switch (id) {
    case 1:
      if (k === 0) {
        putSide(out, cam, f, 1, SOLDIER(0), "s0", add(GUN, -0.2, 0, -0.9), false, { expr: "stern" });
        put(out, cam, f, 2, SOLDIER(1), "s1", add(GUN, -1.6, 0, -0.6), { expr: "nervous", look: 1 });
        if (Math.floor(f / 2) % 2 === 0) fx(out, `flash${step((f % 8) / 8, 4)}`, 300, 300, (q) => flash(q, f * 0.7), add(GUN, 0, 1.0, 1.4), 0.9, 0.9);
        herd(out, cam, f, [-12, 0, 18], 9, 7, 0, 8, "smug");
        for (let j = 0; j < 4; j++) dust(out, [-6 + j * 5 + 3 * Math.sin(t * 3 + j), 0, 15 + 3 * (j % 2)], f, j);
      } else emu(out, cam, [4.5, 0, 14], true, "stand", 0, "smug", false, 1.1);
      break;
    case 2:
      if (k === 0) for (let i = 0; i < 46; i++) emu(out, cam, [-30 + 60 * hh(i, 11), 0, 5 + 50 * hh(i, 12)], hh(i, 13) < 0.5, hh(i, 14) < 0.5 ? "peck" : "stand", 0, "calm");
      else {
        put(out, cam, f, 3, FARMER, "farmer", add(FARM, 2.0, 0, -4.2), { expr: "pained", look: -1 });
        put(out, cam, f, 4, FARMWIFE, "wife", add(FARM, 0.4, 0, -3.9), { expr: "nervous", look: -1 });
        for (let i = 0; i < 5; i++) emu(out, cam, add(FARM, -6 + 3 * i, 0, 4 + 2 * (i % 2)), i % 2 === 0, "peck", 0, "calm");
      }
      break;
    case 3: {
      const p = truckAt(3, f);
      if (f > F(3, 0.62)) {
        put(out, cam, f, 5, MAJOR, "major", add(p, 0.8, 0, -1.8), { expr: "stern", look: -1 });
        for (let i = 0; i < 3; i++) put(out, cam, f, 6 + i, SOLDIER(i), `s${i}`, add(p, -1.4 - i * 1.1, 0, -1.6 - 0.3 * (i % 2)), { expr: "neutral", look: 1 });
      }
      break;
    }
    case 4:
      for (let g = 0; g < 4; g++) { const dir = g % 2 ? 1 : -1, c: V3 = [4 + (g - 1.5) * 5, 0, 26 + (g % 2 ? 6 : -4)]; herd(out, cam, f, c, 4, dir * 6, F(4), 4, "alarm"); }
      break;
    case 5: {
      const p = truckAt(5, f);
      putSide(out, cam, f, 1, SOLDIER(0), "s0", add(p, -1.2, 0.95, 0.4), false, { expr: "stern" });
      if (Math.floor(f / 2) % 2 === 0 && (f - F(5, 0.25)) % 40 < 18 && f > F(5, 0.25)) fx(out, `flash${step((f % 8) / 8, 4)}`, 300, 300, (q) => flash(q, f * 0.7), add(p, 0.4, 1.7, 0), 0.8, 0.8);
      for (let i = 0; i < 6; i++) { const at: V3 = [p[0] + 8 + i * 1.8 + 5 * clamp01((f - F(5)) / 60), 0, 18 + (hh(i, 7) - 0.5) * 6]; emu(out, cam, at, false, "run", (t * 2.6 + hh(i, 4)) % 1, "smug"); }
      dust(out, add(p, -2.8, 0, 0), f, 1, 2.2);
      break;
    }
    case 6:
      put(out, cam, f, 5, MAJOR, "major", add(BOARD, 1.6, 0, -0.7), { expr: "nervous", look: -1 });
      break;
    case 7:
      for (let i = 0; i < 3; i++) put(out, cam, f, 6 + i, SOLDIER(i), `s${i}`, add(CAMP, 2.6 + i * 0.85, 0.36, -2.4), { mode: "sit", expr: (["relief", "smile", "relief_open"] as Expr[])[i], look: 0 });
      emu(out, cam, add(CAMP, -2.2, 0, 3.5), false, "stand", 0, "smug");
      break;
    case 8:
      put(out, cam, f, 6, { ...SOLDIER(0), hat: "hair", hair: "#3a2a1c" }, "s0bare", add(CAMP, 3.6, 0, 1.6), { expr: "pained", look: 1 });
      emu(out, cam, add(CAMP, 5.3, 0, 2.2), true, "stand", 0, "smug", true);
      break;
    case 9: {
      const u = clamp01((f - F(9)) / (F(10) - F(9)));
      const at: V3 = [SIGN50[0] - 14 + 30 * u, 0, SIGN50[2] + 4];
      emu(out, cam, at, false, "run", (t * 3.2) % 1, "smug");
      fx(out, "speed", 300, 300, speed, add(at, -1.6, 1.0, 0), 1.6, 1.0, { soft: true });
      dust(out, add(at, -1.4, 0, 0), f, 2, 1.4);
      break;
    }
    case 10:
      if (k === 0) { for (let i = 0; i < 9; i++) { const at: V3 = [(i - 4) * 2.2, 0, 24 - 3.5 * clamp01((f - F(10)) / 60) + (i % 2) * 1.5]; emu(out, cam, at, i < 4, "run", (t * 1.6 + i * 0.13) % 1, "smug"); dust(out, at, f, i, 1.8); } }
      else put(out, cam, f, 5, MAJOR, "major", add(CAMP, 0.5, 0, 0), { expr: "nervous", look: 0 });
      break;
    case 11: {
      const p = truckAt(11, f);
      for (let i = 0; i < 2; i++) put(out, cam, f, 6 + i, SOLDIER(i), `s${i}`, add(p, -0.6 - i * 1.1, 0.95, 0.4 * i), { expr: "pained", look: 0 });
      for (let i = 0; i < 4; i++) emu(out, cam, [-11 - i * 1.6, 0, -14.5 - 0.6 * (i % 2)], true, "stand", 0, "smug");
      break;
    }
    case 12:
      put(out, cam, f, 5, MAJOR, "major", add(BOARD, 1.6, 0, -0.7), { expr: "stern", look: -1 });
      break;
    case 13:
      emu(out, cam, add(CAMP, 9.6, 0, 6.6), true, f > F(13, 0.4) ? "peck" : "stand", 0, "calm");
      break;
    case 14:
      emu(out, cam, add(PLAQUE, 2.5, 0.9, -0.4), true, "stand", 0, "smug", false, 0.9);
      break;
  }
  return out;
};
