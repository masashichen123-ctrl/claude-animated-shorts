// Who stands where in "The Building That Melted a Car", plus its 2D effects.
import { Pen, INK, SKINS, Outfit, Expr } from "../kit/toon";
import { fxSmoke } from "../kit/fxw";
import { beginStage, put, walker, fx, step, FOLK, CamInfo, Stage, hh } from "../kit/cast";
import { FPS, V3, clamp01 } from "../kit/timeline";
import { TL, F, CAR_AT, SHOP, EGG, PODIUM, DIAG, ARRIVE1, LEAVE, CAR2_1, FOCUS_HIT, driveX } from "./timeline";
import { zS } from "./set";

const MARTIN: Outfit = { jacket: "#2c3e63", pants: "#2a2f3d", boots: "#1f1a1c", hat: "hair", hair: "#8a8d94", moustache: "#8a8d94", skin: SKINS[0], buttons: "#d9dde0" };
const SHOPKEEP: Outfit = { jacket: "#f1ece0", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#a04a2a", skin: SKINS[2], build: "stout" };
const REPORTER: Outfit = { jacket: "#c8443a", pants: "#2c3140", boots: "#2a2228", hat: "hair", hair: "#2a1d16", skin: SKINS[3] };
const CAMMAN: Outfit = { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#4a3426", hat: "cap", cap: "#2f8f8a", skin: SKINS[1] };
const OFFICIAL: Outfit = { jacket: "#f2e12e", pants: "#2f3440", boots: "#1f1a1c", hat: "cap", cap: "#2f3440", skin: SKINS[1], buttons: "#c0c4cc" };
const PRESENTER: Outfit = { jacket: "#1f1d2a", pants: "#1f1d2a", boots: "#111", hat: "hair", hair: "#c9a24a", skin: SKINS[0], buttons: "#e8c45a" };

// ---------------- effect drawings ----------------
const steam = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push([60 + k * 60 + 14 * Math.sin(u * 7 + t * 6.28 + k), 290 - u * 250]); }
    p.stroke(pts, 16, `rgba(255,255,255,${0.85 - 0.25 * k})`);
  }
};
const egg = (p: Pen) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, r = 110 + 18 * Math.sin(i * 2.7); pts.push([150 + r * Math.cos(a), 150 + r * 0.85 * Math.sin(a)]); }
  p.poly(pts, "#fbfaf4", 9);
  p.ell(150, 150, 46, 42, "#f6b21b", 8);
  p.ell(138, 138, 14, 11, "#ffe28a", 0);
};
const blisters = (p: Pen) => { for (let k = 0; k < 14; k++) { const x = 30 + ((k * 73) % 240), y = 30 + ((k * 41) % 240), r = 10 + (k % 4) * 6; p.ell(x, y, r, r, "#f4ead2", 5); p.ell(x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.3, "#ffffff", 0); } };
const cracks = (p: Pen) => { for (const [x0, y0] of [[60, 60], [180, 90], [110, 200], [230, 220]] as const) { p.stroke([[x0, y0], [x0 + 30, y0 + 18], [x0 + 22, y0 + 46], [x0 + 52, y0 + 70]], 6); p.stroke([[x0 + 30, y0 + 18], [x0 + 64, y0 + 6]], 5); } };
const scorch = (p: Pen) => { const g = p.g; const gr = g.createRadialGradient(150, 150, 10, 150, 150, 140); gr.addColorStop(0, "rgba(40,24,20,0.85)"); gr.addColorStop(1, "rgba(40,24,20,0)"); g.fillStyle = gr; g.fillRect(0, 0, 300, 300); };
const drip = (p: Pen) => { p.poly([[40, 10], [60, 10], [62, 120], [50, 150], [38, 120]], "#2a3f5f", 6); p.ell(46, 40, 6, 14, "#7d93b8", 0); };
const burst = (p: Pen, t: number) => {
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6, r0 = 30, r1 = 60 + 170 * t; p.poly([[250 + r0 * Math.cos(a + 0.2), 250 + r0 * Math.sin(a + 0.2)], [250 + r1 * Math.cos(a), 250 + r1 * Math.sin(a)], [250 + r0 * Math.cos(a - 0.2), 250 + r0 * Math.sin(a - 0.2)]], "#fff3b0", 6); }
  p.ell(250, 250, 40 * (1.2 - t), 40 * (1.2 - t), "#ffffff", 6);
};
const steamAt = (out: Stage, f: number, at: V3, n = 3, size = 0.9, k0 = 0) => {
  for (let k = 0; k < n; k++) { const t = step(((f / FPS) * 0.9 + k / n + k0) % 1, 16); fx(out, `steam${t}`, 300, 300, (p) => steam(p, t), [at[0] + (k - (n - 1) / 2) * size * 0.6, at[1] + size * 0.4 + 0.3 * t, at[2]], size, size, { soft: true }); }
};
const smokeAt = (out: Stage, f: number, at: V3, n = 3, size = 1.4) => {
  for (let k = 0; k < n; k++) { const u = step(((f / FPS) * 0.35 + k / n) % 1, 24); fx(out, `smoke${u}`, 300, 300, (p) => fxSmoke(p, u), [at[0] + 0.4 * Math.sin(k * 2.1), at[1] + 2.4 * u, at[2]], size * (0.6 + u), size * (0.6 + u)); }
};

export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const s = TL.SHOTS[id - 1], out = beginStage(s.light, cam), k = TL.keyAt(id, f), t = f / FPS;
  const P = 0.12; // pavement height
  switch (id) {
    case 1:
      steamAt(out, f, [0.9, 1.3, -43.6], 3, 0.8);
      steamAt(out, f, [-0.6, 0.9, -43.6], 2, 0.9, 0.4);
      for (let i = 0; i < 3; i++) fx(out, "drip", 100, 160, drip, [-1.2 + i * 1.1, 0.42 - 0.08 * ((t * 1.5 + i * 0.3) % 1), -43.5], 0.12, 0.2);
      if (k === 0) put(out, cam, f, 20, FOLK[2], "f2", [-3.2, P, -45.8], { expr: "shock", look: 1 });
      break;
    case 2:
      if (k === 1) for (let i = 0; i < 3; i++) walker(out, cam, f, 21 + i, FOLK[(i * 3) % 10], `f${(i * 3) % 10}`, [-4 + i * 3.5 + 0.8 * t * (i % 2 ? -1 : 1), P, -31 + i * 0.6], i % 2 ? -1 : 1, 0);
      break;
    case 3:
      if (f >= ARRIVE1 + 10 && f < LEAVE) put(out, cam, f, 1, MARTIN, "martin", [0.6, P, -45.0], { expr: "smile", look: -1 });
      if (f >= LEAVE) walker(out, cam, f, 1, MARTIN, "martin", [0.6 - 1.4 * (f - LEAVE) / FPS, P, -45.3], -1, 0);
      break;
    case 4: {
      const back = clamp01((f - F(4)) / (F(4, 0.2) - F(4)));
      if (k === 0) {
        if (back < 1) walker(out, cam, f, 1, MARTIN, "martin", [-4.5 + 3.3 * back, P, -45.2], 1, 0);
        else put(out, cam, f, 1, MARTIN, "martin", [-1.2, P, -45.2], { expr: "shock", look: 1 });
      }
      if (k === 1) for (let i = 0; i < 2; i++) fx(out, "drip", 100, 160, drip, [0.95 + (i - 0.5) * 0.12, 0.98 - 0.1 * ((t * 1.3 + i * 0.5) % 1), -43.55], 0.1, 0.17);
      if (k >= 1) steamAt(out, f, [k === 2 ? 2.05 : 0.6, k === 2 ? 1.0 : 1.1, -43.6], 2, 0.5);
      if (k === 3) { for (let i = 0; i < 3; i++) fx(out, "drip", 100, 160, drip, [-1.1 + i * 0.7, 0.35 - 0.08 * ((t * 1.4 + i * 0.4) % 1), -43.5], 0.12, 0.2); }
      break;
    }
    case 5: {
      const [sx, , sz] = SHOP;
      put(out, cam, f, 2, SHOPKEEP, "shop", [sx + 0.2, P, sz + 1.3], { expr: f > F(5, 0.5) ? "pained" : "nervous", look: 0 }, 1, [F(5, 0.5) / FPS]);
      fx(out, "blisters", 300, 300, blisters, [sx + 3.2, 1.6, sz + 0.08], 1.6, 1.6);
      fx(out, "cracks", 300, 300, cracks, [sx - 2.2, P + 0.02, sz + 2.4], 2.0, 2.0, { flat: true });
      fx(out, "scorch", 300, 300, scorch, [sx - 2.6, 3.35, sz + 0.75], 2.2, 1.4, { soft: true });
      smokeAt(out, f, [sx - 2.6, 3.6, sz + 0.9], 3, 1.0);
      break;
    }
    case 6:
      put(out, cam, f, 3, REPORTER, "rep", [2.6, P, -46.2], { expr: "smile", look: -1, wave: 0.5 + 0.5 * Math.sin(t * 5) });
      put(out, cam, f, 4, CAMMAN, "cam", [4.4, P, -47.9], { expr: "neutral", look: -1 });
      fx(out, "egg", 300, 300, egg, [EGG[0], EGG[1] + 0.01, EGG[2]], 0.55, 0.55, { flat: true });
      steamAt(out, f, [EGG[0], EGG[1] + 0.05, EGG[2]], 2, 0.45);
      break;
    case 7:
      for (let i = 0; i < 4; i++) put(out, cam, f, 24 + i, FOLK[(i * 2 + 1) % 10], `f${(i * 2 + 1) % 10}`, [-7 + i * 1.1, P, -46.3 + 0.5 * (i % 2)], { expr: i % 2 ? "nervous" : "neutral", look: 1 });
      walker(out, cam, f, 29, FOLK[6], "f6", [6 - 1.2 * ((t - TL.SHOTS[6].a / FPS) % 6), P, -47.2], -1, 0);
      break;
    case 8:
      for (let i = 0; i < 2; i++) put(out, cam, f, 24 + i, FOLK[(i * 2 + 1) % 10], `f${(i * 2 + 1) % 10}`, [-6.2 + i * 1.2, P, -46.0], { expr: f > CAR2_1 ? "shock" : "nervous", look: 1 }, 1, [CAR2_1 / FPS]);
      if (f > CAR2_1 + 12) steamAt(out, f, [driveX(f, 0, 1) * 0 + 0.5, 1.4, -43.6], 3, 0.8);
      break;
    case 10:
      if (f >= FOCUS_HIT) {
        const u = clamp01((f - FOCUS_HIT) / 8);
        if (u < 1) fx(out, `burst${step(u)}`, 500, 500, (p) => burst(p, step(u)), [DIAG[0], 0.7, DIAG[2] + 26.3], 1.6, 1.6);
        smokeAt(out, f, [DIAG[0], 0.7, DIAG[2] + 26.5], 3, 0.7);
      }
      break;
    case 11:
      if (k === 0) for (let i = 0; i < 4; i++) { const x = -4.5 + i * 3.1, y = 22.5; put(out, cam, f, 50 + i, FOLK[(i * 3 + 2) % 10], `f${(i * 3 + 2) % 10}`, [x, y, zS(x, y) - 0.4], { expr: i % 2 ? "grin" : "smile", look: 0, ...(i % 2 ? { wave: 0.5 + 0.5 * Math.sin(t * 6 + i) } : {}) }); }
      break;
    case 12:
      put(out, cam, f, 5, OFFICIAL, "off", [-4.4, P, -45.4], { expr: "stern", look: 1 });
      break;
    case 13:
      put(out, cam, f, 6, PRESENTER, "pres", [PODIUM[0] + 1.35, P, PODIUM[2] - 0.2], { expr: "grin", look: -1, wave: 0.5 + 0.5 * Math.sin(t * 4) });
      for (let i = 0; i < 4; i++) put(out, cam, f, 60 + i, FOLK[(i * 3 + 4) % 10], `f${(i * 3 + 4) % 10}`, [PODIUM[0] - 3.4 - i * 0.9, P, PODIUM[2] + 1.2 + 0.4 * (i % 2)], { expr: (["stern", "nervous", "pained", "stern"] as Expr[])[i], look: 1 });
      break;
  }
  return out;
};
void hh; void CAR_AT; void INK;
