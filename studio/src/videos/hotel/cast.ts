// Who stands where in "The Hotel That Went Up", plus its 2D effects.
import { Pen, SKINS, Outfit, Expr } from "../kit/toon";
import { fxBurst } from "../kit/toon";
import { beginStage, put, fx, step, FOLK, CamInfo, Stage } from "../kit/cast";
import { FPS, V3, clamp01 } from "../kit/timeline";
import { TL, F, HOTEL, WALK_Y, DOOR_Y, RAISE, JACKS, TRAIN, TURNS, liftAt } from "./timeline";

const PULLMAN: Outfit = { jacket: "#2a2f3d", pants: "#2a2f3d", boots: "#1f1a1c", hat: "tophat", skin: SKINS[0], buttons: "#c9ccd2" };
const MANAGER: Outfit = { jacket: "#7a2e3a", pants: "#3b3f52", boots: "#2a2228", hat: "hair", hair: "#5a3b2a", moustache: "#5a3b2a", skin: SKINS[1], build: "stout", buttons: "#e8c45a" };
const FOREMAN: Outfit = { jacket: "#6e5a3a", pants: "#3b3f52", boots: "#3a2a22", hat: "cap", cap: "#4a4f5c", skin: SKINS[2], moustache: "#3a2a1c" };
const MECHANIC: Outfit = { jacket: "#3f6fb5", pants: "#3f6fb5", boots: "#2a2228", hat: "cap", cap: "#d8453c", skin: SKINS[3] };
const worker = (i: number): Outfit => ({ jacket: ["#7a6a52", "#5f6a72", "#8a5a3c", "#6b5f4a"][i % 4], pants: ["#3b3f52", "#4a4038"][i % 2], boots: "#3a2a22", hat: "cap", cap: ["#4a4f5c", "#6e4b33", "#2f3440"][i % 3], skin: SKINS[i % 4], ...(i % 3 === 1 ? { moustache: "#3a2a1c" } : {}) });
const guest = (i: number): Outfit => ({ ...FOLK[(i * 3 + 1) % 10], hat: i % 2 ? "cap" : "hair", cap: "#f4f1ea" });

const zzz = (p: Pen, t: number) => { for (let k = 0; k < 3; k++) { const x = 60 + k * 70 + 10 * Math.sin(t * 6 + k), y = 230 - k * 80 - 30 * t, s = 26 + k * 10; p.stroke([[x, y], [x + s, y], [x, y + s], [x + s, y + s]], 9); } };
const sparkle = (p: Pen) => { p.poly([[150, 20], [170, 130], [280, 150], [170, 170], [150, 280], [130, 170], [20, 150], [130, 130]], "#ffffff", 8); };

const floorY = (id: number, f: number, k: number) => DOOR_Y + liftAt(id, f) + k * HOTEL.fh + 0.15;
const winX = (i: number) => HOTEL.x0 + 2 + i * 4;
/** the front row of workers at the jacks; arm swing on every turn */
const workers = (out: Stage, cam: CamInfo, f: number, n: number, xFrom: number, swing: number) => {
  for (let i = 0; i < n; i++) put(out, cam, f, 10 + i, worker(i), `w${i % 4}${i % 3}`, [xFrom + i * 2.4, WALK_Y, -13.3 + 0.25 * (i % 2)], { expr: i % 3 ? "neutral" : "stern", look: 0, wave: swing });
};
const turnSwing = (f: number) => TURNS.reduce((a, t) => a + Math.max(0, 1 - Math.abs(f - t - 3) / 6), 0);

export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const s = TL.SHOTS[id - 1], out = beginStage(s.light, cam), k = TL.keyAt(id, f), t = f / FPS;
  switch (id) {
    case 1: {
      workers(out, cam, f, 10, -12, 0.5 + 0.5 * Math.sin(t * 5));
      const at: V3 = [winX(6), floorY(1, f, 2), HOTEL.z0 - 0.3];
      put(out, cam, f, 30, guest(0), "g0", at, { expr: "smile_closed", blink: 1, look: 0 });
      const u = step((t * 0.6) % 1, 12);
      fx(out, `zzz${u}`, 300, 300, (p) => zzz(p, u), [at[0] + 0.7, at[1] + 2.3, at[2] - 0.05], 0.9, 0.9);
      break;
    }
    case 2:
      for (let i = 0; i < 3; i++) put(out, cam, f, 20 + i, FOLK[(i * 4 + 1) % 10], `f${(i * 4 + 1) % 10}`, [-69 + i * 2.6, -0.45, -21 - 1.4 * (i % 2)], { expr: (["pained", "nervous", "dazed"] as Expr[])[i], look: 1 });
      break;
    case 3:
      for (let i = 0; i < 4; i++) put(out, cam, f, 20 + i, FOLK[(i * 3) % 10], `f${(i * 3) % 10}`, [-8 + i * 5.5, WALK_Y, -13.4 - 0.6 * (i % 2)], { expr: "neutral", look: 0 });
      break;
    case 4: {
      const prom = f > F(4, 0.4);
      put(out, cam, f, 1, PULLMAN, "pull", [-2.9, WALK_Y, -14.6], { expr: prom ? "grin" : "smile", look: 1, ...(prom ? { wave: 0.5 + 0.5 * Math.sin(t * 5) } : {}) }, 1, [F(4, 0.4) / FPS]);
      if (k === 0) put(out, cam, f, 2, MANAGER, "mgr", [-1.0, WALK_Y, -14.4], { expr: "stern", look: -1 });
      break;
    }
    case 5:
      workers(out, cam, f, 8, -10, 0);
      break;
    case 6:
      if (k === 0) put(out, cam, f, 3, FOREMAN, "fore", [5.2, WALK_Y, -14.4], { expr: "whistle", look: 0 });
      else workers(out, cam, f, 8, -10, turnSwing(f));
      break;
    case 7:
      workers(out, cam, f, 12, -14, 0.5 + 0.5 * Math.sin(t * 4));
      break;
    case 8:
      [[4, 2, "smile"], [5, 2, "grin"], [6, 3, "smile_closed"], [4, 3, "smile"]].forEach(([wi, fl, ex], i) =>
        put(out, cam, f, 31 + i, guest(i + 1), `g${i + 1}`, [winX(wi as number), floorY(8, f, fl as number), HOTEL.z0 - 0.3], { expr: ex as Expr, look: 0, ...(i === 1 ? { wave: 0.5 + 0.5 * Math.sin(t * 6) } : {}) }));
      break;
    case 9:
      put(out, cam, f, 35, guest(4), "g4", [0.4, DOOR_Y + liftAt(9, f) + 0.02, HOTEL.z0 - 0.35], { expr: "nervous", look: -1 });
      put(out, cam, f, 36, FOLK[7], "f7", [-0.9, WALK_Y + 0.5, -13.3], { expr: f > F(9, 0.4) ? "shock" : "neutral", look: 1 }, 1, [F(9, 0.4) / FPS]);
      break;
    case 10:
      put(out, cam, f, 4, MECHANIC, "mech", [JACKS[0] - 1.4, 0, JACKS[2] - 1.9], { expr: "grin", look: 1, wave: 0.5 + 0.5 * Math.sin(t * 9) });
      break;
    case 11:
      workers(out, cam, f, 14, -16, 0.5 + 0.5 * Math.sin(t * 4));
      put(out, cam, f, 3, FOREMAN, "fore", [-18.5, WALK_Y, -14.6], { expr: "whistle", look: 1 });
      break;
    case 12: {
      const y = RAISE + WALK_Y;
      put(out, cam, f, 1, PULLMAN, "pull", [-2.6, y, -14.4], { expr: "grin", look: 0 });
      put(out, cam, f, 2, MANAGER, "mgr", [-0.6, y, -14.2], { expr: f > F(12, 0.45) ? "laugh" : "relief", look: -1 });
      for (let i = 0; i < 4; i++) put(out, cam, f, 40 + i, FOLK[(i * 3 + 2) % 10], `f${(i * 3 + 2) % 10}`, [-8 + i * 1.7 + (i > 1 ? 9 : 0), y, -14.8 + 0.4 * (i % 2)], { expr: f > F(12, 0.45) ? "laugh" : "smile", look: 0 });
      if (f > F(12, 0.75)) { const u = clamp01((f - F(12, 0.75)) / 12); if (u < 1) fx(out, `spark${step(u, 12)}`, 300, 300, sparkle, [winX(4), RAISE + DOOR_Y + HOTEL.fh + 2.2, HOTEL.z0 - 0.4], 0.8 * Math.sin(u * Math.PI), 0.8 * Math.sin(u * Math.PI)); }
      break;
    }
    case 13:
      put(out, cam, f, 1, PULLMAN, "pull", [-2.2, RAISE + WALK_Y, -14.6], { expr: f > F(13, 0.6) ? "grin" : "smile", look: 1 }, 1, [F(13, 0.6) / FPS]);
      break;
    case 14: {
      const at: V3 = [TRAIN[0] + 1.95, 1.02, TRAIN[2] - 1.56];
      put(out, cam, f, 50, guest(6), "g6", at, { expr: "smile_closed", blink: 1, look: 0 });
      const u = step((t * 0.6) % 1, 12);
      fx(out, `zzz${u}`, 300, 300, (p) => zzz(p, u), [at[0] + 0.6, at[1] + 2.2, at[2] - 0.1], 0.6, 0.6);
      break;
    }
  }
  return out;
};
void fxBurst;
