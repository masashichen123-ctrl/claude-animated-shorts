// Who stands where in "The Morning Sweden Switched Sides", plus its 2D effects.
import { Pen, SKINS, Outfit, Expr } from "../kit/toon";
import { beginStage, put, fx, FOLK, CamInfo, Stage } from "../kit/cast";
import { FPS, add } from "../kit/timeline";
import { TL, F, TOWN, BORDER, OFFICE, ICE, LANE } from "./timeline";
import { carPose } from "./set";
import { text } from "../kit/props";

const POLICE: Outfit = { jacket: "#2c3e63", pants: "#2a2f3d", boots: "#111", hat: "cap", cap: "#2c3e63", skin: SKINS[0], buttons: "#e8c45a", belt: "#f1efe6" };
const AGENT: Outfit = { jacket: "#3b3f52", pants: "#2c3140", boots: "#111", hat: "hair", hair: "#c9a24a", skin: SKINS[0], buttons: "#c9ccd2" };
const DOOM: Outfit = { jacket: "#6e5a3a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#8a8d94", moustache: "#8a8d94", skin: SKINS[1], build: "stout" };
const chaos = (p: Pen) => { const g = p.g; g.fillStyle = "#f8f6ee"; g.fillRect(10, 10, 380, 230); g.strokeStyle = "#1c1a22"; g.lineWidth = 14; g.strokeRect(10, 10, 380, 230); text(g, "CHAOS!", 200, 130, 96, "#d02a2a"); p.stroke([[200, 240], [200, 400]], 14, "#8a5a3c"); };
const lPlate = (p: Pen) => { const g = p.g; g.fillStyle = "#ffffff"; g.fillRect(8, 8, 184, 184); g.strokeStyle = "#1c1a22"; g.lineWidth = 8; g.strokeRect(8, 8, 184, 184); text(g, "L", 100, 106, 150, "#d02a2a"); };

export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const s = TL.SHOTS[id - 1], out = beginStage(s.light, cam), k = TL.keyAt(id, f), t = f / FPS;
  switch (id) {
    case 2:
      put(out, cam, f, 1, FOLK[5], "f5", add(BORDER, -1.0, 0, -LANE - 1.6), { expr: "shock", look: 1 });
      put(out, cam, f, 2, FOLK[1], "f1", add(BORDER, 1.4, 0, -LANE - 1.6), { expr: "stern", look: -1 });
      break;
    case 3: case 10: {
      const p = carPose(0, id, f), seat = id === 3 ? -LANE - 0.4 : LANE - 0.4;
      put(out, cam, f, 3, FOLK[2], "f2", [p.x + 0.1, 0.25, seat], { mode: "sit", expr: id === 3 ? "nervous" : "nervous", look: id === 3 ? 1 : 0 }, 0.9);
      break;
    }
    case 4:
      if (k === 0) put(out, cam, f, 4, POLICE, "police", add(TOWN, 1.2, 0, -1.2), { expr: "stern", look: 0 });
      break;
    case 5:
      if (k === 0) put(out, cam, f, 5, FOLK[8], "f8", add(TOWN, -0.4, 0, -9.6), { expr: "nervous", look: -1 });
      break;
    case 6:
      for (let i = 0; i < 5; i++) put(out, cam, f, 10 + i, FOLK[(i * 3) % 10], `f${(i * 3) % 10}`, add(TOWN, -2.6 + i * 1.3, 0.1, -6.2 + 0.4 * (i % 2)), { expr: (["nervous", "shock", "nervous", "pained", "shock"] as Expr[])[i], look: 0 });
      break;
    case 7:
      for (let i = 0; i < 5; i++) put(out, cam, f, 10 + i, FOLK[(i * 3) % 10], `f${(i * 3) % 10}`, add(TOWN, -6 + i * 1.5, 0.1, -6.6 + 0.4 * (i % 2)), { expr: (["relief", "laugh", "relief_open", "grin", "laugh"] as Expr[])[i], look: 0, wave: 0.5 + 0.5 * Math.sin(t * 5 + i) });
      break;
    case 8:
      put(out, cam, f, 6, DOOM, "doom", add(TOWN, 7.8, 0.1, -6.1), { expr: "pained", look: 1 });
      fx(out, "chaos", 400, 420, chaos, add(TOWN, 7.1, 1.35, -6.3), 1.0, 1.05);
      break;
    case 9:
      put(out, cam, f, 7, AGENT, "agent", add(OFFICE, 1.6, 0, 0.9), { expr: "grin", look: -1 });
      break;
    case 11:
      for (let i = 0; i < 8; i++) { const p = carPose(i, 11, f); fx(out, "lplate", 200, 200, lPlate, [p.x - p.dir * 2.35, 0.75, p.z], 0.45, 0.45); }
      break;
    case 12:
      for (let i = 0; i < 3; i++) put(out, cam, f, 20 + i, FOLK[(i * 4 + 2) % 10], `f${(i * 4 + 2) % 10}`, add(ICE, -4 + i * 1.6, 0, -6.2), { expr: "grin", look: 0, wave: 0.5 + 0.5 * Math.sin(t * 5 + i) });
      break;
  }
  return out;
};
