// Who stands where in "The Leaning Tower Is Also Bent", plus its 2D effects.
import { Pen, SKINS, Outfit, Expr } from "../kit/toon";
import { beginStage, put, walker, fx, step, FOLK, CamInfo, Stage } from "../kit/cast";
import { FPS, add } from "../kit/timeline";
import { TL, F, TOWER, TABLE } from "./timeline";

const MASON = (i: number, old = false): Outfit => ({ jacket: ["#a8724a", "#6e5a3a", "#8a5a3c"][i % 3], pants: "#4a4038", boots: "#3a2a22", hat: "cap", cap: ["#c8443a", "#3f6fb5", "#e2b93c"][i % 3], skin: SKINS[i % 4], moustache: old ? "#f4f4ee" : i % 2 ? "#3a2a1c" : undefined });
const SOLDIER = (i: number): Outfit => ({ jacket: i % 2 ? "#c8202a" : "#2f5f9a", pants: "#3b3f52", boots: "#2a2228", hat: "cap", cap: "#9aa0aa", skin: SKINS[i % 4], belt: "#5a4a2a" });
const SCHOLAR: Outfit = { jacket: "#7b4a8c", pants: "#3b3f52", boots: "#2a2228", hat: "hair", hair: "#8a8d94", skin: SKINS[1] };
const banner = (c: string) => (p: Pen) => { p.stroke([[40, 20], [40, 480]], 12, "#6e4b33"); p.poly([[46, 30], [260, 30], [260, 200], [150, 160], [46, 200]], c, 8); p.poly([[130, 60], [160, 60], [160, 170], [130, 170]], "#ffffff", 0); p.poly([[100, 100], [190, 100], [190, 130], [100, 130]], "#ffffff", 0); };

export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const s = TL.SHOTS[id - 1], out = beginStage(s.light, cam), t = f / FPS, k = TL.keyAt(id, f);
  switch (id) {
    case 2: case 7:
      for (let i = 0; i < 4; i++) put(out, cam, f, 10 + i, MASON(i), `m${i}`, add(TOWER, -12 + i * 2.2, 0, -11 - 1.0 * (i % 2)), { expr: (["grin", "smile", "neutral", "grin"] as Expr[])[i], look: 1, wave: i % 2 ? 0.5 + 0.5 * Math.sin(t * 4 + i) : undefined });
      break;
    case 3:
      for (let i = 0; i < 3; i++) put(out, cam, f, 10 + i, MASON(i), `m${i}`, add(TOWER, -10 + i * 2.4, 0, -12 - 0.6 * (i % 2)), { expr: f > F(3, 0.4) ? "shock" : "smile", look: 1 }, 1, [F(3, 0.4) / FPS]);
      break;
    case 4:
      for (let i = 0; i < 6; i++) {
        const x = -30 + 1.6 * ((t - F(4) / FPS) * 2.2) + i * 2.2, at: [number, number, number] = [TOWER[0] + x, 0, TOWER[2] - 14 - 1.2 * (i % 2)];
        walker(out, cam, f, 20 + i, SOLDIER(i), `sol${i % 2}${i % 4}`, at, 1, 0);
        if (i % 3 === 0) fx(out, `banner${i % 2}`, 300, 500, banner(i % 2 ? "#c8202a" : "#2f5f9a"), add(at, 0.3, 1.9, -0.05), 0.9, 1.5);
      }
      break;
    case 5:
      put(out, cam, f, 14, MASON(1, true), "m1old", add(TOWER, -1.5, 0, -8.6), { mode: "sit", expr: "smile_closed", blink: 1, look: 0 });
      fx(out, `zzz${step((t * 0.6) % 1, 10)}`, 300, 300, (p) => { const u = step((t * 0.6) % 1, 10); for (let q = 0; q < 3; q++) { const x = 60 + q * 70, y = 230 - q * 80 - 30 * u, w = 26 + q * 10; p.stroke([[x, y], [x + w, y], [x, y + w], [x + w, y + w]], 9); } }, add(TOWER, -0.9, 1.6, -8.7), 0.7, 0.7);
      break;
    case 6:
      for (let i = 0; i < 3; i++) put(out, cam, f, 10 + i, MASON(i, true), `m${i}old`, add(TOWER, -4 + i * 1.6, 0, -13.4 - 0.5 * (i % 2)), { expr: (["pained", "nervous", "dazed"] as Expr[])[i], look: 1 });
      break;
    case 8:
      put(out, cam, f, 15, SCHOLAR, "scholar", add(TABLE, -0.85, 0, 0.55), { expr: f > F(8, 0.6) ? "grin" : "smile", look: 1, wave: f > F(8, 0.3) && f < F(8, 0.5) ? 1 : 0.2 }, 0.8);
      break;
    case 9:
      for (let i = 0; i < 3; i++) put(out, cam, f, 10 + i, MASON(i), `m${i}`, add(TOWER, -6 + i * 1.8, 0, -13 - 0.5 * (i % 2)), { expr: "shock", look: 1 });
      break;
    case 11:
      put(out, cam, f, 16, MASON(2, true), "m2old", add(TOWER, -4.2, 0, -14), { expr: f > F(11, 0.5) ? "relief_open" : "smile", look: 1 }, 1, [F(11, 0.5) / FPS]);
      break;
    case 12:
      if (k === 0) {
        put(out, cam, f, 30, FOLK[4], "f4", add(TOWER, -3.5, 0, -30), { expr: "grin", look: 1, wave: 1 });
        put(out, cam, f, 31, FOLK[7], "f7", add(TOWER, -2.0, 0, -29.6), { expr: "laugh", look: 1, wave: 1 });
      } else for (let i = 0; i < 4; i++) put(out, cam, f, 30 + i, FOLK[(i * 3 + 4) % 10], `f${(i * 3 + 4) % 10}`, add(TOWER, -6 + i * 1.5, 0, -30 + 0.5 * (i % 2)), { expr: "laugh", look: 1, wave: 1 });
      break;
  }
  return out;
};
