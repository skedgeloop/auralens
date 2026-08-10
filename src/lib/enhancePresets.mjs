/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
/**
 * Scene → enhance-preset selection for the smart auto-enhance pipeline.
 * Pure module (no DOM) so it can run under plain Node in scripts/ tests.
 *
 * Every multiplier stays modest so the output never looks over-cooked.
 */

const PORTRAIT_VIBES = new Set([
  'handsome', 'gorgeous', 'cute', 'stunning', 'hot', 'dreamy', 'ethereal', 'mysterious',
]);
const LANDSCAPE_VIBES = new Set(['aesthetic', 'iconic', 'legendary', 'ethereal']);
const LANDSCAPE_OBJECTS = new Set([
  'sky', 'cloud', 'tree', 'mountain', 'grass', 'flower', 'water',
]);
const MOODY_VIBES = new Set(['dark vibes', 'chaotic energy']);

/** Preset recipes, keyed by name. */
export const ENHANCE_PRESETS = {
  default: {
    name: 'default', warmth: 0, vibrance: 0.12, clarity: 0.05,
    contrast: 0.06, shadowLift: 0, skinGuardStrength: 0.4,
  },
  portrait: {
    name: 'portrait', warmth: 0.3, vibrance: 0.06, clarity: 0.03,
    contrast: 0.05, shadowLift: 0.02, skinGuardStrength: 0.8,
  },
  landscape: {
    name: 'landscape', warmth: -0.25, vibrance: 0.18, clarity: 0.08,
    contrast: 0.08, shadowLift: 0, skinGuardStrength: 0.2,
  },
  lowlight: {
    name: 'lowlight', warmth: 0, vibrance: 0.1, clarity: 0.04,
    contrast: 0.03, shadowLift: 0.1, skinGuardStrength: 0.4,
  },
};

/**
 * Pick the enhance preset for a scene.
 * Precedence: face/portrait > landscape > low-light > default.
 * @param {{vibe?:string, objects?:string[], hasFace?:boolean}} [scene]
 * @param {number} [avgLum] average luminance (0-255), used for the low-light trigger.
 * @returns {object} one of ENHANCE_PRESETS
 */
export const pickEnhancePreset = (scene = {}, avgLum = 128) => {
  const vibe = (scene.vibe || '').toLowerCase();
  const objects = (scene.objects || []).map((o) => String(o).toLowerCase());

  if (scene.hasFace || PORTRAIT_VIBES.has(vibe)) return ENHANCE_PRESETS.portrait;
  if (objects.some((o) => LANDSCAPE_OBJECTS.has(o)) || LANDSCAPE_VIBES.has(vibe)) return ENHANCE_PRESETS.landscape;
  if (MOODY_VIBES.has(vibe) || avgLum < 60) return ENHANCE_PRESETS.lowlight;
  return ENHANCE_PRESETS.default;
};

export default pickEnhancePreset;
