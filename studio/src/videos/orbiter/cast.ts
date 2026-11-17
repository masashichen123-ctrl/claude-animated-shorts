// Who stands where in "The 125 Million Dollar Mix-Up", plus its 2D effects.
import { Pen, SKINS, Outfit, Expr } from "../kit/toon";
import { fxSmoke, fxBlast } from "../kit/fxw";
import { beginStage, put, fx, step, FOLK, CamInfo, Stage } from "../kit/cast";
import { FPS, V3, add, clamp01 } from "../kit/timeline";
import { TL, F, LAB, CTRL, KITCHEN, probeAt, heatAt, LOST } from "./timeline";

const ENG_CO = (i: number): Outfit => ({ jacket: "#f1ece0", pants: ["#3b3f52", "#5a4632"][i % 2], boots: "#2a2228", hat: "hair", hair: ["#3a2a1c", "#c9a24a", "#7a4a26"][i % 3], skin: SKINS[i % 4], buttons: "#9aa0aa", ...(i % 2 ? { moustache: "#3a2a1c" } : {}) });
const ENG_CA = (i: number): Outfit => ({ jacket: ["#3f6fb5", "#2f8f8a", "#7b4a8c"][i % 3], pants: "#2c3140", boots: "#2a2228", hat: "hair", hair: ["#1f1a1c", "#a04a2a", "#8a8d94"][i % 3], skin: SKINS[(i + 2) % 4] });
const COOK: Outfit = { jacket: "#f8f6ee", pants: "#3b3f52", boots: "#2a2228", hat: "cap", cap: "#f8f6ee", skin: SKINS[1], moustache: "#3a2a1c", build: "stout" };

const puff = (p: Pen, t: number) => { for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, d = 40 + 120 * t, r = (60 + 30 * (i % 3)) * (1 - 0.5 * t); p.ell(250 + d * Math.cos(a), 260 + d * 0.8 * Math.sin(a), r, r * 0.85, `rgba(250,248,240,${(1 - 0.7 * t).toFixed(2)})`, 0); } };
const thrust = (p: Pen, t: number) => { for (let i = 0; i < 4; i++) { const r = 40 + 30 * i + 40 * t; p.ell(150, 60 + 50 * i + 60 * t, r, r * 0.8, `rgba(235,240,250,${(0.8 - 0.2 * i - 0.5 * t).toFixed(2)})`, 0); } };
const flame = (p: Pen, t: number) => {
  const w = (k: number) => 60 + 30 * Math.sin(t * 20 + k);
  p.poly([[150 - w(1), 80], [150, 600], [150 + w(2), 80]], "#ff7a2a", 0);
  p.poly([[150 - w(3) * 0.6, 80], [150, 420], [150 + w(4) * 0.6, 80]], "#ffd36a", 0);
};
const money = (p: Pen) => { p.poly([[20, 20], [280, 10], [290, 140], [30, 150]], "#8fbf7a", 8); p.ell(155, 80, 30, 30, "#3f6a3a", 0); };

export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const s = TL.SHOTS[id - 1], out = beginStage(s.light, cam), k = TL.keyAt(id, f), t = f / FPS;
  const hot = heatAt(id, f);
  if ((id === 1 || id === 8 || id === 15) && hot > 0.05 && !(id === 8 && f >= LOST)) {
    const p = probeAt(id, f), u = step((t * 4) % 1, 8);
    fx(out, `flame${u}`, 300, 640, (q) => flame(q, u), add(p, 0, 2.2, -3.2), 2.4 * hot + 0.6, 5 * hot + 1, { soft: true });
  }
  switch (id) {
    case 2: case 6: case 7: {
      const p = probeAt(id, f);
      if (id !== 2) for (const u0 of [0.15, 0.4, 0.7]) { const ff = F(id, u0), u = clamp01((f - ff) / 10); if (f >= ff && u < 1) fx(out, `thrust${step(u, 10)}`, 300, 300, (q) => thrust(q, step(u, 10)), add(p, 0, -1.4, 0), 1.6, 1.6, { soft: true }); }
      break;
    }
    case 3:
      if (k === 0) for (let i = 0; i < 3; i++) put(out, cam, f, 10 + i, ENG_CO(i), `co${i}`, add(LAB, -2.6 + i * 2.3, 0, -0.9 - 0.4 * (i % 2)), { expr: (["smile", "neutral", "grin"] as Expr[])[i], look: 0 });
      else for (let i = 0; i < 3; i++) put(out, cam, f, 20 + i, ENG_CA(i), `ca${i}`, add(CTRL, -3.6 + i * 3.0, 0, -1.9), { expr: (["neutral", "smile", "stern"] as Expr[])[i], look: 0 });
      break;
    case 4:
      if (k === 0) put(out, cam, f, 10, ENG_CO(0), "co0", add(LAB, -1.2, 0, -1.6), { expr: "grin", look: 1, wave: 0.5 + 0.5 * Math.sin(t * 5) });
      else put(out, cam, f, 20, ENG_CA(0), "ca0", add(CTRL, 1.0, 0, -1.8), { expr: "smile", look: -1, wave: 0.5 + 0.5 * Math.sin(t * 5) });
      break;
    case 9:
      for (let i = 0; i < 3; i++) put(out, cam, f, 20 + i, ENG_CA(i), `ca${i}`, add(CTRL, -2.4 + i * 1.6, 0, -2.0 - 0.3 * (i % 2)), { expr: f > F(9, 0.35) ? "relief" : "nervous", look: 0 }, 1, [F(9, 0.35) / FPS]);
      break;
    case 10: {
      for (let i = 0; i < 2; i++) put(out, cam, f, 20 + i, ENG_CA(i), `ca${i}`, add(CTRL, 4.0 + i * 1.6, 0, -2.9), { expr: f > F(10, 0.4) ? "shock" : "nervous", look: i ? -1 : 1 }, 1, [F(10, 0.4) / FPS]);
      for (let j = 0; j < 4; j++) { const u = clamp01((f - F(10, 0.25) - j * 6) / 30); if (u > 0 && u < 1) fx(out, "money", 300, 160, money, add(CTRL, 4.8 + (j - 1.5) * 0.6, 0.6 + 2.6 * u, -1.5 - 0.3 * j), 0.5, 0.27, { rot: u * 5 + j }); }
      break;
    }
    case 11:
      put(out, cam, f, 11, ENG_CO(1), "co1", add(LAB, -3.1, 0, 1.9), { expr: f > F(11, 0.5) ? "nervous" : "neutral", look: -1 }, 1, [F(11, 0.5) / FPS]);
      break;
    case 12: {
      put(out, cam, f, 30, COOK, "cook", add(KITCHEN, 0.9, 0, 1.15), { expr: k === 0 ? "smile" : "shock", look: 1 }, 1, [F(12, 0.62) / FPS]);
      if (k === 1) { const u = clamp01((f - F(12, 0.66)) / 30); fx(out, `puff${step(u, 20)}`, 500, 500, (q) => puff(q, step(u, 20)), add(KITCHEN, 0, 1.4 + u, 0.1), 2.2 + 3 * u, 2.2 + 3 * u, { soft: true }); }
      break;
    }
    case 13:
      for (let i = 0; i < 3; i++) put(out, cam, f, 10 + i, ENG_CO(i), `co${i}`, add(LAB, -1.8 + i * 1.8, 0, -1.4 - 0.3 * (i % 2)), { expr: (["grin", "smile", "relief"] as Expr[])[i], look: 0, ...(i === 0 ? { wave: 0.5 + 0.5 * Math.sin(t * 5) } : {}) });
      break;
    case 14: {
      const p = probeAt(14, f), u = step((t * 0.8) % 1, 12);
      fx(out, `scan${u}`, 300, 300, (q) => { for (let r = 0; r < 3; r++) { const rr = 40 + ((u + r / 3) % 1) * 110; q.ell(150, 150, rr, rr * 0.5, null, 7); } }, add(p, 0, -6, 18), 8, 8);
      break;
    }
    case 8:
      if (f >= LOST) { const u = clamp01((f - LOST) / 24); fx(out, `blast${step(u, 16)}`, 900, 900, (q) => fxBlast(q, step(u, 16)), add(probeAt(8, LOST), 0, 0, 0), 4 + 6 * u, 4 + 6 * u, { soft: u > 0.6 }); }
      break;
  }
  void fxSmoke; void FOLK;
  return out;
};
