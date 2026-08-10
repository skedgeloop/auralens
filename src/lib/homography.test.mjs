/**
 * Self-check for the homography math in imageFilters.js.
 * Run: node src/lib/homography.test.mjs
 */
import assert from 'node:assert';
import { solveLinearSystem, computeHomography, invert3x3 } from './imageFilters.js';

// 1. Linear solve: 2x + y = 5, x - y = 1  =>  x = 2, y = 1
assert.deepStrictEqual(
  solveLinearSystem([[2, 1], [1, -1]], [5, 1]).map((v) => Math.round(v)),
  [2, 1]
);

// 2. Singular system => null
assert.strictEqual(solveLinearSystem([[1, 1], [2, 2]], [1, 2]), null);

// 3. Identity homography: mapping corners to themselves is the identity map.
const H = computeHomography(
  [[0, 0], [100, 0], [100, 100], [0, 100]],
  [[0, 0], [100, 0], [100, 100], [0, 100]]
);
assert.ok(H, 'identity homography should solve');
for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    assert.ok(Math.abs(H[i][j] - (i === j ? 1 : 0)) < 1e-9, `identity H[${i}][${j}]`);
  }
}

// 4. Known perspective: the image corner (0,0) maps to dst topLeft, etc.
//    Verify by transforming a corner through H.
const src = [[0, 0], [100, 0], [100, 100], [0, 100]];
const dst = [[10, 20], [90, 15], [95, 85], [5, 90]];
const H2 = computeHomography(src, dst);
assert.ok(H2, 'quad homography should solve');
const mapPoint = (h, [x, y]) => {
  const den = h[2][0] * x + h[2][1] * y + h[2][2];
  return [
    (h[0][0] * x + h[0][1] * y + h[0][2]) / den,
    (h[1][0] * x + h[1][1] * y + h[1][2]) / den,
  ];
};
src.forEach((pt, i) => {
  const got = mapPoint(H2, pt);
  assert.ok(Math.abs(got[0] - dst[i][0]) < 1e-6, `corner ${i} x`);
  assert.ok(Math.abs(got[1] - dst[i][1]) < 1e-6, `corner ${i} y`);
});

// 5. Degenerate source (all points on a line) => null.
assert.strictEqual(
  computeHomography([[0, 0], [1, 1], [2, 2], [3, 3]], [[0, 0], [1, 0], [1, 1], [0, 1]]),
  null
);

// 6. Inversion: H * Hinv = identity.
const id = invert3x3(H2);
assert.ok(id, 'H2 should invert');
const mul = (a, b) => {
  const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) r[i][j] += a[i][k] * b[k][j];
    }
  }
  return r;
};
const prod = mul(H2, id);
for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    assert.ok(Math.abs(prod[i][j] - (i === j ? 1 : 0)) < 1e-8, `H*Hinv[${i}][${j}]`);
  }
}

console.log('homography self-check passed');
