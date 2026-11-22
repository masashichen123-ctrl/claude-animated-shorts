// Hand-painted look textures drawn on canvases (cached), owner: sets (with build.ts). Shared painters from the bridge /
// missile template (value octaves, tinted seams, blotches, sign lettering, clouds, corrugated iron, weatherboards,
// planks) plus the marathon short's own (bottom of the file): the ochre dirt road with ruts, dry stubble, pasture,
// corn rows, the cinder track, red brick, cobbles, hay, the 1904 flag, weathered fence wood.
// No words anywhere: every sign and drawing is pictures only.
import * as THREE from "three";

export const rng = (seed: number) => {
  let s = Math.abs(Math.round(seed * 9301 + 49297)) % 233280 || 1;
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
/** wooden boards (2048 px = 2 m, 8 boards of 0.25 m): ochre / tan planks, grain, knots, nails, dark seams */
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
// ---------------- sets look pass: shared painters (textures.md 3.0, ink.md 3.2, world.md 3.3) ----------------
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

// =================================================================================================================
// MARATHON painters. Same conventions: painted seams are dark TINTS, never pure black (the world ink pass draws
// silhouettes), three value octaves on every big surface, sizes in px per metre.
// =================================================================================================================
/** warm ochre dirt road (1024 px = 6 m, v along the road): two wheel ruts, hoof dents, pebbles, dust blotches */
export const dirtRoadHD = () => ctex("dirtRoadHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#d29a58"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 170, "255,228,170", "130,80,40", 1.1);
  for (const x of [300, 724]) { // ruts: darker compacted bands with light ridges
    g.fillStyle = "rgba(140,85,40,0.22)"; g.fillRect(x - 40, 0, 80, S);
    g.fillStyle = "rgba(255,230,180,0.25)"; g.fillRect(x - 54, 0, 10, S); g.fillRect(x + 44, 0, 10, S);
    for (let i = 0; i < 14; i++) { const y = U(r, 0, S); detailLine(g, [[x - 30 + U(r, -6, 6), y], [x - 28 + U(r, -6, 6), y + U(r, 60, 160)]], "#d29a58", 2, r, 0.35, 0.6); }
  }
  for (let i = 0; i < 30; i++) wrap2(S, S, U(r, 0, S), U(r, 0, S), 90, (x, y) => blotch(g, x, y, U(r, 40, 90), 1.6, r() > 0.5 ? "255,235,190" : "150,95,45", 0.18));
  for (let i = 0; i < 60; i++) { const x = U(r, 0, S), y = U(r, 0, S); g.fillStyle = "rgba(120,70,35,0.3)"; g.beginPath(); g.ellipse(x, y, U(r, 6, 12), U(r, 4, 8), r() * 3, 0, TAU); g.fill(); }
  speckle(g, r, S, S, 1800, ["rgba(255,245,215,0.7)", "rgba(110,65,30,0.5)", "rgba(200,150,100,0.6)"], 1.2, 4.5);
});
/** dry roadside verge / stubble field (1024 px = 4 m): straw yellow-ochre with green-brown tufts and stalk ticks */
export const stubbleHD = (key = "stubbleHD", base = "#cfae5a") => ctex(key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 256, "255,245,190", "110,90,30", 1.1);
  for (let i = 0; i < 26; i++) wrap2(S, S, U(r, 0, S), U(r, 0, S), 110, (x, y) => blotch(g, x, y, U(r, 50, 110), 1.5, r() > 0.6 ? "120,140,60" : "170,120,50", 0.2));
  for (let i = 0; i < 3000; i++) { const x = U(r, 0, S), y = U(r, 0, S), l = U(r, 6, 16); g.strokeStyle = r() > 0.5 ? "rgba(120,95,40,0.35)" : "rgba(255,240,170,0.4)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + U(r, -4, 4), y - l); g.stroke(); }
});
/** summer pasture (1024 px = 4 m): saturated green with lighter sun patches, clover and daisy dabs */
export const pastureHD = (key = "pastureHD", base = "#6aa846") => ctex(key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 256, "220,255,150", "30,80,25", 1.1);
  for (let i = 0; i < 2400; i++) { const x = U(r, 0, S), y = U(r, 0, S), l = U(r, 5, 12); g.strokeStyle = r() > 0.5 ? "rgba(35,90,30,0.35)" : "rgba(215,255,150,0.35)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + U(r, -3, 3), y - l); g.stroke(); }
  for (let i = 0; i < 50; i++) { g.fillStyle = r() > 0.4 ? "rgba(255,255,255,0.85)" : "rgba(255,215,60,0.85)"; const x = U(r, 0, S), y = U(r, 0, S); g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
});
/** a wall of corn seen from the side (1024 x 512 = 4 m wide x 2 m tall, u along the row): stalks, long leaves, tassels */
export const cornWallHD = () => ctex("cornWallHD", 1024, 512, (g, r) => {
  const W = 1024, H = 512;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#5f9a3a"); gr.addColorStop(0.6, "#4a8a32"); gr.addColorStop(1, "#356a28");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    const x = U(r, 0, W), c = r() > 0.5 ? "rgba(150,200,80,0.7)" : "rgba(40,95,35,0.7)";
    wrapX(W, x - 60, 120, (xx) => {
      const x0 = xx + 60;
      g.strokeStyle = "rgba(60,110,40,0.85)"; g.lineWidth = 7; g.beginPath(); g.moveTo(x0, H); g.lineTo(x0 + U(r, -6, 6), 40); g.stroke();
      for (let k = 0; k < 4; k++) { const y = 120 + k * 90 + U(r, -20, 20), d = r() > 0.5 ? 1 : -1; g.strokeStyle = c; g.lineWidth = 9; g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo(x0 + d * 50, y - 40, x0 + d * 95, y + 10); g.stroke(); }
      g.fillStyle = "rgba(240,210,110,0.9)"; g.beginPath(); g.moveTo(x0 - 8, 44); g.lineTo(x0, 6); g.lineTo(x0 + 8, 44); g.fill();
    });
  }
  octaves(g, r, W, H, 256, "200,255,150", "20,50,20", 0.6);
});
/** reddish cinder track (1024 px = 4 m): fine cinders, raked arcs, white lane chalk is added as geometry */
export const cinderHD = () => ctex("cinderHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#c27a4e"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 256, "255,215,170", "100,50,30", 1.0);
  for (let i = 0; i < 40; i++) { const y = U(r, 0, S); detailLine(g, [[0, y], [S * 0.5, y + U(r, -10, 10)], [S, y]], "#c27a4e", 1.6, r, 0.25, 0.6); }
  speckle(g, r, S, S, 2600, ["rgba(255,230,200,0.6)", "rgba(80,40,30,0.5)"], 1, 3.5);
});
/** red brick (512 px = 2 m): running bond, mortar tints, per-brick jitter */
export const brickHD = (base = "#b4513a") => ctex("brickHD" + base, 512, 512, (g, r) => {
  const S = 512, bw = 64, bh = 20;
  g.fillStyle = "#d8c8b0"; g.fillRect(0, 0, S, S);
  for (let row = 0; row < S / bh; row++) for (let c = -1; c < S / bw + 1; c++) {
    const x = c * bw + (row % 2) * (bw / 2), y = row * bh;
    g.fillStyle = jit(r, base, 0.12, 6, 0.12); g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
  }
  octaves(g, r, S, S, 256, "255,230,210", "70,30,20", 0.8);
});
/** cobbles (1024 px = 4 m): rounded grey-brown setts */
export const cobbleHD = () => ctex("cobbleHD", 1024, 1024, (g, r) => {
  const S = 1024, n = 16, c = S / n;
  g.fillStyle = "#6e665c"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { rr(g, i * c + 4 + U(r, -2, 2), j * c + 4 + (i % 2) * c / 2, c - 8, c - 8, 18); g.fillStyle = jit(r, "#a89c88", 0.12, 8, 0.2); g.fill(); }
  octaves(g, r, S, S, 256, "255,250,235", "40,35,30", 0.8);
});
/** loose hay (512 px = 2 m): golden straws */
export const hayHD = () => ctex("hayHD", 512, 512, (g, r) => {
  const S = 512;
  g.fillStyle = "#e2b84a"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) { const x = U(r, 0, S), y = U(r, 0, S), a = U(r, 0, TAU), l = U(r, 12, 40); g.strokeStyle = r() > 0.5 ? "rgba(255,235,150,0.8)" : "rgba(150,100,30,0.6)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
});
/** the US flag of 1904 (13 stripes, 45 stars as dots), 600 x 400, unlit */
export const flagHD = () => ctex("flag1904", 600, 400, (g) => {
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#c8282e"; g.fillRect(0, (i * 400) / 13, 600, 400 / 13 + 1); }
  g.fillStyle = "#26357a"; g.fillRect(0, 0, 250, (7 * 400) / 13);
  g.fillStyle = "#ffffff"; for (let rw = 0; rw < 6; rw++) for (let c = 0; c < 8; c++) { if ((rw + c) % 2) continue; g.beginPath(); g.arc(20 + c * 30, 18 + rw * 34, 7, 0, TAU); g.fill(); }
});
/** weathered grey-brown wood (512 px = 2 m): fence rails, the well roof, wagon boards */
export const oldWoodHD = (base = "#9a7a58") => ctex("oldWoodHD" + base, 512, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 30; i++) grain(g, r, 512, U(r, 0, 512), U(r, 0, 256), U(r, 120, 400), 5, U(r, 1.2, 3), r() > 0.4 ? "rgba(70,50,35,0.45)" : "rgba(250,235,210,0.35)");
});
/** dry stone (512 px = 2 m): the well's fieldstone courses */
export const stoneHD = () => ctex("stoneHD", 512, 512, (g, r) => {
  const S = 512;
  g.fillStyle = "#8a8074"; g.fillRect(0, 0, S, S);
  for (let row = 0; row < 8; row++) for (let c = 0; c < 6; c++) { rr(g, c * 86 + (row % 2) * 43 + U(r, -4, 4) - 20, row * 64 + 4, 80, 56, 14); g.fillStyle = jit(r, "#b0a492", 0.14, 8, 0.25); g.fill(); }
  octaves(g, r, S, S, 256, "255,250,235", "40,35,30", 0.8);
});

// ---------------- Chicago 1861 textures ----------------
/** wet street mud (1024 px = 4 m): chocolate brown with glossy sky-blue puddle patches, wheel ruts, boot prints */
export const mudHD = (key = "mudHD", base = "#6a4a2c", puddle = 0.5) => ctex(key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 200, "190,140,90", "50,30,16", 1.2);
  for (const x of [250, 700]) { g.fillStyle = "rgba(60,36,18,0.3)"; g.fillRect(x - 50, 0, 100, S); g.fillStyle = "rgba(200,150,100,0.22)"; g.fillRect(x - 64, 0, 9, S); g.fillRect(x + 56, 0, 9, S); }
  for (let i = 0; i < 14 * puddle + 3; i++) wrap2(S, S, U(r, 0, S), U(r, 0, S), 150, (x, y) => { // glossy puddles
    g.save(); g.translate(x, y); g.rotate(r() * 3); g.scale(1, U(r, 0.45, 0.8));
    const rad = U(r, 70, 150), gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
    gr.addColorStop(0, "rgba(190,215,235,0.95)"); gr.addColorStop(0.8, "rgba(130,160,180,0.85)"); gr.addColorStop(1, "rgba(90,70,50,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill(); g.restore();
  });
  for (let i = 0; i < 50; i++) { const x = U(r, 0, S), y = U(r, 0, S); g.fillStyle = "rgba(50,30,14,0.4)"; g.beginPath(); g.ellipse(x, y, U(r, 8, 16), U(r, 14, 26), U(r, -0.4, 0.4), 0, TAU); g.fill(); g.fillStyle = "rgba(200,160,110,0.3)"; g.beginPath(); g.ellipse(x - 2, y - 2, 4, 8, 0, 0, TAU); g.fill(); }
  speckle(g, r, S, S, 1400, ["rgba(210,170,120,0.5)", "rgba(40,24,12,0.5)"], 1.2, 4);
});
/** murky swamp water / lake (1024 px = 8 m): teal-green with pale ripples and algae */
export const waterHD = (key = "waterHD", base = "#5c8a7a") => ctex(key, 1024, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 1024, 512);
  octaves(g, r, 1024, 512, 120, "190,215,225", "20,30,34", 0.8);
  for (let i = 0; i < 70; i++) { const x = U(r, 0, 1024), y = U(r, 0, 512), l = U(r, 30, 110); g.strokeStyle = "rgba(235,250,245,0.5)"; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 4, x + l, y); g.stroke(); }
  for (let i = 0; i < 14; i++) blotch(g, U(r, 0, 1024), U(r, 0, 512), U(r, 20, 60), 2, "110,130,60", 0.14);
});
/** striped wallpaper (512 px = 2 m): vertical bands with a small diamond motif */
export const wallpaperHD = (key: string, base: string, stripe: string) => ctex("wallpaperHD" + key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) { g.fillStyle = stripe; g.globalAlpha = 0.55; g.fillRect(i * 64 + 22, 0, 20, 512); g.globalAlpha = 1; }
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = "rgba(255,240,210,0.45)"; const x = i * 64 + 32, y = j * 64 + 32 + (i % 2) * 32; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 6, y); g.lineTo(x, y + 7); g.lineTo(x - 6, y); g.closePath(); g.fill(); }
  octaves(g, r, 512, 512, 256, "255,245,225", "60,35,25", 0.5);
});
/** black-and-cream marble checker (512 px = 2 m, 4 x 4 tiles) */
export const checkerHD = (a = "#f2ead8", b = "#4a4a54") => ctex("checkerHD" + a + b, 512, 512, (g, r) => {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = jit(r, (i + j) % 2 ? b : a, 0.05, 2, 0.05); g.fillRect(i * 128, j * 128, 128, 128); }
  octaves(g, r, 512, 512, 256, "255,255,255", "40,40,50", 0.6);
  g.strokeStyle = "rgba(60,50,40,0.4)"; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
});
/** carpet (512 px = 2 m): deep red with a gold border pattern and diamonds */
export const carpetHD = (base = "#a02a30", trim = "#e0b050") => ctex("carpetHD" + base + trim, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = trim; g.lineWidth = 8; g.strokeRect(16, 16, 480, 480); g.lineWidth = 3; g.strokeRect(34, 34, 444, 444);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = 64 + i * 128, y = 64 + j * 128; g.fillStyle = trim; g.globalAlpha = 0.8; g.beginPath(); g.moveTo(x, y - 34); g.lineTo(x + 34, y); g.lineTo(x, y + 34); g.lineTo(x - 34, y); g.closePath(); g.fill(); g.globalAlpha = 1; g.fillStyle = base; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill(); }
  octaves(g, r, 512, 512, 256, "255,200,180", "40,5,10", 0.6);
});
/** dark wood panelling (512 px = 2 m): raised panels with a light edge */
export const panelHD = (base = "#6a4228") => ctex("panelHD" + base, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const x = 20 + i * 250, y = 20 + j * 250; g.fillStyle = jit(r, base, 0.08, 2, 0.05); g.fillRect(x, y, 222, 222); g.strokeStyle = "rgba(255,210,150,0.35)"; g.lineWidth = 5; g.strokeRect(x + 14, y + 14, 194, 194); g.strokeStyle = "rgba(20,8,0,0.5)"; g.strokeRect(x, y, 222, 222); }
  for (let i = 0; i < 26; i++) grain(g, r, 512, U(r, 0, 512), U(r, 0, 512), U(r, 100, 300), 3, 2, "rgba(30,12,0,0.3)");
});
/** cream plaster (512 px = 2 m) */
export const plasterHD = (base = "#efe3c6") => ctex("plasterHD" + base, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  octaves(g, r, 512, 512, 128, "255,250,235", "120,90,60", 0.9);
});
/** roof shingles (512 px = 2 m): scalloped dark slate-brown rows */
export const shingleHD = (base = "#6a4a46") => ctex("shingleHD" + base, 512, 512, (g, r) => {
  g.fillStyle = "#2a1a1a"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) for (let c = -1; c < 9; c++) { const x = c * 64 + (row % 2) * 32, y = row * 32; g.fillStyle = jit(r, base, 0.12, 4, 0.1); g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x + 62, y); g.lineTo(x + 62, y + 20); g.arc(x + 32, y + 20, 30, 0, Math.PI); g.closePath(); g.fill(); }
  octaves(g, r, 512, 512, 256, "255,230,210", "20,10,10", 0.6);
});
/** dark iron with a dusting of rust (512 px = 1 m) */
export const ironHD = (base = "#4a4e58") => ctex("ironHD" + base, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  octaves(g, r, 512, 512, 256, "170,180,200", "10,10,16", 1.0);
  for (let i = 0; i < 26; i++) blotch(g, U(r, 0, 512), U(r, 0, 512), U(r, 14, 50), 1.5, "150,80,40", 0.22);
});
/** screw thread bands (256 x 256): iron with diagonal light/dark stripes, for jackscrew shafts */
export const threadHD = () => ctex("threadHD", 128, 256, (g, r) => {
  g.fillStyle = "#6a6f7a"; g.fillRect(0, 0, 128, 256);
  for (let i = -2; i < 18; i++) { const y = i * 16; g.fillStyle = "#9aa0ae"; g.beginPath(); g.moveTo(0, y + 6); g.lineTo(128, y - 6); g.lineTo(128, y + 2); g.lineTo(0, y + 14); g.closePath(); g.fill(); g.fillStyle = "#2c2f38"; g.beginPath(); g.moveTo(0, y + 14); g.lineTo(128, y + 2); g.lineTo(128, y + 8); g.lineTo(0, y + 20); g.closePath(); g.fill(); }
  octaves(g, r, 128, 256, 128, "210,220,240", "10,10,20", 0.5);
});
/** distant farm field strips (1024 x 256 = 8 m x 2 m): golden / green stripes receding, for the train window */
export const fieldHD = () => ctex("fieldHD", 1024, 256, (g, r) => {
  const cols = ["#d8b14a", "#86a845", "#c9a040", "#6e9a3e", "#e0c060", "#9ab04a"];
  for (let i = 0; i < 16; i++) { g.fillStyle = jit(r, cols[i % 6], 0.06, 3, 0.1); g.fillRect(i * 64, 0, 64, 256); }
  for (let i = 0; i < 120; i++) { const x = U(r, 0, 1024); g.strokeStyle = "rgba(90,70,20,0.25)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + U(r, -4, 4), 256); g.stroke(); }
});
