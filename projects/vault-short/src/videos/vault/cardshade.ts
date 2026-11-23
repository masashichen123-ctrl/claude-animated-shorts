// Character card shading (lighting.md 9.2 / 9.5). Replaces the flat emissive "pasted-on" look: the card takes the
// scene light colour as a tint, keeps a bright floor where a cast shadow falls on it (charShade ~.86), and gets a soft
// side gradient toward the real sun (head ~charGrad, torso ~bodyGrad) with a lavender far side.
// Contract with WORLD: LFB (sun shadow visibility inside three's light loop) and CHAR (uniforms world.ts updates from
// LIGHTS every frame) come from shade.ts; the sun direction is three's own directional light 0.
// The drawing already carries a painted crescent (toon.ts shadedFill / gradFill), so the shader adds GRAD_K of the
// preset gradient, and the preset tint (measured on WHITE heads) is applied at TINT_K so peach skin stays clean
// (lighting.md 9.1 note: golden ~[1, .88, .76], day ~[1, .97, .96] for peach skin).
import * as THREE from "three";
import { LFB, CHAR } from "./shade";

// charshade.md 3.3 (look pass r1): toon.ts paints the form (flat head plateau + far crescent, torso rim / plateau /
// falloff), so the shader ramp is OFF (no double gradient). The tint now comes from the scene ENVIRONMENT (fog + sky +
// ground), 30 % of its chroma on a near-white head, plus a little of the preset tint for the light's character.
export const GRAD_K = 0;
export const GRAD_KB = 1.6; // verify_r1 #7: cloth shade band ~.32 on the far side (preset bodyGrad .2 x 1.6); heads stay flat
export const TINT_K = 0.25;
/** share of the environment's chroma the white head picks up (measured k = 0.30) */
export const ENV_K = 0.3;

// Card zones in UV (v = 1 at the top of the 600 x 1000 design card): adult chin at y ~420 -> v .58, head centre
// y ~309 -> v .69, head half height ~111 -> .11. Head half width ~118 units -> .2 of the card, torso ~89 -> .15.
const CARD = /* glsl */ `
vec3 tintK = mix( vec3( 1.0 ), uCharTint, uTintK ) * uEnvTint;
tintK /= pow( max( dot( tintK, vec3( 0.2126, 0.7152, 0.0722 ) ), 0.2 ), uNorm );             // same face value day and golden
vec3 outgoingLight = diffuseColor.rgb * tintK;
for ( int pi = 0; pi < 3; pi ++ ) {                                   // warm practical lights (candles, lamps): a glow on the cards near them
  vec3 plv = ( viewMatrix * vec4( uPLw[ pi ], 1.0 ) ).xyz;
  vec3 dv = plv + vViewPosition;
  float d2 = dot( dv, dv );
  float fr = 0.5 + 0.5 * clamp( dv.z / sqrt( d2 + 1e-4 ), -0.3, 1.0 );
  outgoingLight += diffuseColor.rgb * uPLc[ pi ] * fr / ( 1.0 + 1.3 * d2 );
}
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;                                          // view space, towards the sun
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float side = sign( sunV.x ) * smoothstep( 0.0, 0.35, abs( sunV.x ) );                     // saturates: even a near-frontal sun shades one side                                          // + = sun on screen right
  // head zone vs body: above the adult chin line, or any near-white paint (faces, also kids' low heads) stays unshaded
  float wmin = min( diffuseColor.r, min( diffuseColor.g, diffuseColor.b ) ), wmax = max( diffuseColor.r, max( diffuseColor.g, diffuseColor.b ) );
  float head = max( smoothstep( 0.565, 0.6, vMapUv.y ), step( 0.8, wmin ) * step( wmax - wmin, 0.12 ) );
  float hw = mix( 0.15, 0.2, head );
  float uu = clamp( ( vMapUv.x - 0.5 ) / hw, -1.0, 1.0 ) * sign( dFdx( vMapUv.x ) + 1e-7 ); // -1..1 screen left..right
  float t = uu * side;                                                                     // +1 = edge facing the sun
  float g = mix( uBodyGrad * uGradKB, min( uGrad * uGradK, 0.4 ), head );
  float dark = smoothstep( -0.15, 0.9, -t );                                                 // far side
  vec3 sideK = mix( vec3( 1.0 ), uSideTint, dark * clamp( g / max( min( uGrad * uGradK, 0.4 ), 1e-3 ), 0.0, 1.5 ) * 0.5 );
  float top = 1.0 + 0.05 * clamp( ( vMapUv.y - 0.69 ) / 0.11, -1.0, 1.0 ) * clamp( dot( sunV, upV ) * 2.0, 0.0, 1.0 ) * head;
  outgoingLight *= mix( uCharShade, 1.0, sunVis ) * ( 1.0 - g * dark ) * sideK * top * uGain;
  #ifdef USE_MAP
  {
    // INNER warm rim, golden only: the outermost ~2 px (at 1080 wide) of the HEAD skin / TORSO silhouette on the
    // sun-facing edge. No offset copy: we only test whether the next pixels toward the sun are outside the card.
    // Hats, legs, rifles and other thin parts are skipped (inner sample must be skin, or torso at least ~40 units thick).
    float warm = max( smoothstep( 0.2, 0.4, 1.0 - uCharTint.b ), uRimK );
    float sl = length( sunV.xy );
    vec2 d2 = sunV.xy / max( sl, 1e-4 );
    vec2 duv = 2.0 * uPx * ( d2.x * dFdx( vMapUv ) + d2.y * dFdy( vMapUv ) );
    float edge = step( texture2D( map, vMapUv + duv ).a, 0.5 );
    vec2 dirU = normalize( duv + vec2( 1e-9 ) );
    vec4 c1 = texture2D( map, vMapUv - dirU * vec2( 0.027, 0.016 ) );   // ~16 design units inward (past the ink line)
    vec4 c2 = texture2D( map, vMapUv - dirU * vec2( 0.067, 0.04 ) );    // ~40 units inward: thick parts only
    float skin = step( 0.5, c1.a ) * step( 0.75, min( c1.r, min( c1.g, c1.b ) ) ) * step( max( c1.r, max( c1.g, c1.b ) ) - min( c1.r, min( c1.g, c1.b ) ), 0.12 ); // near-white head
    float torso = step( 0.27, vMapUv.y ) * step( vMapUv.y, 0.57 ) * step( 0.5, c1.a ) * step( 0.5, c2.a ) * step( 0.04, max( c1.r, max( c1.g, c1.b ) ) );
    #ifdef CARD_ALLRIM
    float zone = step( 0.5, c1.a );                                                    // creature cards: the whole silhouette
    #else
    float zone = max( skin * head, torso );
    #endif
    float rim = warm * smoothstep( 0.1, 0.4, sl ) * edge * zone * mix( 0.6, 1.0, sunVis );
    outgoingLight += uRimCol * rim;
  }
  #endif
}
#endif
`;

const DECL = "#include <common>\nuniform vec3 uCharTint; uniform float uCharShade; uniform float uGrad; uniform float uBodyGrad; uniform vec3 uSideTint;"
  + " uniform float uGradK; uniform float uGradKB; uniform float uTintK; uniform float uNorm; uniform float uGain; uniform float uPx; uniform vec3 uEnvTint;"
  + " uniform vec3 uRimCol; uniform float uRimK; uniform vec3 uPLw[ 3 ]; uniform vec3 uPLc[ 3 ];";
/** card-only constants (not per light): gradient share, tint share, overall gain (calibrated: faces ~.93 V) */
export const CARD_K = { uGradK: { value: GRAD_K }, uGradKB: { value: GRAD_KB }, uTintK: { value: TINT_K }, uNorm: { value: 0.7 }, uGain: { value: 1.0 }, uPx: { value: 0.5 },
  uEnvTint: { value: new THREE.Vector3(1, 1, 1) },
  /** card rim colour (warm by default: golden / dusk) and a switch that forces the rim on (night's cool moon rim) */
  uRimCol: { value: new THREE.Vector3(0.95, 0.52, 0.16) }, uRimK: { value: 0 },
  uPLw: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] }, uPLc: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] } };

/** environment tint (charshade.md 3.3): env = mean of the scene's fog (horizon), hemisphere sky and ground colours (linear);
 *  tint = luma-normalised mix(1, env / luma(env), ENV_K). Called by cast.ts once per frame per scene. */
const _c = new THREE.Color();
export function updateEnvTint(scene: THREE.Scene) {
  const env = new THREE.Vector3(), add = (c: THREE.Color) => env.add(new THREE.Vector3(c.r, c.g, c.b));
  let n = 0;
  if (scene.fog) { add((scene.fog as THREE.Fog).color); n++; }
  scene.traverse((o) => { if (o instanceof THREE.HemisphereLight && o.visible) { add(_c.copy(o.color)); add(_c.copy(o.groundColor)); n += 2; } });
  if (!n) return;
  env.multiplyScalar(1 / n);
  const l = Math.max(1e-4, 0.2126 * env.x + 0.7152 * env.y + 0.0722 * env.z);
  const t = new THREE.Vector3(1, 1, 1).lerp(env.multiplyScalar(1 / l), ENV_K);
  const tl = 0.2126 * t.x + 0.7152 * t.y + 0.0722 * t.z;
  CARD_K.uEnvTint.value.copy(t.multiplyScalar(1 / tl));
} // uPx = render height / 1920 (set per draw in cast.ts)

/** MeshLambertMaterial -> lit card: no emissive, scene tint, bright floor, side gradient toward the sun. */
export function cardShade(m: THREE.MeshLambertMaterial, allRim = false) {
  m.emissive.set(0x000000); m.emissiveIntensity = 0; m.emissiveMap = null;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, CHAR, CARD_K);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", (allRim ? "#define CARD_ALLRIM\n" : "") + DECL)
      .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
      .replace("vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;", CARD);
  };
  m.customProgramCacheKey = () => "card13" + (allRim ? "r" : "");
  return m;
}

/** ground contact blob: multiplies what is already drawn (the ground); drawn after the ground and before the cards */
export const blobMaterial = (map: THREE.Texture) => new THREE.MeshBasicMaterial({
  map, transparent: false, depthWrite: false, fog: false, toneMapped: false,
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide,
});
