// Who stands where in "The Day Pepsi Got Warships", plus its 2D effects.
import { Pen, SKINS, Outfit, Expr, fxPuff, fxBurst } from "../kit/toon";
import { beginStage, put, fx, step, FOLK, CamInfo, Stage } from "../kit/cast";
import { FPS, add, clamp01 } from "../kit/timeline";
import { TL, F, SQUARE, BORDER, DOCK, BOARDRM, SCRAP, OFFICE, SHOP, PODIUM } from "./timeline";

const EXEC = (i: number): Outfit => ({ jacket: ["#1f2a3a", "#2c3e63", "#3b3f52"][i % 3], pants: "#1f1d2a", boots: "#111", hat: "hair", hair: ["#8a8d94", "#3a2a1c", "#c9a24a"][i % 3], skin: SKINS[i % 4], buttons: "#c9ccd2" });
const BOSS: Outfit = { ...EXEC(0), hair: "#c9ccd2", build: "stout" };
const ADVISER: Outfit = { jacket: "#3b3f52", pants: "#2c3140", boots: "#111", hat: "hair", hair: "#5a3b2a", skin: SKINS[1], buttons: "#c9ccd2", moustache: "#5a3b2a" };
const GUARD: Outfit = { jacket: "#5d6b3a", pants: "#4a4f38", boots: "#1f1a1c", hat: "cap", cap: "#5d6b3a", skin: SKINS[0], belt: "#3a2a22" };
const SELLER: Outfit = { jacket: "#f1efe6", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#a04a2a", skin: SKINS[1] };
const DOCKER: Outfit = { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#3a2a22", hat: "cap", cap: "#2f3440", skin: SKINS[2] };
const CAPTAIN: Outfit = { ...EXEC(1), hat: "cap", cap: "#f4f4ee" };
const SHOPKEEP: Outfit = { jacket: "#c8443a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#3a2a1c", skin: SKINS[3], moustache: "#3a2a1c", build: "stout" };
const WORKER: Outfit = { jacket: "#e2b93c", pants: "#3b3f52", boots: "#3a2a22", hat: "cap", cap: "#e2b93c", skin: SKINS[1] };
const dizzy = (p: Pen, t: number) => { for (let k = 0; k < 3; k++) { const a = t * 6.28 + (k * 6.28) / 3; p.poly([[150 + 90 * Math.cos(a), 80 + 25 * Math.sin(a)], [160 + 90 * Math.cos(a), 95 + 25 * Math.sin(a)], [145 + 90 * Math.cos(a), 100 + 25 * Math.sin(a)]], "#f6c62e", 5); } };

export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const s = TL.SHOTS[id - 1], out = beginStage(s.light, cam), k = TL.keyAt(id, f), t = f / FPS;
  switch (id) {
    case 2:
      if (k === 0) {
        put(out, cam, f, 1, SELLER, "seller", add(SQUARE, -2.5, 0, 2.6), { expr: "smile", look: 0 });
        for (let i = 0; i < 3; i++) put(out, cam, f, 10 + i, FOLK[(i * 3) % 10], `f${(i * 3) % 10}`, add(SQUARE, -5.6 + i * 1.3, 0, 2.0 - 0.6 * (i % 2)), { expr: (["smile", "grin", "smile_closed"] as Expr[])[i], look: 1 });
      } else {
        put(out, cam, f, 2, GUARD, "guard", add(BORDER, 2.0, 0, 0.6), { expr: "stern", look: -1 });
        put(out, cam, f, 3, EXEC(2), "e2", add(BORDER, -1.6, 0, -1.4), { expr: "nervous", look: 1 });
      }
      break;
    case 3:
      put(out, cam, f, 4, DOCKER, "docker", add(DOCK, -2.4, 0, 0.6), { expr: "grin", look: 1, wave: 0.5 + 0.5 * Math.sin(t * 4) });
      put(out, cam, f, 5, EXEC(1), "e1", add(DOCK, 1.6, 0, 0.4), { expr: "nervous", look: -1 });
      break;
    case 4: case 6:
      for (let i = 0; i < 3; i++) put(out, cam, f, 20 + i, EXEC(i), `e${i}`, add(BOARDRM, -1.6 + i * 1.6, 0, 1.7), { expr: id === 4 ? (["smile", "neutral", "grin"] as Expr[])[i] : (["shock", "nervous", "dazed"] as Expr[])[i], look: 0 });
      break;
    case 8: {
      put(out, cam, f, 6, CAPTAIN, "capt", add(DOCK, 0.8, 3.0 - 0.6, 32), { expr: "dazed", look: 0, tilt: 0.1 * Math.sin(t * 2) });
      const u = step((t * 0.8) % 1, 12);
      fx(out, `dizzy${u}`, 300, 200, (p) => dizzy(p, u), add(DOCK, 0.8, 5.0, 31.6), 1.0, 0.65);
      break;
    }
    case 9:
      put(out, cam, f, 7, WORKER, "worker", add(SCRAP, -2.2, 0, -1.2), { expr: "grin", look: 1 });
      if (f > F(9, 0.2) && f < F(9, 0.2) + 8) fx(out, `burst${step((f - F(9, 0.2)) / 8, 8)}`, 500, 500, (p) => fxBurst(p, step((f - F(9, 0.2)) / 8, 8), "#ffd36a"), add(SCRAP, 4, 5.4, 5.6), 1.6, 1.6);
      break;
    case 10:
      if (k === 1) { put(out, cam, f, 8, BOSS, "boss", add(OFFICE, -1.2, 0, -0.4), { expr: "grin", look: 1 }); put(out, cam, f, 9, ADVISER, "adv", add(OFFICE, 1.2, 0, -0.2), { expr: "neutral", look: -1 }); }
      break;
    case 11:
      put(out, cam, f, 8, BOSS, "boss", add(OFFICE, -1.2, 0, -0.4), { expr: "laugh", look: 1, wave: 0.5 + 0.5 * Math.sin(t * 5) });
      put(out, cam, f, 9, ADVISER, "adv", add(OFFICE, 1.2, 0, -0.2), { expr: f > F(11, 0.6) ? "shock" : "neutral", look: -1 }, 1, [F(11, 0.6) / FPS]);
      break;
    case 12:
      put(out, cam, f, 10, SHOPKEEP, "shop", add(SHOP, 0, 0, 1.2), { expr: "smile", look: 0 });
      put(out, cam, f, 11, EXEC(0), "e0", add(SHOP, -1.6, 0, -1.4), { expr: "neutral", look: 1 });
      break;
    case 13:
      put(out, cam, f, 10, SHOPKEEP, "shop", add(SHOP, 0, 0, 1.2), { expr: "grin", look: 0 });
      break;
    case 14: {
      put(out, cam, f, 10, SHOPKEEP, "shop", add(SHOP, -1.8, 0, 1.2), { expr: "grin", look: 1 });
      put(out, cam, f, 11, EXEC(0), "e0", add(SHOP, -3.6, 0, -1.6), { expr: "shock", look: 1 });
      const u = clamp01((f - F(14)) / 20);
      if (u < 1) fx(out, `puff${step(u, 12)}`, 300, 300, (p) => fxPuff(p, step(u, 12)), add(SHOP, 1.5, 1.5, 0.5), 3 + 2 * u, 3 + 2 * u, { soft: true });
      break;
    }
    case 15:
      for (let i = 0; i < 6; i++) put(out, cam, f, 30 + i, FOLK[(i * 3 + 1) % 10], `f${(i * 3 + 1) % 10}`, add(PODIUM, -4.2 + i * 1.7 + (i > 2 ? 1.6 : 0), 0, -1.6 - 0.4 * (i % 2)), { expr: "laugh", look: i < 3 ? 1 : -1, wave: 0.5 + 0.5 * Math.sin(t * 6 + i) });
      break;
  }
  return out;
};
