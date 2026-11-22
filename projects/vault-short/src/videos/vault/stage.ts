// Per-shot staging of "The Time Lock": every character card and effect card of shot `id` at time t (a pure function of
// id + t). Cast: the banker (nightcap and long nightshirt at night; waistcoat, watch chain and a walrus moustache by day), three
// bumbling robbers (bandana masks, flat caps, striped shirts, one tall, one short and round, one with a huge moustache; no
// weapons), James Sargent (goggles up, apron full of tools), the townsfolk of Morrison, queueing bankers with money bags, and the
// guard clock mascot. No words, no digits. CONTRACT with world.ts: stage(id, t, cam) -> { places, fx, lights }.
import * as THREE from "three";
import { Outfit, Expr, FrontOpts, townsfolk, fxPlan, fxBlueprint, fxCrowbar, fxRopeWrap, fxIdea, fxSmug, fxLightSpill, fxSilhouette, fxPaper, fxMoneyBag, guardClock, horseDraw, fxConfetti, fxZ } from "./toon";
import {
  Stage, CamInfo, person, blob, stand, actor, lidAt, q, hh, W_, Who, puff, sparkle, poof, steam, zzz, fxc, item, setLight, findSun, SUNV, fxFlame, fxPoof, bigCloud,
  SHOTS, setOf, EV, FPS, clamp01, sitter,
} from "./cast";
import { V3, SPOT, smooth, glide, lerp, lightAt, cartZ, marchZ2, lapse, wheelTurn, pushAt } from "./story";

const SU = 0.00216;
const F5 = (n: number) => Math.round(n * 5) / 5;
// ---------------- outfits ----------------
const robber = (v: number): Outfit => ({
  jacket: ["#e8dfc6", "#dcd2b6", "#e4dcc4"][v], hstripe: ["#2a2a3c", "#7a2a30", "#28465e"][v], pants: ["#3a3436", "#4a4038", "#2e3a4a"][v], boots: "#2a2220",
  hat: "flatcap", cap: ["#4a4a54", "#6a5a46", "#3a3a44"][v], hair: ["#3a2a20", "#7a4a2a", "#2a2020"][v], mask: ["#c8302e", "#2a5ab0", "#e0a820"][v],
  braces: ["#7a4a2a", "#5a3a2a", "#2a2a3a"][v], build: (["slim", "stout", "stout"] as const)[v], headType: (["bean", "bun", "standard"] as const)[v], buttons: "none",
  moustache: v === 2 ? "#3a2a22" : undefined,
});
const RS = [1.14, 0.86, 1.0];   // tall, short and round, huge moustache
const BANKER_DAY: Outfit = { jacket: "#efe8d4", pants: "#3a3a46", boots: "#2a2220", hat: "hair", hairStyle: "side", hair: "#6a5a48", collar: "shirt", bowtie: "#2a2a40", waistcoat: "#7a2a3a",
  moustache: "#5a4a38", headType: "standard", build: "stout", buttons: "none", chain: true, shortSleeve: true, braces: "#7a2a3a" };
const BANKER_NIGHT: Outfit = { jacket: "#f4f0ea", pants: "#f4f0ea", boots: "#b8342e", dress: "#f4f0ea", longDress: true, hat: "nightcap", cap: "#f4f0ea", band: "#c0352e", hair: "#6a5a48",
  moustache: "#5a4a38", headType: "standard", build: "stout", buttons: "none" };
const SARGENT: Outfit = { jacket: "#e8e0cc", pants: "#4a4038", boots: "#3a2a22", hat: "goggles", cap: "#6a5a48", hair: "#3a2a20", collar: "open", braces: "#7a3a2a", apron: "#9a6a3a", shortSleeve: true,
  moustache: "#3a2a20", headType: "bean", build: "slim", buttons: "none" };
const worker = (v: number): Outfit => ({ jacket: ["#efe8d4", "#d4dce4", "#e0d0b0", "#c4d4bc"][v % 4], pants: ["#3a3a46", "#4a4034", "#34404a"][v % 3], boots: "#3a2a22", hat: "flatcap",
  cap: ["#6a6458", "#8a7a5a", "#4a5262", "#7a4a3a"][v % 4], hair: "#3a2a20", collar: "open", braces: ["#3a3a40", "#8a3a2e", "#2e4a6a"][v % 3], shortSleeve: v % 2 === 0, buttons: "none",
  moustache: v % 3 === 0 ? "#3a2a20" : undefined, headType: (["standard", "bean", "bun"] as const)[v % 3], build: v % 4 === 3 ? "stout" : "adult" });
const bonnetLady = (v: number): Outfit => ({ ...townsfolk(2 * v + 1), hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2", "#8aa860"][v % 4], longDress: true, jacket: ["#8c3b4a", "#5d7a3a", "#2f5f6a"][v % 3], collar: "shirt", buttons: "none" });
const manTown = (v: number): Outfit => ({ jacket: ["#8a5a3a", "#5a6a4a", "#4a5a7a", "#7a6a48"][v % 4], pants: "#3a3a46", boots: "#3a2a22", hat: v % 3 === 0 ? "bowler" : v % 3 === 1 ? "flatcap" : "tophat", cap: ["#3a3030", "#6a5a48", "#4a4a52"][v % 3],
  hair: "#3a2a20", collar: "shirt", buttons: "none", moustache: v % 2 ? "#3a2a20" : undefined, headType: (["standard", "bean", "bun"] as const)[v % 3], build: v % 4 === 2 ? "stout" : "adult", waistcoat: v % 2 ? "#6a3a2a" : undefined });
const bankerQ = (v: number): Outfit => ({ jacket: ["#2e2e3a", "#3a3a4e", "#4a3a36", "#26364a"][v % 4], pants: "#2a2a34", boots: "#1a1618", hat: v % 2 ? "tophat" : "bowler", cap: "#2a2426", hair: ["#3a2a20", "#7a6a58", "#2a2020"][v % 3],
  collar: "shirt", bowtie: ["#c8282e", "#2a2a40", "#e0b050"][v % 3], waistcoat: ["#7a2a3a", "#2a5a4a", "#6a4a2a", "#4a4a7a"][v % 4], chain: v % 2 === 0, moustache: v % 3 === 1 ? undefined : ["#3a2a20", "#7a6a58", "#2a2020"][v % 3],
  headType: (["standard", "bean", "bun"] as const)[v % 3], build: v % 3 === 0 ? "stout" : "adult", buttons: "none" });
const O = new Map<string, Outfit>(); const memo = (k: string, f: () => Outfit) => { let o = O.get(k); if (!o) { o = f(); O.set(k, o); } return o; };

// ---------------- helpers ----------------
const pulse = (f: number, i: number, per = 22) => q(0.5 + 0.5 * Math.sin((f / per) * 6.28 + i), 6);
/** an actor with idle life + explicit per-frame options */
const A = (out: Stage, cam: CamInfo, i: number, o: Outfit, okey: string, p: V3, t: number, facing: -1 | 1, fo: FrontOpts = {}, scale = 1) =>
  actor(out, cam, i, o, okey, p, [], t, facing, (x) => ({ ...x, ...fo }), scale);
const walkerDraw = (out: Stage, cam: CamInfo, w: Who, p: V3, dir: V3, dist: number, t: number, fo: FrontOpts = {}, gait: "walk" | "march" = "walk", scale = 1) => {
  const stride = gait === "march" ? 1.1 : 1.5, phase = q((((dist / stride) % 1) + 1) % 1, 12);
  const sx = dir[0] * cam.right.x + dir[2] * cam.right.z, facing = (fo.facing ?? (Math.abs(sx) < 0.15 ? ((p[0] - cam.pos.x) * cam.right.x + (p[2] - cam.pos.z) * cam.right.z > 0 ? -1 : 1) : sx > 0 ? 1 : -1)) as -1 | 1;
  stand(out, cam, w.i, w.o, w.okey, p, { mode: "stroll", lift: 36, lean: 3, phase, ...fo, facing }, t, scale);
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
  out.places.push(person(cam, W_(i, o, okey), p[0], p[1] + 0.23 * scale, p[2], { side: false, mirror: false }, { mode: "sit", blink: lidAt(t, i), ...fo }, {}, scale));
  if (shadow) blob(out, p[0], p[1] - 0.05 * scale, p[2], scale * 1.1);
};
/** where the hand of a standing card lands, by arm pose (metres right of the card centre, metres above the soles) */
const HAND: Record<string, [number, number]> = { lift: [0.43, 1.2], raise: [0.43, 1.4], out: [0.5, 1.29], up: [0.39, 1.5], offer: [0.59, 1.12], hold: [0.06, 0.95], show: [0.7, 1.3], point: [0.5, 1.2] };
const handAt = (cam: CamInfo, p: V3, pose: string, side: 1 | -1, scale = 1, tilt = 0): V3 => {
  const [dx, dy] = HAND[pose] ?? [0.4, 1.2], k = scale;
  const ax = side * (dx + 0.0), ay = dy + Math.abs(tilt) * 0.004;
  return [p[0] + cam.right.x * ax * k, p[1] + ay * k, p[2] + cam.right.z * ax * k];
};
/** a candle flame (a glowing card) whose base is at c, plus its point light and halo */
const flame = (out: Stage, c: V3, f: number, k: number, size = 0.36, I = 6, halo = 1.0) => {
  const ph = q(((f / 9 + k * 0.37) % 1 + 1) % 1, 8);
  fxc(out, "flm" + ph + "_" + (k % 3), 300, 400, (p) => fxFlame(p, ph, k % 3), [c[0], c[1] + size * 0.46, c[2]], size * 0.75, size, { glow: 2.6 });
  out.lights.push({ p: [c[0], c[1] + size * 0.3, c[2]], I, col: "#ffb458", d: 0, halo });
};
const sweatAt = (f: number, f0: number) => { const u = (f - f0) / 14; return u > 0 && u < 1 ? q(u, 14) : undefined; };
const horse = (out: Stage, cam: CamInfo, k: number, g: V3, dir: V3, f: number, size = 3.2, still = false) => {
  const mirror = dir[0] * cam.right.x + dir[2] * cam.right.z < 0, ph = still ? 0.2 + 0.05 * Math.sin(f * 0.3) : q((f / 28 + k * 0.3) % 1, 10);
  const cw = cam.pos.distanceTo(new THREE.Vector3(g[0], g[1] + 1, g[2])) < 14 ? 1024 : 512, col = ["#8a5a34", "#4a3a30", "#b8884e", "#6a4a34"][k % 4], mane = ["#2a2020", "#1a1618", "#e8d8b0", "#2a2020"][k % 4];
  out.places.push({ key: `H|${cw}|${k % 4}|${ph}`, draw: (pn) => { const g2 = pn.g; g2.save(); g2.translate(150 * cw / 1024, 387 * cw / 1024); g2.scale(0.8 * cw / 1024, 0.8 * cw / 1024); horseDraw(pn, { phase: ph, col, mane }); g2.restore(); },
    x: g[0], y: g[1] + 0.25 * size, z: g[2], scale: size, sq: true, billboard: true, mirror, size: [cw, cw, cw / 600] });
  blob(out, g[0], g[1], g[2], 1.9);
};

// ---------------- the stage ----------------
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], lights: [] };
  const f = t * FPS, F = Math.round(f);
  setLight(lightAt(id, F)); findSun(cam, SUNV);
  const set = setOf(id, F);
  const R0 = (v: number) => W_(2 + v, memo("rob" + v, () => robber(v)), "rob" + v);
  const BN = W_(1, BANKER_NIGHT, "bkN"), BD = W_(1, BANKER_DAY, "bkD"), SG = W_(5, SARGENT, "sarg");
  const VD = SPOT.VD;
  switch (id) {
    // ------------------------------------------------------------------------------------------------------------
    case 1: {
      if (set === "street") {
        // the three robbers tiptoe up the boardwalk to the bank window; the tall one stares at the vault door, sighs, tosses the crowbar
        const zA = -4.5, BWX = 5.4;
        const pathZ = (k: number) => (F < EV.TIPTOE1 ? lerp(-11.5, zA, smooth(F / 100)) : zA - (F - EV.TIPTOE1) * 0.075) - k * 1.55;
        const moving = (F < 98) || F >= EV.TIPTOE1;
        const toss = F >= EV.TOSS1 - 1;
        for (let k = 0; k < 3; k++) {
          const z = pathZ(k), p: V3 = [BWX + 0.35 * k * (k % 2 ? -1 : 1), 0.2, z], w = R0(k), dir: V3 = [0, 0, F < EV.TIPTOE1 ? 1 : -1];
          const dist = k * 3 + (F < EV.TIPTOE1 ? F * 0.075 : 100 * 0.075 + (F - EV.TIPTOE1) * 0.075);
          const fo: FrontOpts = k === 0
            ? { expr: F < EV.STARE1 - 2 ? "nervous" : F < EV.TOSS1 - 2 ? "awe" : "annoyed", gaze: F >= EV.STARE1 - 2 && F < EV.TOSS1 ? -1 : 0, armR: F < EV.TOSS1 - 2 ? "raise" : undefined, prop: F < EV.TOSS1 - 2 ? "crowbar" : null,
              shrug: F >= EV.TOSS1 - 12 && F < EV.TOSS1 + 10 ? q(Math.sin(Math.PI * clamp01((F - EV.TOSS1 + 12) / 22)), 10) : undefined }
            : { expr: F < EV.STARE1 - 2 ? "nervous" : F < EV.TOSS1 ? "stern" : "sheepish", gaze: 0, look: 0.5 };
          if (moving) walkerDraw(out, cam, w, p, dir, dist, t, { ...fo, lift: 26, lean: 5 }, "walk", RS[k]);
          else A(out, cam, w.i, w.o, w.okey, p, t, k === 0 ? 1 : 1, { ...fo, facing: 1 }, RS[k]);
        }
        // the crowbar flies over his shoulder (screen left) and clatters down
        if (toss) {
          const u = clamp01((F - EV.TOSS1) / 20), h0 = handAt(cam, [BWX, 0.2, pathZ(0)], "raise", 1, RS[0]);
          const px = h0[0] - cam.right.x * 1.9 * u, pz = h0[2] - cam.right.z * 1.9 * u, py = h0[1] + 0.5 * Math.sin(Math.PI * Math.min(1, u * 1.1)) * 1.3 - (h0[1] - 0.25) * u * u;
          item(out, "crowbar", fxCrowbar, [px, Math.max(0.3, py), pz], 1.0, -u * 8, 512);
          if (F >= EV.TOSS1 + 17 && F < EV.TOSS1 + 26) puff(out, [px, 0.3, pz], (F - EV.TOSS1 - 17) / FPS, 0.9, 0.4, 3, "#9aa6c8");
        }
        // sleeping town: a thin trail of breath? no: a lone shadow-lamp glow is the set's
      } else {
        // the bedroom: the banker snores, the three robbers lean over the bed with a candle, grin; his eyes pop open
        const BED = SPOT.BED;
        const awake = F >= EV.EYES1 - 2;
        lying(out, cam, BN, [BED[0] + 0.15, 0.78, BED[2]], { expr: awake ? "shock" : "sleep", look: 0 }, t, -1, 1.0);
        if (!awake) zzz(out, [BED[0] - 1.15, 1.2, BED[2]], F, EV.CUT1, 0.5);
        const grin = F >= EV.GRIN1 - 2;
        for (let k = 0; k < 3; k++) {
          const x = -1.55 + 0.95 * k, p: V3 = [x, 0, -2.85], w = R0(k);
          const fo: FrontOpts = { expr: grin ? "grin" : "stern", facing: -1, lean: 5 + 3 * k, gaze: 0.3 };
          if (k === 1) { fo.armL = "lift"; fo.prop = "candle"; }
          A(out, cam, w.i, w.o, w.okey, p, t, -1, fo, RS[k]);
        }
        const hp = handAt(cam, [-0.6, 0, -2.85], "lift", -1, RS[1], 8);
        flame(out, [hp[0], hp[1] + 0.2 * RS[1], hp[2]], F, 1, 0.4, 9, 1.4);
      }
      break;
    }
    // ------------------------------------------------------------------------------------------------------------
    case 2: {
      if (set === "bedroom") {
        const BED = SPOT.BED;
        const scoop = F >= EV.GRAB2, k8 = clamp01((F - EV.GRAB2 + 6) / 8), carry = clamp01((F - EV.GRAB2) / 36);
        // the plan: unrolled on the bedpost by the robber on the right
        const planK = clamp01((F - EV.PLAN2) / 26);
        const bx = scoop ? lerp(-0.5, -1.6, carry) : -0.5;
        if (!scoop) sit(out, cam, 1, BANKER_NIGHT, "bkN", [bx, 0.82, -0.78], { expr: F < EV.PLAN2 ? "shock" : "nervous", facing: 1, look: 0.4, sweat: sweatAt(F, 215) ?? sweatAt(F, 232) }, t);
        else { const y = 0.34 * k8 + 0.04 * Math.sin(F * 0.6) * k8; A(out, cam, 1, BANKER_NIGHT, "bkN", [bx, y, -0.55], t, 1, { expr: "pained", armR: "flail", armL: "flail", wave: q((F / 7) % 1, 8), facing: 1 }); }
        // R1 (tall) shows the plan
        const r1x = scoop ? lerp(1.35, 0.3, carry) : 1.35;
        A(out, cam, R0(0).i, R0(0).o, R0(0).okey, [r1x, 0, -0.3 - (scoop ? 0 : 0)], t, -1, { expr: scoop ? "grin" : "stern", armL: scoop ? "point" : "out", gaze: 0, look: -0.3 }, RS[0]);
        if (F < EV.GRAB2 + 6) { const sh = q(planK, 10); item(out, "plan" + sh, (p) => fxPlan(p, sh), [0.74, 1.46, -0.12], 1.5, 0.03, 600); }
        // R2 and R3 close in from behind the bed to the banker's two sides and lift
        const s2 = glide((F - 224) / 14);
        for (const [k, x0, x1, fc] of [[1, 0.0, 0.25 + lerp(0, -1.1, carry), -1], [2, -1.1, -1.05 + lerp(0, -1.1, carry), 1]] as [number, number, number, 1 | -1][]) {
          const w = R0(k), p: V3 = [lerp(x0, x1, s2), 0, lerp(-2.75, -0.45, s2)];
          const fo: FrontOpts = { expr: scoop ? "grin" : "stern", facing: fc, lean: 4, armR: k === 2 && scoop ? "lift" : undefined, armL: k === 1 && scoop ? "lift" : undefined };
          if (scoop) walkerDraw(out, cam, w, p, [-1, 0, 0], F * 0.04 + k, t, fo, "walk", RS[k]);
          else A(out, cam, w.i, w.o, w.okey, p, t, fc, fo, RS[k]);
        }
      } else {
        // the moonlit march: R1 leads with the candle, the banker (nightshirt, slippers) between R2 and R3; the camera backs away down the street
        const z0 = marchZ2(F), dist = (F - EV.CUT2) * 0.085 + 40;
        const moving = F < EV.ARRIVE2;
        const rz = z0 - 1.5, g = (x: number, zz: number) => [x, 0, zz] as V3;
        const lead = g(0.55, rz), mid = g(0.2, z0), l = g(-0.6, z0 + 0.1), r = g(1.0, z0 + 0.1);
        const wf = (w: Who, p: V3, fo: FrontOpts, sc: number) => (moving ? walkerDraw(out, cam, w, p, [0, 0, -1], dist + w.i, t, { ...fo, lift: 30, lean: 3, facing: fo.facing }, "walk", sc) : A(out, cam, w.i, w.o, w.okey, p, t, (fo.facing ?? 1) as 1 | -1, fo, sc));
        wf(R0(1), l, { expr: "grin", facing: 1, armR: "out" }, RS[1]);
        wf(R0(2), r, { expr: "grin", facing: -1, armL: "out" }, RS[2]);
        wf(BN, mid, { expr: "pained", facing: 1, armR: "hang", look: 0.5 }, 1.0);
        wf(R0(0), lead, { expr: "stern", facing: -1, armR: "lift", prop: "candle" }, RS[0]);
        const hp = handAt(cam, lead, "lift", 1, RS[0], 0);
        flame(out, [hp[0], hp[1] + 0.2 * RS[0], hp[2]], F, 2, 0.42, 8, 1.6);
      }
      break;
    }
    // ------------------------------------------------------------------------------------------------------------
    case 3: {
      // the great door looms; pull back to the tiny banker with his key on a string; his tiny shadow on the door
      const trem = Math.sin(F * 1.9) * 0.8, bz = VD[2] + 3.4;
      const hold = F >= EV.PULL3 - 6;
      const rpos: V3[] = [[-1.75, 0, bz + 1.0], [-0.55, 0, bz + 1.9], [1.35, 0, bz + 1.3]];
      for (let k = 0; k < 3; k++) {
        const fo: FrontOpts = { expr: k === 0 ? "grin" : "stern", facing: k === 2 ? -1 : 1, gaze: 0.2 };
        if (k === 0) { fo.armR = "lift"; fo.prop = "candle"; }
        if (hold || F > 330) A(out, cam, R0(k).i, R0(k).o, R0(k).okey, rpos[k], t, k === 2 ? -1 : 1, fo, RS[k]);
      }
      const hp = handAt(cam, rpos[0], "lift", 1, RS[0], 0);
      flame(out, [hp[0], hp[1] + 0.2 * RS[0], hp[2]], F, 3, 0.42, 9, 1.6);
      A(out, cam, 1, BANKER_NIGHT, "bkN", [0.1, 0, bz], t, 1, { expr: F < EV.KEY3 - 2 ? "nervous" : "shock", armR: "offer", prop: "keystring", phase: q((F / 5) % 1, 8), sweat: sweatAt(F, 380) ?? sweatAt(F, 424), headTilt: 2 + 2 * Math.sin(F * 1.7), lean: trem * 0.7 }, 1.0);
      if (F >= EV.SHADOW3 - 2) { const u = clamp01((F - EV.SHADOW3 + 2) / 12); fxc(out, "silh", 200, 400, fxSilhouette, [0.55, 1.0, VD[2] + 0.55], 0.9 * (0.8 + 0.2 * u), 1.8 * (0.8 + 0.2 * u), { soft: true }); }
      break;
    }
    case 4: {
      const bz = VD[2] + 5.5;
      if (F < EV.WHEEL4) {
        // CU: the sweating face, knees knocking, the key jangling; the robbers' candle glows behind him
        const bk: FrontOpts = { expr: F < EV.SCARED4 - 2 ? "nervous" : F < 474 ? "gulp" : "shock", facing: 1, look: 0.3, armR: "offer", prop: "keystring", phase: q((F / 3) % 1, 10), sweat: sweatAt(F, 460) ?? sweatAt(F, 472), headTilt: 3 * Math.sin(F * 2.3), lean: Math.sin(F * 2.1) * 1.4 };
        stand(out, cam, 1, BANKER_NIGHT, "bkN", [0.0, 0, bz], { mode: "stand", ...bk }, t, 1.0);
        const last = out.places[out.places.length - 1]; last.roll = 0.018 * Math.sin(F * 2.4); last.y += 0.012 * Math.abs(Math.sin(F * 2.4));
        const rp: V3[] = [[-0.95, 0, bz + 1.3], [0.9, 0, bz + 1.6], [0.1, 0, bz + 2.4]];
        for (let k = 0; k < 3; k++) A(out, cam, R0(k).i, R0(k).o, R0(k).okey, rp[k], t, k === 1 ? -1 : 1, { expr: "grin", gaze: 0.2, armR: k === 1 ? "lift" : undefined, prop: k === 1 ? "candle" : null }, RS[k]);
        const hp = handAt(cam, rp[1], "lift", 1, RS[1], 0);
        flame(out, [hp[0], hp[1] + 0.2 * RS[1], hp[2]], F, 4, 0.4, 7, 1.3);
      } else {
        // the key in the lock, the wheel spins, the door swings open and gold pours over the rubbing robbers
        const bx = -1.28, bzz = VD[2] + 1.55;
        A(out, cam, 1, BANKER_NIGHT, "bkN", [bx, 0, bzz], t, 1, { expr: F < EV.OPEN4 - 2 ? "pained" : "shock", armR: "raise", lean: 3, sweat: sweatAt(F, 490), headTilt: 3 * Math.sin(F * 1.2) }, 1.0);
        const rub = (k: number, p: V3, fc: 1 | -1) => A(out, cam, R0(k).i, R0(k).o, R0(k).okey, p, t, fc, { expr: "grin", armR: "rub", armL: "rub", wave: q((F / 10) % 1, 10), lean: 2, gaze: -0.1 }, RS[k]);
        rub(0, [1.55, 0, VD[2] + 3.0], -1); rub(1, [0.5, 0, VD[2] + 3.9], -1); rub(2, [-1.2, 0, VD[2] + 3.4], 1);
        // golden light: the chamber glows; a warm light moves out with the door and a long spill on the floor
        const o = clamp01((F - EV.OPEN4) / 26);
        if (F >= EV.OPEN4 - 2) {
          out.lights.push({ p: [0.2, 2.0, VD[2] - 2.0 + 3.2 * o], I: 26 * o, col: "#ffb830", d: 17, halo: 2.2 * o });
          fxc(out, "spill", 400, 700, (p) => fxLightSpill(p, 400, 700), [0.0, 0.05, VD[2] + 4.2], 3.4 * (0.4 + 0.6 * o), 7.4, { flat: true, soft: true, glow: 1.5 + o });
        }
        if (F >= EV.WHEEL4 && F < EV.WHEEL4 + 16) puff(out, [0, 0.2, VD[2] + 0.3], (F - EV.WHEEL4) / FPS, 1.2, 0.5, 2, "#ffe0a0");
      }
      break;
    }
    // ------------------------------------------------------------------------------------------------------------
    case 5: {
      // Sargent's cluttered workshop: he works at the bench, looks up @563, the idea spark @594, he scribbles the blueprint @625-690
      const looked = F >= EV.SARG5 - 2, ideas = F >= EV.IDEA5 - 2, draw = F >= EV.SCRIBBLE5 - 2;
      const sx = lerp(-0.7, 0.35, glide((F - 598) / 24));
      const fo: FrontOpts = { expr: !looked ? "stern" : !ideas ? "smile" : !draw ? "grin" : F < EV.KEYHOLE5 ? "smile_closed" : F < EV.CROSS5 ? "nervous" : "proud",
        gaze: !looked ? 1 : -0.3, armR: draw ? "hold" : "hold", prop: draw ? "pen" : "screwdriver", facing: 1, look: 0.3, headTilt: !looked ? -4 : 2 };
      if (draw) { fo.armR = "pinch"; }
      A(out, cam, 5, SARGENT, "sarg", [sx, 0, -0.2 - 0.0 * sx], t, 1, fo, 1.0);
      if (F >= EV.IDEA5 - 3 && F < EV.IDEA5 + 22) { const u = q(clamp01((F - EV.IDEA5 + 3) / 25), 12); item(out, "idea" + u, (p) => fxIdea(p, u), [sx + 0.1, 2.38, -0.15], 1.1, 0.08, 512); if (F < EV.IDEA5 + 14) sparkle(out, [sx + 0.1, 2.38, -0.1], F, EV.IDEA5 - 3, 1.2, 1.4); }
      if (F >= EV.SCRIBBLE5 - 14) {
        const a = q(clamp01((F - EV.SCRIBBLE5) / 30), 14), b = q(clamp01((F - EV.KEYHOLE5) / 32), 14), sc = glide((F - EV.SCRIBBLE5 + 14) / 12);
        item(out, `bp${a}_${b}`, (p) => fxBlueprint(p, a, b), [1.05, 1.45, 0.45], 1.5 * (0.5 + 0.5 * sc), -0.02, 768);
      }
      // the kitchen clock on the bench is in the set; a few sparks over the cogs
      break;
    }
    case 6: {
      // the bench: the screwdriver pops the left clock open; gears and a spring spill; Sargent fits them together
      const sx = -1.2 + 0.12 * Math.sin(F * 0.07), ac = F >= EV.SCREW6 - 3 && F < EV.FIT6, hold = F >= EV.FIT6 - 2;
      A(out, cam, 5, SARGENT, "sarg", [sx, 0, -1.55], t, 1, { expr: F < EV.SCREW6 - 3 ? "smile_closed" : F < EV.FIT6 - 2 ? "grin" : "proud", armR: ac ? "raise" : hold ? "up" : "hold", prop: ac ? "screwdriver" : null, facing: 1, look: 0.3, headTilt: 2, lean: ac ? 5 : 0 }, 1.0);
      if (F >= EV.SCREW6 && F < EV.SCREW6 + 14) sparkle(out, [-0.62, 1.95, -1.9], F, EV.SCREW6, 1.0, 1.3);
      if (F >= EV.MECH6 && F < EV.MECH6 + 22) sparkle(out, [0.0, 2.1, -1.9], F, EV.MECH6, 1.5, 1.5);
      break;
    }
    case 7: {
      // the banker stands by the mechanism's little wheel and tries it: it will not turn; his face pleads, then he shrugs
      const MC = SPOT.MECH, push = pushAt(F);
      const bx = MC[0] + 1.52, bz = MC[2] + 0.45;
      const pleads = F >= EV.FACE7 - 2;
      const fo: FrontOpts = { expr: pleads ? (F < EV.FACE7 + 26 ? "sheepish" : "sheepish") : push > 0.1 ? "pained" : "nervous", facing: -1, look: -0.4,
        armL: pleads && F >= EV.FACE7 + 20 ? "shrug" : "out", armR: pleads && F >= EV.FACE7 + 20 ? "shrug" : undefined, lean: -2 - 8 * push, shrug: pleads && F >= EV.FACE7 + 20 ? q(glide((F - EV.FACE7 - 20) / 8), 10) : undefined,
        sweat: sweatAt(F, 850) ?? sweatAt(F, 895), headTilt: pleads ? -6 : 0 };
      A(out, cam, 1, BANKER_DAY, "bkD", [bx, 0.0, bz], t, -1, fo, 1.0);
      break;
    }
    // ------------------------------------------------------------------------------------------------------------
    case 8: {
      const BX = SPOT.PR_BANK_X;
      const crowd = (n: number, x0: number, x1: number, z0: number, z1: number, cheer: boolean, seedK = 0) => {
        for (let k = 0; k < n; k++) {
          const x = lerp(x0, x1, hh(k + seedK, 1)), z = lerp(z0, z1, hh(k + seedK, 2)), o = k % 2 ? bonnetLady(k + seedK) : manTown(k + seedK);
          A(out, cam, 100 + k + seedK, o, (k % 2 ? "bl" : "mt") + ((k + seedK) % 4), [x, 0.0, z], t, (hh(k, 3) > 0.5 ? 1 : -1), cheer ? { expr: (["laugh", "grin", "smile"] as Expr[])[k % 3], armR: "wave", wave: pulse(F, k, 12), facing: x < -4.5 ? 1 : -1 } : { expr: (["smile", "grin", "smile_closed"] as Expr[])[k % 3], look: 0.3 * Math.sin(k) }, 1.0);
        }
      };
      if (F < EV.CART8) {
        // the prairie town: townsfolk on the boardwalks, carts and horses along the street, dust
        for (const [k, x, z, dz] of [[0, 2.0, 14, -1], [1, -2.6, 9, 1], [2, 3.6, 4, -1]] as [number, number, number, number][]) {
          horse(out, cam, k, [x, 0, z + (F - 935) * 0.02 * dz], [0, 0, dz], F, 3.0);
        }
        for (let k = 0; k < 9; k++) {
          const side = k % 2 ? 1 : -1, z0 = 22 - 4.3 * k, o = k % 3 ? manTown(k) : bonnetLady(k);
          walkerDraw(out, cam, W_(120 + k, o, "tw" + k), [side * 7.4, 0.25, z0 + (F - 935) * 0.03 * side], [0, 0, side], F * 0.03 + k, t, { expr: "smile", facing: side as 1 | -1 }, "walk", 1.0);
        }
        // the cart with the door starts toward the bank: workers push, Sargent walks beside it
        crowd(5, 4.6, 6.0, 6, 16, false, 20);
        const cz = cartZ(F);
        horse(out, cam, 3, [-5.0, 0, cz - 4.3], [0, 0, -1], F, 3.2);
        for (const [k, x] of [[0, -5.8], [1, -4.5]] as [number, number][]) walkerDraw(out, cam, W_(300 + k, memo("wk" + k, () => worker(k)), "wk" + k), [x, 0, cz + 2.2], [0, 0, -1], (16 - cz) * 1.0 + k, t, { expr: "grin", armR: "pull", armL: "pull", lean: 8 }, "walk", 1.0);
        walkerDraw(out, cam, SG, [-3.6, 0, cz - 0.6], [0, 0, -1], (16 - cz), t, { expr: "grin" }, "walk", 1.0);
        for (let k = 0; k < 4; k++) puff(out, [-5.2 + 0.5 * (k % 2), 0.3, cz + 3.2 + 1.2 * k], ((F * 0.7 + k * 9) % 22) / FPS, 1.3, 0.8, k, "#e6c898");
      } else if (F < EV.CUT8) {
        // 8b: the cart arrives; Sargent bolts the door on @1034 and pats it
        const cz = cartZ(F), stopped = F >= 1030;
        const arr = F < EV.BOLT8;
        horse(out, cam, 3, [-5.0, 0, cz - 4.3], [0, 0, -1], F, 3.2, stopped);
        for (const [k, x] of [[0, -5.9], [1, -4.5]] as [number, number][]) {
          const p: V3 = [x, 0, cz + 2.3];
          if (!stopped) walkerDraw(out, cam, W_(300 + k, memo("wk" + k, () => worker(k)), "wk" + k), p, [0, 0, -1], (16 - cz) + k, t, { expr: "grin", armR: "pull", armL: "pull", lean: 9 }, "walk", 1.0);
          else A(out, cam, 300 + k, memo("wk" + k, () => worker(k)), "wk" + k, p, t, 1, { expr: "laugh", armR: "wave", wave: pulse(F, k, 11) }, 1.0);
        }
        const sp: V3 = [-3.9, 0, stopped ? 0.9 : cz - 0.7];
        if (!stopped) walkerDraw(out, cam, SG, sp, [0, 0, -1], (16 - cz), t, { expr: "grin" }, "walk", 1.0);
        else {
          const bolt = F >= EV.BOLT8 - 2;
          A(out, cam, 5, SARGENT, "sarg", sp, t, 1, { expr: F < EV.BOLT8 + 14 ? "grin" : "proud", armR: bolt && F < EV.BOLT8 + 14 ? "raise" : "hip", prop: bolt && F < EV.BOLT8 + 14 ? "wrench" : null, lean: bolt ? 4 : 0, headTilt: bolt ? 4 : 0 }, 1.0);
        }
        if (F >= EV.BOLT8 - 1 && F < EV.BOLT8 + 22) { puff(out, [-4.9, 1.8, 0.2], (F - EV.BOLT8) / FPS, 2.6, 0.7, 1, "#e6d8b8"); sparkle(out, [-4.8, 2.2, 0.8], F, EV.BOLT8, 1.4, 1.5); }
        // a few townsfolk gather on the boardwalk
        crowd(8, -7.6, -6.4, -4, 9, false, 40);
        void arr;
      } else {
        // 8c: the bank front: the door is installed; townsfolk gather; Sargent snips the ribbon @1087
        const snip = F >= EV.RIBBON8 - 1;
        crowd(12, -5.4, -1.8, -3.6, 6.2, snip, 60);
        A(out, cam, 5, SARGENT, "sarg", [BX + 2.7, 0, 0.0], t, -1, { expr: snip ? "laugh" : "grin", armR: "raise", armL: "hold", prop: "scissors", phase: snip && F < EV.RIBBON8 + 14 ? q((F / 3) % 1, 6) : 0.5, facing: -1, lean: 3 }, 1.0);
        if (snip && F < EV.RIBBON8 + 40) { const u = (F - EV.RIBBON8) / 40; for (let k = 0; k < 3; k++) fxc(out, "conf" + k, 400, 400, (p) => fxConfetti(p, k), [BX + 3.0 + 0.5 * k, 3.2 - 1.2 * u + 0.3 * k, -1.0 + 1.0 * k], 2.4, 2.4, { soft: false, glow: 1.0 }); }
      }
      break;
    }
    // ------------------------------------------------------------------------------------------------------------
    case 9: {
      // night: the robbers march the nightshirted banker in; he turns the wheel: nothing; shrug; face-palms; thumbs-up
      const arriveK = glide((F - 1114) / 38), moving = F < 1152;
      const bx = lerp(-6.0, -0.55, arriveK), rz = VD[2] + 3.6;
      const rp = (k: number): V3 => [lerp(-8.0 - 1.2 * k, [1.6, 2.6, -2.0][k], arriveK), 0, rz + [0.2, 0.5, 0.9][k]];
      const turn = F >= EV.TURN9 - 2, shrug = F >= EV.SHRUG9 - 2, palm = F >= EV.PALM9 - 2, thumb = F >= EV.THUMB9 - 2;
      const bf: FrontOpts = moving ? { expr: "nervous", facing: 1, armR: "hang" }
        : { expr: thumb ? "grin" : shrug ? "sheepish" : turn ? "pained" : "nervous", facing: 1, armR: thumb ? "thumb" : shrug ? "point" : turn ? "raise" : "hang", armL: shrug && !thumb ? "shrug" : undefined, shrug: shrug && !thumb ? 0.8 : undefined,
          lean: turn && !shrug ? 4 : 0, sweat: sweatAt(F, 1180) ?? sweatAt(F, 1228), headTilt: shrug ? -5 : 0 };
      const bp: V3 = [moving ? bx : -1.2 + (shrug ? 0.6 : 0), 0, moving ? rz + 0.4 : VD[2] + 1.55 + (shrug ? 1.4 : 0)];
      if (moving) walkerDraw(out, cam, BN, bp, [1, 0, 0], bx * 1.0 + 20, t, bf, "walk", 1.0); else A(out, cam, 1, BANKER_NIGHT, "bkN", bp, t, 1, bf, 1.0);
      for (let k = 0; k < 3; k++) {
        const p = moving ? rp(k) : ([1.5 + 0.95 * k - (k === 2 ? 3.9 : 0), 0, rz + [0.2, -0.3, 0.6][k]] as V3), w = R0(k);
        const fo: FrontOpts = { expr: palm ? "annoyed" : "grin", facing: moving ? 1 : (k === 2 ? 1 : -1), armR: palm ? "palm" : undefined, armL: undefined, gaze: 0.2, lean: palm ? 4 : 0 };
        if (moving) walkerDraw(out, cam, w, p, [1, 0, 0], p[0] * 1.0 + k * 4, t, { ...fo, facing: 1 }, "walk", RS[k]);
        else A(out, cam, w.i, w.o, w.okey, p, t, fo.facing as 1 | -1, fo, RS[k]);
      }
      // the lead robber's candle
      const lp = moving ? rp(0) : ([1.5, 0, rz + 0.2] as V3);
      if (!moving || true) { const h = handAt(cam, lp, "lift", 1, RS[0], 0); flame(out, [h[0] - 0.35, h[1] + 0.0, h[2]], F, 5, 0.38, 6, 1.1); }
      break;
    }
    case 10: {
      // tied to a chair; time passes: cards, knitting, a cobweb, a nest, stubble; then a tiny smug face on the clock-lock
      const L = lapse(F), L2 = clamp01((F - 1303) / 22);
      const cz = VD[2] + 3.6;
      const tie = clamp01((F - EV.TIE10) / 16), fist = F >= EV.FIST10 - 2 && F < EV.TIE10 - 4;
      const stub = (k: number) => q(L2 * 0.9, 6) * (k === 2 || k === 0 ? 1 : 0.6), web = q(L2, 6), nest = q(clamp01((L2 - 0.35) / 0.65), 6);
      // banker on the chair
      sit(out, cam, 1, BANKER_NIGHT, "bkN", [0.1, 0.5, cz - 0.0], { expr: F >= EV.TIE10 ? (L2 > 0.3 ? "sheepish" : "pained") : "nervous", facing: 1, look: 0.2, sweat: sweatAt(F, 1262) ?? sweatAt(F, 1290), armR: F < EV.TIE10 ? "hold" : undefined, headTilt: L2 > 0.5 ? 6 : 0 }, t);
      if (F >= EV.TIE10 - 4) { const s = glide(tie); fxc(out, "ropew", 480, 220, fxRopeWrap, [0.1, 0.98, cz + 0.05], 0.78 * s + 0.02, 0.36 * s + 0.01); }
      // the robbers: R1 knits (left crate), R2 and R3 play cards (right crates)
      const r1 = memo(`rob0_s${stub(0)}_w${web}`, () => ({ ...robber(0), stubble: stub(0), cobweb: web }));
      const r2 = memo(`rob1_n${nest}_s${stub(1)}`, () => ({ ...robber(1), nest, stubble: stub(1) }));
      const r3 = memo(`rob2_s${stub(2)}`, () => ({ ...robber(2), stubble: stub(2) }));
      const sitting = F >= EV.TIE10 + 10;
      const p1: V3 = [-1.45, 0.45, cz + 0.2], p2: V3 = [0.95, 0.45, cz - 0.1], p3: V3 = [2.05, 0.45, cz + 0.15];
      if (sitting) {
        sit(out, cam, 2, r1, `r0s${stub(0)}w${web}`, p1, { expr: "stern", armR: "hold", prop: "knitting", phase: q((F / 20) % 1, 10), facing: 1, look: 0.2 }, t, RS[0]);
        sit(out, cam, 3, r2, `r1n${nest}s${stub(1)}`, p2, { expr: L2 > 0.5 ? "annoyed" : "grin", armR: "hold", prop: "cards", facing: 1, look: 0.3 }, t, RS[1]);
        sit(out, cam, 4, r3, `r2s${stub(2)}`, p3, { expr: L2 > 0.5 ? "annoyed" : "grin", armL: "hold", prop: "cards", facing: -1, look: -0.3 }, t, RS[2]);
        if (L2 > 0.4) zzz(out, [p3[0] - 0.1, 1.55, p3[2]], F, 1312, 0.4);
      } else {
        const sh = F >= EV.FIST10 - 2;
        const s1 = clamp01((F - EV.TIE10 + 10) / 14);
        A(out, cam, 2, r1, "r0", [lerp(-1.1, p1[0], s1), 0.0, cz + 0.3], t, 1, { expr: sh ? "annoyed" : "stern", armR: sh ? "fist" : undefined, wave: q((F / 8) % 1, 8), facing: 1, lean: sh ? 6 : 0 }, RS[0]);
        A(out, cam, 3, r2, "r1", [lerp(0.8, p2[0], s1), 0.0, cz - 0.1], t, -1, { expr: "stern", armL: F >= EV.TIE10 - 6 ? "pull" : undefined, facing: -1 }, RS[1]);
        A(out, cam, 4, r3, "r2", [lerp(1.9, p3[0], s1), 0.0, cz + 0.15], t, -1, { expr: "stern", armL: F >= EV.TIE10 - 6 ? "pull" : undefined, facing: -1 }, RS[2]);
      }
      // the clock-lock: a tiny smug face on its left dial @SMUG10
      if (F >= EV.SMUG10 - 6) { const bl = F % 40 < 3 ? 1 : 0; fxc(out, "smug" + bl, 300, 300, (p) => fxSmug(p, bl), [-0.44, VD[1] + 1.12, VD[2] + 0.66], 0.56, 0.56, { glow: 1.0 }); }
      break;
    }
    // ------------------------------------------------------------------------------------------------------------
    case 11: {
      // a street of banks: a line of bankers with money bags queue outside Sargent's shop; he waves, overwhelmed
      const S = SPOT.SHOP, dz = 3.6;
      for (let k = 0; k < 12; k++) {
        const z = S[2] + 0.2 - 2.0 * k - (k > 0 ? 0.0 : 0), x = 7.7 - 0.2 * (k % 2), ap = clamp01((F - EV.QUEUE11 + 6 + k * 0.3) / 6);
        if (ap <= 0 && k > 3) continue;
        A(out, cam, 200 + k, bankerQ(k), "bq" + (k % 4) + (k % 3), [x, 0.22, z], t, -1, { expr: (["smile", "grin", "nervous", "smile_closed"] as Expr[])[k % 4], armR: k % 3 === 2 ? "raise" : "hold", prop: "moneybag", look: 0.4, sweat: undefined }, 1.0);
      }
      A(out, cam, 5, SARGENT, "sarg", [8.0, 0.22, dz + 0.6], t, -1, { expr: "shock", armR: "wave", wave: pulse(F, 3, 8), armL: "up", sweat: sweatAt(F, 1380) ?? sweatAt(F, 1398), facing: -1, lean: -3 }, 1.0);
      for (let k = 0; k < 4; k++) { const u = ((F * 0.8 + k * 11) % 40) / 40; item(out, "paper" + k, (p) => fxPaper(p, k), [7.0 - 0.7 * k, 2.3 + 1.2 * u + 0.3 * k, dz + 1.4 - 0.5 * k], 0.5, u * 6 + k, 300); }
      break;
    }
    // ------------------------------------------------------------------------------------------------------------
    case 12: {
      if (F >= EV.CUT12) {
        // the guard clock: arms crossed, a serious stare, a wink @1551
        const wink = F >= EV.WINK12 - 1 && F < EV.WINK12 + 26, lid = lidAt(t, 77);
        const key = `gc${wink ? 1 : 0}${lid > 0.5 ? 1 : 0}`;
        out.places.push({ key, draw: (p) => guardClock(p, { wink, lid, stare: 0.6 }), x: 0, y: 0, z: SPOT.MD[2] + 3.3, size: [1080, 1800, 1.8], scale: 1.0 });
        blob(out, 0, 0, SPOT.MD[2] + 3.3, 1.2);
        if (wink && F < EV.WINK12 + 14) sparkle(out, [0.38, 1.35, SPOT.MD[2] + 3.1], F, EV.WINK12 + 2, 0.6, 1.6);
      }
      break;
    }
  }
  void F5; void fxZ; void fxPoof; void bigCloud; void steam; void poof; void fxMoneyBag; void sitter; void SHOTS; void lightAt; void wheelTurn; void hh;
  return out;
};
