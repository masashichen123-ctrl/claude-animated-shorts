// Per-shot staging of "Chicago Lifts a Hotel": every character card and effect card of shot `id` at time t (a pure function of
// id + t). Cast: Pullman (young: derby, emerald waistcoat, rolled sleeves; old: top hat, watch chain), his partners, the
// workers (flat caps, braces, instanced by shared canvases), the foreman, the mayor and council, townsfolk, the sick and the
// doctor, hotel guests and staff. No words, no digits. CONTRACT with world.ts: stage(id, t, cam) -> { places, fx, lights }.
import * as THREE from "three";
import { Outfit, Expr, FrontOpts, fxStink } from "./toon";
import { SKIN, townsfolk, mix } from "./toon";
import {
  Stage, CamInfo, person, blob, stand, act, lidAt, q, hh, W_, Who, puff, sparkle, poof, stink, steam, stars, zzz, fxc, item, bigCloud, setLight, findSun, SUNV, hexOf,
  fxFlame, fxFrog, fxBubble, fxMud, fxCough, fxSwirl, fxCoin, horseDraw, fxPoof, fxBurst, SHOTS, setOf, EV, FPS, clamp01,
} from "./cast";
import {
  V3, HOTEL, SCREWS, screwX, screwZ, SPOT, hotelY, screwTurn, turnPulse, marchZ, fillAt, cutY, boardK, smooth, glide, lerp, riseAt,
} from "./story";
import { dogDraw } from "./toon";

const FH = HOTEL.FH, BAYS = HOTEL.BAYS;
const F5 = (n: number) => Math.round(n * 5) / 5;
// ---------------- outfits ----------------
const SHIRT = ["#efe8d4", "#d4dce4", "#e0d0b0", "#c4d4bc", "#e8d8c8", "#d0d4e4"];
export const worker = (v: number): Outfit => ({
  jacket: SHIRT[v % 6], pants: ["#3a3a46", "#4a4034", "#34404a"][v % 3], boots: "#3a2a22", hat: "flatcap", cap: ["#6a6458", "#8a7a5a", "#4a5262", "#7a4a3a", "#5a6a4a"][v % 5],
  hair: ["#3a2a20", "#7a4a2a", "#a8682e", "#2a2020"][v % 4], collar: "open", braces: ["#3a3a40", "#8a3a2e", "#2e4a6a"][v % 3], shortSleeve: v % 2 === 0, buttons: "none",
  moustache: v % 3 === 0 ? "#3a2a20" : undefined, headType: (["standard", "bean", "bun"] as const)[v % 3], build: v % 4 === 3 ? "stout" : "adult",
});
const PULLMAN: Outfit = { jacket: "#f6f2e8", pants: "#3a3a46", boots: "#2a2220", hat: "bowler", cap: "#3a2a22", hair: "#6a4a2a", collar: "shirt", tie: "#3a2a22", waistcoat: "#1e9a5e",
  shortSleeve: true, moustache: "#6a4a2a", headType: "standard", build: "slim", buttons: "none" };
const PULLMAN_OLD: Outfit = { jacket: "#2a2a36", pants: "#2a2a36", boots: "#1a1618", hat: "tophat", hair: "#d8d4cc", collar: "shirt", tie: "#c8282e", waistcoat: "#1e9a5e",
  moustache: "#d8d4cc", beard: "#d8d4cc", headType: "standard", build: "stout", buttons: "#e8c45a", glasses: false };
const partner = (v: number): Outfit => ({ jacket: "#f4f1e6", pants: ["#3a3432", "#4a4038", "#3a3e4a"][v % 3], boots: "#2a2220", hat: "bowler", cap: ["#2a2426", "#4a3426", "#3a3a40"][v % 3],
  hair: ["#3a2a20", "#7a4a2a", "#2a2020"][v % 3], collar: "shirt", buttons: "none", waistcoat: ["#8a5a30", "#6a4a2a", "#7a6a4a"][v % 3], bowtie: ["#2a2a40", "#8a2a2a", "#2a2a40"][v % 3],
  moustache: ["#3a2a20", "#7a4a2a", "#2a2020"][v % 3], headType: (["standard", "bean", "bun"] as const)[v % 3], build: v % 3 === 1 ? "stout" : "adult", shortSleeve: true });
const FOREMAN: Outfit = { jacket: "#f4f1e6", pants: "#34404a", boots: "#2a2220", hat: "bowler", cap: "#2a3a5a", hair: "#3a2a20", collar: "shirt", buttons: "none", waistcoat: "#2a5db0", bowtie: "#c8282e", moustache: "#3a2a20", headType: "bean", build: "stout", shortSleeve: true };
const mayor: Outfit = { jacket: "#2a2a36", pants: "#2a2a36", boots: "#1a1618", hat: "tophat", hair: "#e0dcd4", collar: "shirt", tie: "#c8282e", waistcoat: "#d9a83a", sash: "#c8282e", moustache: "#e0dcd4", headType: "standard", build: "stout", buttons: "#e8c45a" };
const COAT = ["#3a3a52", "#4a3a2e", "#2e4a3a", "#4a2e3a", "#3e3e3e", "#2e3e5a"];
const councilman = (v: number): Outfit => ({ jacket: COAT[v % 6], pants: COAT[(v + 2) % 6], boots: "#1a1618", hat: "tophat", hair: ["#3a2a20", "#7a4a2a", "#c8c0b0", "#2a2020"][v % 4], collar: "shirt", tie: ["#c8282e", "#2a2a40", "#e0b050"][v % 3],
  waistcoat: ["#c8a050", "#8a2a3a", "#4a6a8a"][v % 3], moustache: v % 2 ? ["#3a2a20", "#c8c0b0"][v % 2] : undefined, beard: v % 3 === 0 ? "#6a5a48" : undefined, headType: (["standard", "bean", "bun"] as const)[v % 3], build: v % 2 ? "stout" : "adult", buttons: "#e8c45a" });
const doctor: Outfit = { jacket: "#2e2e38", pants: "#2e2e38", boots: "#1a1618", hat: "tophat", hair: "#7a6a58", collar: "shirt", bowtie: "#2a2a40", waistcoat: "#6a6a72", glasses: true, beard: "#7a6a58", headType: "bean", build: "adult", buttons: "none" };
const SICKSKIN = "#bfe08c";
const sick = (v: number): Outfit => {
  const t = townsfolk(v);
  const o: Outfit = { ...t, skin: SICKSKIN, collar: "shirt", buttons: "none", headType: (["standard", "bean", "bun"] as const)[v % 3] };
  if (v % 2) return { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3], longDress: true };
  return { ...o, hat: v % 4 === 0 ? "nightcap" : "bowler", cap: v % 4 === 0 ? "#f4f0ea" : "#3a3030", hair: "#3a2a20" };
};
const bonnetLady = (v: number): Outfit => ({ ...townsfolk(2 * v + 1), hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2", "#8aa860"][v % 4], longDress: true, jacket: ["#8c3b4a", "#5d7a3a", "#2f5f6a"][v % 3], collar: "shirt", buttons: "none" });
const manTown = (v: number): Outfit => ({ jacket: ["#8a5a3a", "#5a6a4a", "#4a5a7a", "#7a6a48"][v % 4], pants: "#3a3a46", boots: "#3a2a22", hat: v % 3 === 0 ? "bowler" : v % 3 === 1 ? "flatcap" : "tophat", cap: ["#3a3030", "#6a5a48", "#4a4a52"][v % 3],
  hair: "#3a2a20", collar: "shirt", buttons: "none", moustache: v % 2 ? "#3a2a20" : undefined, headType: (["standard", "bean", "bun"] as const)[v % 3], build: v % 4 === 2 ? "stout" : "adult", waistcoat: v % 2 ? "#6a3a2a" : undefined });
const guestLady = (v: number): Outfit => ({ jacket: ["#c25a7a", "#5a8fc2", "#d9a441"][v % 3], pants: "#3a3a46", boots: "#3a2a22", dress: ["#f6f2ea", "#a8c4e8", "#e8b8c8"][v % 3], longDress: true, hat: "lady", cap: "#f2e2b0", band: "#c0352e", hair: "#7a4a2a", collar: "shirt", buttons: "none", headType: "bun" });
const guestMan = (v: number): Outfit => ({ jacket: ["#3a3e52", "#5a4a3a", "#4a5a4a"][v % 3], pants: "#2e2e36", boots: "#2a2220", hat: v % 2 ? "bowler" : "tophat", cap: "#2a2426", hair: "#3a2a20", collar: "shirt", tie: "#c0352e", moustache: v % 2 ? "#3a2a20" : undefined, headType: "standard", buttons: "none" });
const sleeperO: Outfit = { jacket: "#f4f0ea", pants: "#f4f0ea", boots: "#d8d0c0", hat: "nightcap", cap: "#f4f0ea", band: "#c0352e", hair: "#7a4a2a", collar: "open", moustache: "#5a3a22", headType: "bun", build: "stout", buttons: "none" };
const diner: Outfit = { jacket: "#4a4a62", pants: "#3a3a46", boots: "#2a2220", hat: "hair", hairStyle: "side", hair: "#5a3a22", collar: "shirt", tie: "#fbf8ee", moustache: "#5a3a22", headType: "standard", build: "stout", buttons: "none" };
const clerk: Outfit = { jacket: "#e8e4d4", pants: "#3a3a46", boots: "#2a2220", hat: "hair", hairStyle: "bowl", hair: "#2a2020", collar: "shirt", bowtie: "#2a2a40", waistcoat: "#6a7a9a", glasses: true, shortSleeve: true, braces: "#8a3a2e", headType: "bean", build: "slim", buttons: "none" };
const bellhop: Outfit = { jacket: "#b8302a", pants: "#2a2a36", boots: "#1a1618", hat: "cap", cap: "#b8302a", band: "#e8c45a", hair: "#3a2a20", collar: "tunic", buttons: "#e8c45a", headType: "bun", build: "slim" };
const inspector: Outfit = { jacket: "#4a4a52", pants: "#4a4a52", boots: "#2a2220", hat: "bowler", cap: "#2a2426", hair: "#6a5a48", glasses: true, collar: "shirt", bowtie: "#2a2a40", moustache: "#4a3a2a", headType: "standard", build: "stout", buttons: "#3a3a40" };
const doorman: Outfit = { jacket: "#2f5a4a", pants: "#2a2a36", boots: "#1a1618", hat: "peaked", cap: "#2f5a4a", band: "#e8c45a", peak: "#16171b", hair: "#3a2a20", collar: "tunic", buttons: "#e8c45a", sash: "#e8c45a", moustache: "#3a2a20", headType: "standard", build: "stout" };
const porter: Outfit = { jacket: "#3a5a8a", pants: "#2a2a36", boots: "#1a1618", hat: "cap", cap: "#3a5a8a", band: "#e8c45a", hair: "#3a2a20", collar: "tunic", buttons: "#e8c45a", headType: "bean", build: "adult" };
const conductor: Outfit = { jacket: "#26263a", pants: "#26263a", boots: "#1a1618", hat: "peaked", cap: "#26263a", band: "#e8c45a", peak: "#16171b", hair: "#3a2a20", collar: "tunic", buttons: "#e8c45a", moustache: "#3a2a20", headType: "bean", build: "stout" };
const passenger = (v: number): Outfit => (v % 3 === 1 ? { ...guestLady(v), dress: ["#e8b8c8", "#a8c4e8", "#f2e2a8"][v % 3] } : guestMan(v));

const O = new Map<string, Outfit>(); const memo = (k: string, f: () => Outfit) => { let o = O.get(k); if (!o) { o = f(); O.set(k, o); } return o; };
const wk = (v: number) => memo("w" + v, () => worker(v));

// ---------------- helpers ----------------
const walkerDraw = (out: Stage, cam: CamInfo, w: Who, p: V3, dir: V3, dist: number, t: number, fo: FrontOpts = {}, gait: "walk" | "march" | "run" = "walk", scale = 1) => {
  const stride = gait === "run" ? 2.3 : gait === "march" ? 1.1 : 1.5;
  const phase = q((((dist / stride) % 1) + 1) % 1, 12);
  const sx = dir[0] * cam.right.x + dir[2] * cam.right.z, facing = (fo.facing ?? (Math.abs(sx) < 0.15 ? ((p[0] - cam.pos.x) * cam.right.x + (p[2] - cam.pos.z) * cam.right.z > 0 ? -1 : 1) : sx > 0 ? 1 : -1)) as -1 | 1;
  stand(out, cam, w.i, w.o, w.okey, p, { mode: gait === "run" ? "run" : "stroll", lift: gait === "run" ? 50 : 36, lean: gait === "run" ? 8 : 3, phase, ...fo, facing }, t, scale);
};
/** a lying person (head toward screen left (-1) or right), body centre c */
const lying = (out: Stage, cam: CamInfo, w: Who, c: V3, fo: FrontOpts, t: number, head: -1 | 1 = -1, scale = 1) => {
  const off = 0.95 * scale, px = c[0] - head * cam.right.x * off, pz = c[2] - head * cam.right.z * off;
  const pl = person(cam, w, px, c[1] + 0.28 * scale, pz, { side: false, mirror: false }, { mode: "stand", blink: lidAt(t, w.i), ...fo }, {}, scale);
  pl.roll = -head * Math.PI / 2;
  out.places.push(pl);
};
/** a sitting person: p = the seat point (y = seat height) */
const sit = (out: Stage, cam: CamInfo, i: number, o: Outfit, okey: string, p: V3, fo: FrontOpts, t: number, scale = 1, shadow = true) => {
  out.places.push(person(cam, W_(i, o, okey), p[0], p[1] - 0.45 * scale, p[2], { side: false, mirror: false }, { mode: "sit", blink: lidAt(t, i), ...fo }, {}, scale));
  if (shadow) blob(out, p[0], p[1] - 0.45 * scale, p[2], scale * 1.1);
};
const SW = (f: number, i: number) => { const u = ((f + i * 7) % 26) / 26; return u < 0.9 ? q(u / 0.9, 14) : undefined; };
const pulse = (f: number, i: number, per = 22) => q(0.5 + 0.5 * Math.sin((f / per) * 6.28 + i), 6);
const horse = (out: Stage, cam: CamInfo, k: number, g: V3, dir: V3, f: number, size = 3.2, mud = false, still = false) => {
  const mirror = dir[0] * cam.right.x + dir[2] * cam.right.z < 0, ph = still ? 0.2 + 0.05 * Math.sin(f * 0.3) : q((f / 28 + k * 0.3) % 1, 10);
  const cw = cam.pos.distanceTo(new THREE.Vector3(g[0], g[1] + 1, g[2])) < 14 ? 1024 : 512, col = ["#8a5a34", "#4a3a30", "#b8884e", "#6a4a34"][k % 4], mane = ["#2a2020", "#1a1618", "#e8d8b0", "#2a2020"][k % 4];
  out.places.push({ key: `H|${cw}|${k % 4}|${ph}|${mud}`, draw: (pn) => { const g2 = pn.g; g2.save(); g2.translate(150 * cw / 1024, 387 * cw / 1024); g2.scale(0.8 * cw / 1024, 0.8 * cw / 1024); horseDraw(pn, { phase: ph, col, mane, mud }); g2.restore(); },
    x: g[0], y: g[1] + 0.25 * size, z: g[2], scale: size, sq: true, billboard: true, mirror, size: [cw, cw, cw / 600] });
  blob(out, g[0], g[1], g[2], 1.9);
};
const dogAt = (out: Stage, cam: CamInfo, g: V3, dir: V3, f: number, o: { nose?: boolean; k?: number; bark?: boolean }, size = 1.1) => {
  const mirror = dir[0] * cam.right.x + dir[2] * cam.right.z < 0, ph = o.nose ? 0 : q(((f / 9) % 1 + 1) % 1, 8), k = o.k ?? 0;
  const op = { phase: ph, bark: !!o.bark, col: ["#c8945a", "#3a3436", "#8a5a34"][k % 3], patch: ["#f2e2c4", "#f4f0ea", "#4a2e20"][k % 3], nose: !!o.nose };
  const cw = cam.pos.distanceTo(new THREE.Vector3(g[0], g[1] + 0.4, g[2])) < 7 ? 1024 : 512;
  out.places.push({ key: `D|${cw}|${JSON.stringify(op)}`, draw: (pn) => dogDraw(pn, op), x: g[0], y: g[1] + 0.29 * size, z: g[2], scale: size, sq: true, billboard: true, mirror, size: [cw, cw, cw / 600] });
  blob(out, g[0], g[1], g[2], 0.9);
};
const GUEST_WIN = (floor: number, bay: number, H: number): V3 => [BAYS[bay], H + FH[floor] + 0.04, -1.25];
/** the hotel's guests in the front windows (every open window with somebody) */
const GUESTS: [number, number, number][] = [[1, 0, 0], [1, 1, 1], [1, 3, 2], [1, 4, 3], [2, 0, 4], [2, 1, 5], [2, 2, 6], [2, 4, 7], [3, 0, 8], [3, 2, 9], [3, 3, 10], [3, 4, 11], [4, 0, 12], [4, 1, 13], [4, 2, 14], [4, 4, 15], [5, 1, 16], [5, 2, 17], [5, 3, 18], [5, 4, 19]];
const guests = (out: Stage, cam: CamInfo, t: number, id: number, H: number, wave: (floor: number, bay: number) => boolean, scale = 1.0, skip: [number, number][] = []) => {
  const f = Math.round(t * FPS);
  for (const [fl, bay, v] of GUESTS) {
    if (skip.some(([a, b]) => a === fl && b === bay)) continue;
    const p = GUEST_WIN(fl, bay, H), w = wave(fl, bay);
    const o = v % 3 === 1 ? guestLady(v) : guestMan(v);
    out.places.push(person(cam, W_(100 + v, o, "g" + v), p[0], p[1], p[2], { side: false, mirror: false }, { mode: "stand", expr: w ? (["grin", "laugh", "smile"] as Expr[])[v % 3] : (["smile", "smile_closed", "neutral"] as Expr[])[v % 3], armR: w ? "wave" : undefined,
      wave: w ? pulse(f, v, 14) : undefined, facing: v % 2 ? 1 : -1, blink: lidAt(t, 100 + v), look: 0.3 * Math.sin(v) }, {}, scale));
  }
  void id;
};

// ---------------- workers ----------------
const WORKER_ROWS = SCREWS.ROWS;
const workerBase = (i: number, j: number): V3 => [screwX(i) + 0.5, 0, screwZ(j) + 0.62];
/** the grid of workers (every other column, every row): mode picks the acting */
const workers = (out: Stage, cam: CamInfo, f: number, t: number, mode: "cheer" | "idle" | "turn" | "march", maxRow = WORKER_ROWS, minRow = 0) => {
  let n = 0;
  for (let j = minRow; j < maxRow; j++) for (let i = 0; i < SCREWS.COLS; i += 2) {
    const k = j * 9 + i / 2, base = workerBase(i, j), w = W_(200 + k % 40, wk(k % 12), "wk" + (k % 12));
    let p: V3 = base, fo: FrontOpts = {};
    const d = cam.pos.distanceTo(new THREE.Vector3(base[0], 1, base[2]));
    if (d > 62 && j > 5) continue;
    switch (mode) {
      case "cheer": fo = { expr: (["laugh", "grin", "proud"] as Expr[])[k % 3], armR: "wave", armL: k % 3 ? "raise" : undefined, wave: pulse(f, k, 12), facing: k % 2 ? 1 : -1 }; break;
      case "idle": fo = { expr: (["smile", "grin", "smile_closed"] as Expr[])[k % 3], facing: k % 2 ? 1 : -1, look: 0.4 * Math.sin(k), sweat: SW(f, k) }; break;
      case "turn": { const pl = turnPulse(f, j); fo = { expr: pl > 0.2 ? "pained" : (["grin", "smile", "smile_closed"] as Expr[])[k % 3], armR: "pull", armL: "pull", lean: 6 + 14 * pl, facing: k % 2 ? 1 : -1, sweat: SW(f, k), tilt: 1.5 * pl }; break; }
      case "march": { const z = marchZ(f, base[2], k); p = [base[0], 0, z]; const mv = z > base[2] + 0.02; fo = { expr: "grin", facing: k % 2 ? 1 : -1, ...(mv ? {} : { lean: 4 }) };
        if (mv) { walkerDraw(out, cam, w, p, [0, 0, -1], (-z + 100), t, { expr: "grin", facing: k % 2 ? 1 : -1, armR: k % 3 ? undefined : "hold" }, "march"); n++; continue; } break; }
    }
    stand(out, cam, w.i, w.o, w.okey, p, { mode: "stand", ...fo }, t);
    n++;
  }
  return n;
};
const plazaCrowd = (out: Stage, cam: CamInfo, f: number, t: number, cheer: boolean, n = 36, z0 = 8, zspan = 22) => {
  for (let k = 0; k < n; k++) {
    const x = -10 + 20 * hh(k, 5) + 0.6 * Math.sin(k), z = z0 + zspan * hh(k, 6), lady = k % 3 === 1, o = lady ? bonnetLady(k) : k % 3 === 0 ? manTown(k) : wk(k % 12);
    stand(out, cam, 300 + k, o, "pl" + (lady ? "L" : k % 3 === 0 ? "M" : "W") + k % 12, [x, 0, z], { expr: cheer ? (["laugh", "grin", "proud"] as Expr[])[k % 3] : "smile", armR: cheer ? "wave" : undefined, armL: cheer && k % 2 ? "raise" : undefined, wave: pulse(f, k, 12),
      facing: k % 2 ? 1 : -1, prop: !cheer && lady && k % 2 ? "parasol" : null }, t);
  }
};
const WINDOWS_SPARKLE = (out: Stage, f: number, H: number) => { void out; void f; void H; };

// ---------------- the shots ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], lights: [] };
  const s = SHOTS[id - 1], f = t * FPS, F = Math.round(f);
  setLight(s.light); findSun(cam, SUNV);
  const set = setOf(id, F);
  const R = (...a: number[]) => a;
  void R; void WINDOWS_SPARKLE;
  switch (id) {
    case 1: { // HOOK: the hotel rising on its jackscrews, guests waving, workers and the plaza crowd cheering
      const H = hotelY(1, F);
      guests(out, cam, t, 1, H, (fl, bay) => F >= EV.WAVE1 - 2 + ((fl * 3 + bay) % 5) * 2 || (fl === 2 && bay === 1) || (fl === 4 && bay === 3) || (fl === 2 && bay === 3), 1.35, [[2, 1], [4, 3], [2, 3]]);
      const GW = (fl: number, bay: number, o: Outfit, key: string, fo: FrontOpts, i: number) => { const p = GUEST_WIN(fl, bay, H); out.places.push(person(cam, W_(i, o, key), p[0], p[1], p[2], { side: false, mirror: false }, { mode: "stand", blink: lidAt(t, i), facing: -1, ...fo }, {}, 1.4)); };
      const wv = pulse(F, 3, 12);
      GW(2, 1, guestLady(0), "gl0", { expr: F >= EV.WAVE1 - 2 ? "laugh" : "smile", armR: F >= EV.WAVE1 - 2 ? "wave" : undefined, wave: wv }, 401);
      GW(4, 3, sleeperO, "slp", { expr: F >= EV.SLEEP1 - 2 ? "grin" : "sleep", armR: F >= EV.SLEEP1 - 2 ? "wave" : undefined, wave: wv, hatTilt: 0 }, 402);
      GW(2, 3, diner, "dnr", { expr: F >= EV.SPOON1 - 2 ? "grin" : "smile", armR: F >= EV.SPOON1 - 4 ? "raise" : undefined, prop: F >= EV.SPOON1 - 4 ? "spoon" : null }, 403);
      workers(out, cam, F, t, "cheer", 3);
      plazaCrowd(out, cam, F, t, true, 40, 7, 26);
      const fp = SPOT.FOREMAN;
      stand(out, cam, 410, FOREMAN, "foreman", [fp[0] + 5, 0.55, fp[2] + 4], { expr: "laugh", armR: "raise", prop: "flagPole", facing: -1, lean: -4 }, t);
      break;
    }
    case 2: { // the swamp-edge town: cattails, mist, frogs; @250 a frog plops; @280 the street is a river of mud
      if (F < EV.CUT2) {
        const jf = (F - EV.FROG2 + 4) / 18, hop = jf > 0 && jf < 1;
        const fp: V3 = [1.0, 0.0, 22.5];
        if (!hop && F < EV.FROG2 - 4) fxc(out, "frogS", 300, 300, (p) => fxFrog(p, 0), [fp[0], 0.3, fp[2]], 0.7, 0.7);
        else if (hop) fxc(out, "frogH" + q(jf, 12), 300, 300, (p) => fxFrog(p, q(jf, 12)), [fp[0] - 1.4 * jf, 0.3 + 0.7 * Math.sin(jf * Math.PI), fp[2] - 3.4 * jf], 0.75, 0.75);
        if (F >= EV.FROG2 + 12 && F < EV.FROG2 + 28) { const u = (F - EV.FROG2 - 12) / 16; fxc(out, "splM" + q(u, 12), 400, 400, (p) => fxMud(p, q(u, 12)), [fp[0] - 1.4, 0.4, fp[2] - 3.4], 1.6, 1.6, { glow: 1.0 }); }
        for (const [x, z, k] of [[-1.8, 20.5, 0], [2.6, 19.0, 1], [-0.2, 26, 2], [3.4, 24.5, 3]] as [number, number, number][]) fxc(out, "frogS", 300, 300, (p) => fxFrog(p, 0), [x, 0.22 + 0.01 * Math.sin(f * 0.4 + k), z], 0.5, 0.5);
        for (let k = 0; k < 7; k++) bigCloud(out, [-14 + 6 * k + 3 * Math.sin(f / 60 + k), 0.9 + 0.3 * (k % 2), -30 + 6 * k], 9, F, 0, 99, k, "#e8f0f2", 0, [0.3, 0, 0]);
        for (let k = 0; k < 4; k++) puff(out, [-2 + 3 * k, 0.5, 14 + 2 * k], ((F + k * 9) % 40) / FPS, 1.0, 1.4, k, "#e4eef0");
      } else {
        const cp: V3 = [0.4, 0, 8.0]; horse(out, cam, 0, [cp[0] + 1.7, 0, cp[2] + 3.4], [0.5, 0, 1], F, 3.4, true, true);
        stand(out, cam, 500, manTown(1), "drv", [cp[0] - 0.2, 0.1, cp[2] + 0.9], { expr: "annoyed", armR: "pull", armL: "pull", facing: 1, lean: 8 + 3 * Math.sin(f * 0.4) }, t);
        stand(out, cam, 501, bonnetLady(1), "lady1", [-2.4, 0, 13], { expr: F < EV.MUD2 - 4 ? "shock" : "nervous", armR: "lift", facing: -1, shrug: 0.4, lean: -4 }, t);
        const slp = F >= EV.SCHLORP2 - 4;
        stand(out, cam, 502, manTown(0), "man0", [2.6, 0, 14.6], { expr: slp ? "shock" : "pained", tilt: slp ? -10 + 12 * glide((F - EV.SCHLORP2) / 6) : 6 * Math.sin(f * 0.6), armR: slp ? "up" : "pull", armL: "out", facing: 1, hatTilt: slp ? 0.5 : 0, hatLift: slp ? 0.15 : 0 }, t);
        if (F >= EV.SCHLORP2 - 2) { const u = clamp01((F - EV.SCHLORP2 + 2) / 16); fxc(out, "slM" + q(u, 12), 400, 400, (p) => fxMud(p, q(u, 12)), [2.9, 0.3, 14.8], 1.8, 1.8); item(out, "boot", (p) => { p.poly([[200, 120], [310, 120], [330, 360], [440, 380], [450, 470], [190, 470]], "#5a3a22", 14); p.poly([[200, 440], [440, 440], [450, 470], [190, 470]], "#2a1a10", 8); }, [2.8, 0.38, 14.9], 0.42, 0.15, 512); }
        for (let k = 0; k < 6; k++) { const side = k % 2 ? 1 : -1, z = 24 + 6 * k; walkerDraw(out, cam, W_(510 + k, k % 2 ? bonnetLady(k) : manTown(k), "tw" + k), [side * 5.6, 0.38, z - 0.4 * (f - EV.CUT2) / 3], [0, 0, -1], z + f * 0.1, t, {}, "walk"); }
        for (let k = 0; k < 4; k++) bigCloud(out, [-6 + 4 * k, 0.8, 0 + 7 * k], 7, F, 0, 99, k, "#e4eef0", 0, [0.2, 0, 0]);
      }
      break;
    }
    case 3: { // the whole street one puddle: bubbles burp @328, a brown flow circles @343, stink + the dog holds his nose @358
      const P0: V3 = [0.2, 0.06, -12.5];
      if (F >= EV.FLOW3 - 3) { const ph = q((F / 70) % 1, 12); fxc(out, "swirl" + ph, 400, 400, (p) => fxSwirl(p, ph), [P0[0], 0.08, P0[2]], 5.2, 5.2, { flat: true }); }
      for (let k = 0; k < 7; k++) {
        const per = 36 + (k % 3) * 6, base = EV.BUBBLE3 - 4 + k * 5, u = ((F - base) % per + per) % per / per, on = F >= base;
        if (!on) continue; const g = q(Math.min(1, u * 1.15), 12);
        const bx = P0[0] + [-1.0, 0.7, 0.1, -0.5, 1.3, -1.5, 0.4][k], bz = P0[2] + [0.4, -0.2, 0.9, -0.9, 0.5, -0.1, -1.3][k];
        fxc(out, "bub" + g, 400, 400, (p) => fxBubble(p, g), [bx, 0.1 + 0.35 * g + 0.2 * (k % 2), bz], 0.5 + 0.7 * g, 0.5 + 0.7 * g, { glow: 1.05 });
        if (u > 0.88 && u < 1) poof(out, [bx, 0.5, bz], 0.9, F, base + Math.floor((F - base) / per) * per + Math.round(per * 0.88), 6);
      }
      if (F >= EV.BUBBLE3 - 3) for (let k = 0; k < 3; k++) bigCloud(out, [P0[0] + (k - 1) * 0.9, 0.5, P0[2] + 0.5], 2.0, F, EV.BUBBLE3 - 2 + k * 3, 1.0, k, "#c8d890", 0.9);
      if (F >= EV.STINK3 - 2) for (let k = 0; k < 3; k++) stink(out, [P0[0] - 1.6 + 1.6 * k, 0.6, P0[2] + 0.6 * (k % 2)], 1.6, F, k);
      const dz = lerp(-4.5, -9, smooth((F - 300) / 70)), nose = F >= EV.STINK3 - 2;
      dogAt(out, cam, [-4.2, 0.38, dz - 2.0 * (nose ? 0 : 0)], [0, 0, -1], F, { nose, k: 1, bark: false }, 1.35);
      stand(out, cam, 520, bonnetLady(3), "lad3", [4.9, 0.38, -16.5], { expr: F > EV.STINK3 ? "sick" : "annoyed", armR: F > EV.STINK3 ? "pinch" : undefined, facing: -1 }, t);
      for (let k = 0; k < 3; k++) bigCloud(out, [-8 + 5 * k, 0.8, -30 - 8 * k], 9, F, 0, 99, k, "#dfe8ea", 0, [0.2, 0, 0]);
      break;
    }
    case 4: { // cholera: a bench of green-faced townsfolk with thermometers, sneezing; the doctor with his bag shakes his head
      const C0 = SPOT.CLINIC, bx = C0[0] - 0.8, bz = [-24.2, -22.8, -21.4, -20.0];
      bz.forEach((zz, k) => {
        const sneeze = F >= EV.COUGH4 - 2 + k * 6 && F < EV.COUGH4 + 14 + k * 6, tz = F >= EV.COUGH4 + 10;
        sit(out, cam, 530 + k, sick(k), "sick" + k, [bx, 0.38 + 0.52, C0[2] + zz - C0[2] - 0.0], { expr: sneeze ? "cough" : (["sick", "pained", "nervous", "sick"] as Expr[])[k], armR: "raise", prop: "thermo", facing: 1, headTilt: sneeze ? -8 : 2 * Math.sin(f * 0.2 + k), lean: sneeze ? 6 : 0, sweat: SW(F, k) }, t, 1.05);
        if (sneeze) fxc(out, "cough" + q((F - EV.COUGH4 - k * 6) / 16, 8), 400, 400, (p) => fxCough(p, clamp01(q((F - EV.COUGH4 - k * 6 + 2) / 16, 8))), [bx + 0.9, 1.35 + 0.1 * k, C0[2] + zz], 1.5, 1.5);
        void tz;
      });
      const dp: V3 = [C0[0] + 1.4, 0.38, C0[2] - 22.2 + 22.2 - 0.4];
      stand(out, cam, 540, doctor, "doc", [C0[0] + 1.6, 0.38, C0[2] - 1.0], { expr: F < EV.SHAKE4 - 2 ? "stern" : "nervous", armR: "hold", prop: "chart", headTilt: F >= EV.SHAKE4 - 2 ? 10 * Math.sin((F - EV.SHAKE4) * 0.9) * Math.exp(-(F - EV.SHAKE4) / 20) : 0, facing: -1, look: 0.4 }, t);
      item(out, "bag", (p) => { p.poly([[100, 280], [500, 280], [520, 440], [80, 440]], "#3a2a26", 16); p.stroke([[220, 280], [260, 200], [340, 200], [380, 280]], 22, "#5a463c"); p.band([[100, 340], [500, 340]], "#5a463c", 18, 0); }, [C0[0] + 0.7, 0.38 + 0.18, C0[2] - 1.9], 0.36, 0, 512);
      void dp;
      for (let k = 0; k < 3; k++) bigCloud(out, [-4 + 3 * k, 1.2, -24 + 4 * k], 6, F, 0, 99, k, "#e4eef0", 0, [0.2, 0, 0]);
      for (let k = 0; k < 4; k++) walkerDraw(out, cam, W_(550 + k, k % 2 ? bonnetLady(k) : manTown(k + 2), "tw" + k), [2.4 + k, 0, -10 - 5 * k + 0.05 * (F - 389)], [0, 0, -1], 100 + F * 0.05 + k, t, { expr: "nervous" }, "walk");
      break;
    }
    case 5: { // the council hall
      const M = SPOT.MAYOR, EZ = SPOT.EASEL;
      const gav = F >= EV.GAVEL5 - 5 && F < EV.GAVEL5 + 12, hit = F >= EV.GAVEL5;
      const atEasel = F >= EV.CUTIN5;
      const gasp = F >= EV.GASP5 - 2;
      if (!atEasel) {
        stand(out, cam, 600, mayor, "mayor", [M[0], 0.4, M[2] - 0.7], { expr: F < EV.WILD5 - 2 ? "stern" : F < EV.GAVEL5 + 4 ? "shock" : "yell", armR: gav || F > EV.WILD5 ? "raise" : undefined, prop: gav || F > EV.WILD5 ? "gavel" : null, shrug: 0.3, facing: 1, tilt: hit && F < EV.GAVEL5 + 5 ? 3 : 0, lean: F > EV.WILD5 ? -3 : 0 }, t, 1.05);
        if (hit && F < EV.GAVEL5 + 14) { poof(out, [M[0] + 0.55, 1.45, M[2] + 0.2], 1.4, F, EV.GAVEL5, 12); sparkle(out, [M[0] + 0.5, 1.5, M[2] + 0.5], F, EV.GAVEL5, 0.9, 1.5); }
        for (let k = 0; k < 6; k++) {
          const sd = k % 2 ? 1 : -1, z = -6.4 + 1.9 * Math.floor(k / 2), sh = F >= EV.WILD5 - 2;
          sit(out, cam, 610 + k, councilman(k), "cm" + k, [sd * 1.7, 0.5, z], { expr: gasp ? "jawdrop" : F >= EV.GAVEL5 ? "shock" : sh ? "awe" : "stern", facing: -sd as -1 | 1, look: -sd * 0.5, headTilt: 3 * Math.sin(f * 0.15 + k) }, t);
        }
      } else {
        for (let k = 0; k < 6; k++) {
          const sd = k % 2 ? 1 : -1, z = -6.4 + 1.9 * Math.floor(k / 2);
          sit(out, cam, 610 + k, councilman(k), "cm" + k, [sd * 1.7, 0.5, z], { expr: gasp ? "jawdrop" : F > EV.ARROW5 ? "awe" : "stern", facing: 1, look: 0.7, headTilt: 3 * Math.sin(f * 0.15 + k), armR: gasp && k % 2 ? "raise" : undefined, armL: gasp && k % 2 === 0 ? "raise" : undefined }, t);
        }
        stand(out, cam, 600, mayor, "mayor", [EZ[0] - 1.35, 0, EZ[2] + 0.2], { expr: F < EV.ARROW5 - 2 ? "proud" : "grin", armR: F >= EV.ARROW5 - 6 ? "point" : "out", facing: 1, look: 0.7, lean: 4 }, t, 1.05);
        if (F >= EV.ARROW5 && F < EV.ARROW5 + 14) sparkle(out, [EZ[0] + 0.55, 2.0, EZ[2] + 0.3], F, EV.ARROW5, 0.9, 1.4);
        if (F >= EV.PIPE5 && F < EV.PIPE5 + 16) sparkle(out, [EZ[0], 1.3, EZ[2] + 0.3], F, EV.PIPE5, 1.1, 1.4);
        if (gasp) for (let k = 0; k < 6; k++) { if (F < EV.GASP5 + 14) poof(out, [(k % 2 ? 1 : -1) * 1.5, 2.2, -6.4 + 1.9 * Math.floor(k / 2)], 0.9, F, EV.GASP5 + (k % 3), 8); }
      }
      out.lights.push({ p: [0, 5.2, -3], I: 14, col: "#ffd9a0", d: 16 });
      break;
    }
    case 6: { // the street is raised: shovels, the dumping wagon; then pull back: the buildings in a pit; the head bonk
      const Fy = fillAt(F);
      for (let k = 0; k < 7; k++) {
        const x = -9 + 2.1 * k + (k % 2) * 0.7, z = -2.8 + 1.6 * (k % 3), sw = Math.sin(f * 0.42 + k * 1.3);
        stand(out, cam, 620 + k, wk(k + 3), "wk" + ((k + 3) % 12), [x, Fy, z], { expr: sw > 0.3 ? "pained" : "grin", armR: "hold", prop: "shovel", lean: 6 + 6 * sw, tilt: 2 * sw, facing: k % 2 ? 1 : -1, sweat: SW(F, k), look: 0.4 }, t);
        if (F >= EV.SHOVEL6 - 4 && k % 2 === 0 && (F + k * 3) % 11 === 0) puff(out, [x + 0.5, Fy + 0.5, z], 0, 0.9, 0.5, F + k, "#c8a070");
      }
      const wp: V3 = [-2.2, Fy, 2.6];
      horse(out, cam, 2, [wp[0], Fy, wp[2] + 3.2], [0, 0, 1], F, 3.4, false, F < EV.DUMP6 - 8 || F > EV.DUMP6 + 40);
      stand(out, cam, 630, manTown(2), "drvr", [wp[0] + 0.45, Fy + 1.0, wp[2] + 1.3], { expr: "grin", armR: "pull", facing: 1 }, t);
      if (F >= EV.DUMP6 - 4 && F < EV.DUMP6 + 40) for (let k = 0; k < 5; k++) { const u = (F - EV.DUMP6 + 4 - k * 2) / 24; if (u > 0 && u < 1.3) bigCloud(out, [wp[0] + 0.6 * k - 1.2, Fy + 0.6, wp[2] - 1.5 - 1.5 * u], 1.9 + 0.8 * k * 0.2, F, F - 2, 0.5, k, "#c8a070", 0.6); }
      // pedestrians on the raised street, down the stair, the bonk
      for (let k = 0; k < 4; k++) { const x0 = -20 + 14 * k + 0.25 * (F - 618), z = k % 2 ? 4.4 : -4.4; if (Fy > 1) walkerDraw(out, cam, W_(640 + k, k % 2 ? bonnetLady(k + 1) : manTown(k), "pd" + k), [x0, Fy + 0.14, z], [1, 0, 0], x0, t, { expr: "smile", prop: k % 2 ? "parasol" : null }, "walk"); }
      if (F >= EV.PULL6 - 6) {
        const u = clamp01((F - (EV.BONK6 - 34)) / 34), zs = lerp(5.4, 8.1, u * u * (3 - 2 * u)), hitN = F >= EV.BONK6;
        const yy = Fy * (1 - ((zs - 6) / 3) * 0.923 - 0.077);
        const rb = hitN ? clamp01((F - EV.BONK6) / 10) : 0, zz = zs - 0.9 * rb * (1 - rb * 0.3);
        const m = manTown(3);
        walkerDraw(out, cam, W_(650, m, "bonk"), [SPOT.PIT_STAIR_X, Math.max(0, hitN ? Fy * (1 - ((zz - 6) / 3) * 0.923 - 0.077) : yy), hitN ? zz : zs], [0, 0, 1], zs * 1.6, t, hitN ? { expr: "dazed", armR: "palm", headTilt: 8 * Math.sin((F - EV.BONK6) * 0.8) * Math.exp(-(F - EV.BONK6) / 18), facing: -1 } : { expr: "smile_closed", look: 0.3 }, hitN ? "walk" : "walk");
        if (hitN) { stars(out, [SPOT.PIT_STAIR_X, Math.max(0, Fy * (1 - ((zz - 6) / 3) * 0.923 - 0.077)) + 2.1, zz], 1.2, F); if (F < EV.BONK6 + 12) sparkle(out, [SPOT.PIT_STAIR_X, 2.5, 8.0], F, EV.BONK6, 1.0, 1.5); }
        for (let k = 0; k < 3; k++) { const u2 = clamp01((F - (EV.PULL6 + 6 + 14 * k)) / 40); if (u2 > 0 && u2 < 1) walkerDraw(out, cam, W_(655 + k, k === 1 ? bonnetLady(k) : manTown(k + 1), "sd" + k), [SPOT.PIT_STAIR_X - 0.3 + 0.3 * k, Fy * (1 - u2 * 0.92) + 0.0, 6.0 + 3.0 * u2], [0, 0, 1], u2 * 8, t, { expr: "smile" }, "walk"); }
        walkerDraw(out, cam, W_(660, manTown(0), "pit0"), [1.4, 0, 8.6], [1, 0, 0], F * 0.05, t, { expr: "neutral" }, "walk");
        walkerDraw(out, cam, W_(661, bonnetLady(2), "pit1"), [-6, 0, 8.6], [1, 0, 0], F * 0.05 + 1, t, { expr: "smile", prop: "parasol" }, "walk");
      }
      break;
    }
    case 7: { // the Tremont House on its plinth: the doorman, carriages, the crowd; the crest appears @740
      const H = hotelY(7, F);
      stand(out, cam, 700, doorman, "door", [1.9, 0.56, 0.55], { expr: "proud", armR: F > EV.CREST7 + 6 ? "salute" : "hip", facing: -1, lean: 2 }, t);
      stand(out, cam, 701, doorman, "door", [-1.9, 0.56, 0.55], { expr: "smile", armL: "hip", facing: 1 }, t);
      guests(out, cam, t, 7, H, (fl, bay) => F > 750 && (fl + bay) % 3 === 0, 1.0);
      horse(out, cam, 1, [-11.8, 0, 18.2], [0.5, 0, 1], F, 3.4, false, true); stand(out, cam, 702, manTown(1), "cab1", [-13.1, 1.0, 16.0], { expr: "smile", armR: "pull", facing: 1 }, t);
      horse(out, cam, 3, [15.6, 0, 33.2], [-0.3, 0, 1], F, 3.4, false, true);
      for (let k = 0; k < 18; k++) { const x = -9 + 18 * hh(k, 3) + 1.2 * Math.sin(f * 0.02 + k), z = 3.8 + 12 * hh(k, 4); walkerDraw(out, cam, W_(710 + k, k % 3 === 1 ? bonnetLady(k) : manTown(k), "t7" + k), [x, 0.2 + 0 * z, z], [k % 2 ? 1 : -1, 0, 0], f * 0.03 + k, t, { expr: "smile", prop: k % 3 === 1 && k % 2 ? "parasol" : null }, "walk"); }
      if (F >= EV.CREST7 - 2 && F < EV.CREST7 + 18) sparkle(out, [0, H + FH[1] + 1.8, 1.0], F, EV.CREST7 - 2, 4.0, 1.4);
      break;
    }
    case 8: { // the contractors' office
      const T = SPOT.TABLE, Pu = [0.1, 0, T[2] - 0.95] as V3;
      const rolled = F < EV.PLAN8 - 2, smileOn = F >= EV.SMILE8 - 2;
      stand(out, cam, 800, PULLMAN, "pull", Pu, { expr: smileOn ? "grin" : F < EV.PLAN8 - 2 ? "neutral" : "awe", armR: rolled ? "hold" : "out", prop: rolled ? "blueprint" : null, armL: F >= EV.PLAN8 ? "out" : undefined, look: smileOn ? 0 : -0.3, gaze: smileOn ? 0 : 0.7, facing: 1,
        lean: smileOn ? 4 : -4, headTilt: smileOn ? -4 : 0 }, t, 1.02);
      const hs = (e: number) => F >= e;
      const px = [-2.2, -1.1, 1.3, 2.4];
      px.forEach((x, k) => {
        const arrive = glide((F - (EV.HANDS8 - 26 + 4 * k)) / 18), xx = x + (k < 2 ? -1 : 1) * (1 - arrive) * 3.2, shake = F >= EV.CHAIN8 - 4 + k * 2 && F < EV.CHAIN8 + 24, side = k < 2 ? 1 : -1;
        const inChain = k === 1 ? true : true;
        stand(out, cam, 810 + k, partner(k), "par" + k, [xx, 0, Pu[2] + 0.3 * (k % 2)], { expr: shake ? "laugh" : F >= EV.HANDS8 ? "grin" : "awe", armR: shake && side > 0 ? "out" : (k < 2 ? undefined : undefined), armL: shake && side < 0 ? "out" : undefined, wave: shake ? pulse(f, k, 8) : undefined, facing: side as -1 | 1, look: 0.4, lean: shake ? 5 : 0 }, t, 1.0);
        void hs; void inChain;
      });
      if (F >= EV.CHAIN8 - 2 && F < EV.CHAIN8 + 24) for (const x of [-0.5, 0.1, 0.7]) sparkle(out, [x + 0.2, 1.25, -0.6], F, EV.CHAIN8 - 2 + Math.round(x * 4), 0.7, 1.4);
      if (smileOn && F < EV.SMILE8 + 16) sparkle(out, [0.5, 1.9, Pu[2] + 0.2], F, EV.SMILE8 - 1, 0.7, 1.5);
      out.lights.push({ p: [T[0] + 1.3, 1.6, T[2] - 0.4], I: 5, col: "#ffd9a0", d: 5 }, { p: [0, 3.0, 0], I: 10, col: "#ffe2b0", d: 10 });
      break;
    }
    case 9: { // under the hotel: the hero jackscrew @974; pull back to the forest; the workers march in
      const H = hotelY(9, F), hp = SPOT.HERO_SCREW;
      if (F < EV.PULLBACK9 + 36) {
        const placing = F < EV.SCREW9 - 2, hit = F >= EV.SCREW9 - 2;
        stand(out, cam, 900, wk(1), "wk1", [hp[0] - 1.25, 0, hp[2] + 0.1], { expr: hit ? "grin" : "pained", armR: placing ? "hold" : "pull", armL: placing ? "hold" : "pull", prop: placing ? "bar" : null, lean: hit ? 8 : 4, facing: 1, sweat: SW(F, 3), look: 0.4 }, t, 1.2);
        if (hit && F < EV.SCREW9 + 16) { sparkle(out, [hp[0] - 0.7, 1.55, hp[2] + 0.2], F, EV.SCREW9 - 2, 1.2, 1.5); for (let k = 0; k < 3; k++) puff(out, [hp[0] + (k - 1) * 0.4, 0.15, hp[2] + 0.4], (F - EV.SCREW9 + 2 + k * 2) / FPS, 0.8, 0.5, k, "#d8a86a"); }
      }
      workers(out, cam, F, t, F < EV.MARCH9 - 40 ? "idle" : "march", 14);
      void H;
      break;
    }
    case 10: { // the signal: flag + whistle; every worker turns his screws in a ripple (@1142, 1168, 1194)
      const Fp = SPOT.FOREMAN, fy = 0.55;
      stand(out, cam, 1000, FOREMAN, "foreman", [Fp[0], fy, Fp[2]], { expr: F >= EV.WHISTLE10 - 2 ? "whistle" : "stern", armR: F >= EV.FLAG10 - 4 ? "raise" : "hold", prop: "flagPole", armL: F >= EV.WHISTLE10 - 2 ? "drink" : undefined, lean: F >= EV.FLAG10 ? -4 : 0, facing: 1,
        headTilt: F >= EV.WHISTLE10 ? 4 : 0 }, t, 1.05);
      if (F >= EV.WHISTLE10 - 1 && F < EV.WHISTLE10 + 12) { poof(out, [Fp[0] - 0.5, fy + 1.55, Fp[2] + 0.2], 1.2, F, EV.WHISTLE10 - 1, 12); fxc(out, "whis" + q((F - EV.WHISTLE10) / 12, 8), 500, 500, (p) => fxBurst(p, q(clamp01((F - EV.WHISTLE10 + 1) / 12), 8), "#fff3b0", 8, 40, 200), [Fp[0] - 0.5, fy + 1.6, Fp[2] + 0.5], 1.6, 1.6, { glow: 1.3 }); }
      workers(out, cam, F, t, "turn", 16);
      for (const [e, j0] of [[EV.TURN10, 0], [EV.TURN10B, 0], [EV.TURN10C, 0]] as [number, number][]) if (F >= e - 2 && F < e + 10) for (let k = 0; k < 3; k++) sparkle(out, [screwX(2 + 4 * k) + 0.1, 1.15, screwZ(j0) + 0.5], F, e - 2 + k, 0.45, 1.5);
      break;
    }
    case 11: { // inch by inch: the board, the neat row of smiling workers, spectators
      const H = hotelY(11, F);
      guests(out, cam, t, 11, H, (fl, bay) => (fl + bay) % 2 === 0, 1.35);
      workers(out, cam, F, t, "turn", 3);
      plazaCrowd(out, cam, F, t, false, 26, 8, 30);
      for (const [e, k] of [[EV.MARK11, 1], [EV.MARK11B, 2], [EV.MARK11C, 3], [1268, 4], [1272, 5], [EV.MARK11D, 6]] as [number, number][]) if (F >= e - 1 && F < e + 12) sparkle(out, [SPOT.BOARD[0] + 0.9, 3.14 + 0.4 * k, SPOT.BOARD[2] + 0.4], F, e - 1, 0.8, 1.5);
      for (let k = 0; k < 4; k++) stand(out, cam, 1100 + k, wk(k + 2), "wk" + (k + 2), [SPOT.BOARD[0] + 1.8 + 1.0 * k, 0, SPOT.BOARD[2] + 1.0], { expr: "smile", armR: k % 2 ? "point" : undefined, look: 0.6, facing: -1 }, t);
      break;
    }
    case 12: { // the cutaway: the hotel never closed
      const y = cutY(F), L = y + 0.35, Dn = y + SPOT.ROOM_H[1] + 0.35, Bd = y + SPOT.ROOM_H[2] + 0.35, D = SPOT.CUT_D;
      // lobby
      const flip = F >= EV.OPEN12 - 4;
      stand(out, cam, 1200, bellhop, "bhop", [-4.0, L, -1.1], { expr: flip ? "proud" : "neutral", armR: F >= EV.OPEN12 - 8 && F < EV.OPEN12 + 14 ? "up" : undefined, prop: F >= EV.OPEN12 - 8 && F < EV.OPEN12 + 14 ? "keyfob" : null, facing: -1, lean: flip ? -3 : 0, look: -0.3 }, t, 1.0);
      if (F >= EV.OPEN12 + 4 && F < EV.OPEN12 + 20) sparkle(out, [-4.7, L + 1.95, -0.7], F, EV.OPEN12 + 4, 0.9, 1.5);
      const ring = F >= EV.CLERK12 - 2;
      stand(out, cam, 1201, clerk, "clerk", [0.6, L + 0.0, -3.55], { expr: ring ? "grin" : "smile", armR: ring ? "raise" : "hold", prop: ring ? "bell" : null, wave: ring ? pulse(f, 5, 5) : undefined, facing: -1, look: -0.4 }, t, 1.05);
      if (ring) { sparkle(out, [0.15, L + 1.9, -3.2], F, EV.CLERK12 - 2, 0.8, 1.5); if (F > EV.CLERK12 && F % 6 < 3) sparkle(out, [0.15, L + 1.9, -3.2], F, F - (F % 6), 0.6, 1.4); }
      stand(out, cam, 1202, guestLady(2), "lad2", [1.9, L, -1.9], { expr: ring ? "laugh" : "smile", armR: "lift", prop: "trunk", facing: 1, look: -0.3, lean: 2 }, t, 1.0);
      stand(out, cam, 1203, manTown(1), "par2", [4.3, L, -1.3], { expr: "smile", look: -0.3, facing: -1 }, t);
      // dining room
      const eat = F >= EV.DINER12 - 6, sp = F % 24 < 12;
      sit(out, cam, 1210, diner, "diner", [-1.1, Dn + 0.5, -3.55], { expr: eat ? (sp ? "smile_closed" : "grin") : "smile", armR: eat ? (sp ? "drink" : "raise") : "hold", prop: eat ? "spoon" : null, facing: 1, look: -0.2, lean: 2, headTilt: 3 * Math.sin(f * 0.2) }, t, 1.1);
      sit(out, cam, 1211, guestLady(1), "lad1", [-3.2, Dn + 0.5, -3.55], { expr: "smile", look: 0.4, facing: 1, armR: "drink", prop: "spoon" }, t, 1.05);
      sit(out, cam, 1212, councilman(1), "cm1", [0.9, Dn + 0.5, -3.55], { expr: "grin", facing: -1, look: 0.3 }, t, 1.05);
      stand(out, cam, 1213, porter, "wtr", [2.5, Dn, -2.4], { expr: "smile", armR: "lift", prop: "tray", facing: -1 }, t);
      for (const x of [-3.0, -1.6, -0.2]) steam(out, [x, Dn + 1.3, -3.3], 0.8, F + Math.round(x * 5));
      // bedroom
      lying(out, cam, W_(1220, sleeperO, "slpr"), [-2.75, Bd + 0.85, -3.8], { expr: "sleep", armR: "behindHead", armL: "behindHead" }, t, -1, 1.0);
      zzz(out, [-4.1 + 0.2, Bd + 1.7, -3.2], F, EV.SLEEPER12 - 20, 0.7);
      const cp: V3 = [-0.55, Bd + 1.4, -D + 0.45];
      fxc(out, "cflame", 300, 400, (p) => fxFlame(p, 0.3, 2), [cp[0], cp[1], cp[2] + 0.05], 0.22, 0.3, { glow: 1.6 });
      out.lights.push({ p: [cp[0], cp[1] + 0.2, cp[2] + 0.5], I: 3, col: "#ffb860", d: 5 }, { p: [0, L + 3.4, -3], I: 5, col: "#ffe2b0", d: 8 }, { p: [0, Dn + 3.4, -3], I: 5, col: "#ffe2b0", d: 8 });
      // the workers below, turning
      for (let k = 0; k < 10; k++) { const pl = turnPulse(F, 0) + 0.15 * Math.sin(f * 0.1 + k); stand(out, cam, 1230 + k, wk(k + 4), "wk" + ((k + 4) % 12), [-5.4 + k * 1.2 + 0.45, 0, 0.55 + 0.3 * (k % 2)], { expr: "smile", armR: "pull", armL: "pull", lean: 6 + 8 * clamp01(pl), facing: k % 2 ? 1 : -1, sweat: SW(F, k) }, t, 1.0); }
      for (let k = 0; k < 3; k++) stand(out, cam, 1245 + k, manTown(k), "mt" + k, [-14 + 6 * k + 28 * (k > 0 ? 1 : 0), 0, 9], { expr: "awe", look: 0.4, facing: k % 2 ? -1 : 1 }, t);
      break;
    }
    case 13: { // not a single window broke
      const H = hotelY(13, F), sx = SPOT.WINDOW13[0], y = H + FH[1];
      const tap = F >= EV.TAP13 - 5 && F < EV.TAP13 + 4, dry = F >= EV.DRY13 - 2;
      const phase = F < EV.TAP13 - 8 ? 0 : F < EV.WINK13 - 2 ? 1 : 2;
      stand(out, cam, 1300, inspector, "insp", [sx - 1.15, 11.8, 1.3], {
        expr: phase === 0 ? "stern" : phase === 1 ? (dry ? "smile" : "awe") : "wink", armR: phase === 2 ? "salute" : phase === 0 ? "hold" : "out", prop: phase === 2 ? null : "magnifier",
        hatLift: phase === 2 ? 0.35 : 0, look: -0.4, facing: 1, lean: tap ? 6 : 0, gaze: phase === 2 ? 0 : 0.3,
      }, t, 1.15);
      void y;
      if (F >= EV.TAP13 - 1 && F < EV.TAP13 + 14) sparkle(out, [sx - 0.1, H + FH[1] + 2.0, 0.2], F, EV.TAP13 - 1, 0.7, 1.6);
      if (F >= EV.WINK13 - 1 && F < EV.WINK13 + 18) sparkle(out, [sx - 1.0, 11.8 + 1.9, 1.5], F, EV.WINK13 - 1, 0.6, 1.5);
      out.lights.push({ p: [sx, H + FH[1] + 2.0, -1.5], I: 3, col: "#ffe2b0", d: 4 });
      break;
    }
    case 14: {
      if (set === "platform") { // the golden platform: rich old Pullman, the coin, the passengers, the steam
        const cy = 0.0;
        stand(out, cam, 1400, PULLMAN_OLD, "pullO", [0.0, cy, 0.7], { expr: F >= EV.BEAM14 - 2 ? "laugh" : "proud", armR: F >= EV.COIN14 - 2 ? "raise" : "hold", prop: F >= EV.COIN14 - 4 ? "coin" : "watch", armL: "hip", facing: 1, lean: 2, look: 0.3 }, t, 1.08);
        const u = (F - EV.COIN14) / 40, cyy = 2.4 + 0.45 * Math.sin(Math.max(0, u) * 8);
        if (F >= EV.COIN14) { const ph = q((F / 14) % 1, 14); fxc(out, "coin" + ph, 300, 300, (p) => fxCoin(p, ph), [0.55, cyy, 0.9], 0.5, 0.5, { glow: 1.5 }); sparkle(out, [0.55, cyy, 0.95], F, F - (F % 10), 0.6, 1.6); }
        if (F >= EV.BEAM14 - 2 && F < EV.BEAM14 + 16) sparkle(out, [0.2, 2.4, 1.0], F, EV.BEAM14 - 2, 1.2, 1.5);
        stand(out, cam, 1401, conductor, "cond", [3.0, 0, 0.5], { expr: "proud", armR: "raise", prop: "whistle", look: -0.4, facing: -1 }, t);
        stand(out, cam, 1402, porter, "port", [-3.6, 0, 0.4], { expr: "smile", armR: "lift", prop: "trunk", facing: 1 }, t);
        for (let k = 0; k < 7; k++) { const x = -9.5 + 2.5 * k + 0.2 * Math.sin(k), pf = passenger(k); stand(out, cam, 1410 + k, pf, "ps" + k, [x, 0, 1.6 + 0.9 * (k % 2)], { expr: "smile", armR: k % 3 === 0 ? "wave" : undefined, wave: pulse(f, k, 18), prop: k % 3 === 1 ? "parasol" : null, facing: k % 2 ? 1 : -1 }, t); }
        steam(out, [10.6, 7.5, -5.0], 3.0, F); steam(out, [10.6, 9.6, -5.0], 3.4, F + 8); steam(out, [10.9, 11.6, -5.0], 3.6, F + 16);
        for (let k = 0; k < 4; k++) bigCloud(out, [-12 + 3 * k, 1.2, -7.0], 3.5, F, 0, 99, k, "#fbe6cc", 0.2, [0.3, 0, 0]);
        out.lights.push({ p: [3.0, 3.2, 3], I: 3, col: "#ffc070", d: 8 });
      } else { // inside the sleeping car: sleepers in the lower berths, zzz, the countryside slides by in the windows
        const bays = [-6.0, -3.0, 0.0, 3.0, 6.0];
        bays.forEach((x, k) => {
          const w = W_(1450 + k, { ...sleeperO, moustache: k % 2 ? undefined : "#5a3a22", cap: ["#f4f0ea", "#fbe8e8", "#e8f0f8"][k % 3], band: ["#c0352e", "#2f8a5a", "#3a6ab0"][k % 3] }, "slp" + k);
          lying(out, cam, w, [x + 0.1 * (k % 2), 0.78, -1.1], { expr: "sleep", armR: k % 2 ? "behindHead" : undefined, armL: "hip" }, t, k % 2 ? 1 : -1, 1.0);
          zzz(out, [x + (k % 2 ? 0.9 : -0.9), 1.5, -1.0], F, EV.CUT14 + k * 5, 0.5);
        });
        for (const x of [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]) out.lights.push({ p: [x, 2.7, 0], I: 3.5, col: "#ffd9a0", d: 5 });
      }
      break;
    }
  }
  void fxStink; void mix; void SKIN; void screwTurn; void riseAt; void boardK; void hexOf; void act; void blob; void SCREWS; void WORKER_ROWS; void dogDraw; void fxPoof; void horse;
  return out;
};
