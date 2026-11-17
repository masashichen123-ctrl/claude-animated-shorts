// Who stands where in "The Toads That Ate Everything Except Beetles": the toad and beetle drawings, people, effects.
import { Pen, INK, SKINS, Outfit, Expr } from "../kit/toon";
import { beginStage, put, creature, fx, step, FOLK, CamInfo, Stage, hh } from "../kit/cast";
import { FPS, V3, add, clamp01 } from "../kit/timeline";
import { TL, F, FIELD, DOCK, COURT, OUTBACK } from "./timeline";

/** a cane toad sitting, filling the bottom of the 600 x 1000 card (feet at y = 975) */
const drawToad = (p: Pen, mood: "calm" | "sleep" | "tongue" | "up" | "smug") => {
  p.ell(150, 940, 70, 34, "#7a6a3a", 9); p.ell(450, 940, 70, 34, "#7a6a3a", 9);
  p.ell(300, 800, 230, 160, "#8f7a42", 12);
  for (let i = 0; i < 14; i++) p.ell(150 + ((i * 97) % 300), 720 + ((i * 53) % 140), 14, 11, "#6e5c30", 0);
  p.ell(300, 880, 160, 70, "#d8c48a", 0);
  for (const x of [200, 400]) {
    p.ell(x, mood === "up" ? 600 : 640, 62, 58, "#8f7a42", 10);
    if (mood === "sleep") p.arc(x, 650, 36, 18, 10, 170, 9);
    else { p.ell(x, mood === "up" ? 590 : 635, 40, 38, "#f2c14a", 7); p.ell(x + (mood === "up" ? 0 : 6), mood === "up" ? 572 : 640, 18, 26, INK, 0); }
  }
  if (mood === "smug") { p.stroke([[160, 590], [230, 610]], 10); p.stroke([[440, 590], [370, 610]], 10); }
  p.arc(300, 760, 150, 40, 10, 170, 9);
  if (mood === "tongue") p.line([[300, 790], [330, 600], [360, 420]], "#e86e78", 26);
};
const drawBeetle = (p: Pen) => {
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) p.stroke([[150 + s * 40, 120 + k * 30], [150 + s * 95, 100 + k * 45]], 8);
  p.ell(150, 160, 60, 80, "#5a3b2a", 9); p.stroke([[150, 90], [150, 235]], 5); p.ell(150, 72, 32, 26, "#3a2a22", 8);
  p.ell(165, 66, 7, 7, "#ffffff", 0); p.dot(167, 66, 3.5, INK);
};
const flyingBeetle = (p: Pen, w: number) => { drawBeetle(p); for (const s of [-1, 1]) p.ell(150 + s * 70, 110 - 30 * w, 50, 20, "rgba(220,235,255,0.75)", 4, 0, 360, s * 30); };
const zzz = (p: Pen, u: number) => { for (let q = 0; q < 3; q++) { const x = 60 + q * 70, y = 230 - q * 80 - 30 * u, w = 26 + q * 10; p.stroke([[x, y], [x + w, y], [x, y + w], [x + w, y + w]], 9); } };
const bulb = (p: Pen) => { p.ell(150, 120, 80, 85, "#fff3b0", 9); p.poly([[115, 190], [185, 190], [175, 250], [125, 250]], "#9aa0aa", 8); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; p.stroke([[150 + 105 * Math.cos(a), 120 + 105 * Math.sin(a)], [150 + 140 * Math.cos(a), 120 + 140 * Math.sin(a)]], 8, "#f6c62e"); } };

const toad = (out: Stage, cam: CamInfo, at: V3, mood: "calm" | "sleep" | "tongue" | "up" | "smug", sc = 0.14, mirror = false) =>
  creature(out, cam, `toad|${mood}`, (p) => drawToad(p, mood), at, mirror, sc);
const beetle = (out: Stage, cam: CamInfo, at: V3, sc = 0.05) => creature(out, cam, "beetle", (p) => { p.g.save(); p.g.translate(150, 700); drawBeetle(p); p.g.restore(); }, at, false, sc, false);

const FARMER: Outfit = { jacket: "#f1efe6", pants: "#6e5a3a", boots: "#4a3426", hat: "cap", cap: "#c9a24a", skin: SKINS[1], moustache: "#8a8d94" };
const DOCKER: Outfit = { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#3a2a22", hat: "cap", cap: "#2f3440", skin: SKINS[2] };
const KEEPER: Outfit = { jacket: "#2f8f4a", pants: "#1f1d2a", boots: "#111", hat: "hair", hair: "#3a2a1c", skin: SKINS[3] };
const PLAYER: Outfit = { jacket: "#d8453c", pants: "#d8453c", boots: "#f4f4ee", hat: "hair", hair: "#1f1a1c", skin: SKINS[2] };

export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const s = TL.SHOTS[id - 1], out = beginStage(s.light, cam), k = TL.keyAt(id, f), t = f / FPS;
  switch (id) {
    case 1:
      toad(out, cam, add(FIELD, 0.5, 0.01, 2.4), k === 0 ? "tongue" : "up", 0.22);
      if (k === 1) beetle(out, cam, add(FIELD, 1.0, 2.2, 5.0), 0.9);
      break;
    case 2:
      if (k === 1) { put(out, cam, f, 1, FARMER, "farmer", add(FIELD, -1.5, 0, 0.5), { expr: "grin", look: 1 }); fx(out, "bulb", 300, 300, bulb, add(FIELD, -1.5, 2.9, 0.4), 0.7, 0.7); }
      break;
    case 3:
      put(out, cam, f, 2, DOCKER, "docker", add(DOCK, 1.6, 0, 0.6), { expr: "pained", look: -1 });
      for (let i = 0; i < 4; i++) toad(out, cam, add(DOCK, -1.5 + i * 0.8, 1.4, 1.15), "calm", 0.1);
      break;
    case 4:
      for (let i = 0; i < 40; i++) { const hop = Math.abs(Math.sin(t * 4 + i)) * 0.3; toad(out, cam, add(FIELD, -8 + 16 * hh(i, 1), hop, 1 + 10 * hh(i, 2)), "calm", 0.1, hh(i, 3) < 0.5); }
      break;
    case 5: case 10:
      toad(out, cam, add(FIELD, 0, 0.01, 4.6), id === 10 ? "up" : f > F(5, 0.5) ? "up" : "calm", 0.16);
      beetle(out, cam, add(FIELD, 0.2, 2.3, 5.0), 0.9);
      break;
    case 6:
      if (k === 0) { toad(out, cam, add(FIELD, 0, 0.01, 4.4), "sleep", 0.16); const u = step((t * 0.6) % 1, 10); fx(out, `zzz${u}`, 300, 300, (p) => zzz(p, u), add(FIELD, 0.25, 0.45, 4.3), 0.3, 0.3); }
      else for (let i = 0; i < 5; i++) { const w = step((Math.sin(t * 20 + i) + 1) / 2, 4); fx(out, `fbeetle${w}`, 300, 260, (p) => flyingBeetle(p, w), add(FIELD, -0.8 + i * 0.4, 2.6 + 0.3 * Math.sin(t * 3 + i), 5.0), 0.22, 0.19); }
      break;
    case 7: {
      toad(out, cam, add(FIELD, 0, 0.01, 1.2), Math.floor(t * 2) % 2 ? "tongue" : "smug", 0.16);
      for (let i = 0; i < 6; i++) fx(out, "ant", 60, 40, (p) => { p.ell(30, 20, 14, 8, INK, 0); p.ell(14, 20, 7, 6, INK, 0); }, add(FIELD, 0.6 + i * 0.12 - ((t * 0.3) % 0.4), 0.02, 0.9), 0.05, 0.035, { flat: true });
      break;
    }
    case 8: case 9: {
      const n = id === 8 ? 6 + Math.floor(20 * clamp01((f - F(8)) / (F(9) - F(8)))) : 30 + Math.floor(120 * clamp01((f - F(9)) / (F(10) - F(9))));
      for (let i = 0; i < n; i++) toad(out, cam, add(FIELD, -6 + 12 * hh(i, 4), 0.01, -1 + 8 * hh(i, 5)), i % 5 ? "calm" : "smug", i < 2 ? 0.16 : 0.08 + 0.04 * hh(i, 6), hh(i, 7) < 0.5);
      break;
    }
    case 11:
      put(out, cam, f, 3, KEEPER, "keeper", add(COURT, 0.2, 0, 2.6), { expr: "nervous", look: 0, wave: 0.9 });
      put(out, cam, f, 4, PLAYER, "player", add(COURT, -2.2, 0, 1.2), { expr: "grin", look: 1, wave: 1 });
      break;
    case 12:
      for (let i = 0; i < 160; i++) { const sx = -40 * clamp01((f - F(12)) / (F(13) - F(12))) * hh(i, 8); toad(out, cam, add(OUTBACK, -20 + 50 * hh(i, 9) + sx, 0.02, -15 + 40 * hh(i, 10)), "calm", 0.6, true); }
      break;
    case 13:
      for (let i = 0; i < 6; i++) toad(out, cam, add(DOCK, -1.5 + (i % 3) * 1.0, 0.7 * Math.floor(i / 3) + 0.7, 0.85), i % 2 ? "smug" : "calm", 0.1);
      break;
  }
  void FOLK; void (null as unknown as Expr);
  return out;
};
