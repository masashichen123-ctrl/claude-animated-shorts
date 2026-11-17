// Who stands where in "The Smell That Fixed London", plus its 2D effects.
import { Pen, SKINS, Outfit, Expr } from "../kit/toon";
import { fxStink } from "../kit/fxw";
import { beginStage, put, walker, fx, step, FOLK, CamInfo, Stage } from "../kit/cast";
import { FPS, V3, add } from "../kit/timeline";
import { TL, F, RIVER, PARL, CHAMBER, STREET, OFFICE, TUNNEL, BATH } from "./timeline";

const MP = (i: number): Outfit => ({ jacket: "#1f1d2a", pants: "#2a2f3d", boots: "#111", hat: i % 2 ? "tophat" : "hair", hair: ["#8a8d94", "#3a2a1c", "#c9a24a"][i % 3], skin: SKINS[i % 4], moustache: i % 3 === 0 ? "#8a8d94" : undefined, buttons: "#c9ccd2" });
const WORKER = (i: number): Outfit => ({ jacket: ["#6e5a3a", "#5f6a72"][i % 2], pants: "#4a4038", boots: "#3a2a22", hat: "cap", cap: "#4a4f5c", skin: SKINS[(i + 1) % 4] });
const BAZ: Outfit = { jacket: "#2a2f3d", pants: "#2a2f3d", boots: "#111", hat: "tophat", skin: SKINS[0], moustache: "#3a2a1c", build: "stout" };
const BOSS: Outfit = { jacket: "#7a2e3a", pants: "#2a2f3d", boots: "#111", hat: "hair", hair: "#8a8d94", skin: SKINS[1], moustache: "#8a8d94", build: "stout", buttons: "#e8c45a" };
const stinkAt = (out: Stage, f: number, at: V3, n = 3, size = 1.6, k0 = 0) => {
  for (let k = 0; k < n; k++) { const u = step(((f / FPS) * 0.7 + k / n + k0) % 1, 12); fx(out, `stink${u}`, 300, 500, (p) => fxStink(p, u), add(at, (k - (n - 1) / 2) * size * 0.7, size * 0.6, 0), size * 0.6, size, { soft: true }); }
};
const stream = (p: Pen, t: number) => { for (let k = 0; k < 4; k++) p.stroke([[60 + k * 40, 0], [70 + k * 40 + 20 * Math.sin(t * 6 + k), 300]], 22, "#6e5a2a"); };

export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const s = TL.SHOTS[id - 1], out = beginStage(s.light, cam), t = f / FPS;
  switch (id) {
    case 1: case 4:
      stinkAt(out, f, add(PARL, -10, 1, -18), 4, 6); stinkAt(out, f, add(PARL, 20, 1, -22), 3, 5, 0.4);
      break;
    case 2:
      for (let i = 0; i < 5; i++) { const u = step((t * 2 + i * 0.2) % 1, 8); fx(out, `stream${u}`, 300, 300, (p) => stream(p, u), add(RIVER, -60 + i * 9, -0.9, 7.1), 1.2, 1.0, { soft: true }); }
      stinkAt(out, f, add(RIVER, -40, -1, 2), 3, 3);
      break;
    case 3:
      stinkAt(out, f, add(RIVER, -6, -1, -14), 4, 5); stinkAt(out, f, add(RIVER, 10, -1, -26), 3, 4, 0.5);
      break;
    case 5:
      put(out, cam, f, 1, WORKER(0), "w0", add(CHAMBER, 0.2, 0, 0.6), { expr: "pained", look: 1, wave: 0.5 + 0.5 * Math.sin(t * 4) });
      put(out, cam, f, 2, MP(0), "mp0", add(CHAMBER, -2.2, 0, -0.6), { expr: "pained", look: 1 });
      stinkAt(out, f, add(CHAMBER, -1, 0.4, 2.0), 3, 1.6);
      break;
    case 6:
      put(out, cam, f, 2, MP(1), "mp1", add(CHAMBER, 1.0, 0, 0.6), { expr: "dazed", look: 0 });
      stinkAt(out, f, add(CHAMBER, 1.0, 0.6, 0.3), 3, 1.4);
      break;
    case 7:
      for (let i = 0; i < 8; i++) { const sd = i % 2 ? 1 : -1, row = Math.floor(i / 2) % 3; put(out, cam, f, 10 + i, MP(i), `mp${i % 6}`, add(CHAMBER, sd * (2.2 + row * 1.1), 0.5 + row * 0.4, -3 + (i % 4) * 0.9), { mode: "stand", expr: (["stern", "laugh", "pained", "stern"] as Expr[])[i % 4], look: -sd, wave: i % 3 === 0 ? 0.5 + 0.5 * Math.sin(t * 6 + i) : undefined }); }
      break;
    case 8:
      put(out, cam, f, 2, MP(0), "mp0", add(CHAMBER, -0.9, 0, 1.0), { expr: f > F(8, 0.3) ? "grin" : "stern", look: 1 }, 1, [F(8, 0.3) / FPS]);
      break;
    case 9:
      for (let i = 0; i < 3; i++) put(out, cam, f, 20 + i, MP(i), `mp${i}`, add(CHAMBER, -2.0 + i * 1.3, 0, -0.4), { expr: "pained", look: 0 });
      stinkAt(out, f, add(CHAMBER, -0.7, 1.2, -0.6), 3, 1.2);
      break;
    case 10: case 11:
      for (let i = 0; i < 7; i++) put(out, cam, f, 30 + i, FOLK[(i * 3) % 10], `f${(i * 3) % 10}`, add(STREET, -10 + i * 3.2, 0, 2.5 + (i % 2)), { expr: (["pained", "dazed", "pained", "nervous"] as Expr[])[i % 4], look: 0 });
      stinkAt(out, f, add(STREET, -2, 0.2, 1.5), 5, 2.2);
      break;
    case 12:
      put(out, cam, f, 3, BOSS, "boss", add(OFFICE, 0, 0, 1.4), { expr: "pained", look: 0, wave: 1 });
      stinkAt(out, f, add(OFFICE, 0.4, 0.8, 1.0), 2, 1.2);
      for (let i = 0; i < 3; i++) walker(out, cam, f, 40 + i, WORKER(i), `w${i}`, add(OFFICE, -4 + ((t - F(12) / FPS) * 3 + i * 1.5) % 6, 0, -1.5 - i * 0.5), 1, 0);
      break;
    case 13:
      put(out, cam, f, 4, BAZ, "baz", add(TUNNEL, -1.0, 0.25, 6), { expr: "grin", look: 1 });
      for (let i = 0; i < 3; i++) put(out, cam, f, 50 + i, WORKER(i), `w${i}`, add(TUNNEL, 0.9 - i * 0.2, 0.25, 12 + i * 4), { expr: "neutral", look: -1 });
      break;
    case 14:
      if (TL.keyAt(14, f) === 0) put(out, cam, f, 5, FOLK[5], "f5", add(BATH, 0.9, 0, 1.4), { expr: "grin", look: -1, wave: f > F(14, 0.15) && f < F(14, 0.3) ? 1 : 0.3 });
      break;
  }
  return out;
};
