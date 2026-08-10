/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
/**
 * Self-check for the scene-aware auto-enhance preset selection.
 * Pure Node test — no DOM needed.
 */
import { pickEnhancePreset, ENHANCE_PRESETS } from '../src/lib/enhancePresets.mjs';

let pass = 0, fail = 0;
const assert = (name, cond) => {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
};

// Portrait: face detected → portrait preset
assert('face → portrait', pickEnhancePreset({ hasFace: true }).name === 'portrait');
assert('cute vibe → portrait', pickEnhancePreset({ vibe: 'cute' }).name === 'portrait');
assert('hot vibe → portrait', pickEnhancePreset({ vibe: 'hot' }).name === 'portrait');

// Landscape: sky object → landscape
assert('sky object → landscape', pickEnhancePreset({ objects: ['person', 'sky'] }).name === 'landscape');
assert('tree object → landscape', pickEnhancePreset({ objects: ['tree'] }).name === 'landscape');
assert('aesthetic vibe → landscape', pickEnhancePreset({ vibe: 'aesthetic' }).name === 'landscape');

// Low-light: moody vibe or low avg luminance
assert('dark vibes → lowlight', pickEnhancePreset({ vibe: 'dark vibes' }).name === 'lowlight');
assert('chaotic → lowlight', pickEnhancePreset({ vibe: 'chaotic energy' }).name === 'lowlight');
assert('low lum → lowlight', pickEnhancePreset({}, 40).name === 'lowlight');

// Default: nothing → default
assert('no scene → default', pickEnhancePreset({}, 128).name === 'default');
assert('playful vibe → default', pickEnhancePreset({ vibe: 'playful' }).name === 'default');

// Precedence: face beats landscape beat lowlight
assert('face beats landscape', pickEnhancePreset({ hasFace: true, objects: ['sky'] }).name === 'portrait');
assert('landscape beats lowlight', pickEnhancePreset({ objects: ['sky'], vibe: 'dark vibes' }, 40).name === 'landscape');

// Presets exist and are bounded (never over-cook)
assert('4 presets', Object.keys(ENHANCE_PRESETS).length === 4);
const all = Object.values(ENHANCE_PRESETS);
assert('vibrance bounded ≤0.2', all.every((p) => p.vibrance <= 0.2));
assert('contrast bounded ≤0.1', all.every((p) => p.contrast <= 0.1));
assert('clarity bounded ≤0.1', all.every((p) => p.clarity <= 0.1));
assert('warmth bounded |w|≤0.5', all.every((p) => Math.abs(p.warmth) <= 0.5));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
