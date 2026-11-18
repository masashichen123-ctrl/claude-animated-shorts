// Hand-painted look textures drawn on canvases (cached). Bridge-template painters (grass, stone, planks, water marks,
// clouds, roof tiles, facades, bricks) plus the missile short's own set (bottom of the file, "MISSILE SHORT"): the
// Regulus skin, sub hull + deck slats, asphalt, concrete, sand, clapboard siding, floor tiles, parquet, plaster,
// panelled wood, pigeon-hole slots, posters, the 1959 plaque, burlap sacks, the mail truck livery, corrugated hangar
// metal, palm bark, podium bunting, marble and waterline foam. Owner: sets (with build.ts).
import * as THREE from "three";

export const rng = (seed: number) => {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
};
const cache = new Map<string, THREE.CanvasTexture>();
export const ctex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void) => {
  let t = cache.get(key);
  if (!t) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    draw(cv.getContext("2d")!, rng(key.length * 131 + key.charCodeAt(0)));
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    cache.set(key, t);
  }
  return t;
};
/** clone with its own repeat */
export const rep = (t: THREE.Texture, x: number, y: number) => {
  const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c;
};
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length) % a.length];
const INKL = "rgba(40,30,40,0.85)";
const _jc = new THREE.Color(), _hsl = { h: 0, s: 0, l: 0 };
/** per-tile colour jitter in sRGB HSL: lightness x(1 +- dv), hue +- dh degrees, saturation x(1 +- ds) -> css hex.
 *  (MAT pass: reviewer saw tiled brick / cobbles / blocks; about +-10 % per tile breaks the repetition) */
export const jit = (r: () => number, hex: string, dv = 0.1, dh = 5, ds = 0.15) => {
  _jc.set(hex).getHSL(_hsl);
  const k = (a: number) => 1 + (r() * 2 - 1) * a;
  _jc.setHSL((_hsl.h + ((r() * 2 - 1) * dh) / 360 + 1) % 1, Math.min(1, _hsl.s * k(ds)), Math.min(0.97, _hsl.l * k(dv)));
  return "#" + _jc.getHexString();
};

export const grass = () => ctex("grass", 512, 512, (g, r) => {
  g.fillStyle = "#79b950"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) { g.fillStyle = pick(r, ["rgba(96,160,60,.35)", "rgba(140,205,95,.3)"]); g.beginPath(); g.ellipse(r() * 512, r() * 512, 30 + r() * 60, 18 + r() * 30, r() * 3, 0, 7); g.fill(); }
  g.lineCap = "round";
  for (let i = 0; i < 2600; i++) {
    const x = r() * 512, y = r() * 512, l = 5 + r() * 8;
    g.strokeStyle = pick(r, ["#5f9c3d", "#8fcc5f", "#6aa844", "#9ad46a"]); g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - l); g.stroke();
  }
  for (let i = 0; i < 30; i++) { g.fillStyle = pick(r, ["#fff7d0", "#ffe066", "#ffb3c8"]); g.beginPath(); g.arc(r() * 512, r() * 512, 3, 0, 7); g.fill(); }
});

export const cobble = () => ctex("cobble", 512, 512, (g, r) => {
  g.fillStyle = "#8f7b5c"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const cx = x * 32 + 16 + (y % 2) * 16 + (r() - 0.5) * 6, cy = y * 32 + 16 + (r() - 0.5) * 6;
    g.fillStyle = pick(r, ["#cbb68f", "#bfa982", "#d6c39c", "#b49f79"]);
    g.strokeStyle = "rgba(70,55,40,.8)"; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(cx % 512, cy, 13 + r() * 2, 12 + r() * 2, r(), 0, 7); g.fill(); g.stroke();
    g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.ellipse((cx % 512) - 4, cy - 4, 5, 3, 0, 0, 7); g.fill();
  }
});

export const stone = (key = "stone", cols = ["#cbbfa6", "#bdb197", "#d4c8ae", "#b3a88f"]) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = "#5d5446"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 8; row++) {
    let x = row % 2 ? -60 : 0;
    while (x < 512) {
      const w = 90 + r() * 70;
      g.fillStyle = pick(r, cols);
      g.fillRect(x + 3, row * 64 + 3, w - 6, 58);
      g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x + 3, row * 64 + 3, w - 6, 8);
      g.fillStyle = "rgba(0,0,0,.08)"; for (let k = 0; k < 6; k++) g.fillRect(x + 6 + r() * (w - 16), row * 64 + 10 + r() * 44, 4, 3);
      x += w;
    }
  }
});

export const planks = () => ctex("planks", 512, 512, (g, r) => {
  for (let i = 0; i < 16; i++) {
    g.fillStyle = pick(r, ["#c68a52", "#b97c46", "#d39a5f", "#bf8550"]);
    g.fillRect(0, i * 32, 512, 32);
    g.strokeStyle = "rgba(120,70,35,.35)"; g.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) { const y = i * 32 + 6 + r() * 20; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + 4, 340, y - 4, 512, y + (r() - 0.5) * 4); g.stroke(); }
    g.fillStyle = "#4a2f1c"; g.fillRect(0, i * 32, 512, 3);
    const cut = r() * 512; g.fillRect(cut, i * 32, 3, 32);
    g.fillStyle = "#3b2618"; for (const x of [20, 492]) { g.beginPath(); g.arc(x, i * 32 + 16, 2.5, 0, 7); g.fill(); }
  }
});

export const beam = () => ctex("beam", 256, 256, (g, r) => {
  g.fillStyle = "#a8743f"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(85,48,20,.16)"; g.lineWidth = 2.5;
  for (let i = 0; i < 22; i++) { const y = r() * 256; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(90, y + 5, 170, y - 5, 256, y); g.stroke(); }
});

export const water = () => ctex("water", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#3d92da"); gr.addColorStop(0.5, "#3487d0"); gr.addColorStop(1, "#3d92da");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.lineCap = "round";
  for (let i = 0; i < 90; i++) {
    const x = r() * 512, y = r() * 512, l = 30 + r() * 70;
    g.strokeStyle = pick(r, ["rgba(140,205,245,.55)", "rgba(110,185,240,.5)", "rgba(220,245,255,.55)"]); g.lineWidth = 3 + r() * 3;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 6, x + l, y); g.stroke();
  }
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(255,255,255,.8)"; g.fillRect(r() * 512, r() * 512, 6 + r() * 8, 2); }
});

export const bed = () => ctex("bed", 512, 512, (g, r) => {
  g.fillStyle = "#a88f62"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { g.fillStyle = pick(r, ["#8f7a52", "#bca37a", "#9c8a66", "#7d6c4c"]); g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 9, 3 + r() * 6, r() * 3, 0, 7); g.fill(); }
});

export const roof = (col: string) => ctex("roof" + col, 512, 512, (g, r) => {
  g.fillStyle = "#3b2a2a"; g.fillRect(0, 0, 512, 512);
  const base = new THREE.Color(col);
  for (let row = 0; row < 16; row++) for (let i = -1; i < 9; i++) {
    const x = i * 64 + (row % 2) * 32, y = row * 32, c = base.clone().offsetHSL(0, 0, (r() - 0.5) * 0.08);
    g.fillStyle = `#${c.getHexString()}`; g.strokeStyle = INKL; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x + 62, y); g.lineTo(x + 62, y + 22); g.quadraticCurveTo(x + 32, y + 36, x + 2, y + 22); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x + 6, y + 3, 50, 5);
  }
});

/** MAT round 3: brick colour with strong per-brick value variation (lightness +-24 %), plus ~1 in 8 dark clinker
 *  and ~1 in 10 pale, sun-bleached bricks, so a wall reads as hand-laid bricks rather than a flat red print */
const brickCol = (r: () => number) => {
  const c = jit(r, pick(r, ["#c0583a", "#b44f35", "#c8643f", "#a94a33", "#cf6e45", "#b9603f"]), 0.24, 6, 0.15), u = r();
  return u < 0.12 ? dim(c, 0.68) : u > 0.9 ? dim(c, 1.22) : c;
};
/** scale the HSL lightness of a hex colour */
const dim = (hex: string, k: number) => {
  _jc.set(hex).getHSL(_hsl);
  _jc.setHSL(_hsl.h, _hsl.s, Math.min(0.92, _hsl.l * k));
  return "#" + _jc.getHexString();
};
export const brick = () => ctex("brick", 512, 512, (g, r) => {
  g.fillStyle = "#e6d3b3"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) for (let i = 0; i < 8; i++) {
    const c = brickCol(r);
    const x = i * 64 + (row % 2) * 32 + 2, y = row * 32 + 2;
    for (const ox of [0, -512]) { // seamless in x
      g.fillStyle = c; g.fillRect(x + ox, y, 60, 28);
      g.fillStyle = "rgba(255,235,210,0.16)"; g.fillRect(x + ox + 2, y, 56, 3); // light top lip
      g.fillStyle = "rgba(70,30,20,0.14)"; g.fillRect(x + ox + 2, y + 25, 56, 3);
    }
  }
  for (let i = 0; i < 9; i++) { // sparse soot / weathering blotches
    const x = r() * 512, y = r() * 512, rad = 30 + r() * 70;
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
      g.save(); g.translate(x + ox, y + oy); g.scale(1.3, 1);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
      gr.addColorStop(0, "rgba(70,45,35,0.13)"); gr.addColorStop(1, "rgba(70,45,35,0)");
      g.fillStyle = gr; g.fillRect(-rad, -rad, 2 * rad, 2 * rad); g.restore();
    }
  }
});

export const chainTex = () => ctex("chain", 128, 512, (g) => {
  g.fillStyle = "#2c2f36"; g.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 8; i++) {
    g.strokeStyle = "#565c66"; g.lineWidth = 14;
    g.beginPath(); g.ellipse(64, i * 64 + 32, 34, 26, 0, 0, 7); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.22)"; g.lineWidth = 4;
    g.beginPath(); g.ellipse(64, i * 64 + 32, 34, 26, 0, 3.6, 5.4); g.stroke();
  }
});

/** plaster/brick facade, w x h metres at 48 px/m: floors of shuttered windows, optional door + timber frame */
export const facade = (key: string, wm: number, hm: number, o: { wall: string; shutter: string; door?: boolean; timber?: boolean; brick?: boolean }) =>
  ctex("fac" + key, Math.round(wm * 48), Math.round(hm * 48), (g, r) => {
    const W = Math.round(wm * 48), H = Math.round(hm * 48);
    if (o.brick) { g.fillStyle = g.createPattern(brick().image as HTMLCanvasElement, "repeat")!; g.fillRect(0, 0, W, H); }
    else {
      g.fillStyle = o.wall; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},.05)`; g.beginPath(); g.ellipse(r() * W, r() * H, 20 + r() * 40, 10 + r() * 20, 0, 0, 7); g.fill(); }
    }
    const floors = Math.max(1, Math.floor(hm / 2.8));
    if (o.timber) {
      g.fillStyle = "#5b3a24";
      g.fillRect(0, 0, 10, H); g.fillRect(W - 10, 0, 10, H); g.fillRect(0, 0, W, 10);
      for (let fl = 1; fl < floors; fl++) g.fillRect(0, H - fl * 2.8 * 48 - 5, W, 10);
    }
    g.fillStyle = "rgba(60,45,40,.35)"; g.fillRect(0, H - 22, W, 22);
    const nWin = Math.max(1, Math.floor(wm / 2.2));
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < nWin; i++) {
      const cx = ((i + 0.5) * W) / nWin, by = H - fl * 2.8 * 48 - 0.9 * 48;
      if (o.door && fl === 0 && i === Math.floor(nWin / 2)) {
        const dw = 1.1 * 48, dh = 2.1 * 48;
        g.fillStyle = "#7a4a2c"; g.strokeStyle = INKL; g.lineWidth = 3;
        g.beginPath(); g.moveTo(cx - dw / 2, H); g.lineTo(cx - dw / 2, H - dh + dw / 2); g.arc(cx, H - dh + dw / 2, dw / 2, Math.PI, 0); g.lineTo(cx + dw / 2, H); g.fill(); g.stroke();
        g.fillStyle = "#e8c45a"; g.beginPath(); g.arc(cx + dw / 3, H - dh / 2, 3.5, 0, 7); g.fill();
        continue;
      }
      const ww = 0.9 * 48, wh = 1.3 * 48, x0 = cx - ww / 2, y0 = by - wh;
      g.fillStyle = o.shutter; g.strokeStyle = INKL; g.lineWidth = 2.5;
      for (const sx of [x0 - ww / 2 - 2, x0 + ww + 2]) { g.fillRect(sx, y0, ww / 2, wh); g.strokeRect(sx, y0, ww / 2, wh); }
      g.fillStyle = "#f4efe2"; g.fillRect(x0 - 4, y0 - 4, ww + 8, wh + 8);
      const gg = g.createLinearGradient(x0, y0, x0 + ww, y0 + wh); gg.addColorStop(0, "#8fd0f5"); gg.addColorStop(1, "#3f7fc0");
      g.fillStyle = gg; g.fillRect(x0, y0, ww, wh);
      g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.moveTo(x0 + 6, y0 + wh * 0.55); g.lineTo(x0 + ww * 0.55, y0 + 6); g.lineTo(x0 + ww * 0.75, y0 + 6); g.lineTo(x0 + 6, y0 + wh * 0.8); g.fill();
      g.fillStyle = "#f4efe2"; g.fillRect(cx - 2, y0, 4, wh); g.fillRect(x0, y0 + wh / 2 - 2, ww, 4);
      g.strokeRect(x0 - 4, y0 - 4, ww + 8, wh + 8);
      g.fillStyle = "#e6dccb"; g.fillRect(x0 - 8, by, ww + 16, 7); g.strokeRect(x0 - 8, by, ww + 16, 7);
    }
  });

// ---------------- HD painters (textures.md 5.1, from compare/textures/proto/paint_recipe.ts) ----------------
type R = () => number;
type G = CanvasRenderingContext2D;
const U = (r: R, a: number, b: number) => a + (b - a) * r();
const TAU = Math.PI * 2;

/** run fn at x and again one tile over when [x, x + w] crosses the left / right edge (seamless repeat in x) */
const wrapX = (W: number, x: number, w: number, fn: (x: number) => void) => {
  fn(x);
  if (x + w > W) fn(x - W);
  if (x < 0) fn(x + W);
};
/** same for a scattered mark of radius rad, in x and y */
const wrap2 = (W: number, H: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  for (const ox of [0, -W, W]) for (const oy of [0, -H, H]) {
    const X = x + ox, Y = y + oy;
    if (X + rad > 0 && X - rad < W && Y + rad > 0 && Y - rad < H) fn(X, Y);
  }
};
/** rounded-rectangle path */
const rr = (g: G, x: number, y: number, w: number, h: number, k: number) => {
  k = Math.max(0, Math.min(k, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k); g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k); g.arcTo(x, y, x + w, y, k);
  g.closePath();
};
/** soft elliptical blotch (radial gradient) stretched sx along x */
const blotch = (g: G, x: number, y: number, rad: number, sx: number, rgb: string, a: number) => {
  g.save(); g.translate(x, y); g.scale(sx, 1);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(-rad, -rad, rad * 2, rad * 2);
  g.restore();
};
/** long, soft wood-grain stroke along +x; random offsets drawn once so the wrapped copy matches */
const grain = (g: G, r: R, W: number, x: number, y: number, len: number, amp: number, lw: number, col: string) => {
  const n = Math.max(2, Math.round(len / 180));
  const dy = Array.from({ length: n + 1 }, () => (r() - 0.5) * 2 * amp);
  wrapX(W, x, len, (xx) => {
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = "round";
    g.beginPath(); g.moveTo(xx, y + dy[0]);
    for (let i = 1; i <= n; i++) {
      const x1 = xx + (len * i) / n;
      g.quadraticCurveTo(x1 - len / n / 2, y + (dy[i - 1] + dy[i]) / 2 + (i % 2 ? 0.3 : -0.3) * amp, x1, y + dy[i]);
    }
    g.stroke();
  });
};
/** nail / bolt head with a small painted glint (ref: dark dots with a white catch-light) */
const nail = (g: G, x: number, y: number, rad: number, col = "#3a2212") => {
  g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,240,215,0.55)"; g.beginPath(); g.arc(x - rad * 0.32, y - rad * 0.32, rad * 0.36, 0, TAU); g.fill();
};

// ---------------------------------------------------------------------------------------------------------------
/** Deck top, transverse boards. 2048 px = 2 m x 2 m (1024 texels/m: the 0.5 m lens then magnifies ~5.8 px per
 *  texel, the same as the reference's closest deck shot, 10-90 % edge ramp ~4.8 px at 1080p).
 *  Canvas y runs along the bridge (z): 8 boards of 0.25 m = 256 px. world.ts deckTop uv -> [0, z / 2, 2.5, z / 2].
 *  Ref: board-to-board L* std 1.2-4.2 (ours 5-6), within-board 1.3-2.6, gaps ~4 % of the pitch (FWHM) dark brown
 *  #571e00-#6b2903 (dL* 40-48), sunlit lip +4..7 L*, shaded lip -3..-6 L*, nails + rare knots. */
export const planksHD = () => ctex("planksHD", 2048, 2048, (g, r) => {
  const S = 2048, B = 256, GAP = 12;
  // albedo: under the current day light sunlit boards must then measure L* 72-80 on screen (ref #f8bb60, #dea04b,
  // #e28c29, #ffab49). MAT round 3: the merged grade lifts deck chroma ~x1.4 and hue ~+10 deg (the #eaa45a set landed
  // as lemon #f1b333, C* 70, h 80), so these are ochre / tan albedos (Lab L 61-69, C* 31-35, h 64-70): on screen
  // ochre wood about C* 45, h 72-78
  const fills = ["#c99669", "#c18e64", "#d19f6e", "#bb8961", "#c69466", "#c79b6f"];
  for (let i = 0; i < 8; i++) {
    const y = i * B;
    g.save(); g.beginPath(); g.rect(0, y, S, B); g.clip();
    g.fillStyle = jit(r, pick(r, fills), 0.05, 3, 0.08); g.fillRect(0, y, S, B);
    for (let k = 0; k < 5; k++) { // broad tone drift along the board, +-2 L*
      const x = U(r, 0, S), rad = U(r, 120, 260), light = r() > 0.5;
      wrapX(S, x - rad * 3, rad * 6, (xx) => blotch(g, xx + rad * 3, y + B / 2, rad, 3, light ? "255,236,200" : "110,60,25", light ? 0.12 : 0.1));
    }
    for (let k = 0; k < 18; k++) { // grain: long, thin, clearly visible; never as dark or as wide as a seam
      const light = r() < 0.25;
      grain(g, r, S, U(r, 0, S), y + U(r, 16, B - 16), U(r, 500, 1600), U(r, 2, 8), U(r, 2, 4),
        light ? "rgba(255,232,195,0.2)" : "rgba(95,48,18,0.3)");
    }
    for (let k = 0; k < 4; k++) // a few longer figure lines (darker, still thinner than a seam)
      grain(g, r, S, U(r, 0, S), y + U(r, 30, B - 30), U(r, 900, 1900), U(r, 4, 10), 3.5, "rgba(70,32,10,0.4)");
    if (r() < 0.35) { // knot, about one board in three
      const kx = U(r, 120, S - 120), ky = y + U(r, 70, B - 70), rx = U(r, 14, 24), ry = rx * U(r, 0.45, 0.6);
      g.strokeStyle = "rgba(140,82,36,0.20)"; g.lineWidth = 2;
      g.beginPath(); g.ellipse(kx, ky, rx * 2.3, ry * 1.9, 0, 0, TAU); g.stroke();
      g.fillStyle = "rgba(150,88,38,0.30)"; g.beginPath(); g.ellipse(kx, ky, rx, ry, 0, 0, TAU); g.fill();
      g.strokeStyle = "rgba(105,55,22,0.55)"; g.lineWidth = 2.5; g.stroke();
    }
    for (let k = 0; k < 3; k++) blotch(g, U(r, 100, S - 100), y + U(r, 40, B - 40), U(r, 40, 110), 1.6, "120,70,30", 0.06); // wear
    // board edges: sunlit lip on one side, soft darkening on the other
    g.fillStyle = "rgba(255,238,200,0.35)"; g.fillRect(0, y + GAP / 2 + 1, S, 3);
    const sh = g.createLinearGradient(0, y + B - GAP / 2 - 18, 0, y + B - GAP / 2);
    sh.addColorStop(0, "rgba(80,35,10,0)"); sh.addColorStop(1, "rgba(80,35,10,0.24)");
    g.fillStyle = sh; g.fillRect(0, y + B - GAP / 2 - 18, S, 18);
    // one butt joint per board per tile (staggered), nailed both sides; joist nails every 1 m
    const jx = U(r, 90, S - 90);
    g.fillStyle = "#24110a"; g.fillRect(jx - 3, y, 7, B);
    g.fillStyle = "rgba(255,238,200,0.30)"; g.fillRect(jx + 4, y, 2, B);
    for (const nx of [jx - 24, jx + 24]) for (const f of [0.28, 0.72]) nail(g, nx, y + B * f, 5, "#22140c");
    for (const nx of [512, 1536]) for (const f of [0.3, 0.7]) nail(g, nx + U(r, -3, 3), y + B * f, 5, "#22140c");
    g.restore();
  }
  for (let i = 0; i <= 8; i++) { // seams last: 12 px near-black core + 3 px soft rim (~5 % of the pitch: survives mips)
    g.fillStyle = "rgba(40,18,8,0.6)"; g.fillRect(0, i * B - GAP / 2 - 3, S, GAP + 6);
    g.fillStyle = "#1c0c05"; g.fillRect(0, i * B - GAP / 2, S, GAP);
  }
});

/** Deck side beams / stringers: 1024 x 512 = 3 m along the beam x 1 m (matches the side uv: z / 3, height in m).
 *  Ours rendered #231001 (L* 7, reads as a black hole); ref timber in shade stays at L* 27-34 (#77331b, #632918). */
export const beamHD = () => ctex("beamHD", 1024, 512, (g, r) => {
  const W = 1024, H = 512, T = H / 7; // 0.143 m timbers
  for (let k = 0; k < 7; k++) {
    const y = k * T;
    g.save(); g.beginPath(); g.rect(0, y, W, T); g.clip();
    g.fillStyle = pick(r, ["#a8743f", "#9e6b39", "#b07a44"]); g.fillRect(0, y, W, T);
    for (let i = 0; i < 6; i++) {
      const light = r() < 0.3;
      grain(g, r, W, U(r, 0, W), y + U(r, 8, T - 8), U(r, 250, 700), U(r, 1.5, 4), U(r, 1.5, 3), light ? "rgba(255,232,190,0.12)" : "rgba(85,48,20,0.16)");
    }
    g.fillStyle = "rgba(255,235,195,0.30)"; g.fillRect(0, y + 3, W, 3);
    const sh = g.createLinearGradient(0, y + T - 12, 0, y + T);
    sh.addColorStop(0, "rgba(60,28,8,0)"); sh.addColorStop(1, "rgba(60,28,8,0.26)");
    g.fillStyle = sh; g.fillRect(0, y + T - 12, W, 12);
    const jx = U(r, 120, W - 120);
    g.fillStyle = "#4a2510"; g.fillRect(jx - 2, y, 4, T);
    for (const bx of [jx - 30, jx + 30]) nail(g, bx, y + T / 2, 7, "#2f2a2a");
    g.restore();
    g.fillStyle = "#4a2510"; g.fillRect(0, y - 1.5, W, 3); // seam between timbers
  }
});

/** Ashlar courses, 1024 px per tile: with boxGeo tile 2 (towers) courses are 0.25 m at 512 texels/m; with the 4 m
 *  quad tile (quay walls) 0.5 m blocks. Ref: blocks #c2b2a5 / #cdbdb0 (C* 5-12), mortar dL* -14..-20 and only
 *  2.8-3.6 px wide at 1080p (ours #503f26, 5.4 px, yellow C* 18), top bevel +5 L*, bottom -3 L*, 2-4 px speckles,
 *  hairline cracks. Joint = 7 px = 5.5 % of a course. */
/** MAT pass: warm palettes per key. The two-tone shade multiplies by a blue-violet (shade.ts), so the old neutral
 *  greys rendered lavender on every shaded tower / quay face; warm sandstone / cream albedos stay warm in shade. */
// MAT round 3: saturation -35 % (HSL) on every stone palette -> neutral warm grey / beige, not cream-pink
const STONE_PAL: Record<string, { cols: string[]; mortar: string }> = {
  stoneHD: { cols: ["#d6c4a8", "#cbb89c", "#decfb5", "#c2ae91", "#d0bea2"], mortar: "#a08e76" },
  towerHD: { cols: ["#d6c4a8", "#cbb89c", "#decfb5", "#c2ae91", "#d0bea2"], mortar: "#a08e76" },
  tstoneHD: { cols: ["#e2d5bc", "#d7c8ac", "#e9dec9", "#ccbca1"], mortar: "#a69881" },
  wallHD: { cols: ["#c3b198", "#b8a68b", "#cdbda3", "#af9c83", "#beac94"], mortar: "#887762" },
  copeHD: { cols: ["#e5d9c1", "#dbcdb5", "#ebe1ce", "#d3c4ac"], mortar: "#a99982" },
};
/** keys painted on a 2048 canvas shown at repeat 0.5: same block size and texel density, half as many repeats */
const STONE_BIG = new Set(["towerHD", "tstoneHD", "wallHD", "stoneHD"]);
export const stoneHD = (key = "stoneHD", cols = ["#ddd0bf", "#d3c5b3", "#e5d9c9", "#cabba8"], mortar = "#a39584") => {
  const pal = STONE_PAL[key];
  if (pal) { cols = pal.cols; mortar = pal.mortar; }
  const S = STONE_BIG.has(key) ? 2048 : 1024;
  const t = ctex(key, S, S, (g, r) => {
    const RH = 128, J = 7;
    g.fillStyle = mortar; g.fillRect(0, 0, S, S);
    for (let row = 0; row < S / RH; row++) {
      const y = row * RH, ws: number[] = [];
      let sum = 0;
      while (sum < S) { const w = U(r, 200, 360); ws.push(w); sum += w; }
      const k = S / sum; // stretch so every course closes exactly on the tile width
      let x = (row % 2) * 140 + U(r, 0, 60);
      for (const w0 of ws) {
        const w = w0 * k, col = jit(r, pick(r, cols), 0.1, 5, 0.18), dl = U(r, -1, 1);
        const sp = Array.from({ length: 16 }, () => [r(), r(), U(r, 1, 2.2), r() < 0.6 ? 1 : 0]);
        const crack = r() < 0.15 ? Array.from({ length: 4 }, () => [r(), r()]) : null;
        wrapX(S, x % S, w, (xx) => {
          const X = xx + J / 2, Y = y + J / 2, BW = w - J, BH = RH - J;
          rr(g, X, Y, BW, BH, 5); g.fillStyle = col; g.fill();
          g.fillStyle = dl > 0 ? `rgba(255,252,245,${0.07 * dl})` : `rgba(70,55,45,${-0.06 * dl})`; g.fill();
          g.fillStyle = "rgba(255,252,245,0.22)"; g.fillRect(X + 3, Y, BW - 6, 6);        // top bevel
          g.fillStyle = "rgba(255,252,245,0.10)"; g.fillRect(X, Y + 4, 4, BH - 8);        // left bevel
          g.fillStyle = "rgba(70,55,45,0.14)"; g.fillRect(X + 3, Y + BH - 5, BW - 6, 5); // bottom shade
          for (const [u, v, s, dark] of sp) {
            g.fillStyle = dark ? "rgba(95,82,72,0.38)" : "rgba(255,255,255,0.35)";
            g.beginPath(); g.arc(X + 6 + u * (BW - 12), Y + 8 + v * (BH - 16), s, 0, TAU); g.fill();
          }
          if (crack) {
            g.strokeStyle = "rgba(110,90,70,0.45)"; g.lineWidth = 1.2; g.beginPath();
            crack.forEach(([u, v], i) => { const px = X + 10 + u * (BW - 20), py = Y + 10 + v * (BH - 20); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
            g.stroke();
          }
        });
        x += w;
      }
    }
    // sparse grime: soft dirt patches across several blocks and a few rain streaks (break the tile repetition)
    const n = (S / 1024) ** 2;
    for (let i = 0; i < 14 * n; i++) {
      const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 50, 170), dark = r() < 0.75;
      wrap2(S, S, x, y, rad * 1.4, (xx, yy) => blotch(g, xx, yy, rad, 1.4, dark ? "105,82,55" : "255,246,225", dark ? U(r, 0.07, 0.13) : 0.09));
    }
    for (let i = 0; i < 8 * n; i++) {
      const x = U(r, 0, S), y = U(r, 0, S * 0.8), w = U(r, 8, 26), h = U(r, 90, 300);
      const gr = g.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, "rgba(95,75,52,0.14)"); gr.addColorStop(1, "rgba(95,75,52,0)");
      wrapX(S, x, w, (xx) => { g.fillStyle = gr; g.fillRect(xx, y, w, h); });
    }
    for (let i = 0; i < 160 * n; i++) { // pebble-size dark / light pits
      const x = U(r, 0, S), y = U(r, 0, S), s = U(r, 1.2, 3), d = r() < 0.65;
      g.fillStyle = d ? "rgba(90,70,50,0.32)" : "rgba(255,248,230,0.35)";
      g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    }
  });
  t.repeat.set(1024 / S, 1024 / S);
  return t;
};

/** Cobbled quay: granite setts in staggered courses, 1024 px = 4 m (256 texels/m; setts 0.19-0.28 x 0.167 m).
 *  Replaces the polka-dot ellipses (ours: regular grid, dark rims, L* std 20): low tone spread, sand-coloured
 *  joints, a soft top-left light and bottom-right shade per sett, no outline ring. */
export const cobbleHD = () => { const t = ctex("cobbleHD", 2048, 2048, (g, r) => {
  // MAT pass: 2048 px = 8 m shown at repeat 0.5 (same sett size, half the repeats), warm granite (neutral greys went
  // lavender in shade), +-10 % per-sett value / hue jitter, sparse dirt, pebbles in the joints
  const S = 2048, N = 48, CH = S / N, J = 5;
  g.fillStyle = "#867967"; g.fillRect(0, 0, S, S);
  const cols = ["#c4b6a0", "#b8aa93", "#cdc1ab", "#af9f88", "#c7baa3", "#bdb19b", "#b8ad9c"]; // round 3: sat -35 %
  for (let row = 0; row < N; row++) {
    const y = row * CH, ws: number[] = [];
    let sum = 0;
    while (sum < S) { const w = U(r, 48, 72); ws.push(w); sum += w; }
    const k = S / sum;
    let x = U(r, 0, 60);
    for (const w0 of ws) {
      const w = w0 * k, col = jit(r, pick(r, cols), 0.1, 6, 0.2), dy = U(r, -1.5, 1.5), rad = U(r, 7, 12);
      const sp = Array.from({ length: 3 }, () => [r(), r(), r() < 0.5 ? 1 : 0]);
      wrapX(S, x % S, w, (xx) => {
        const X = xx + J / 2, Y = y + J / 2 + dy, W = w - J, H = CH - J;
        rr(g, X, Y, W, H, rad); g.fillStyle = col; g.fill();
        g.save(); rr(g, X, Y, W, H, rad); g.clip();
        const gr = g.createLinearGradient(X, Y, X + W * 0.6, Y + H);
        gr.addColorStop(0, "rgba(255,250,240,0.20)"); gr.addColorStop(0.5, "rgba(255,250,240,0)"); gr.addColorStop(1, "rgba(70,58,45,0.16)");
        g.fillStyle = gr; g.fillRect(X, Y, W, H);
        g.restore();
        for (const [u, v, d] of sp) {
          g.fillStyle = d ? "rgba(90,80,68,0.35)" : "rgba(255,255,255,0.3)";
          g.beginPath(); g.arc(X + 5 + u * (W - 10), Y + 5 + v * (H - 10), 1.4, 0, TAU); g.fill();
        }
      });
      x += w;
    }
  }
  for (let i = 0; i < 40; i++) { // damp / worn / sun-bleached patches
    const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 60, 220), d = r() < 0.7;
    wrap2(S, S, x, y, rad * 1.3, (xx, yy) => blotch(g, xx, yy, rad, 1.3, d ? "90,70,48" : "255,244,220", d ? U(r, 0.06, 0.12) : 0.1));
  }
  for (let i = 0; i < 260; i++) { // pebbles and grit dabs (ref: sparse cream pebble dabs), some dark
    const x = U(r, 0, S), y = U(r, 0, S), rx = U(r, 2, 5), d = r() < 0.4;
    wrap2(S, S, x, y, 8, (xx, yy) => {
      g.fillStyle = d ? "rgba(95,78,58,0.55)" : pick(r, ["rgba(245,232,205,0.8)", "rgba(230,214,185,0.8)"]);
      g.beginPath(); g.ellipse(xx, yy, rx, rx * 0.75, 0, 0, TAU); g.fill();
    });
  }
});
t.repeat.set(0.5, 0.5);
return t; };

/** Roof tiles (or slates with slate = true), 1024 px = 4 m (256 texels/m; keep the 4 m roof uv), courses 0.25 m.
 *  No per-tile ink outline: ref tile joints are 3.3 px at 1080p and only dL* 10 (ours 9.4 px, dL* 15, INKL stroke);
 *  the course shadow carries the pattern. Canvas y runs down the slope (flip the course if v runs the other way). */
export const roofHD = (col: string, slate = false) => ctex("roofHD" + col, 1024, 1024, (g, r) => {
  const S = 1024, C = 64, TW = slate ? 52 : 77;
  g.fillStyle = col; g.fillRect(0, 0, S, S);
  for (let row = 0; row < S / C; row++) {
    const y = row * C, off = (row % 2) * TW / 2 + U(r, -6, 6);
    const n = Math.ceil(S / TW) + 1;
    for (let i = 0; i < n; i++) {
      const x = i * TW - off, tone = U(r, -1, 1);
      const fill = tone > 0 ? `rgba(255,240,225,${0.10 * tone})` : `rgba(60,25,20,${-0.10 * tone})`;
      wrapX(S, x, TW, (xx) => {
        g.fillStyle = fill; g.fillRect(xx, y, TW, C);
        const gr = g.createLinearGradient(xx, 0, xx + TW, 0); // rounded pan: light left, darker right
        gr.addColorStop(0, "rgba(255,240,225,0.12)"); gr.addColorStop(0.55, "rgba(255,240,225,0)"); gr.addColorStop(1, slate ? "rgba(20,25,35,0.10)" : "rgba(60,25,20,0.12)");
        g.fillStyle = gr; g.fillRect(xx, y, TW, C);
        g.fillStyle = slate ? "rgba(20,25,35,0.25)" : "rgba(60,25,20,0.22)"; g.fillRect(xx, y, 2, C); // thin soft joint
      });
    }
    g.fillStyle = slate ? "rgba(220,230,245,0.18)" : "rgba(255,235,220,0.22)"; g.fillRect(0, y + C - 9, S, 3); // lower-lip light
    g.fillStyle = slate ? "rgba(15,20,30,0.32)" : "rgba(55,22,18,0.32)"; g.fillRect(0, y + C - 5, S, 5);        // course shadow
  }
  for (let i = 0; i < 18; i++) { // weathering
    const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 40, 120);
    wrap2(S, S, x, y, rad * 1.5, (xx, yy) => blotch(g, xx, yy, rad, 1.5, "70,60,40", 0.08));
  }
});

/** Grass bank: 1024 px = 4 m (256 texels/m). Ref lawns: flat, saturated (#71b038 / #7dbf3f, L* 62-66, C* 55-64),
 *  broad soft variation (autocorrelation ~40 px at 1080p, +-4 L*), sparse tufts and flowers, low fine noise.
 *  Ours had the right hue (#6dad37) but only fine uniform noise (autocorrelation 6 px). */
export const grassHD = () => ctex("grassHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#7cb35a"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 16; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 120, 320), light = r() > 0.5;
    wrap2(S, S, x, y, rad * 1.4, (xx, yy) => blotch(g, xx, yy, rad, 1.4, light ? "140,198,80" : "92,154,48", 0.35));
  }
  g.lineWidth = 2; g.lineCap = "round"; g.lineJoin = "round";
  for (let i = 0; i < 1400; i++) { // tufts ~90 per m2
    const x = U(r, 0, S), y = U(r, 0, S), h = U(r, 7, 16), lean = U(r, -3, 3), light = r() < 0.4;
    wrap2(S, S, x, y, 20, (xx, yy) => {
      g.strokeStyle = light ? "rgba(165,218,98,0.35)" : "rgba(78,138,38,0.45)";
      g.beginPath(); g.moveTo(xx - 3 + lean, yy - h); g.lineTo(xx, yy); g.lineTo(xx + 3 + lean, yy - h * 0.8); g.stroke();
    });
  }
  for (let i = 0; i < 12; i++) { // flowers ~0.75 per m2
    const x = U(r, 0, S), y = U(r, 0, S), c = pick(r, ["#f7f3e8", "#f4d24a", "#f3a9bb", "#f7f3e8"]);
    wrap2(S, S, x, y, 8, (xx, yy) => {
      g.fillStyle = c; g.beginPath(); g.arc(xx, yy, 3.5, 0, TAU); g.fill();
      g.fillStyle = "rgba(240,190,60,0.9)"; g.beginPath(); g.arc(xx, yy, 1.3, 0, TAU); g.fill();
    });
  }
});

/** Plaster / timber / brick facade at 96 px/m (2x the old 48, capped at 2048 px a side). Windows as in the ref:
 *  white trim with a thin dark line (no heavy ink), mid-tone blue-violet glass (never near-black), two diagonal
 *  glints, curtains in about a third, louvred shutters. Same options object as facade(). */
export const facadeHD = (key: string, wm: number, hm: number, o: { wall: string; shutter: string; door?: boolean; timber?: boolean; brick?: boolean }) => {
  const PX = Math.min(72, 2048 / Math.max(wm, hm)); // 72 px/m: half the GPU memory of 96 (textures.md 4)
  const W = Math.round(wm * PX), H = Math.round(hm * PX), m = (v: number) => v * PX;
  return ctex("facHD" + key, W, H, (g, r) => {
    if (o.brick) { // real-size bricks 0.25 x 0.085 m with light mortar (ref brick #cf5e30 / mortar #f6d9b1)
      g.fillStyle = "#e9d3b4"; g.fillRect(0, 0, W, H);
      const bw = m(0.25), bh = m(0.085);
      for (let y = 0, row = 0; y < H; y += bh, row++) for (let x = -(row % 2) * bw / 2; x < W; x += bw) {
        g.fillStyle = brickCol(r);
        g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      }
      const n = Math.round((wm * hm) / 12) + 3;
      for (let i = 0; i < n; i++) blotch(g, U(r, 0, W), U(r, 0, H), m(U(r, 0.4, 1.4)), 1.4, "70,40,30", U(r, 0.06, 0.12)); // soot
    } else {
      g.fillStyle = o.wall; g.fillRect(0, 0, W, H);
      const n = Math.round((wm * hm) / 3) + 6;
      for (let i = 0; i < n; i++) {
        const light = r() > 0.5;
        blotch(g, U(r, 0, W), U(r, 0, H), m(U(r, 0.4, 1.5)), 1.5, light ? "255,255,255" : "120,90,60", light ? 0.07 : 0.05);
      }
      for (let i = 0; i < 4; i++) { // hairline cracks
        let x = U(r, 0, W), y = U(r, 0, H * 0.8);
        g.strokeStyle = "rgba(120,100,80,0.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += m(U(r, -0.08, 0.08)); y += m(U(r, 0.04, 0.12)); g.lineTo(x, y); }
        g.stroke();
      }
    }
    const floors = Math.max(1, Math.floor(hm / 2.8));
    const nWin = Math.max(1, Math.floor(wm / 2.2));
    g.fillStyle = "rgba(70,55,45,0.28)"; g.fillRect(0, H - m(0.45), W, m(0.45)); // plinth
    g.fillStyle = "rgba(70,55,45,0.35)"; g.fillRect(0, H - m(0.45), W, 2);
    const timberBeam = (x: number, y: number, w: number, h: number) => {
      g.fillStyle = "#6e4a30"; g.fillRect(x, y, w, h);
      g.strokeStyle = "rgba(40,25,15,0.5)"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      g.fillStyle = "rgba(255,230,200,0.22)"; g.fillRect(x + 2, y + 2, w - 4, 2);
    };
    if (o.timber) {
      const t = m(0.18);
      timberBeam(0, 0, t, H); timberBeam(W - t, 0, t, H); timberBeam(0, 0, W, t);
      for (let fl = 1; fl < floors; fl++) timberBeam(0, H - m(fl * 2.8) - t / 2, W, t);
      for (let i = 1; i < nWin; i++) timberBeam((i * W) / nWin - t / 2, 0, t, H - m(2.8)); // posts, upper floors
    }
    const door = (cx: number) => {
      const dw = m(1.1), dh = m(2.1);
      const path = (k: number) => {
        g.beginPath(); g.moveTo(cx - dw / 2 - k, H); g.lineTo(cx - dw / 2 - k, H - dh + dw / 2);
        g.arc(cx, H - dh + dw / 2, dw / 2 + k, Math.PI, 0); g.lineTo(cx + dw / 2 + k, H); g.closePath();
      };
      path(m(0.1)); g.fillStyle = "#e9e2d4"; g.fill(); g.strokeStyle = "rgba(60,45,40,0.6)"; g.lineWidth = 1.5; g.stroke();
      path(0); g.fillStyle = "#7a4a2c"; g.fill();
      g.save(); path(0); g.clip();
      for (let x = cx - dw / 2 + m(0.14); x < cx + dw / 2; x += m(0.14)) {
        g.fillStyle = "rgba(40,20,10,0.45)"; g.fillRect(x - 1, H - dh, 2, dh);
        g.fillStyle = "rgba(255,225,190,0.15)"; g.fillRect(x + 1, H - dh, 2, dh);
      }
      g.restore();
      path(0); g.strokeStyle = "rgba(40,25,15,0.7)"; g.lineWidth = 2; g.stroke();
      nail(g, cx + dw / 3, H - dh / 2, m(0.035), "#d9b04a");
    };
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < nWin; i++) {
      const cx = ((i + 0.5) * W) / nWin, by = H - m(fl * 2.8 + 0.9);
      if (o.door && fl === 0 && i === Math.floor(nWin / 2)) { door(cx); continue; }
      const ww = m(0.85), wh = m(1.25), x0 = cx - ww / 2, y0 = by - wh, tr = m(0.08), sw = m(0.45);
      for (const sx of [x0 - tr - sw - m(0.02), x0 + ww + tr + m(0.02)]) { // louvred shutters
        g.fillStyle = o.shutter; g.fillRect(sx, y0, sw, wh);
        const lw = Math.max(1.5, m(0.012));
        for (let ly = y0 + m(0.06); ly < y0 + wh - m(0.04); ly += m(0.06)) {
          g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(sx + m(0.04), ly, sw - m(0.08), lw);
          g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(sx + m(0.04), ly + lw, sw - m(0.08), 1);
        }
        g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = m(0.03); g.strokeRect(sx + m(0.015), y0 + m(0.015), sw - m(0.03), wh - m(0.03));
        g.strokeStyle = "rgba(40,30,40,0.55)"; g.lineWidth = 1.5; g.strokeRect(sx, y0, sw, wh);
      }
      g.fillStyle = "#f7f2e8"; g.fillRect(x0 - tr, y0 - tr, ww + 2 * tr, wh + 2 * tr); // trim
      const gl = g.createLinearGradient(0, y0, 0, y0 + wh);
      gl.addColorStop(0, "#8d9cdb"); gl.addColorStop(1, "#5761a8"); // ref glass #6670b0
      g.fillStyle = gl; g.fillRect(x0, y0, ww, wh);
      if (r() < 0.35) { // curtains from the top corners
        g.fillStyle = pick(r, ["#f5c4c8", "#f3e3c6", "#d7e6cf"]);
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + ww * 0.42, y0); g.lineTo(x0, y0 + wh * 0.75); g.fill();
        g.beginPath(); g.moveTo(x0 + ww, y0); g.lineTo(x0 + ww * 0.58, y0); g.lineTo(x0 + ww, y0 + wh * 0.75); g.fill();
      }
      g.save(); g.beginPath(); g.rect(x0, y0, ww, wh); g.clip(); // two diagonal glints
      g.fillStyle = "rgba(255,255,255,0.5)";
      for (const [a, b] of [[0.3, m(0.07)], [0.58, m(0.035)]]) {
        g.save(); g.translate(x0 + ww * a, y0 + wh * 0.5); g.rotate(Math.PI / 4); g.fillRect(-b / 2, -wh, b, wh * 2); g.restore();
      }
      g.restore();
      g.fillStyle = "#f7f2e8"; g.fillRect(cx - m(0.02), y0, m(0.04), wh); g.fillRect(x0, y0 + wh * 0.45 - m(0.02), ww, m(0.04)); // mullions
      g.strokeStyle = "rgba(60,45,40,0.6)"; g.lineWidth = 1.5; g.strokeRect(x0 - tr, y0 - tr, ww + 2 * tr, wh + 2 * tr);
      g.strokeStyle = "rgba(60,45,40,0.45)"; g.strokeRect(x0, y0, ww, wh);
      g.fillStyle = "#ebe3d4"; g.fillRect(x0 - tr - m(0.06), by + tr, ww + 2 * tr + m(0.12), m(0.07)); // sill
      g.fillStyle = "rgba(60,45,40,0.35)"; g.fillRect(x0 - tr - m(0.06), by + tr + m(0.07), ww + 2 * tr + m(0.12), m(0.03));
    }
  });
};

/** River marks as a DATA texture for the water shader (world.ts): R = crest, G = trough, B = glint; 1024 px = 8 m.
 *  Two instances: a sparse one for the near band and a dense one sampled at 40 m tiles for the far band, because the
 *  ref thins the marks out towards the camera (area far 1.5-5 %, mid 0-1.6 %, near 0-0.9 %; ours 4-12 % everywhere).
 *  Ref marks: 12-30 px wide at 1080p (p90 36-97), 3-6 px tall, aspect 3-6, crest +8..+13 L* with a trough
 *  -8..-9 L* right under it, thin glint lines 1-3 x 30-100 px. The marks are short, deep, randomly turned arcs
 *  (isotropic on average): foreshortening alone then makes horizontal dashes on screen from ANY heading (aspect
 *  1 / sin(grazing) = 3.4 at 17 deg, 5.8 at 10 deg); ours drew 30-100 px strokes along u, which turn into dots /
 *  vertical streaks when the camera looks along the river. In reel-kit set colorSpace = THREE.NoColorSpace. */
export const waterMarks = (key: string, nCrest: number, nGlint: number) => ctex("waterMarks" + key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = "lighter"; // channels add independently
  g.lineCap = "round";
  for (let i = 0; i < nCrest; i++) {
    // sets look pass: thin horizontal crests (|angle| <= 9 deg, textures.md 3.1.4), shallow sag so they read as dashes
    const x = U(r, 0, S), y = U(r, 0, S), w = U(r, 22, 54), sag = w * U(r, 0.06, 0.14), lw = U(r, 2.2, 3.6), a = U(r, -0.16, 0.16);
    wrap2(S, S, x, y, w, (xx, yy) => {
      g.save(); g.translate(xx, yy); g.rotate(a);
      const arc = (dy: number, col: string, k: number) => {
        g.strokeStyle = col; g.lineWidth = lw * k;
        g.beginPath(); g.moveTo(-w / 2, dy); g.quadraticCurveTo(0, dy - sag * 2, w / 2, dy); g.stroke();
      };
      arc(0, "rgb(255,0,0)", 1);          // crest
      arc(lw * 1.5, "rgb(0,255,0)", 0.9); // trough right under it
      g.restore();
    });
  }
  for (let i = 0; i < nGlint; i++) { // glints: long thin straight lines
    const x = U(r, 0, S), y = U(r, 0, S), len = U(r, 40, 140), lw = U(r, 1.2, 2.4), a = U(r, -0.05, 0.05);
    wrap2(S, S, x, y, len, (xx, yy) => {
      g.save(); g.translate(xx, yy); g.rotate(a); g.strokeStyle = "rgb(0,0,255)"; g.lineWidth = lw;
      g.beginPath(); g.moveTo(-len / 2, 0); g.lineTo(len / 2, 0); g.stroke(); g.restore();
    });
  }
  g.globalCompositeOperation = "source-over";
});
export const waterNear = () => waterMarks("near", 28, 5);  // ~0.3 % crest area
export const waterFar = () => waterMarks("far", 220, 30);  // ~2.5 % crest + glints, at 40 m tiles

/** Cloud sprite, 1024 x 512, three painted tones and a flat soft bottom, no outline.
 *  Ref cumulus: lit crown #f1f6fc-#fbfafd (L* 96-98, warm in haze #faedd7), mid #dadae9-#e5edf9, lavender-blue
 *  underside #b6c1f2 / #c7cedf / #d1d4e1 (L* 79-86) mostly in the bottom third, edge ramp 8-20 px at 1080p
 *  (median ~10), no dark rim in 9 of 11 clouds. Ours: one flat tone (#f0f0f0 = 83 % of the cloud), 4-5 px edge.
 *  Golden: use CLOUD_GOLD instead of multiplying the white sprite by #ffd6b8 (a tint cannot make the cool belly). */
export const CLOUD_DAY = { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" };
export const CLOUD_GOLD = { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" };
export const cloudHD = (seed: number, pal = CLOUD_DAY) => ctex(`cloudHD_${pal.lit}_${seed}`, 1024, 512, (g) => {
  const r = rng(seed * 7919 + 17); // own seed: ctex keys of equal length would otherwise share shapes
  const W = 1024, H = 512, base = 400;
  const n = 6 + Math.floor(r() * 4), lobes: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < n; i++) { // main row, biggest in the middle
    const t = (i + 0.5) / n, rad = (60 + 110 * Math.sin(Math.PI * t) ** 0.8) * U(r, 0.75, 1.15);
    lobes.push({ x: 150 + t * 724 + U(r, -30, 30), y: base - rad * U(r, 0.35, 0.65), r: rad });
  }
  for (let i = 0; i < Math.floor(n / 2); i++) { // crown
    const t = U(r, 0.25, 0.75), rad = U(r, 60, 110);
    lobes.push({ x: 150 + t * 724, y: base - 150 - rad * U(r, 0.3, 0.7), r: rad });
  }
  const layer = (dx: number, dy: number, k: number, col: string, blur: number) => {
    g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = col; g.beginPath();
    for (const l of lobes) { const x = l.x + dx * l.r, y = l.y + dy * l.r; g.moveTo(x + l.r * k, y); g.arc(x, y, l.r * k, 0, TAU); }
    g.fill(); g.restore();
  };
  layer(0, 0, 1.0, pal.shade, 6);         // silhouette in the underside tone
  layer(-0.04, -0.12, 0.9, pal.mid, 8);   // mid band
  layer(-0.1, -0.26, 0.72, pal.lit, 10);  // sunlit crown, offset up-left
  g.globalCompositeOperation = "destination-in"; // flat, soft bottom
  const m = g.createLinearGradient(0, base - 18, 0, base + 6);
  m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = m; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over";
});

/** Chain strand: 4 faces side by side (Strand uv: u = k / 4 around the tube), 1024 px = 2 m along (512 texels/m).
 *  Ref iron: blue-grey with a painted matcap-like bright band (#e3d5c6-#e8e7df, ~25-30 % of the area), mids
 *  #586076 / #8790a6, darks #282f41 (L* 19). Ours renders #040d16 / #050b1b (L* 3-5). */
export const chainHD = () => ctex("chainHD", 256, 1024, (g) => {
  // MAT pass: slate blue-grey (was saturated navy #262c3e / #5f6880). Only a fallback now: build.ts Strand builds
  // real link geometry for the chain material (lam("chainHD")), this map is used if anything else asks for it.
  const F = 64, P = 128; // face width, link pitch 0.25 m
  g.fillStyle = "#4a5160"; g.fillRect(0, 0, 256, 1024);
  for (let f = 0; f < 4; f++) {
    const cx = f * F + F / 2;
    for (let i = 0; i < 1024 / P; i++) {
      const cy = i * P + P / 2;
      if (i % 2 === 0) { // face-on link
        g.lineWidth = 15; g.strokeStyle = "#8a93a3"; g.beginPath(); g.ellipse(cx, cy, 22, 58, 0, 0, TAU); g.stroke();
        g.lineWidth = 2.5; g.strokeStyle = "#3a404d";
        for (const d of [-7.5, 7.5]) { g.beginPath(); g.ellipse(cx, cy, 22 + d, 58 + d, 0, 0, TAU); g.stroke(); }
        g.lineWidth = 5; g.strokeStyle = "#e4e6ea"; g.beginPath(); g.ellipse(cx, cy, 22, 58, 0, Math.PI * 1.05, Math.PI * 1.55); g.stroke();
        g.fillStyle = "#fbfaf4"; g.beginPath(); g.arc(cx - 15, cy - 40, 2.5, 0, TAU); g.fill();
      } else { // edge-on link
        rr(g, cx - 8, cy - 62, 16, 124, 8); g.fillStyle = "#7d8696"; g.fill();
        g.strokeStyle = "#3a404d"; g.lineWidth = 2.5; g.stroke();
        g.fillStyle = "#d9dce3"; g.fillRect(cx - 5, cy - 52, 3, 104);
      }
    }
  }
});



// =================================================================================================================
// MISSILE SHORT painters. Conventions: painted seams are dark TINTS (never pure black lines: the world ink pass draws
// silhouettes and creases), per-panel jitter about +-6 % lightness, sizes noted as px per metre.
// =================================================================================================================
const seamLine = (g: G, x0: number, y0: number, x1: number, y1: number, w = 2, a = 0.35, rgb = "40,30,40") => {
  g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
};
const rivetRow = (g: G, x0: number, y0: number, x1: number, y1: number, step: number, rad = 2.2) => {
  const n = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / step));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    g.fillStyle = "rgba(60,55,65,0.45)"; g.beginPath(); g.arc(x, y + 0.6, rad, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.arc(x - 0.5, y - 0.5, rad * 0.55, 0, TAU); g.fill();
  }
};
const speckle = (g: G, r: R, W: number, H: number, n: number, cols: string[], r0: number, r1: number) => {
  for (let i = 0; i < n; i++) {
    const x = U(r, 0, W), y = U(r, 0, H), rad = U(r, r0, r1);
    g.fillStyle = pick(r, cols); wrap2(W, H, x, y, rad, (xx, yy) => { g.beginPath(); g.arc(xx, yy, rad, 0, TAU); g.fill(); });
  }
};

/** checker floor tiles (1024 px = 2 m, 0.5 m tiles) */
export const tilesHD = (a: string, b: string) => ctex(`tilesHD${a}${b}`, 1024, 1024, (g, r) => {
  const S = 1024, T = 256;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    g.fillStyle = jit(r, (i + j) % 2 ? a : b, 0.04, 3, 0.08); g.fillRect(i * T, j * T, T, T);
    blotch(g, i * T + U(r, 60, 200), j * T + U(r, 60, 200), U(r, 40, 110), 1.5, "255,255,255", 0.12);
  }
  for (let k = 0; k <= S; k += T) { seamLine(g, k, 0, k, S, 4, 0.3, "60,45,40"); seamLine(g, 0, k, S, k, 4, 0.3, "60,45,40"); }
});
/** polished parquet / plank floor (1024 px = 2 m, 0.16 m boards along canvas x) */
export const parquetHD = (base = "#b0784a") => ctex("parquetHD" + base, 1024, 1024, (g, r) => {
  const S = 1024, P = 82;
  for (let y = 0; y < S + P; y += P) {
    let x = U(r, -400, 0);
    while (x < S) {
      const len = U(r, 320, 700), c = jit(r, base, 0.09, 4, 0.12);
      wrapX(S, x, len, (xx) => { g.fillStyle = c; g.fillRect(xx, y, len, P); seamLine(g, xx + 1, y, xx + 1, y + P, 3, 0.35, "60,30,15"); });
      grain(g, r, S, x, y + P * 0.35, len - 10, 5, 1.4, "rgba(70,35,15,0.16)");
      grain(g, r, S, x, y + P * 0.7, len - 10, 5, 1.4, "rgba(70,35,15,0.12)");
      x += len;
    }
    seamLine(g, 0, y, S, y, 3, 0.4, "60,30,15");
    g.fillStyle = "rgba(255,240,220,0.08)"; g.fillRect(0, y + 3, S, 8); // varnish sheen
  }
});
/** interior plaster (512 px = 2 m): soft mottle, faint picture-rail shading at the top */
export const plasterHD = (col: string) => ctex("plasterHD" + col, 512, 512, (g, r) => {
  const S = 512;
  g.fillStyle = col; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 20; i++) { const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 40, 140); wrap2(S, S, x, y, rad * 1.3, (xx, yy) => blotch(g, xx, yy, rad, 1.3, r() > 0.5 ? "255,250,240" : "150,120,100", 0.08)); }
});
/** varnished raised-panel wood (1024 x 512 = 2 m x 1 m): counter fronts, wainscot, podium */
export const panelHD = (base = "#7a4a2c") => ctex("panelHD" + base, 1024, 512, (g, r) => {
  const W = 1024, H = 512;
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let y = 10; y < H; y += 26) grain(g, r, W, 0, y, W, 6, 1.5, "rgba(40,20,10,0.16)");
  for (let i = 0; i < 4; i++) {
    const x = i * 256 + 28, y = 50, w = 200, h = H - 100;
    g.fillStyle = "rgba(0,0,0,0.18)"; rr(g, x, y, w, h, 8); g.fill();
    g.fillStyle = "rgba(255,230,200,0.1)"; rr(g, x + 10, y + 10, w - 20, h - 20, 6); g.fill();
    g.strokeStyle = "rgba(30,15,8,0.5)"; g.lineWidth = 4; rr(g, x, y, w, h, 8); g.stroke();
    g.strokeStyle = "rgba(255,225,190,0.25)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 4, y + h - 4); g.lineTo(x + 4, y + 4); g.lineTo(x + w - 4, y + 4); g.stroke();
  }
});
/** pigeon-hole sorting wall (1024 x 1024 = 2.4 m x 2.4 m): 8 x 10 cubbies, letters poking out of most */
export const slotsHD = () => ctex("slotsHD", 1024, 1024, (g, r) => {
  const S = 1024, CW = 128, CH = 102.4;
  g.fillStyle = "#8a5634"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 10; j++) {
    const x = i * CW, y = j * CH;
    g.fillStyle = "#3a2216"; g.fillRect(x + 10, y + 10, CW - 20, CH - 16);
    const lg = g.createLinearGradient(0, y + 10, 0, y + CH); lg.addColorStop(0, "rgba(0,0,0,0.35)"); lg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = lg; g.fillRect(x + 10, y + 10, CW - 20, CH - 16);
    const n = Math.floor(r() * 4);
    for (let k = 0; k < n; k++) { // letters standing in the cubby, slightly fanned
      const lx = x + 18 + k * 18 + U(r, -3, 3), ly = y + CH - 14, lh = U(r, 40, 62), lw = U(r, 60, 80);
      g.save(); g.translate(lx, ly); g.rotate(U(r, -0.12, 0.12));
      g.fillStyle = pick(r, ["#f4efe2", "#efe3c8", "#f7f4ea", "#e8d9b8", "#dfe8f2"]); g.fillRect(0, -lh, lw, lh);
      g.strokeStyle = "rgba(60,45,40,0.45)"; g.lineWidth = 2; g.strokeRect(0, -lh, lw, lh);
      if (r() < 0.35) { g.fillStyle = "#d0322f"; g.fillRect(lw - 16, -lh + 4, 12, 10); } // stamp
      g.restore();
    }
    g.fillStyle = "rgba(255,225,190,0.25)"; g.fillRect(x + 4, y + 2, CW - 8, 6); // lit shelf lip
  }
});
/** wall posters (512 x 720), no lettering: 0 airmail (plane over chevrons), 1 eagle + stars, 2 winged envelope */
export const posterHD = (k: number) => ctex("posterHD" + k, 512, 720, (g, r) => {
  const W = 512, H = 720;
  const bg = ["#2f5d9a", "#f1e6c8", "#c9473c"][k % 3];
  g.fillStyle = "#f4ecd8"; g.fillRect(0, 0, W, H);
  g.fillStyle = bg; g.fillRect(24, 24, W - 48, H - 48);
  if (k % 3 === 0) {
    for (let i = -6; i < 12; i++) { g.fillStyle = i % 2 ? "#d0322f" : "#f4ecd8"; g.beginPath(); g.moveTo(24 + i * 60, H - 24); g.lineTo(84 + i * 60, H - 24); g.lineTo(24 + i * 60 + 140, H - 160); g.lineTo(i * 60 - 36 + 140, H - 160); g.fill(); }
    g.fillStyle = "#f4ecd8"; g.beginPath(); g.ellipse(256, 300, 170, 26, -0.25, 0, TAU); g.fill(); // fuselage
    g.beginPath(); g.moveTo(230, 300); g.lineTo(150, 170); g.lineTo(200, 170); g.lineTo(300, 290); g.fill(); // wings
    g.beginPath(); g.moveTo(240, 300); g.lineTo(300, 420); g.lineTo(340, 410); g.lineTo(290, 300); g.fill();
    g.fillStyle = "#f2c94c"; g.beginPath(); g.arc(400, 130, 46, 0, TAU); g.fill();
  } else if (k % 3 === 1) {
    for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f4ecd8" : "#c9473c"; g.fillRect(24, 430 + i * 20, W - 48, 20); }
    g.fillStyle = "#2f5d9a"; g.fillRect(24, 24, W - 48, 400);
    g.fillStyle = "#f4ecd8";
    for (let i = 0; i < 5; i++) { const cx = 90 + i * 83, cy = 80; g.beginPath(); for (let a = 0; a < 10; a++) { const rad2 = a % 2 ? 9 : 22, b = -Math.PI / 2 + (a * Math.PI) / 5; g.lineTo(cx + rad2 * Math.cos(b), cy + rad2 * Math.sin(b)); } g.fill(); }
    g.fillStyle = "#6a4a2a"; g.beginPath(); g.ellipse(256, 270, 60, 90, 0, 0, TAU); g.fill(); // eagle body
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(256 + sx * 40, 230); g.quadraticCurveTo(256 + sx * 190, 150, 256 + sx * 200, 320); g.quadraticCurveTo(256 + sx * 120, 280, 256 + sx * 40, 300); g.fill(); }
    g.fillStyle = "#f4ecd8"; g.beginPath(); g.arc(256, 175, 34, 0, TAU); g.fill();
    g.fillStyle = "#e0a530"; g.beginPath(); g.moveTo(276, 170); g.lineTo(312, 182); g.lineTo(276, 192); g.fill();
  } else {
    g.fillStyle = "#f4ecd8"; g.fillRect(126, 270, 260, 170); // envelope
    g.strokeStyle = "#5a3a30"; g.lineWidth = 6; g.strokeRect(126, 270, 260, 170);
    g.beginPath(); g.moveTo(126, 270); g.lineTo(256, 370); g.lineTo(386, 270); g.stroke();
    for (const sx of [-1, 1]) { g.fillStyle = "#f4ecd8"; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(256 + sx * (170 + i * 18), 300 - i * 34, 70 - i * 10, 18, sx * (0.5 + i * 0.12), 0, TAU); g.fill(); } }
    g.fillStyle = "#2f5d9a"; g.fillRect(320, 285, 44, 54);
  }
  g.strokeStyle = "rgba(40,30,30,0.35)"; g.lineWidth = 3; g.strokeRect(24, 24, W - 48, H - 48);
  for (let i = 0; i < 8; i++) blotch(g, U(r, 0, W), U(r, 0, H), U(r, 40, 120), 1.5, "120,90,60", 0.08); // age
});
/** bronze plaque with "1959" (1024 x 512): the only lettering in the film, period-correct museum label */
export const plaqueHD = () => ctex("plaqueHD", 1024, 512, (g, r) => {
  const W = 1024, H = 512;
  const lg = g.createLinearGradient(0, 0, W, H); lg.addColorStop(0, "#b98a3e"); lg.addColorStop(0.5, "#d6aa58"); lg.addColorStop(1, "#9c7130");
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  g.strokeStyle = "#5a3d14"; g.lineWidth = 14; rr(g, 26, 26, W - 52, H - 52, 30); g.stroke();
  g.strokeStyle = "rgba(255,230,170,0.5)"; g.lineWidth = 4; rr(g, 44, 44, W - 88, H - 88, 22); g.stroke();
  drawText(g, "1959", W / 2, 190, 600, 170, { fg: "#3e2a0e", style: "slab", shadow: "rgba(255,235,180,0.55)" });
  drawText(g, "REGULUS I  -  MISSILE MAIL", W / 2, 340, 800, 46, { fg: "#3e2a0e", style: "slab" });
  drawText(g, "U.S.S. BARBERO  -  JUNE 8, 1959", W / 2, 408, 760, 34, { fg: "rgba(62,42,14,0.85)", style: "stencil" });
  for (let i = 0; i < 6; i++) blotch(g, U(r, 0, W), U(r, 0, H), U(r, 50, 150), 1.5, "80,50,20", 0.12);
});
/** corrugated quonset metal (512 px = 2 m): silver-grey ribs along canvas x, weathering */
export const corrugatedHD = (base = "#a9adb0") => ctex("corrHD" + base, 512, 512, (g, r) => {
  const S = 512, P = 32;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x += P) {
    const lg = g.createLinearGradient(x, 0, x + P, 0);
    lg.addColorStop(0, "rgba(255,255,255,0.22)"); lg.addColorStop(0.45, "rgba(255,255,255,0)"); lg.addColorStop(1, "rgba(40,45,55,0.28)");
    g.fillStyle = lg; g.fillRect(x, 0, P, S);
  }
  for (let y = 0; y < S; y += 256) seamLine(g, 0, y + 1, S, y + 1, 3, 0.3);
  for (let i = 0; i < 12; i++) blotch(g, U(r, 0, S), U(r, 0, S), U(r, 40, 120), 1, r() > 0.6 ? "150,100,70" : "80,85,90", 0.12);
});
/** palm trunk rings (256 x 512 = around x 2 m up) */
export const palmBarkHD = () => ctex("palmBarkHD", 256, 512, (g, r) => {
  g.fillStyle = "#9a7a52"; g.fillRect(0, 0, 256, 512);
  for (let y = 0; y < 512; y += 32) {
    const lg = g.createLinearGradient(0, y, 0, y + 32); lg.addColorStop(0, "rgba(255,235,200,0.25)"); lg.addColorStop(0.6, "rgba(0,0,0,0)"); lg.addColorStop(1, "rgba(60,40,20,0.45)");
    g.fillStyle = lg; g.fillRect(0, y, 256, 32);
    seamLine(g, 0, y + 30 + U(r, -2, 2), 256, y + 30 + U(r, -2, 2), 3, 0.4, "60,40,25");
  }
});
/** flag bunting for the podium front / stage skirt (512 x 256): blue star field + red/white stripes, gathered folds */
export const buntingHD = () => ctex("buntingHD", 512, 256, (g) => {
  for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? "#f4f0e6" : "#c8323a"; g.fillRect(0, i * (256 / 7), 512, 256 / 7 + 1); }
  g.fillStyle = "#2c3f86"; g.fillRect(0, 0, 200, 256 * (4 / 7));
  g.fillStyle = "#f4f0e6";
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(22 + i * 38 + (j % 2) * 19, 18 + j * 34, 6, 0, TAU); g.fill(); }
  for (let x = 0; x < 512; x += 64) { // folds
    const lg = g.createLinearGradient(x, 0, x + 64, 0); lg.addColorStop(0, "rgba(255,255,255,0.12)"); lg.addColorStop(0.5, "rgba(0,0,0,0)"); lg.addColorStop(1, "rgba(30,20,40,0.22)");
    g.fillStyle = lg; g.fillRect(x, 0, 64, 256);
  }
});
/** pale marble for the museum pedestal (512 px = 2 m) */
export const marbleHD = () => ctex("marbleHD", 512, 512, (g, r) => {
  const S = 512;
  g.fillStyle = "#e9e4da"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 12; i++) blotch(g, U(r, 0, S), U(r, 0, S), U(r, 60, 160), 1.6, "200,190,175", 0.18);
  g.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    let x = U(r, 0, S), y = U(r, 0, S);
    g.strokeStyle = "rgba(120,110,105,0.28)"; g.lineWidth = U(r, 1, 3); g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 10; k++) { x += U(r, 10, 40); y += U(r, -25, 25); g.lineTo(x, y); }
    g.stroke();
  }
});
/** waterline foam strip (512 x 128, alpha): broken white froth fading out at both edges; tiles along canvas x */
export const foamHD = () => ctex("foamHD", 512, 128, (g, r) => {
  for (let i = 0; i < 160; i++) {
    const x = U(r, 0, 512), y = 64 + U(r, -30, 30) * (r() < 0.6 ? 0.4 : 1), rad = U(r, 6, 20), a = 0.95 - Math.abs(y - 64) / 50;
    g.fillStyle = `rgba(255,255,255,${Math.max(0, a).toFixed(3)})`;
    wrap2(512, 128, x, y, rad * 2, (xx, yy) => { g.beginPath(); g.ellipse(xx, yy, rad * 2, rad * 0.7, 0, 0, TAU); g.fill(); });
  }
});
/** museum banner (256 x 768): a white Regulus silhouette climbing over stars on navy, red hem */
export const museumBannerHD = (k: number) => ctex("musBanner" + k, 256, 768, (g) => {
  g.fillStyle = k % 2 ? "#8c2b35" : "#253a73"; g.fillRect(0, 0, 256, 768);
  g.fillStyle = "#f4ecd8";
  for (let i = 0; i < 9; i++) { const cx = 40 + (i % 3) * 88, cy = 60 + Math.floor(i / 3) * 70; g.beginPath(); for (let a = 0; a < 10; a++) { const rad2 = a % 2 ? 6 : 15, b = -Math.PI / 2 + (a * Math.PI) / 5; g.lineTo(cx + rad2 * Math.cos(b), cy + rad2 * Math.sin(b)); } g.fill(); }
  g.save(); g.translate(128, 470); g.rotate(-1.1);
  g.beginPath(); g.ellipse(0, 0, 150, 22, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-10, 0); g.lineTo(-70, 80); g.lineTo(-40, 80); g.lineTo(40, 0); g.fill();
  g.beginPath(); g.moveTo(-10, 0); g.lineTo(-70, -80); g.lineTo(-40, -80); g.lineTo(40, 0); g.fill();
  g.beginPath(); g.moveTo(-120, 0); g.lineTo(-150, -50); g.lineTo(-125, -50); g.lineTo(-90, 0); g.fill();
  g.restore();
  g.fillStyle = k % 2 ? "#f2c94c" : "#c8323a"; g.fillRect(0, 700, 256, 68);
  // sets look pass: gold border + lettering ("MOVING THE MAIL" / dates), world.md 4.6
  g.strokeStyle = "#d9b45a"; g.lineWidth = 8; g.strokeRect(10, 10, 236, 680);
  const words = [["MOVING", "THE MAIL"], ["1959", "MISSILE MAIL"], ["AIR MAIL", "1918"], ["U.S.", "POST OFFICE"]][k % 4];
  drawText(g, words[0], 128, 268, 210, 40, { fg: "#f4ecd8", style: "slab" });
  drawText(g, words[1], 128, 318, 210, 26, { fg: "#d9b45a", style: "stencil" });
});
/** impact crack + scorch decal around the missile's entry hole (512 x 512, alpha) */
export const crackHD = () => ctex("crackHD", 512, 512, (g, r) => {
  const c = 256;
  const gr = g.createRadialGradient(c, c, 30, c, c, 240); gr.addColorStop(0, "rgba(40,30,30,0.85)"); gr.addColorStop(0.45, "rgba(60,45,40,0.35)"); gr.addColorStop(1, "rgba(60,45,40,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(30,20,25,0.9)"; g.lineCap = "round";
  for (let i = 0; i < 11; i++) {
    let a = (i / 11) * TAU + U(r, -0.2, 0.2), d = 70, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d;
    g.lineWidth = 7; g.beginPath(); g.moveTo(x, y);
    while (d < 230) { d += U(r, 20, 45); a += U(r, -0.35, 0.35); x = c + Math.cos(a) * d; y = c + Math.sin(a) * d; g.lineTo(x, y); g.lineWidth = Math.max(2, g.lineWidth - 1); }
    g.stroke();
  }
});
/** wall clock face (256 x 256) */
export const clockHD = () => ctex("clockHD", 256, 256, (g) => {
  g.fillStyle = "#f7f1e1"; g.strokeStyle = "#3a2a1c"; g.lineWidth = 14;
  g.beginPath(); g.arc(128, 128, 112, 0, TAU); g.fill(); g.stroke();
  g.lineCap = "round"; g.strokeStyle = "#221f2e";
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.lineWidth = 7; g.beginPath(); g.moveTo(128 + 80 * Math.cos(a), 128 + 80 * Math.sin(a)); g.lineTo(128 + 96 * Math.cos(a), 128 + 96 * Math.sin(a)); g.stroke(); }
  g.lineWidth = 11; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 60); g.stroke();
  g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(180, 140); g.stroke();
});

// ---------------- sets look pass: shared painters (textures.md 3.0, ink.md 3.2, world.md 3.3) ----------------
const FONT = {
  slab: "'DejaVu Serif', 'Bitstream Charter', Georgia, serif",
  stencil: "'Inter Display', 'DejaVu Sans', Arial, sans-serif",
  script: "Caladea, 'DejaVu Serif', serif",
  plate: "'DejaVu Sans', Arial, sans-serif",
};
export type SignStyle = keyof typeof FONT;
const hexRgb = (hex: string, k = 1) => { const c = new THREE.Color(hex); return `${Math.round(Math.min(1, c.r * k) * 255)},${Math.round(Math.min(1, c.g * k) * 255)},${Math.round(Math.min(1, c.b * k) * 255)}`; };
/** Tinted-dark detail line, the reference's thin line weight: local colour x 0.40, +-10 % width, round caps (ink.md 3.2) */
export function detailLine(g: G, pts: [number, number][], base: string, lw: number, r: R, a = 0.85, k = 0.4) {
  g.strokeStyle = `rgba(${hexRgb(base, k)},${a})`;
  g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = lw * (0.9 + 0.2 * r());
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
}
/** lit lip next to a seam (+5 L*) */
const lip = (g: G, x0: number, y0: number, x1: number, y1: number, lw: number, a = 0.22) => {
  g.strokeStyle = `rgba(255,250,236,${a})`; g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
};
/** three octaves of value variation (textures.md 3.0): O1 broad drift, O2 patches, O3 dabs/speckle. ppm = px per metre */
const octaves = (g: G, r: R, W: number, H: number, ppm: number, light: string, dark: string, k = 1) => {
  const area = (W / ppm) * (H / ppm);
  const n1 = Math.max(3, Math.min(24, Math.round(area / 3))), n2 = Math.max(10, Math.min(260, Math.round(area * 4))), n3 = Math.min(26000, Math.round(area * 2600));
  for (let i = 0; i < n1; i++) { const x = U(r, 0, W), y = U(r, 0, H), rad = Math.min(W, H) * 0.45 > U(r, 0.8, 2.5) * ppm ? U(r, 0.8, 2.5) * ppm : Math.min(W, H) * U(r, 0.2, 0.45), l = r() > 0.5; wrap2(W, H, x, y, rad * 1.5, (xx, yy) => blotch(g, xx, yy, rad, 1.5, l ? light : dark, U(r, 0.1, 0.16) * k)); }
  for (let i = 0; i < n2; i++) { const x = U(r, 0, W), y = U(r, 0, H), rad = U(r, 0.15, 0.5) * ppm, l = r() > 0.5; wrap2(W, H, x, y, rad * 1.3, (xx, yy) => blotch(g, xx, yy, rad, 1.3, l ? light : dark, U(r, 0.08, 0.12) * k)); }
  for (let i = 0; i < n3; i++) { const x = U(r, 0, W), y = U(r, 0, H), rad = Math.max(0.6, U(r, 0.005, 0.02) * ppm), l = r() > 0.5; g.fillStyle = `rgba(${l ? light : dark},${(U(r, 0.12, 0.22) * k).toFixed(3)})`; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); }
};
/** draw text fitted into a box (cx, cy centre, max width mw, cap height capPx), with a dark outline + offset shadow */
export const drawText = (g: G, text: string, cx: number, cy: number, mw: number, capPx: number, o: { fg: string; style?: SignStyle; stroke?: string; shadow?: string; italic?: boolean; track?: number }) => {
  const st = o.style ?? "slab", px = capPx / 0.72;
  g.save();
  g.font = `${o.italic ? "italic " : ""}bold ${px}px ${FONT[st]}`;
  g.textAlign = "center"; g.textBaseline = "middle";
  const track = o.track ?? (st === "stencil" ? 0.08 : 0.03);
  const chars = [...text], ws = chars.map((c) => g.measureText(c).width), tw = ws.reduce((a, b) => a + b, 0) + track * px * (chars.length - 1);
  const sx = Math.min(1, mw / tw);
  g.translate(cx, cy + capPx * 0.03); g.scale(sx, 1);
  const pass = (dx: number, dy: number, fill: string | null, stroke: string | null, lw: number) => {
    let x = -tw / 2;
    chars.forEach((c, i) => {
      const xc = x + ws[i] / 2;
      if (stroke) { g.lineJoin = "round"; g.strokeStyle = stroke; g.lineWidth = lw; g.strokeText(c, xc + dx, dy); }
      if (fill) { g.fillStyle = fill; g.fillText(c, xc + dx, dy); }
      x += ws[i] + track * px;
    });
  };
  if (o.shadow) pass(capPx * 0.035, capPx * 0.035, o.shadow, o.shadow, capPx * 0.05);
  if (o.stroke) pass(0, 0, null, o.stroke, capPx * 0.06);
  pass(0, 0, o.fg, null, 0);
  g.restore();
};
/** sign board texture (world.md 3.3): board fill, inner border at 6 % h, ink outline 3 % h, text cap 62 % h with an
 *  outline and an offset shadow, light wear. bg null = transparent decal. sub = smaller second line. */
export const signTex = (key: string, text: string, W: number, H: number, o: { bg: string | null; fg: string; style?: SignStyle; border?: string | null; sub?: string; subFg?: string; cap?: number; stroke?: string; italic?: boolean }) =>
  ctex("sign_" + key, W, H, (g, r) => {
    if (o.bg) {
      g.fillStyle = o.bg; g.fillRect(0, 0, W, H);
      octaves(g, r, W, H, H / 1.0, "255,250,235", "60,45,35", 0.5);
      if (o.border !== null) {
        g.strokeStyle = o.border ?? `rgba(${hexRgb(o.bg, 0.55)},0.9)`; g.lineWidth = H * 0.035; rr(g, H * 0.06, H * 0.06, W - H * 0.12, H - H * 0.12, H * 0.05); g.stroke();
        g.strokeStyle = "rgba(34,31,46,0.9)"; g.lineWidth = H * 0.03; g.strokeRect(H * 0.015, H * 0.015, W - H * 0.03, H - H * 0.03);
      }
    }
    const cap = (o.cap ?? (o.sub ? 0.42 : 0.62)) * H, cy = o.sub ? H * 0.4 : H * 0.5;
    drawText(g, text, W / 2, cy, W * 0.88, cap, { fg: o.fg, style: o.style, stroke: o.stroke ?? (o.bg ? `rgba(${hexRgb(o.bg, 0.45)},0.9)` : undefined), shadow: o.bg ? `rgba(${hexRgb(o.bg, 0.7)},0.8)` : undefined, italic: o.italic });
    if (o.sub) drawText(g, o.sub, W / 2, H * 0.76, W * 0.86, H * 0.17, { fg: o.subFg ?? o.fg, style: "stencil" });
    if (o.bg) for (let i = 0; i < 5; i++) blotch(g, U(r, 0, W), U(r, 0, H), U(r, 0.1, 0.3) * H, 2, "90,70,50", 0.06);
  });
/** 48-star US flag (1959: the 49-star flag took effect on 4 July), 13 stripes, soft cloth folds (512 x 270) */
export const flag48HD = () => ctex("flag48HD", 512, 270, (g) => {
  const W = 512, H = 270, sh = H / 13;
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f4f0e6" : "#c8323a"; g.fillRect(0, i * sh, W, sh + 1); }
  const cw = W * 0.4, ch = sh * 7;
  g.fillStyle = "#2c3f86"; g.fillRect(0, 0, cw, ch);
  g.fillStyle = "#f4f0e6";
  for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) {
    const cx = cw * (i + 0.5) / 8, cy = ch * (j + 0.5) / 6, R0 = 7, R1 = 2.9;
    g.beginPath(); for (let a = 0; a < 10; a++) { const rd = a % 2 ? R1 : R0, b = -Math.PI / 2 + (a * Math.PI) / 5; g.lineTo(cx + rd * Math.cos(b), cy + rd * Math.sin(b)); } g.fill();
  }
  for (let x = 0; x < W; x += 80) { const lg = g.createLinearGradient(x, 0, x + 80, 0); lg.addColorStop(0, "rgba(255,255,255,0.1)"); lg.addColorStop(0.5, "rgba(0,0,0,0)"); lg.addColorStop(1, "rgba(30,20,40,0.2)"); g.fillStyle = lg; g.fillRect(x, 0, 80, H); }
});

/** Regulus I skin for the fuselage lathe (2048 x 512). u = canvas x runs tail (0) -> nose (1) over 9.02 m (227 px/m);
 *  v runs once around (512 px = 4.15 m, 123 px/m): canvas y = H/2 is the -z side, y = 0 / H the +z side, H/4 the top.
 *  Warm white #e7e1d6 (textures.md 3.5), ring seams every 0.7 m + 2 longitudinal seams with rivet rows, red bands with
 *  dark edges, "U.S. MAIL" (navy slab) both sides ahead of the wing, "U.S. NAVY" stencil aft, roundel, mail hatch on
 *  top, chips, grime pulled aft, tail soot. */
export const missileSkinHD = () => ctex("missileSkinHD2", 2048, 512, (g, r) => {
  const W = 2048, H = 512, PU = W / 9.02, PV = H / 4.15, AX = PU / PV;
  g.fillStyle = "#e7e1d6"; g.fillRect(0, 0, W, H);
  octaves(g, r, W, H, PU, "250,246,236", "160,150,140", 0.7);
  // nose cone a shade greyer
  const ng = g.createLinearGradient(0.9 * W, 0, W, 0); ng.addColorStop(0, "rgba(215,211,203,0)"); ng.addColorStop(0.3, "rgba(205,201,195,0.8)"); ng.addColorStop(1, "rgba(195,191,186,0.9)");
  g.fillStyle = ng; g.fillRect(0.9 * W, 0, 0.1 * W, H);
  // red bands with a darker 3 px edge and a lit lip
  for (const [a, b] of [[0.075, 0.125], [0.905, 0.945]]) {
    g.fillStyle = "#cf3328"; g.fillRect(a * W, 0, (b - a) * W, H);
    g.fillStyle = "rgba(143,31,26,0.9)"; g.fillRect(a * W, 0, 3, H); g.fillRect(b * W - 3, 0, 3, H);
    g.fillStyle = "rgba(255,225,210,0.2)"; g.fillRect(a * W + 3, 0, 4, H);
  }
  g.fillStyle = "rgba(40,36,44,0.75)"; g.fillRect(0.985 * W, 0, 0.015 * W, H); // dark tip ring at the intake lip
  // anti-glare panel ahead of the wing on top (v = 0.75 -> canvas y = H/4)
  g.fillStyle = "#24407a"; rr(g, 0.62 * W, H * 0.25 - 0.2 * PV, 1.2 * PU, 0.4 * PV, 6); g.fill();
  // ring seams every 0.7 m and longitudinal seams (+-50 deg from the top, and the belly)
  const seam = "#8c8a92";
  for (let x = 0.35 * PU; x < W; x += 0.7 * PU) {
    detailLine(g, [[x, 0], [x, H]], "#d8d2c8", 2.4, r, 0.75, 0.55); lip(g, x + 2.5, 0, x + 2.5, H, 1.5);
    for (let y = 4; y < H; y += 0.06 * PV) { g.fillStyle = "rgba(110,106,116,0.55)"; g.beginPath(); g.arc(x + 6, y, 1.6, 0, TAU); g.fill(); }
  }
  for (const v of [0.389, 0.111, 0.75 - 0.5]) {
    const y = v * H; detailLine(g, [[0, y], [W, y]], seam, 2.2, r, 0.55, 0.75);
    for (let x = 6; x < W; x += 0.08 * PU) { g.fillStyle = "rgba(110,106,116,0.45)"; g.beginPath(); g.arc(x, y + 5, 1.4, 0, TAU); g.fill(); }
  }
  // mail hatch on top of the forward fuselage
  const hx = 0.7 * W, hy = H * 0.25 - 0.32 * PV, hw = 0.95 * PU, hh = 0.5 * PV;
  g.fillStyle = "rgba(255,255,255,0.18)"; rr(g, hx, hy, hw, hh, 8); g.fill();
  detailLine(g, [[hx, hy], [hx + hw, hy], [hx + hw, hy + hh], [hx, hy + hh], [hx, hy]], "#c8c2b8", 3, r, 0.9, 0.5);
  for (const [px, py] of [[hx + 8, hy + 8], [hx + hw - 8, hy + 8], [hx + 8, hy + hh - 8], [hx + hw - 8, hy + hh - 8]]) nail(g, px, py, 3, "#6a6872");
  // lettering, both sides (see header for the mirror / flip per side)
  const side = (cy: number, mirror: boolean, flip: boolean, fn: () => void) => { g.save(); g.translate(0, cy); g.scale(mirror ? -1 : 1, flip ? -1 : 1); fn(); g.restore(); };
  const label = (u0: number, u1: number, dv: number, text: string, capM: number, fg: string, st: SignStyle) => {
    for (const [cy, mirror, flip, sgn] of [[H / 2, true, false, -1], [0, false, true, 1], [H, false, true, 1]] as const) {
      side(cy + sgn * dv * PV, mirror, flip, () => {
        const cx = ((u0 + u1) / 2) * W * (mirror ? -1 : 1);
        g.save(); g.translate(cx, 0); g.scale(AX, 1);
        drawText(g, text, 0, 0, ((u1 - u0) * W) / AX, capM * PV, { fg, style: st, stroke: "rgba(231,225,214,0.9)" });
        g.restore();
      });
    }
  };
  label(0.64, 0.88, 0.12, "U.S. MAIL", 0.42, "#24407a", "slab");
  label(0.2, 0.3, 0.1, "U.S. NAVY", 0.17, "#1e2230", "stencil");
  label(0.66, 0.86, -0.22, "REGULUS I  -  SSG 317", 0.08, "#1e2230", "stencil");
  // star-and-bar roundel behind the wing root, both sides
  for (const [cy, sgn] of [[H / 2, -1], [0, 1], [H, 1]] as const) {
    const cx = 0.42 * W, y = cy + sgn * 0.14 * PV;
    g.save(); g.translate(cx, y); g.scale(AX, 1);
    const R0 = 0.24 * PV;
    g.fillStyle = "#f4f0e6"; g.fillRect(-R0 * 1.9, -R0 * 0.32, R0 * 3.8, R0 * 0.64);
    g.fillStyle = "#cf3328"; g.fillRect(-R0 * 1.8, -R0 * 0.1, R0 * 3.6, R0 * 0.2);
    g.fillStyle = "#24407a"; g.beginPath(); g.arc(0, 0, R0, 0, TAU); g.fill();
    g.fillStyle = "#f4f0e6"; g.beginPath(); for (let a = 0; a < 10; a++) { const rd = a % 2 ? R0 * 0.38 : R0 * 0.92, b = -Math.PI / 2 * (sgn < 0 ? 1 : -1) + (a * Math.PI) / 5; g.lineTo(rd * Math.cos(b), rd * Math.sin(b)); } g.fill();
    g.restore();
  }
  // yellow / black hazard chevron near the booster mount (belly, aft), NO STEP box
  for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? "#1e2230" : "#f0c53a"; g.fillRect(0.16 * W + k * 14, H * 0.75 - 30, 14, 60); }
  // wear: chips along seams + grime streaks pulled aft
  for (let i = 0; i < 520; i++) { g.fillStyle = r() < 0.7 ? "rgba(185,180,171,0.5)" : "rgba(120,112,105,0.35)"; g.beginPath(); g.arc(U(r, 0, W), U(r, 0, H), U(r, 0.6, 1.8), 0, TAU); g.fill(); }
  for (let i = 0; i < 40; i++) { const x = U(r, 0.1, 1) * W, y = U(r, 0, H), len = U(r, 0.1, 0.4) * PU, lg = g.createLinearGradient(x, 0, x - len, 0); lg.addColorStop(0, "rgba(120,110,100,0.07)"); lg.addColorStop(1, "rgba(120,110,100,0)"); g.fillStyle = lg; g.fillRect(x - len, y, len, U(r, 2, 6)); }
  // exhaust soot: alpha .6 at the nozzle -> 0 over 0.6 m, fine streaks
  const sg = g.createLinearGradient(0, 0, 0.6 * PU, 0); sg.addColorStop(0, "rgba(42,42,51,0.6)"); sg.addColorStop(1, "rgba(42,42,51,0)");
  g.fillStyle = sg; g.fillRect(0, 0, 0.6 * PU, H);
  for (let i = 0; i < 40; i++) { const y = U(r, 0, H); detailLine(g, [[0, y], [U(r, 0.3, 0.8) * PU, y + U(r, -3, 3)]], "#5a5560", U(r, 1, 2), r, 0.25, 1); }
});
/** wing / fin paint (planar uv, 512 px = 4 m): warm white, panel lines + rivets, leading-edge lip, NO STEP box */
export const wingHD = () => ctex("wingHD2", 512, 512, (g, r) => {
  const S = 512, P = 128;
  g.fillStyle = "#e7e1d6"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, P, "250,246,236", "160,150,140", 0.7);
  for (let x = 40; x < S; x += 0.55 * P) { detailLine(g, [[x, 0], [x, S]], "#d8d2c8", 2, r, 0.7, 0.55); for (let y = 3; y < S; y += 8) { g.fillStyle = "rgba(110,106,116,0.45)"; g.beginPath(); g.arc(x + 5, y, 1.3, 0, TAU); g.fill(); } }
  for (let y = 60; y < S; y += 0.7 * P) { detailLine(g, [[0, y], [S, y]], "#d8d2c8", 2, r, 0.6, 0.55); lip(g, 0, y + 2, S, y + 2, 1.5); }
  g.strokeStyle = "rgba(60,58,70,0.6)"; g.lineWidth = 2; g.strokeRect(200, 210, 64, 26);
  g.font = `bold 16px ${FONT.stencil}`; g.fillStyle = "rgba(30,34,48,0.75)"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("NO STEP", 232, 223);
  for (let i = 0; i < 160; i++) { g.fillStyle = "rgba(185,180,171,0.5)"; g.beginPath(); g.arc(U(r, 0, S), U(r, 0, S), U(r, 0.6, 1.6), 0, TAU); g.fill(); }
});

/** submarine hull plating (1024 px = 4 m, 256 px/m): slate #4d586b, staggered 2 x 1 m plates (+-4 L* each), welded seams
 *  with a lit lip above, rivet rows every 0.15 m, salt and rust streaks running down from the seams (textures.md 3.4) */
export const hullHD = () => ctex("hullHD2", 1024, 1024, (g, r) => {
  const S = 1024, PW = 512, PH = 256;
  g.fillStyle = "#4d586b"; g.fillRect(0, 0, S, S);
  for (let row = 0; row < S / PH; row++) for (let k = -1; k < S / PW + 1; k++) {
    const x = k * PW + (row % 2) * (PW / 2), c = jit(r, "#4d586b", 0.06, 3, 0.1);
    g.fillStyle = c; g.fillRect(x, row * PH, PW, PH);
  }
  octaves(g, r, S, S, 256, "120,132,150", "30,36,48", 0.8);
  for (let row = 0; row < S / PH; row++) {
    const y = row * PH;
    detailLine(g, [[0, y + 1.5], [S, y + 1.5]], "#4d586b", 3, r, 0.75, 0.55); lip(g, 0, y + 4, S, y + 4, 2, 0.18);
    for (let x = 6; x < S; x += 38) nail(g, x, y + 12, 4.5, "#2d3442");
    for (let k = -1; k < S / PW + 1; k++) {
      const x = k * PW + (row % 2) * (PW / 2);
      if (x < -4 || x > S + 4) continue;
      detailLine(g, [[x, y], [x, y + PH]], "#4d586b", 3, r, 0.7, 0.55);
      for (let yy = y + 20; yy < y + PH - 10; yy += 38) nail(g, x + 10, yy, 4.5, "#2d3442");
    }
  }
  for (let i = 0; i < 26; i++) { // salt / rust streaks from the seams
    const row = Math.floor(r() * 4), x = U(r, 0, S), y = row * PH + 14, len = U(r, 0.4, 1.0) * 256, rust = r() < 0.35, w = U(r, 0.05, 0.16) * 256;
    const lg = g.createLinearGradient(0, y, 0, y + len);
    lg.addColorStop(0, rust ? "rgba(139,106,88,0.22)" : "rgba(169,180,194,0.2)"); lg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = lg; wrapX(S, x, w, (xx) => g.fillRect(xx, y, w * U(r, 0.3, 1), len));
  }
});
/** deck casing side (1024 x 256 = 8 m x 2 m): flat slate with two staggered rows of limber holes (0.36 x 0.12 m, pitch
 *  0.55 m), dark insides with a lit lower lip, weld seams, salt streaks */
export const casingHD = () => ctex("casingHD", 1024, 256, (g, r) => {
  const W = 1024, H = 256, P = 128;
  g.fillStyle = "#6c7884"; g.fillRect(0, 0, W, H);
  octaves(g, r, W, H, P, "150,160,172", "40,46,58", 0.8);
  for (const [row, y] of [[0, 0.62], [1, 0.82]] as const) for (let x = row * 0.275 * P; x < W; x += 0.55 * P) {
    const hw = 0.36 * P, hh = 0.12 * P, yy = y * H;
    wrapX(W, x, hw, (xx) => { rr(g, xx, yy, hw, hh, hh / 2); g.fillStyle = "#2e3742"; g.fill(); g.fillStyle = "rgba(190,200,215,0.3)"; g.fillRect(xx + 4, yy + hh - 2, hw - 8, 2); });
  }
  for (let x = 0; x < W; x += 2 * P) detailLine(g, [[x, 0], [x, H]], "#6c7884", 2.5, r, 0.6, 0.5);
  detailLine(g, [[0, 0.12 * H], [W, 0.12 * H]], "#6c7884", 2.5, r, 0.6, 0.5);
  for (let i = 0; i < 18; i++) { const x = U(r, 0, W), lg = g.createLinearGradient(0, 0.2 * H, 0, H); lg.addColorStop(0, "rgba(200,210,220,0.14)"); lg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lg; g.fillRect(x, 0.2 * H, U(r, 4, 12), H); }
});
/** sub deck: weathered teak planks along the hull (1024 px = 4 m, 256 px/m), 0.125 m boards, staggered butt joints,
 *  #6e5a46 gaps, grain, a lit lip per board (world.md 4.2) */
export const subDeckHD = () => ctex("subDeckHD2", 1024, 1024, (g, r) => {
  const S = 1024, P = 32;
  g.fillStyle = "#6e5a46"; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += P) {
    let x = U(r, -500, 0);
    while (x < S) {
      const len = U(r, 1.6, 2.8) * 256, c = jit(r, "#a08a6e", 0.07, 4, 0.12);
      wrapX(S, x, len, (xx) => {
        g.fillStyle = c; g.fillRect(xx + 1.5, y + 1.5, len - 3, P - 3);
        g.fillStyle = "rgba(255,245,225,0.16)"; g.fillRect(xx + 1.5, y + 1.5, len - 3, 2);
        g.fillStyle = "rgba(60,45,30,0.16)"; g.fillRect(xx + 1.5, y + P - 4, len - 3, 2.5);
      });
      grain(g, r, S, x + 4, y + P * 0.4, len - 10, 2.5, 1.2, "rgba(80,60,40,0.2)");
      grain(g, r, S, x + 4, y + P * 0.72, len - 10, 2.5, 1, "rgba(80,60,40,0.14)");
      if (r() < 0.5) wrapX(S, x, 10, (xx) => { nail(g, xx + 8, y + 9, 2, "#5a4a3a"); nail(g, xx + 8, y + P - 9, 2, "#5a4a3a"); });
      x += len;
    }
  }
  octaves(g, r, S, S, 256, "235,220,195", "70,55,40", 0.6);
});
/** asphalt (1024 px = 4 m): warm grey base, 3 octaves of tar blotches, aggregate specks, cracks with a lit lip, patches */
export const asphaltHD = (key = "asphaltHD2", base = "#7b7770") => ctex(key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 8; i++) { const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 0.4, 1.2) * 256; wrap2(S, S, x, y, rad * 1.5, (xx, yy) => blotch(g, xx, yy, rad, 1.5, r() > 0.5 ? "150,148,140" : "58,56,60", 0.14)); }
  for (let i = 0; i < 300; i++) { const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 0.04, 0.12) * 256; wrap2(S, S, x, y, rad, (xx, yy) => blotch(g, xx, yy, rad, 1.2, r() > 0.5 ? "150,148,140" : "58,56,60", 0.08)); }
  speckle(g, r, S, S, 6000, ["rgba(95,92,90,0.3)", "rgba(175,172,165,0.3)", "rgba(60,58,62,0.25)"], 0.8, 2.0);
  g.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    let x = U(r, 0, S), y = U(r, 0, S); const pts: [number, number][] = [[x, y]]; let a = U(r, 0, TAU);
    for (let k = 0; k < 7; k++) { a += U(r, -0.6, 0.6); const d = U(r, 0.08, 0.25) * 256; x += Math.cos(a) * d; y += Math.sin(a) * d; pts.push([x, y]); }
    g.save(); g.translate(1, -1); detailLine(g, pts, "#d0ccc4", 1.2, r, 0.25, 1); g.restore();
    detailLine(g, pts, base, 2.5, r, 0.6, 0.45);
  }
  for (let i = 0; i < 3; i++) { const x = U(r, 0, S), y = U(r, 0, S), w = U(r, 0.4, 0.9) * 256, h = U(r, 0.3, 0.6) * 256; g.fillStyle = "rgba(50,48,52,0.18)"; rr(g, x, y, w, h, 12); g.fill(); detailLine(g, [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], base, 1.5, r, 0.35, 0.5); }
  for (let i = 0; i < 2; i++) blotch(g, U(r, 100, S - 100), U(r, 100, S - 100), U(r, 40, 90), 1.4, "35,30,40", 0.3); // oil stains
});
/** runway concrete (1024 px = 3.8 m = half a 7.6 m slab): warm #cfc8b8, joint lines #a39c8c with a lit lip, patchwork
 *  tint, hairline cracks, tyre-skid streaks along x (world.md 4.3) */
export const runwayHD = () => ctex("runwayHD", 1024, 1024, (g, r) => {
  const S = 1024, P = 1024 / 3.8;
  g.fillStyle = "#cfc8b8"; g.fillRect(0, 0, S, S);
  g.fillStyle = "rgba(170,160,140,0.12)"; g.fillRect(0, 0, S / 2, S / 2); g.fillStyle = "rgba(255,250,240,0.1)"; g.fillRect(S / 2, S / 2, S / 2, S / 2);
  octaves(g, r, S, S, P, "246,240,228", "120,110,95", 1);
  for (let i = 0; i < 9; i++) { // skid streaks
    const y = U(r, 0, S), len = U(r, 0.4, 1) * S, x = U(r, 0, S), w = U(r, 0.25, 0.35) * P;
    const lg = g.createLinearGradient(x, 0, x + len, 0); lg.addColorStop(0, "rgba(143,138,128,0)"); lg.addColorStop(0.3, "rgba(120,115,108,0.22)"); lg.addColorStop(1, "rgba(143,138,128,0)");
    g.fillStyle = lg; wrapX(S, x, len, (xx) => g.fillRect(xx, y, len, w));
  }
  for (const k of [0, S / 2]) {
    detailLine(g, [[k + 2, 0], [k + 2, S]], "#a39c8c", 4, r, 0.85, 0.7); lip(g, k + 5, 0, k + 5, S, 2);
    detailLine(g, [[0, k + 2], [S, k + 2]], "#a39c8c", 4, r, 0.85, 0.7); lip(g, 0, k + 5, S, k + 5, 2);
  }
  for (let i = 0; i < 6; i++) { let x = U(r, 0, S), y = U(r, 0, S); const pts: [number, number][] = [[x, y]]; for (let k = 0; k < 6; k++) { x += U(r, -40, 40); y += U(r, -40, 40); pts.push([x, y]); } detailLine(g, pts, "#cfc8b8", 1.4, r, 0.5, 0.55); }
  for (let i = 0; i < 4; i++) blotch(g, U(r, 0, S), U(r, 0, S), U(r, 30, 80), 1.3, "90,80,70", 0.18);
});
/** poured concrete (1024 px = one tile): warm pale grey, saw-cut joints at half tile with a lit lip, 3 octaves, rust /
 *  water stains, hairline cracks (textures.md 3.3) */
export const concreteHD = (key = "concreteHD2", base = "#c9c2b4") => ctex(key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = jit(r, base, 0.04, 3, 0.1) + "40"; g.fillRect(i * 512, j * 512, 512, 512); }
  octaves(g, r, S, S, 256, "246,242,232", "110,100,88", 1);
  for (let i = 0; i < 3; i++) { const x = U(r, 0, S), y = U(r, 0, S * 0.6), lg = g.createLinearGradient(0, y, 0, y + 200); lg.addColorStop(0, "rgba(165,138,106,0.14)"); lg.addColorStop(1, "rgba(165,138,106,0)"); g.fillStyle = lg; g.fillRect(x, y, U(r, 20, 60), 200); }
  for (let i = 0; i < 6; i++) { let x = U(r, 0, S), y = U(r, 0, S); const pts: [number, number][] = [[x, y]]; for (let k = 0; k < 6; k++) { x += U(r, -35, 35); y += U(r, -35, 35); pts.push([x, y]); } detailLine(g, pts, base, 1.3, r, 0.5, 0.55); }
  for (const k of [0, 512]) {
    detailLine(g, [[k + 2, 0], [k + 2, S]], "#857d72", 3.5, r, 0.8, 0.8); lip(g, k + 5, 0, k + 5, S, 2);
    detailLine(g, [[0, k + 2], [S, k + 2]], "#857d72", 3.5, r, 0.8, 0.8); lip(g, 0, k + 5, S, k + 5, 2);
  }
});
/** beach sand (1024 px = 4 m): ripples, wet / dry octaves, shell specks */
export const sandHD = () => ctex("sandHD2", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#e6d3a3"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 256, "252,242,210", "190,160,110", 1.2);
  for (let i = 0; i < 60; i++) { const y = U(r, 0, S), x = U(r, 0, S), len = U(r, 80, 260); detailLine(g, [[x, y], [x + len * 0.5, y + U(r, -6, 6)], [x + len, y + U(r, -4, 4)]], "#e6d3a3", 1.6, r, 0.3, 0.7); }
  speckle(g, r, S, S, 400, ["rgba(250,248,240,0.7)", "rgba(150,120,90,0.4)"], 1, 2.4);
});
/** clapboard siding (512 px = 2 m, 0.2 m boards): pastel, lit board lip, dark shadow line under each lip, 3 octaves,
 *  vertical butt joints, nail dots */
export const sidingHD = (col: string) => ctex("sidingHD2" + col, 512, 512, (g, r) => {
  const S = 512, B = 51.2;
  g.fillStyle = col; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 10; i++) {
    const y = i * B, lg = g.createLinearGradient(0, y, 0, y + B);
    lg.addColorStop(0, "rgba(255,255,255,0.16)"); lg.addColorStop(0.7, "rgba(255,255,255,0)"); lg.addColorStop(1, "rgba(60,40,40,0.14)");
    g.fillStyle = lg; g.fillRect(0, y, S, B);
    detailLine(g, [[0, y + B - 2], [S, y + B - 2]], col, 2.6, r, 0.85, 0.45);
    const jx = U(r, 0, S); detailLine(g, [[jx, y + 2], [jx, y + B - 3]], col, 1.4, r, 0.6, 0.55);
  }
  octaves(g, r, S, S, 256, "255,252,244", "120,100,90", 0.6);
});
/** canvas mail-sack cloth (512 px = 1 m around x up): khaki duck weave #c8b48a, a vertical stitched seam, a navy
 *  "U.S. MAIL" stencil on two opposite sides (u 0.25, 0.75), darker gathered top, soil at the bottom */
export const burlapHD = () => ctex("canvasSack", 1024, 512, (g, r) => {
  const W = 1024, H = 512;
  g.fillStyle = "#c8b48a"; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 4) { g.fillStyle = `rgba(120,95,60,${0.05 + 0.06 * r()})`; g.fillRect(0, y, W, 1.5); }
  for (let x = 0; x < W; x += 4) { g.fillStyle = `rgba(250,238,205,${0.04 + 0.06 * r()})`; g.fillRect(x, 0, 1.5, H); }
  octaves(g, r, W, H, 400, "240,228,195", "110,85,50", 1);
  for (const x of [4, W / 2]) { detailLine(g, [[x, 0], [x, H]], "#c8b48a", 3, r, 0.8, 0.5); for (let y = 6; y < H; y += 14) detailLine(g, [[x - 5, y], [x + 5, y + 5]], "#c8b48a", 1.5, r, 0.6, 0.5); }
  const tg = g.createLinearGradient(0, 0, 0, H * 0.22); tg.addColorStop(0, "rgba(90,70,40,0.35)"); tg.addColorStop(1, "rgba(90,70,40,0)"); g.fillStyle = tg; g.fillRect(0, 0, W, H * 0.22);
  const bg = g.createLinearGradient(0, H, 0, H * 0.8); bg.addColorStop(0, "rgba(90,70,45,0.35)"); bg.addColorStop(1, "rgba(90,70,45,0)"); g.fillStyle = bg; g.fillRect(0, H * 0.8, W, H * 0.2);
  for (const u of [0.25, 0.75]) {
    drawText(g, "U.S. MAIL", u * W, H * 0.5, W * 0.3, H * 0.13, { fg: "rgba(36,64,122,0.85)", style: "stencil" });
    g.fillStyle = "rgba(36,64,122,0.7)"; g.fillRect(u * W - W * 0.13, H * 0.62, W * 0.26, 6);
  }
  for (let i = 0; i < 6; i++) blotch(g, U(r, 0, W), U(r, H * 0.5, H), U(r, 30, 90), 1.5, "100,80,55", 0.15);
});
/** mail-truck box side (1024 x 512 = 4.3 m x 2.55 m): 1955 livery: warm white upper, navy below the red belt (the
 *  belt and the navy are real geometry, this paints the white field), "U.S. MAIL" navy slab, "POST OFFICE DEPARTMENT",
 *  vertical ribs every 0.35 m, rivet columns, eagle disc, a lit top lip, dust on the lowest part */
export const truckHD = () => ctex("truckSide2", 1024, 512, (g, r) => {
  const W = 1024, H = 512, PX = W / 4.3, PY = H / 2.55, split = H - 0.9 * PY;
  g.fillStyle = "#f2efe6"; g.fillRect(0, 0, W, H);
  octaves(g, r, W, H, PX, "255,252,244", "150,140,125", 0.7);
  g.fillStyle = "#24407a"; g.fillRect(0, split, W, H - split);
  octaves(g, r, W, H - split, PX, "80,110,170", "15,25,55", 0.3);
  for (let x = 0.35 * PX; x < W; x += 0.35 * PX) {
    detailLine(g, [[x, 6], [x, H - 4]], x < W ? "#d8d2c4" : "#24407a", 2.2, r, 0.6, 0.6); lip(g, x + 3, 6, x + 3, split - 4, 2, 0.4);
    for (let y = 18; y < H; y += 0.12 * PY) { g.fillStyle = y < split ? "rgba(120,115,110,0.5)" : "rgba(10,20,45,0.5)"; g.beginPath(); g.arc(x + 9, y, 1.8, 0, TAU); g.fill(); }
  }
  g.fillStyle = "rgba(255,255,250,0.5)"; g.fillRect(0, 0, W, 5);
  detailLine(g, [[0, 9], [W, 9]], "#d8d2c4", 2, r, 0.6, 0.6);
  drawText(g, "U.S. MAIL", W * 0.5, split - 0.62 * PY, W * 0.72, 0.42 * PY, { fg: "#24407a", style: "slab", stroke: "#f2efe6", shadow: "rgba(150,140,120,0.5)" });
  drawText(g, "POST OFFICE DEPARTMENT", W * 0.5, split - 0.22 * PY, W * 0.62, 0.11 * PY, { fg: "#c8302c", style: "stencil" });
  drawText(g, "U.S. GOVT  5-1127", W * 0.5, split + 0.45 * PY, W * 0.4, 0.1 * PY, { fg: "#f2efe6", style: "stencil" });
  // eagle disc near the front end
  const ex = W * 0.9, ey = split - 1.2 * PY, er = 0.24 * PY;
  g.fillStyle = "#24407a"; g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill();
  g.strokeStyle = "#f2efe6"; g.lineWidth = 4; g.beginPath(); g.arc(ex, ey, er * 0.82, 0, TAU); g.stroke();
  g.fillStyle = "#f2efe6"; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(ex, ey + 4); g.quadraticCurveTo(ex + sx * er * 0.7, ey - er * 0.6, ex + sx * er * 0.65, ey - er * 0.05); g.quadraticCurveTo(ex + sx * er * 0.3, ey + er * 0.1, ex, ey + er * 0.4); g.fill(); }
  // dust on the lowest 20 %
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(156,132,103,${U(r, 0.15, 0.3).toFixed(2)})`; g.beginPath(); g.arc(U(r, 0, W), H - Math.abs(U(r, -1, 1)) ** 2 * 0.22 * H, U(r, 0.5, 2.5), 0, TAU); g.fill(); }
  for (const x of [3, W - 4]) detailLine(g, [[x, 0], [x, H]], "#d8d2c4", 3, r, 0.8, 0.5);
});
/** oil drum (512 x 256 = around x 0.88 m up): paint colour, two rolling hoops, stencil, rust and drips */
export const drumHD = (col: string, text: string) => ctex("drum" + col + text, 512, 256, (g, r) => {
  const W = 512, H = 256;
  g.fillStyle = col; g.fillRect(0, 0, W, H);
  octaves(g, r, W, H, 280, "255,245,230", "60,40,30", 1);
  for (const y of [H * 0.33, H * 0.66]) { detailLine(g, [[0, y - 5], [W, y - 5]], col, 3, r, 0.8, 0.45); lip(g, 0, y, W, y, 3, 0.3); detailLine(g, [[0, y + 5], [W, y + 5]], col, 2, r, 0.7, 0.55); }
  for (const u of [0.25, 0.75]) drawText(g, text, u * W, H * 0.5, W * 0.35, H * 0.14, { fg: "rgba(245,240,225,0.9)", style: "stencil" });
  for (let i = 0; i < 12; i++) { const x = U(r, 0, W), lg = g.createLinearGradient(0, 0, 0, U(r, 40, 140)); lg.addColorStop(0, "rgba(140,80,40,0.35)"); lg.addColorStop(1, "rgba(140,80,40,0)"); g.fillStyle = lg; g.fillRect(x, 0, U(r, 2, 6), 140); }
  speckle(g, r, W, H, 200, ["rgba(130,75,40,0.5)", "rgba(40,30,30,0.3)"], 0.8, 2.2);
});
/** hangar door leaf grid (1024 x 1024 = 14 m x 9 m: two 7 m leaves): grey-green steel, vertical seams every 1.75 m,
 *  a 4 x 3 window grid in the upper third with frames + glints, a darker kick band, rivets, streaks */
export const hangarDoorHD = () => ctex("hangarDoorHD", 1024, 1024, (g, r) => {
  const S = 1024, PX = S / 14, PY = S / 9;
  g.fillStyle = "#8d9a96"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, PX, "200,210,205", "50,60,58", 1);
  g.fillStyle = "#6c7884"; g.fillRect(0, S - 0.6 * PY, S, 0.6 * PY);
  for (let lf = 0; lf < 2; lf++) {
    const x0 = lf * 7 * PX;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const wx = x0 + 0.6 * PX + i * 1.5 * PX, wy = 0.6 * PY + j * 0.85 * PY, ww = 1.2 * PX, wh = 0.65 * PY;
      const gl = g.createLinearGradient(0, wy, 0, wy + wh); gl.addColorStop(0, "#cfe6ee"); gl.addColorStop(1, "#7fb8d0");
      g.fillStyle = "#5d6a68"; g.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
      g.fillStyle = gl; g.fillRect(wx, wy, ww, wh);
      g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 3; g.beginPath(); g.moveTo(wx + ww * 0.2, wy + wh * 0.8); g.lineTo(wx + ww * 0.45, wy + wh * 0.2); g.stroke();
    }
    for (let k = 0; k <= 4; k++) { const x = x0 + k * 1.75 * PX; detailLine(g, [[x, 0], [x, S]], "#8d9a96", k % 4 ? 2.5 : 5, r, 0.85, 0.45); lip(g, x + 3, 0, x + 3, S, 2); }
    for (let y = 0.3 * PY; y < S; y += 0.6 * PY) for (let k = 0; k < 4; k++) nail(g, x0 + (k + 0.5) * 1.75 * PX, y, 3, "#4a5654");
  }
  detailLine(g, [[0, S - 0.6 * PY], [S, S - 0.6 * PY]], "#6c7884", 3, r, 0.8, 0.5);
  for (let i = 0; i < 20; i++) { const x = U(r, 0, S), lg = g.createLinearGradient(0, 3 * PY, 0, S); lg.addColorStop(0, "rgba(90,80,60,0.12)"); lg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lg; g.fillRect(x, 3 * PY, U(r, 4, 14), S); }
});
/** red / white airfield check band (512 x 128 = 4 squares around x 1 up) */
export const checkHD = () => ctex("checkHD", 512, 256, (g, r) => {
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? "#d8352f" : "#f2efe6"; g.fillRect(i * 64, j * 64, 64, 64); }
  octaves(g, r, 512, 256, 90, "255,250,240", "80,40,40", 0.6);
  for (let i = 0; i <= 8; i++) detailLine(g, [[i * 64, 0], [i * 64, 256]], "#d8b0a0", 1.5, r, 0.4, 0.6);
});
/** post-office lock boxes (1024 x 1024 = 2.4 m square): brass doors with dials, number plates, glass windows */
export const poBoxesHD = () => ctex("poBoxesHD", 1024, 1024, (g, r) => {
  const S = 1024, C = 8, R0 = 10, cw = S / C, ch = S / R0;
  g.fillStyle = "#5a3a22"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < C; i++) for (let j = 0; j < R0; j++) {
    const x = i * cw + 6, y = j * ch + 6, w = cw - 12, h = ch - 12, c = jit(r, "#c9a24e", 0.08, 4, 0.1);
    const lg = g.createLinearGradient(x, y, x + w, y + h); lg.addColorStop(0, c); lg.addColorStop(1, "#8a6a2e");
    g.fillStyle = lg; g.fillRect(x, y, w, h);
    g.fillStyle = "#3a3a46"; g.fillRect(x + 10, y + 10, w * 0.45, h * 0.55);
    g.fillStyle = "rgba(200,225,235,0.35)"; g.fillRect(x + 12, y + 12, w * 0.2, h * 0.2);
    g.fillStyle = "#e8d39a"; g.beginPath(); g.arc(x + w * 0.76, y + h * 0.42, h * 0.18, 0, TAU); g.fill();
    g.strokeStyle = "rgba(60,40,15,0.7)"; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = "#3e2a0e"; g.font = `bold ${h * 0.2}px ${FONT.plate}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(100 + j * C + i), x + w * 0.3, y + h * 0.82);
    detailLine(g, [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], "#c9a24e", 2, r, 0.8, 0.4);
  }
});
/** terrazzo floor (1024 px = 4 m): warm chips, 1 m brass divider grid, a navy / walnut border band */
export const terrazzoHD = () => ctex("terrazzoHD", 1024, 1024, (g, r) => {
  const S = 1024, P = 256;
  g.fillStyle = "#d9c9a8"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { g.fillStyle = "rgba(196,170,130,0.35)"; g.fillRect(i * P, j * P, P, P); }
  octaves(g, r, S, S, P, "250,240,220", "120,95,70", 0.8);
  speckle(g, r, S, S, 9000, ["rgba(143,107,75,0.5)", "rgba(250,245,235,0.6)", "rgba(36,64,122,0.25)", "rgba(110,90,70,0.4)"], 0.8, 2.6);
  for (let k = 0; k < S; k += P) { detailLine(g, [[k + 1, 0], [k + 1, S]], "#d9b45a", 3, r, 0.9, 0.9); detailLine(g, [[0, k + 1], [S, k + 1]], "#d9b45a", 3, r, 0.9, 0.9); }
  g.fillStyle = "rgba(255,240,215,0.1)"; g.fillRect(0, S * 0.3, S, S * 0.2);
});
/** ashlar stone wall (1024 px = 4 m, blocks 1.2 x 0.6 m), warm museum / civic stone, recessed joints with lit lips */
export const ashlarHD = (key: string, base = "#e6d3b0") => ctex("ashlar" + key, 1024, 1024, (g, r) => {
  const S = 1024, P = 256, BH = 0.5 * P;
  g.fillStyle = "#b8a585"; g.fillRect(0, 0, S, S);
  for (let row = 0; row < S / BH; row++) {
    let x = (row % 2) * 0.6 * P - P;
    while (x < S) {
      const w = (r() < 0.3 ? 0.8 : 1.2) * P, c = jit(r, base, 0.05, 4, 0.12);
      wrapX(S, x, w, (xx) => { g.fillStyle = c; g.fillRect(xx + 2, row * BH + 2, w - 4, BH - 4); g.fillStyle = "rgba(255,250,235,0.25)"; g.fillRect(xx + 2, row * BH + 2, w - 4, 3); });
      x += w;
    }
    detailLine(g, [[0, row * BH + 1], [S, row * BH + 1]], base, 2.5, r, 0.6, 0.6);
  }
  octaves(g, r, S, S, P, "255,248,230", "120,95,65", 0.9);
});
/** coastal town facade strip for far backdrops (512 x 256): pastel walls, window rows, roof band; one image per box */
export const townHD = (k: number) => ctex("townHD" + k, 256, 256, (g, r) => {
  const cols = ["#f2efe6", "#f0dc9c", "#b9dcc8", "#f2c2a8", "#e8e4da", "#c9d8ec"], c = cols[k % cols.length];
  g.fillStyle = c; g.fillRect(0, 0, 256, 256);
  octaves(g, r, 256, 256, 30, "255,250,240", "100,90,80", 0.6);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) if (r() < 0.85) { g.fillStyle = r() < 0.3 ? "#f6e7a6" : "#6f8fb0"; g.fillRect(18 + i * 46, 30 + j * 58, 24, 30); detailLine(g, [[18 + i * 46, 62 + j * 58], [42 + i * 46, 62 + j * 58]], c, 3, r, 0.6, 0.7); }
});
