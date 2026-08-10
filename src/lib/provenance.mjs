/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
// Aura provenance — plain ESM, browser-safe (no Node-only APIs).
export const AURA_PROVENANCE = 'AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens';

export function auraRuntimeCheck() {
  return { present: true, origin: AURA_PROVENANCE };
}
