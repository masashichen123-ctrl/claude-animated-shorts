// "The Great Emu War" (1932): 59 s vertical short in the flat-characters-in-a-3D-toon-world style, on the missile
// short's look stack (owner: post, with ink.ts / lensblur.ts / grade.ts).
// One three.js world (world.ts) posed per frame from the story timeline (story.ts). Post chain:
//   InkPass (world ink lines, own pass) -> lens blur pre + main (thin-lens DOF per shot from dofAt) ->
//   [bloom (emissive only) + NEUTRAL tone mapping + colour grade] (one merged EffectPass), MSAA 4.
// Ink runs before the DOF so lines blur with what they belong to; bloom after the DOF so glows defocus with their
// source; the grade is display-referred, so it comes after tone mapping. Every pixel-sized parameter is specified at
// 1080x1920 and scaled with the output size, so stills at --scale 0.5 and the 1440x2560 final match.
// Place changes crossfade by stacking a second canvas for the fade frames; the hook ends on a 4-frame white flash that
// hides a straight cut to shot 2 (layersFlash).
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, loadKit } from "./world";
import { InkPass, noInkFallback, InkOptions } from "./ink";
import { LensBlur, GrainEffect, OpaqueEffect } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { TOTAL, FLASH_AT, SHOTS, layersAt, dofAt } from "./story";
import * as LXM from "./lights";
/** lights.ts seen loosely: lightOf / bloomI / bloomR arrive with the light owner's merge */
const LX = LXM as unknown as { LIGHTS: Record<string, unknown>; lightOf?: (id: number) => string };

export const EMU_FRAMES = TOTAL;

/** A/B switches for test stills only (Remotion inputProps `{ post: { ink: false, ... } }`); everything is on by default. */
type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean; inkDebug: number; bloomT?: number; inkOpts?: InkOptions }; // bloomT: test override of the bright-pass threshold
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false, inkDebug: 0, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

/** Bloom for emissive sources only (depth.md 6.4). Its MIP chain always starts at 540x960 (half of 1080x1920),
 *  whatever the output size, so the glow keeps the same size relative to the frame (e-fold ~30 px at 1080p,
 *  ~1.5 % of the frame height) at 540, 1080 and 1440 widths. ADD blend: HDR-safe (SCREEN darkens values > 1). */
// Look pass r1 (lighting.md 3.4, "bloom on emissives only"): the bright pass keys on the MAX channel, not luminance,
// with a threshold above any lit albedo (day lit 1.58 x white .85 = 1.34; golden 1.5 x .95 = 1.43): from 1.45, full
// at 1.8. A/B on r1 stills: at the old luminance threshold 1.0 the sunlit top of the white missile bloomed (311, 816);
// now only emissives do: sun disc (6.0), muzzle flash cards (glow 1.6-2.2), the tent lamp and its glowing door. Max channel
// so saturated sources (an orange lamp: luminance < 1.3) still bloom. Emissives need k >= 1.8 to glow fully.
const BLOOM_T = 1.45, BLOOM_S = 0.35;
/** per light preset bloom strength / radius (lighting.md 3.4; e-fold glow ~30 px at 1080 for radius 0.6) */
const BLOOM_LOOK: Record<string, [number, number]> = { day: [0.6, 0.6], golden: [0.8, 0.7], dusk: [0.8, 0.7], morning: [0.8, 0.7] };
/** per-light bright-pass threshold (max channel, linear); a lights.ts preset may carry its own `bloomT`, which wins */
const BLOOM_TH: Record<string, number> = {};
/** per-shot bloom intensity factor */
const SHOT_BLOOM_K: Record<number, number> = {};
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.6, luminanceThreshold: BLOOM_T, luminanceSmoothing: BLOOM_S, mipmapBlur: true, levels: 6, radius: 0.6 });
  // bright pass = max channel x the bloom mask the InkPass writes into alpha (1 + mask): only glow materials, the sky /
  // sun and NOINK fx cards (flames, booms) can bloom; lit floors and walls never do, however hot (verify_r1 #1)
  b.luminanceMaterial.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("float l=luminance(texel.rgb);", "float l=max(texel.r,max(texel.g,texel.b))*clamp(2.0*(1.0-texel.a),0.0,1.0);"); };
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

/** waits for loadKit() (procedural world: resolves at once; kept so async assets can be added without touching the comp) */
const useKit = () => {
  const [kit, setKit] = useState<boolean | null>(null);
  const [handle] = useState(() => delayRender("emu kit"));
  useEffect(() => { loadKit().then((k) => { setKit(k); continueRender(handle); }); }, [handle]);
  return kit;
};

const Inner: React.FC<{ id: number; kit: boolean }> = ({ id, kit }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), [kit]); // one world per canvas (crossfades stack two)
  const target = useMemo(() => new THREE.Vector3(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxFar: 14, maxNear: 22, nearScale: 1.4 }), // depth.md 3.5: split caps (was one 24 px clamp)
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
    opaque: new OpaqueEffect(),
    grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }), // film grain, OFF by default (inputProps post.grain): the reference measures no grain and it quadruples the file size
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  fx.ink.debug = on.inkDebug;
  if (on.inkOpts) fx.ink.set(on.inkOpts); // test stills only (A/B of ink constants)
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      {on.ink ? <primitive object={fx.ink} dispose={null} /> : null}
      {on.lens && on.pre ? <primitive object={fx.lens.pre} dispose={null} /> : null}
      {on.lens ? <primitive object={fx.lens.main} dispose={null} /> : null}
      {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : null}
      <primitive object={fx.tone} dispose={null} />
      {on.grade ? <primitive object={fx.grade} dispose={null} /> : null}
      {on.grain ? <primitive object={fx.grain} dispose={null} /> : null}
      <primitive object={fx.opaque} dispose={null} />
    </EffectComposer>
  ), [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, f, cam, scene));
  noInkFallback(world.root);
  // thin-lens focus: distance along the view axis to the shot's focus point (default: the camera's look target)
  // DOF of THIS canvas's shot: during a dissolve / the flash cut, a shot drawn outside its own range keeps its first
  // (or last) frame's lens instead of the other shot's 
  const sd = SHOTS[id - 1];
  const d = dofAt(Math.min(Math.max(f, sd.a), sd.b - 1));
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  const light = SHOTS[id - 1].light;
  gradeFor(fx.grade, light);
  // bloom per shot: lights.ts LIGHTS[lightOf(id)].bloomI / bloomR when the light owner's version provides them,
  // else the BLOOM_LOOK table above (optional access: compiles against both lights.ts versions)
  const lname = (typeof LX.lightOf === "function" ? LX.lightOf(id) : light) as string;
  const lp = (LX.LIGHTS as Record<string, { bloomI?: number; bloomR?: number; bloomT?: number } | undefined>)[lname];
  const [bi0, br0] = BLOOM_LOOK[lname] ?? BLOOM_LOOK[light] ?? BLOOM_LOOK.day;
  const bi = typeof lp?.bloomI === "number" ? lp.bloomI : bi0, br = typeof lp?.bloomR === "number" ? lp.bloomR : br0;
  fx.bloom.intensity = bi * (SHOT_BLOOM_K[id] ?? 1); fx.bloom.mipmapBlurPass.radius = br;
  fx.bloom.luminanceMaterial.threshold = on.bloomT ?? (typeof lp?.bloomT === "number" ? lp.bloomT : BLOOM_TH[lname] ?? BLOOM_T);
  fx.grain.seed = f; // deterministic per frame
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

/** test stills only: inputProps `{ post: { dpr: 0.5 } }` forces the WebGL buffer size (R3F clamps dpr to >= 1 by default) */
const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; kit: boolean; alpha: number }> = ({ id, kit, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.15, far: 3000 }}>
      <Inner id={id} kit={kit} />
    </ThreeCanvas>
  </AbsoluteFill>
);

/** The white flash IS the hook's transition: from the frame after the flash peak, show only the next shot (a cut
 *  under the white). Dissolves elsewhere are untouched. */
const layersFlash = (f: number) => {
  const L = layersAt(f);
  const nxt = SHOTS.find((s) => s.a > FLASH_AT);
  if (!nxt || f <= FLASH_AT || f >= nxt.a + 3) return L;
  return [{ id: nxt.id, alpha: 1 }];
};

export const EmuShort: React.FC = () => {
  const f = useCurrentFrame();
  const kit = useKit();
  if (!kit) return null;
  const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [1, 0.75, 0.45, 0.2][f - FLASH_AT] : 0;
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      <Audio src={staticFile("emu/mix.wav")} />
      {layersFlash(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} kit={kit} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
    </AbsoluteFill>
  );
};
