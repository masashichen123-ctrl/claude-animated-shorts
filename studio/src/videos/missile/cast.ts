// Who stands where in "The Letter That Came by Missile", plus its 2D effects.
import { Pen, SKINS, Outfit, Expr, fxPuff } from "../kit/toon";
import { fxBlast } from "../kit/fxw";
import { beginStage, put, fx, step, FOLK, CamInfo, Stage, hh } from "../kit/cast";
import { FPS, add, clamp01 } from "../kit/timeline";
import { TL, F, SUB, RUNWAY, POST, ROAD, HOUSE, MUSEUM, LAUNCH, LAND, missileAt } from "./timeline";

const SAILOR = (i: number): Outfit => ({ jacket: "#f4f4ee", pants: "#f4f4ee", boots: "#1f1a1c", hat: "cap", cap: "#f4f4ee", skin: SKINS[i % 4], buttons: "#2f5f9a" });
const PMG: Outfit = { jacket: "#2c3e63", pants: "#2a2f3d", boots: "#111", hat: "hair", hair: "#c9ccd2", skin: SKINS[0], build: "stout", buttons: "#e8c45a", sash: "#c8202a" };
const CLERK: Outfit = { jacket: "#8a8d94", pants: "#3b3f52", boots: "#2a2228", hat: "cap", cap: "#2f5f9a", skin: SKINS[2], moustache: "#3a2a1c" };
const POSTMAN: Outfit = { jacket: "#2f5f9a", pants: "#2f5f9a", boots: "#1f1a1c", hat: "cap", cap: "#2f5f9a", skin: SKINS[1] };
const envelope = (p: Pen) => { p.poly([[20, 40], [280, 40], [280, 200], [20, 200]], "#fbf6e6", 8); p.stroke([[20, 40], [150, 130], [280, 40]], 6); p.poly([[220, 60], [262, 60], [262, 104], [220, 104]], "#c8202a", 0); };
const flame = (p: Pen, t: number) => { const w = 50 + 20 * Math.sin(t * 25); p.poly([[150 - w, 40], [150, 420], [150 + w, 40]], "#ff7a2a", 0); p.poly([[150 - w * 0.5, 40], [150, 280], [150 + w * 0.5, 40]], "#ffe28a", 0); };

export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const s = TL.SHOTS[id - 1], out = beginStage(s.light, cam), k = TL.keyAt(id, f), t = f / FPS;
  const flying = id === 1 || (id === 5 && f >= LAUNCH && f < LAND);
  if (flying) {
    const m = missileAt(id, f).p, u = step((t * 6) % 1, 6);
    fx(out, `mflame${u}`, 300, 440, (p) => flame(p, u), add(m, 0, 0, 5.2), 1.2, 1.8, { soft: true, rot: Math.PI / 2 });
    for (let i = 0; i < 6; i++) { const a = ((t * 0.8 + i / 6) % 1); fx(out, "env", 300, 240, envelope, add(m, (hh(i, 1) - 0.5) * 4, (hh(i, 2) - 0.5) * 2 - a * 3, 5 + a * 18), 0.6, 0.48, { rot: t * 3 + i }); }
  }
  switch (id) {
    case 2:
      if (k === 0) { put(out, cam, f, 1, CLERK, "clerk", add(POST, 0.4, 0.35, 1.6), { expr: "dazed", look: 0 }); put(out, cam, f, 2, FOLK[3], "f3", add(POST, -1.6, 0.35, -0.6), { expr: "pained", look: 1 }); }
      break;
    case 3:
      for (let i = 0; i < 3; i++) put(out, cam, f, 10 + i, SAILOR(i), `sail${i}`, add(SUB, -1.4 + i * 1.3, 2.4, -3.2 + 0.4 * (i % 2)), { expr: (["stern", "grin", "neutral"] as Expr[])[i], look: 1 });
      break;
    case 4:
      put(out, cam, f, 10, SAILOR(0), "sail0", add(SUB, 0.9, 2.4, -4.6), { expr: "grin", look: -1, wave: 0.5 + 0.5 * Math.sin(t * 6) });
      for (let i = 0; i < 4; i++) { const a = ((t * 1.4 + i / 4) % 1); fx(out, "env", 300, 240, envelope, add(SUB, 0.6 - a * 0.6, 3.6 + 0.8 * Math.sin(a * Math.PI), -4.6 + a * 0.4), 0.35, 0.28, { rot: i + t }); }
      break;
    case 5:
      if (f >= LAUNCH && f < LAUNCH + 24) { const u = (f - LAUNCH) / 24; fx(out, `puff${step(u, 12)}`, 300, 300, (p) => fxPuff(p, step(u, 12)), add(SUB, 0, 3.2, -2), 6 + 6 * u, 6 + 6 * u, { soft: true }); }
      if (f >= LAND && f < LAND + 20) { const u = (f - LAND) / 20; fx(out, `puff${step(u, 12)}`, 300, 300, (p) => fxPuff(p, step(u, 12)), add(RUNWAY, 0, 1, 0), 5 + 6 * u, 5 + 6 * u, { soft: true }); }
      break;
    case 6:
      put(out, cam, f, 3, PMG, "pmg", add(RUNWAY, -1.5, 0.33, -6.4), { expr: "grin", look: 1, wave: 0.5 + 0.5 * Math.sin(t * 4) });
      for (let i = 0; i < 3; i++) put(out, cam, f, 10 + i, SAILOR(i), `sail${i}`, add(RUNWAY, -4.4 + i * 1.2, 0.33, -4.6 - 0.4 * (i % 2)), { expr: "smile", look: 1 });
      break;
    case 7:
      for (let i = 0; i < 3; i++) put(out, cam, f, 20 + i, i ? SAILOR(i) : POSTMAN, i ? `sail${i}` : "postman", add(RUNWAY, 3.6 + i * 1.3, 0.33, -1.6 + 0.4 * (i % 2)), { expr: (["laugh", "grin", "relief_open"] as Expr[])[i], look: -1, wave: 0.5 + 0.5 * Math.sin(t * 5 + i) });
      break;
    case 8:
      put(out, cam, f, 4, FOLK[6], "f6", add(HOUSE, 2.4, 0.33, -0.6), { expr: f > F(8, 0.65) ? "shock" : "smile", look: -1 }, 1, [F(8, 0.65) / FPS]);
      if (f >= F(8, 0.65) && f < F(8, 0.65) + 16) { const u = (f - F(8, 0.65)) / 16; fx(out, `puff${step(u, 12)}`, 300, 300, (p) => fxPuff(p, step(u, 12)), add(HOUSE, -1.5, 0.6, 0.5), 3 + 3 * u, 3 + 3 * u, { soft: true }); }
      if (f < F(8, 0.65)) fx(out, "env", 300, 240, envelope, add(HOUSE, 1.0, 1.6, -0.1), 0.35, 0.28);
      break;
    case 9:
      put(out, cam, f, 5, POSTMAN, "postman", add(ROAD, 8, 0.33, -5.2), { expr: "grin", look: -1 });
      break;
    case 10: {
      const b0 = F(10, 0.65);
      if (f >= b0) { const u = clamp01((f - b0) / 20); fx(out, `blast${step(u, 14)}`, 900, 900, (p) => fxBlast(p, step(u, 14)), add(ROAD, 34, 22, 31), 8 + 6 * u, 8 + 6 * u, { soft: u > 0.6 }); }
      put(out, cam, f, 5, POSTMAN, "postman", add(ROAD, 31, 0.33, -4.6), { expr: f >= b0 ? "dazed" : "smile", look: 1 }, 1, [b0 / FPS]);
      break;
    }
    case 11: case 12:
      for (let i = 0; i < (id === 11 ? 4 : 1); i++) put(out, cam, f, 30 + i, FOLK[(i * 3 + 1) % 10], `f${(i * 3 + 1) % 10}`, add(MUSEUM, -3.2 + i * 2.1 + (id === 12 ? 4.6 : 0), 0.35, -2.4 - 0.4 * (i % 2)), { expr: id === 12 ? "smile" : (["smile", "grin", "neutral", "smile_closed"] as Expr[])[i], look: id === 12 ? -1 : 0 });
      break;
  }
  return out;
};
