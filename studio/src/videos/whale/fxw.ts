// 2D drawings for the whale short: gulls, stink lines, the blast cloud, blubber splats and the painted signs.
import { Pen, INK } from "./toon";

type P2 = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;

/** flying gull on a 400 x 260 canvas, seen from the front/behind; wing = -1 (down) .. 1 (up) */
export const fxGull = (p: Pen, wing: number) => {
  const cx = 200, cy = 140, tip = -70 * wing;
  for (const s of [-1, 1]) {
    const pts: P2[] = [[cx + s * 18, cy - 6], [cx + s * 80, cy - 26 + tip * 0.45], [cx + s * 170, cy + tip], [cx + s * 150, cy + 18 + tip * 0.9], [cx + s * 78, cy + 8 + tip * 0.35], [cx + s * 20, cy + 16]];
    p.poly(pts, "#f4f2ec", 9);
    p.poly([[cx + s * 150, cy + 18 + tip * 0.9], [cx + s * 170, cy + tip], [cx + s * 186, cy + 6 + tip * 1.05]], "#3a3d47", 7);
  }
  p.ell(cx, cy + 4, 34, 26, "#ffffff", 9);
  p.poly([[cx - 8, cy + 14], [cx, cy + 34], [cx + 8, cy + 14]], "#f2a51c", 6);
  p.dot(cx - 11, cy - 2, 5, INK); p.dot(cx + 11, cy - 2, 5, INK);
};

/** perched gull on a 240 x 260 canvas facing screen right (mirror the card for left); expr 0 calm, 1 hungry, 2 alarmed */
export const fxGullSit = (p: Pen, expr: number) => {
  p.stroke([[104, 214], [100, 250]], 7, "#f2a51c"); p.stroke([[132, 214], [136, 250]], 7, "#f2a51c");
  p.poly([[40, 170], [18, 150], [60, 140], [96, 120], [150, 118], [180, 150], [176, 196], [140, 220], [86, 218], [52, 200]], "#ffffff", 10);
  p.poly([[40, 170], [18, 150], [60, 140], [112, 150], [150, 176], [110, 196], [60, 190]], "#b9bfc9", 8);
  p.ell(160, 96, 46, 44, "#ffffff", 10);
  p.poly([[196, 88], [238, expr === 2 ? 84 : 98], [198, 112]], "#f2a51c", 7);
  if (expr === 1) { p.stroke([[204, 116], [212, 138]], 5, "#7fd0f0"); }
  if (expr === 2) { p.ell(168, 86, 13, 13, "#ffffff", 5); p.dot(170, 86, 5, INK); }
  else { p.dot(170, 88, 7, INK); if (expr === 1) p.stroke([[154, 74], [184, 80]], 6); }
};

/** wavy stink lines on a 300 x 500 canvas; t = phase 0..1 */
export const fxStink = (p: Pen, t: number) => {
  for (let k = 0; k < 3; k++) {
    const x0 = 70 + k * 80, pts: P2[] = [];
    for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([x0 + 26 * Math.sin(u * 7 + t * 6.283 + k * 2), 470 - u * 420]); }
    p.stroke(pts, 22, INK); p.stroke(pts, 12, "#9fca4e");
  }
};

/** the blast: a lumpy red-pink cloud with sand and ink outline on a 900 x 900 canvas; t = 0..1 (growth of the lumps) */
export const fxBlast = (p: Pen, t: number) => {
  const c = 450, lumps: [number, number, number, string][] = [];
  const N = 15;
  for (let i = 0; i < N; i++) {
    const a = rad((i * 360) / N + 11 * (i % 3)), d = 150 + 170 * t * (0.75 + 0.25 * ((i * 7) % 5) / 4);
    lumps.push([c + d * Math.cos(a), c + 40 + d * 0.92 * Math.sin(a), 105 + 30 * ((i * 3) % 4) / 3, i % 3 === 0 ? "#b3283c" : i % 3 === 1 ? "#d9455a" : "#e8768a"]);
  }
  // sand skirt
  for (let i = 0; i < 7; i++) p.ell(140 + i * 104, 770 - 26 * Math.sin(i * 1.9), 90, 70, "#e6cf96", 12);
  for (const [x, y, r] of lumps) p.ell(x, y, r + 12, r + 12, INK, 0);
  p.ell(c, c + 30, 250 + 60 * t, 240 + 50 * t, INK, 0);
  for (const [x, y, r, col] of lumps) p.ell(x, y, r, r, col, 0);
  p.ell(c, c + 30, 240 + 60 * t, 230 + 50 * t, "#d9455a", 0);
  p.ell(c - 30, c - 10, 150 + 40 * t, 140 + 30 * t, "#f08a9b", 0);
  p.ell(c - 60, c - 50, 70 + 20 * t, 60 + 15 * t, "#ffc2cb", 0);
};

/** blubber splat on a 300 x 300 canvas */
export const fxSplat = (p: Pen, seed: number) => {
  const pts: P2[] = [];
  for (let i = 0; i < 28; i++) { const a = rad(i * (360 / 28)), r = 78 + 34 * Math.sin(i * 2.3 + seed) + (i % 4 === 0 ? 30 : 0); pts.push([150 + r * Math.cos(a), 150 + r * 0.8 * Math.sin(a)]); }
  p.poly(pts, "#e0637a", 11);
  p.ell(128, 128, 30, 20, "#f5a3b2", 0);
  p.poly([[110, 205], [102, 262], [122, 274], [134, 210]], "#e0637a", 9);
  p.poly([[176, 205], [172, 240], [188, 246], [194, 208]], "#e0637a", 9);
};

/** grey smoke wisp on a 300 x 300 canvas; t in 0..1 */
export const fxSmoke = (p: Pen, t: number) => {
  for (let i = 0; i < 4; i++) {
    const r = 46 + 16 * (i % 2) + 20 * t;
    p.ell(150 + 50 * Math.sin(i * 2.1 + t * 3), 230 - i * 52, r, r * 0.85, "#8d8a94", 9);
  }
};

const text = (g: CanvasRenderingContext2D, s: string, x: number, y: number, px: number, fill: string, stroke?: string, lw = 0) => {
  g.font = `900 ${px}px "Arial Black", "DejaVu Sans", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  if (stroke) { g.lineJoin = "round"; g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(s, x, y); }
  g.fillStyle = fill; g.fillText(s, x, y);
};

/** dynamite crate face, 512 x 340 */
export const paintCrate = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#c98f4e"; g.fillRect(0, 0, 512, 340);
  g.strokeStyle = "#8a5a2e"; g.lineWidth = 8;
  for (const y of [86, 170, 254]) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.strokeStyle = "#2b1c1c"; g.lineWidth = 22; g.strokeRect(11, 11, 490, 318);
  text(g, "DYNAMITE", 256, 150, 78, "#b3202a", "#2b1c1c", 10);
  g.fillStyle = "#2b1c1c";
  g.beginPath(); g.arc(256, 250, 34, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#f6c62e"; g.beginPath();
  for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, r = i % 2 ? 14 : 30; g.lineTo(256 + r * Math.cos(a), 250 + r * Math.sin(a)); }
  g.closePath(); g.fill();
};

/** speed-limit road sign, 400 x 500 */
export const paintRoadSign = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#f7f5ee"; g.fillRect(0, 0, 400, 500);
  g.strokeStyle = "#1c1a22"; g.lineWidth = 20; g.strokeRect(22, 22, 356, 456);
  text(g, "SPEED", 200, 110, 78, "#1c1a22"); text(g, "LIMIT", 200, 190, 78, "#1c1a22"); text(g, "25", 200, 350, 210, "#1c1a22");
};

/** highway department door badge, 256 x 256 */
export const paintBadge = (g: CanvasRenderingContext2D) => {
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = "#f7f5ee"; g.strokeStyle = "#1c1a22"; g.lineWidth = 12;
  g.beginPath(); g.moveTo(40, 30); g.lineTo(216, 30); g.lineTo(226, 120); g.quadraticCurveTo(210, 210, 128, 236); g.quadraticCurveTo(46, 210, 30, 120); g.closePath(); g.fill(); g.stroke();
  text(g, "HWY", 128, 90, 56, "#1c1a22"); text(g, "DEPT", 128, 152, 50, "#1c1a22");
};

/** the dealer's banner, 1680 x 340: "GET A WHALE OF A DEAL!" with a little whale */
export const paintBanner = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#f6c62e"; g.fillRect(0, 0, 1680, 340);
  g.fillStyle = "#e23b3b";
  for (let i = 0; i < 28; i++) { g.beginPath(); g.moveTo(i * 60, 0); g.lineTo(i * 60 + 30, 34); g.lineTo(i * 60 + 60, 0); g.fill(); g.beginPath(); g.moveTo(i * 60, 340); g.lineTo(i * 60 + 30, 306); g.lineTo(i * 60 + 60, 340); g.fill(); }
  g.strokeStyle = "#1c1a22"; g.lineWidth = 16; g.strokeRect(8, 8, 1664, 324);
  text(g, "GET A WHALE OF A DEAL!", 760, 176, 112, "#ffffff", "#1c1a22", 26);
  text(g, "GET A WHALE OF A DEAL!", 760, 176, 112, "#e23b3b");
  // whale
  const x = 1520, y = 176;
  g.fillStyle = "#4f86c6"; g.strokeStyle = "#1c1a22"; g.lineWidth = 12;
  g.beginPath(); g.moveTo(x - 120, y + 10); g.quadraticCurveTo(x - 110, y - 80, x, y - 76); g.quadraticCurveTo(x + 96, y - 70, x + 100, y + 6); g.quadraticCurveTo(x + 90, y + 66, x - 10, y + 62);
  g.quadraticCurveTo(x - 80, y + 60, x - 120, y + 10); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x - 112, y + 6); g.lineTo(x - 150, y - 50); g.lineTo(x - 128, y - 10); g.lineTo(x - 156, y + 34); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#1c1a22"; g.beginPath(); g.arc(x + 56, y - 14, 9, 0, Math.PI * 2); g.fill();
  g.lineWidth = 9; g.beginPath(); g.arc(x + 44, y + 18, 34, 0.2, 1.4); g.stroke();
  g.strokeStyle = "#7fd0f0"; g.lineWidth = 10; g.beginPath(); g.moveTo(x - 10, y - 84); g.quadraticCurveTo(x - 30, y - 130, x - 54, y - 112); g.moveTo(x - 10, y - 84); g.quadraticCurveTo(x + 10, y - 132, x + 36, y - 112); g.stroke();
};

/** price sticker for the windscreen, 256 x 160 */
export const paintSticker = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 160); g.strokeStyle = "#1c1a22"; g.lineWidth = 12; g.strokeRect(6, 6, 244, 148);
  text(g, "NEW!", 128, 84, 88, "#e23b3b", "#1c1a22", 8);
};

/** speckled sand, 512 x 512 */
export const paintSand = (g: CanvasRenderingContext2D, r: () => number) => {
  g.fillStyle = "#ecd9a8"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(196,170,112,0.5)" : "rgba(255,246,214,0.6)"; const s = 1 + r() * 2.2; g.fillRect(r() * 512, r() * 512, s, s); }
  g.strokeStyle = "rgba(190,160,100,0.35)"; g.lineWidth = 3;
  for (let i = 0; i < 9; i++) { const y = r() * 512, x = r() * 512; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 40, y - 8, x + 90, y + 2); g.stroke(); }
};
