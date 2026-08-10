import React, { useState, useEffect, useCallback } from 'react';
import { FiCheck, FiMove } from 'react-icons/fi';
import { getImageDimensions } from '../lib/imageFilters';

const GRID_N = 8;

/** Uniform N×N grid of normalized node positions. */
const makeGrid = (n = GRID_N) => {
  const grid = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) grid.push([i / (n - 1), j / (n - 1)]);
  }
  return grid;
};

/** Per-node normalized displacement fields: bulge / pinch / wave. */
const makeWarp = (kind, strength) => {
  const n = GRID_N;
  const amp = strength / 100;
  const warp = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const gx = i / (n - 1);
      const gy = j / (n - 1);
      let dx = 0;
      let dy = 0;
      if (kind === 'bulge' || kind === 'pinch') {
        const rx = gx - 0.5;
        const ry = gy - 0.5;
        const r = Math.sqrt(rx * rx + ry * ry);
        const t = Math.max(0, 1 - r * 2); // falloff away from center
        const dir = kind === 'bulge' ? 1 : -1;
        const m = t * amp * 2.4;
        dx = rx * m;
        dy = ry * m;
      } else if (kind === 'wave') {
        dx = Math.sin(gy * Math.PI * 4) * amp * 0.25;
        dy = Math.sin(gx * Math.PI * 4) * amp * 0.25;
      }
      warp.push([dx, dy]);
    }
  }
  return warp;
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Build a destination quad in image pixels from a combination of
 * horizontal keystone (tiltX), vertical keystone (tiltY) and skew (shear).
 */
const buildQuad = (w, h, { tiltX = 0, tiltY = 0, skew = 0 } = {}) => {
  const sX = clamp(Math.abs(Math.tan((tiltX * Math.PI) / 180)) * h * 0.5, 0, w / 2);
  const sY = clamp(Math.abs(Math.tan((tiltY * Math.PI) / 180)) * w * 0.5, 0, h / 2);
  const shear = Math.tan((skew * Math.PI) / 180) * w;
  const leftInset = tiltX > 0 ? sX : 0;
  const rightInset = tiltX < 0 ? sX : 0;
  const topInset = tiltY > 0 ? sY : 0;
  const bottomInset = tiltY < 0 ? sY : 0;
  return {
    topLeft: [leftInset, topInset - shear],
    topRight: [w - rightInset, topInset + shear],
    bottomRight: [w - rightInset, h - bottomInset + shear],
    bottomLeft: [leftInset, h - bottomInset - shear],
  };
};

const PERSPECTIVE_PRESETS = [
  { label: 'Tilt Left', args: { tiltX: 30 } },
  { label: 'Tilt Right', args: { tiltX: -30 } },
  { label: 'Tilt Up', args: { tiltY: 30 } },
  { label: 'Tilt Down', args: { tiltY: -30 } },
];

const MESH_PRESETS = ['bulge', 'pinch', 'wave'];

export default function WarpPanel({ previewImage, onApplyWarp }) {
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [keystone, setKeystone] = useState(0);
  const [skew, setSkew] = useState(0);
  const [meshKind, setMeshKind] = useState('bulge');
  const [meshStrength, setMeshStrength] = useState(60);

  useEffect(() => {
    let cancelled = false;
    if (!previewImage) return undefined;
    getImageDimensions(previewImage).then((d) => {
      if (!cancelled) setDims(d);
    });
    return () => { cancelled = true; };
  }, [previewImage]);

  const canWarp = dims.width > 0 && dims.height > 0;

  const applyPerspectivePreset = useCallback((args) => {
    if (!canWarp) return;
    onApplyWarp({ type: 'perspective', ...buildQuad(dims.width, dims.height, args) });
  }, [canWarp, dims, onApplyWarp]);

  const handleApplyPerspective = useCallback(() => {
    if (!canWarp) return;
    onApplyWarp({ type: 'perspective', ...buildQuad(dims.width, dims.height, { tiltX: keystone, skew }) });
  }, [canWarp, dims, keystone, skew, onApplyWarp]);

  const handleApplyMesh = useCallback(() => {
    if (!canWarp) return;
    onApplyWarp({ type: 'mesh', grid: makeGrid(), warp: makeWarp(meshKind, meshStrength) });
  }, [canWarp, meshKind, meshStrength, onApplyWarp]);

  const buttonClass = (active) =>
    `px-2 py-1.5 rounded-md text-[10px] font-semibold transition-colors border ${
      active
        ? 'bg-[var(--pink)] text-black border-transparent'
        : 'bg-[var(--surface)] text-[var(--text-dim)] border-[var(--border)] hover:text-white'
    }`;

  return (
    <div className="border-t border-[var(--border)] pt-3 mt-4">
      <div className="flex items-center gap-1.5 mb-2">
        <FiMove className="w-3 h-3 text-[var(--pink)]" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
          perspective · warp
        </span>
      </div>

      {/* --- Perspective --- */}
      <div className="grid grid-cols-4 gap-1.5">
        {PERSPECTIVE_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPerspectivePreset(p.args)}
            disabled={!canWarp}
            className={buttonClass(false)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-[var(--text-dim)]">keystone</span>
          <span className="text-[11px] text-[var(--text-dim)] tabular-nums font-mono">{keystone}</span>
        </div>
        <input
          type="range" min={-45} max={45} value={keystone}
          aria-label="Keystone angle"
          onChange={(e) => setKeystone(Number(e.target.value))}
          className="slider"
          style={{
            background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${((keystone + 45) / 90) * 100}%, #222 ${((keystone + 45) / 90) * 100}%)`,
          }}
        />
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-[var(--text-dim)]">skew</span>
          <span className="text-[11px] text-[var(--text-dim)] tabular-nums font-mono">{skew}</span>
        </div>
        <input
          type="range" min={-45} max={45} value={skew}
          aria-label="Skew angle"
          onChange={(e) => setSkew(Number(e.target.value))}
          className="slider"
          style={{
            background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${((skew + 45) / 90) * 100}%, #222 ${((skew + 45) / 90) * 100}%)`,
          }}
        />
      </div>

      <button
        onClick={handleApplyPerspective}
        disabled={!canWarp}
        className="btn btn-pink w-full mt-3 py-2 text-xs"
      >
        <FiCheck className="w-3.5 h-3.5" /> apply perspective
      </button>

      {/* --- Mesh warp --- */}
      <div className="mt-4 pt-3 border-t border-[var(--border)]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
          mesh warp
        </span>
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          {MESH_PRESETS.map((kind) => (
            <button
              key={kind}
              onClick={() => setMeshKind(kind)}
              disabled={!canWarp}
              className={buttonClass(meshKind === kind)}
            >
              {kind}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[var(--text-dim)]">strength</span>
            <span className="text-[11px] text-[var(--text-dim)] tabular-nums font-mono">{meshStrength}</span>
          </div>
          <input
            type="range" min={0} max={100} value={meshStrength}
            aria-label="Warp strength"
            onChange={(e) => setMeshStrength(Number(e.target.value))}
            className="slider"
            style={{
              background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${meshStrength}%, #222 ${meshStrength}%)`,
            }}
          />
        </div>
        <button
          onClick={handleApplyMesh}
          disabled={!canWarp}
          className="btn btn-pink w-full mt-3 py-2 text-xs"
        >
          <FiCheck className="w-3.5 h-3.5" /> apply mesh warp
        </button>
      </div>
    </div>
  );
}
