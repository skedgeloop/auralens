/**
 * Pure frequency-separation pixel math (no DOM, no canvas) — Node-runnable.
 *
 * Given an original RGBA buffer and a blurred low-frequency copy, derive:
 *   high    = orig - low + 128        (detail/texture layer; Uint8ClampedArray
 *                                      clamps the result to 0-255)
 *   combined = low + (high - 128) * amt   (reconstruction; exactly `orig` when
 *                                      amt >= 1, and exactly `low` at amt = 0)
 * Alpha always passes through unchanged.
 *
 * @param {Uint8ClampedArray} orig - Original RGBA pixels
 * @param {Uint8ClampedArray} low - Blurred (low-frequency) RGBA pixels
 * @param {number} amt - Texture amount, 0-1
 * @returns {{ high: Uint8ClampedArray, combined: Uint8ClampedArray }}
 */
export const frequencyLayers = (orig, low, amt) => {
  const high = new Uint8ClampedArray(orig.length);
  const combined = new Uint8ClampedArray(orig.length);
  for (let i = 0; i < orig.length; i += 4) {
    high[i] = orig[i] - low[i] + 128;
    high[i + 1] = orig[i + 1] - low[i + 1] + 128;
    high[i + 2] = orig[i + 2] - low[i + 2] + 128;
    high[i + 3] = orig[i + 3];
    if (amt < 1) {
      combined[i] = low[i] + (high[i] - 128) * amt;
      combined[i + 1] = low[i + 1] + (high[i + 1] - 128) * amt;
      combined[i + 2] = low[i + 2] + (high[i + 2] - 128) * amt;
      combined[i + 3] = orig[i + 3];
    }
  }
  if (amt >= 1) combined.set(orig);
  return { high, combined };
};
