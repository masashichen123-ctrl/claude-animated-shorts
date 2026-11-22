// Hand-painted look textures drawn on canvases (cached), owner: sets (with build.ts). Shared painters from the bridge /
// missile template (value octaves, tinted seams, blotches, sign lettering, clouds, corrugated iron, weatherboards,
// planks) plus the whale short's own (bottom of the file): beach sand, wet sand, basalt, asphalt, park lawn, driftwood,
// the whale's skin + X-eye, the dynamite crate, the easel drawing, the park sign pictogram, the sea marks + surf foam.
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
// WHALE SHORT painters. Same conventions: painted seams are dark TINTS, never pure black (the world ink pass draws
// silhouettes), three value octaves on every big surface, sizes in px per metre.
// =================================================================================================================
/** pale Oregon beach sand (1024 px = 4 m): cool beige, wind ripples, shell flecks, dark grains */
export const sandHD = (key = "sandHD", base = "#dcc9a2") => ctex(key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 256, "255,248,226", "140,115,80", 1.0);
  for (let i = 0; i < 20; i++) wrap2(S, S, U(r, 0, S), U(r, 0, S), 110, (x, y) => blotch(g, x, y, U(r, 50, 110), 1.8, "170,140,100", 0.18));
  for (let i = 0; i < 90; i++) { const y = U(r, 0, S), x = U(r, 0, S), l = U(r, 80, 260); detailLine(g, [[x, y], [x + l * 0.5, y + U(r, -8, 8)], [x + l, y + U(r, -5, 5)]], base, U(r, 1.5, 3), r, 0.26, 0.72); }
  speckle(g, r, S, S, 1600, ["rgba(255,252,240,0.75)", "rgba(90,75,60,0.45)", "rgba(190,170,150,0.6)"], 1.2, 4);
});
/** dark basalt of the headland (1024 px = 8 m): grey-brown blocks with cracks and lichen dabs */
export const rockHD = (key = "rockHD", base = "#57504c") => ctex(key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 128, "200,190,180", "30,25,25", 1.3);
  for (let i = 0; i < 60; i++) { let x = U(r, 0, S), yy = U(r, 0, S); const pts: [number, number][] = [[x, yy]]; for (let k = 0; k < 4; k++) { x += U(r, -30, 30); yy += U(r, 10, 50); pts.push([x, yy]); } detailLine(g, pts, base, 2.6, r, 0.6, 0.35); }
  for (let i = 0; i < 40; i++) wrap2(S, S, U(r, 0, S), U(r, 0, S), 40, (x, y) => blotch(g, x, y, U(r, 10, 40), 1.4, r() > 0.5 ? "190,180,110" : "140,160,120", 0.3));
  speckle(g, r, S, S, 700, ["rgba(230,225,215,0.45)", "rgba(20,15,15,0.4)"], 1.5, 4);
});
/** asphalt (1024 px = 6 m): dark warm grey, aggregate speckle, patches */
export const asphaltHD = () => ctex("asphaltHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#5d5a58"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 170, "160,155,150", "25,22,22", 1.0);
  for (let i = 0; i < 10; i++) wrap2(S, S, U(r, 0, S), U(r, 0, S), 120, (x, y) => blotch(g, x, y, U(r, 50, 120), 1.6, "30,28,30", 0.2));
  for (let i = 0; i < 8; i++) { let x = U(r, 0, S), y = U(r, 0, S); const pts: [number, number][] = [[x, y]]; for (let k = 0; k < 6; k++) { x += U(r, 10, 40); y += U(r, -25, 25); pts.push([x, y]); } detailLine(g, pts, "#5d5a58", 2, r, 0.6, 0.4); }
  speckle(g, r, S, S, 2600, ["rgba(200,195,185,0.5)", "rgba(20,18,18,0.5)"], 0.8, 2.6);
});
/** concrete (1024 px = 6 m): pale paths, expansion joints */
export const concreteHD = () => ctex("concreteHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#d8d2c4"; g.fillRect(0, 0, S, S);
  octaves(g, r, S, S, 170, "250,245,232", "110,100,85", 0.8);
  for (const k of [0, 512]) { detailLine(g, [[k + 2, 0], [k + 2, S]], "#d8d2c4", 3, r, 0.7, 0.45); detailLine(g, [[0, k + 2], [S, k + 2]], "#d8d2c4", 3, r, 0.7, 0.45); }
  speckle(g, r, S, S, 700, ["rgba(255,255,250,0.5)", "rgba(90,80,70,0.35)"], 1, 3);
});
/** park lawn (1024 px = 4 m): fresh green, mown stripes, clover dabs, blade ticks */
export const lawnHD = () => ctex("lawnHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#6fae4a"; g.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x += 256) { g.fillStyle = "rgba(255,255,200,0.07)"; g.fillRect(x, 0, 128, S); }
  octaves(g, r, S, S, 256, "220,255,160", "30,80,30", 1.1);
  for (let i = 0; i < 2600; i++) { const x = U(r, 0, S), y = U(r, 0, S), l = U(r, 5, 12); g.strokeStyle = r() > 0.5 ? "rgba(40,100,40,0.35)" : "rgba(210,255,160,0.35)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + U(r, -3, 3), y - l); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = r() > 0.4 ? "rgba(255,255,255,0.8)" : "rgba(255,225,80,0.8)"; const x = U(r, 0, S), y = U(r, 0, S); g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
});
/** silver-grey driftwood (512 px = 2 m along canvas x): long cracks, knots */
export const driftHD = () => ctex("driftHD", 512, 256, (g, r) => {
  g.fillStyle = "#b7aa98"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 34; i++) grain(g, r, 512, U(r, 0, 512), U(r, 0, 256), U(r, 120, 400), 6, U(r, 1.2, 3), r() > 0.4 ? "rgba(90,75,60,0.45)" : "rgba(250,245,235,0.45)");
  for (let i = 0; i < 4; i++) { const x = U(r, 30, 480), y = U(r, 30, 220); g.strokeStyle = "rgba(80,65,55,0.6)"; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, 14, 8, 0, 0, TAU); g.stroke(); }
});
/** the whale's skin (1024 x 512 on the body lathe: u around, v along): grey-brown, wrinkled furrows, pale scars and
 *  barnacle dabs, a lighter belly band (v = along the body, u = around) */
export const whaleSkinHD = (key = "whaleSkin", base = "#6b5f58") => ctex(key, 1024, 512, (g, r) => {
  const W = 1024, H = 512;
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  // belly: pale grey band around u = .5 (the underside)
  const lg = g.createLinearGradient(0, 0, W, 0);
  // lighter belly: the lower lens-side flank (u .26-.5) up to the underside, warm pale grey
  lg.addColorStop(0, "rgba(0,0,0,0)"); lg.addColorStop(0.24, "rgba(0,0,0,0)"); lg.addColorStop(0.36, "rgba(200,184,170,0.6)"); lg.addColorStop(0.6, "rgba(200,184,170,0.6)"); lg.addColorStop(0.72, "rgba(0,0,0,0)"); lg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  octaves(g, r, W, H, 128, "220,205,190", "50,40,34", 0.55);
  // soft, smooth hide: a few long gentle wrinkle bands (the sperm whale's prune skin), never rocky cracks
  for (let i = 0; i < 26; i++) { const x = U(r, 0, W), y = U(r, 0, H), l = U(r, 160, 420); g.strokeStyle = "rgba(55,44,38,0.2)"; g.lineWidth = U(r, 5, 9); g.lineCap = "round"; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l * 0.5, y + U(r, -14, 14), x + l, y + U(r, -6, 6)); g.stroke(); }
  for (let i = 0; i < 10; i++) { const x = U(r, 0, W), y = U(r, 0, H); g.strokeStyle = "rgba(245,238,235,0.35)"; g.lineWidth = U(r, 3, 5); g.beginPath(); g.moveTo(x, y); g.lineTo(x + U(r, 40, 90), y + U(r, -8, 8)); g.stroke(); }
});
/** the whale's cartoon X-eye decal (256 px, alpha): a pale socket with a bold ink X */
export const xEyeHD = () => ctex("xEyeHD", 256, 256, (g) => {
  g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(128, 128, 110, 100, 0, 0, TAU); g.fill();
  g.strokeStyle = "#1a1418"; g.lineWidth = 16; g.stroke();
  g.lineCap = "round"; g.lineWidth = 34;
  g.beginPath(); g.moveTo(68, 70); g.lineTo(188, 186); g.moveTo(188, 70); g.lineTo(68, 186); g.stroke();
});
/** the dynamite crate face (512 x 384): pine boards, dark seams, a red stick bundle pictogram + a flame-burst mark */
export const crateHD = () => ctex("dynCrateHD", 512, 384, (g, r) => {
  g.fillStyle = "#c9955a"; g.fillRect(0, 0, 512, 384);
  for (let k = 0; k < 4; k++) { const y = k * 96; g.fillStyle = jit(r, "#c9955a", 0.06, 3, 0.1); g.fillRect(0, y, 512, 96); grain(g, r, 512, 0, y + 30, 512, 6, 1.5, "rgba(110,60,30,0.35)"); seamLine(g, 0, y + 1, 512, y + 1, 4, 0.55); }
  g.lineWidth = 18; g.strokeStyle = "#8a5a32"; g.strokeRect(9, 9, 494, 366);
  for (const [x, y] of [[20, 20], [492, 20], [20, 364], [492, 364]]) nail(g, x, y, 6);
  // three red sticks with fuses, bound
  for (let k = 0; k < 3; k++) { const x = 180 + k * 52; g.fillStyle = "#d6312e"; rr(g, x, 120, 46, 170, 18); g.fill(); g.strokeStyle = "#2a1418"; g.lineWidth = 7; g.stroke(); g.strokeStyle = "#2a1418"; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 23, 120); g.quadraticCurveTo(x + 30, 95, x + 20 + k * 6, 82); g.stroke(); }
  g.fillStyle = "#2a1418"; g.fillRect(172, 190, 170, 16);
  g.fillStyle = "#ffd23a"; for (const [x, y] of [[110, 110], [400, 120]]) { g.beginPath(); for (let a = 0; a < 16; a++) { const rad = a % 2 ? 14 : 34, b = (a * Math.PI) / 8; g.lineTo(x + rad * Math.cos(b), y + rad * Math.sin(b)); } g.closePath(); g.fill(); g.strokeStyle = "#2a1418"; g.lineWidth = 4; g.stroke(); }
});
/** the Engineer's easel drawing (512 x 640): whale -> big arrow -> lots of little bits; pictures only */
export const easelHD = () => ctex("easelHD", 512, 640, (g, r) => {
  g.fillStyle = "#fbf7ec"; g.fillRect(0, 0, 512, 640);
  g.strokeStyle = "rgba(120,150,200,0.35)"; g.lineWidth = 2; for (let y = 40; y < 640; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  const ink = "#2a2030"; g.lineJoin = "round"; g.lineCap = "round";
  // the whale (top): a grey blocky-head whale, side view
  g.fillStyle = "#8a8f9a"; g.beginPath(); g.moveTo(60, 120); g.lineTo(250, 110); g.quadraticCurveTo(300, 120, 300, 170); g.lineTo(290, 210); g.lineTo(150, 205); g.quadraticCurveTo(100, 200, 80, 175); g.lineTo(40, 150); g.lineTo(20, 120); g.lineTo(42, 138); g.closePath(); g.fill();
  g.strokeStyle = ink; g.lineWidth = 7; g.stroke();
  g.lineWidth = 5; g.beginPath(); g.moveTo(240, 140); g.lineTo(258, 156); g.moveTo(258, 140); g.lineTo(240, 156); g.stroke();
  // big red arrow down
  g.fillStyle = "#d6312e"; g.beginPath(); g.moveTo(230, 250); g.lineTo(290, 250); g.lineTo(290, 340); g.lineTo(330, 340); g.lineTo(260, 420); g.lineTo(190, 340); g.lineTo(230, 340); g.closePath(); g.fill(); g.strokeStyle = ink; g.lineWidth = 6; g.stroke();
  // lots of tiny bits (bottom) + a happy gull
  for (let i = 0; i < 34; i++) { const x = U(r, 60, 460), y = U(r, 460, 600), s = U(r, 6, 14); g.fillStyle = "#8a8f9a"; g.beginPath(); g.ellipse(x, y, s, s * 0.7, U(r, 0, 3), 0, TAU); g.fill(); g.strokeStyle = ink; g.lineWidth = 3; g.stroke(); }
  g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(420, 400, 34, 24, 0, 0, TAU); g.fill(); g.strokeStyle = ink; g.lineWidth = 5; g.stroke();
  g.fillStyle = "#f2b234"; g.beginPath(); g.moveTo(450, 392); g.lineTo(482, 400); g.lineTo(450, 408); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = ink; g.beginPath(); g.arc(432, 392, 4, 0, TAU); g.fill();
});
/** the park sign face (640 x 400, unlit): a whale pictogram with a cartoon explosion burst; pictures only */
export const parkSignHD = () => ctex("parkSignHD", 640, 400, (g) => {
  g.fillStyle = "#2f5e3e"; rr(g, 0, 0, 640, 400, 30); g.fill();
  g.strokeStyle = "#f2e6c4"; g.lineWidth = 14; rr(g, 18, 18, 604, 364, 22); g.stroke();
  // burst behind
  g.fillStyle = "#f6c23a"; g.beginPath(); for (let a = 0; a < 24; a++) { const rad = a % 2 ? 70 : 150, b = (a * Math.PI) / 12; g.lineTo(420 + rad * Math.cos(b), 180 + rad * Math.sin(b)); } g.closePath(); g.fill();
  g.fillStyle = "#e8582c"; g.beginPath(); for (let a = 0; a < 20; a++) { const rad = a % 2 ? 40 : 90, b = (a * Math.PI) / 10 + 0.1; g.lineTo(420 + rad * Math.cos(b), 180 + rad * Math.sin(b)); } g.closePath(); g.fill();
  // whale silhouette (cream on green)
  g.fillStyle = "#f2e6c4"; g.beginPath(); g.moveTo(110, 200); g.lineTo(300, 175); g.quadraticCurveTo(370, 180, 372, 240); g.lineTo(360, 290); g.lineTo(190, 292); g.quadraticCurveTo(140, 288, 120, 260); g.lineTo(80, 240); g.lineTo(60, 200); g.lineTo(82, 222); g.closePath(); g.fill();
  g.strokeStyle = "#2f5e3e"; g.lineWidth = 8; g.lineCap = "round"; g.beginPath(); g.moveTo(318, 208); g.lineTo(338, 228); g.moveTo(338, 208); g.lineTo(318, 228); g.stroke();
  // two little blubber bits flying
  g.fillStyle = "#f2e6c4"; for (const [x, y, s] of [[500, 70, 16], [560, 120, 12], [520, 300, 14]]) { g.beginPath(); g.ellipse(x, y, s, s * 0.75, 0.4, 0, TAU); g.fill(); }
});

/** Sea marks as a DATA texture for the water shader (world.ts): R = crest, G = trough, B = glint; 1024 px = 8 m.
 *  Sparse near band + dense far band (missile short, verify_r2 #12: trough bands and fewer, larger glints). */
export const waterMarks = (key: string, nCrest: number, nGlint: number) => ctex("waterMarks" + key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#000"; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = "lighter";
  g.lineCap = "round";
  for (let i = 0; i < nCrest; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), w = U(r, 30, 80), sag = w * U(r, 0.06, 0.14), lw = U(r, 2.6, 4.2), a = U(r, -0.12, 0.12);
    wrap2(S, S, x, y, w, (xx, yy) => {
      g.save(); g.translate(xx, yy); g.rotate(a);
      const arc = (dy: number, col: string, k: number) => { g.strokeStyle = col; g.lineWidth = lw * k; g.beginPath(); g.moveTo(-w / 2, dy); g.quadraticCurveTo(0, dy - sag * 2, w / 2, dy); g.stroke(); };
      arc(0, "rgb(255,0,0)", 1); arc(lw * 2.0, "rgb(0,255,0)", 1.7);
      g.restore();
    });
  }
  for (let i = 0; i < nCrest / 5; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), w = U(r, 160, 380);
    wrap2(S, S, x, y, w, (xx, yy) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, "rgba(0,150,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.save(); g.translate(xx, yy); g.scale(w, w * 0.12); g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore(); });
  }
  for (let i = 0; i < nGlint; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), len = U(r, 80, 200), lw = U(r, 1.6, 3.0), a = U(r, -0.05, 0.05);
    wrap2(S, S, x, y, len, (xx, yy) => { g.save(); g.translate(xx, yy); g.rotate(a); g.strokeStyle = "rgb(0,0,255)"; g.lineWidth = lw; g.beginPath(); g.moveTo(-len / 2, 0); g.lineTo(len / 2, 0); g.stroke(); g.restore(); });
  }
  g.globalCompositeOperation = "source-over";
});
export const waterNear = () => waterMarks("near", 34, 5);
export const waterFar = () => waterMarks("far", 150, 14);
/** surf foam strip (1024 x 128, alpha): broken white froth along canvas x, a solid crest line fading toward both edges */
export const foamHD = () => ctex("foamHD", 1024, 128, (g, r) => {
  for (let i = 0; i < 360; i++) {
    const x = U(r, 0, 1024), y = 64 + U(r, -34, 34) * (r() < 0.6 ? 0.35 : 1), rad = U(r, 6, 22), a = 0.95 - Math.abs(y - 64) / 52;
    g.fillStyle = `rgba(255,255,255,${Math.max(0, a).toFixed(3)})`;
    wrap2(1024, 128, x, y, rad * 2, (xx, yy) => { g.beginPath(); g.ellipse(xx, yy, rad * 2, rad * 0.6, 0, 0, TAU); g.fill(); });
  }
});
