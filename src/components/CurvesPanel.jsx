import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FiCheck, FiRotateCcw } from 'react-icons/fi';
import { buildCurveLut } from '../lib/colorTools';

const CHANNELS = [
  { key: 'master', label: 'Master', color: '#ffffff' },
  { key: 'r', label: 'R', color: '#ff4d6d' },
  { key: 'g', label: 'G', color: '#4dff88' },
  { key: 'b', label: 'B', color: '#4d8dff' },
];

const LEVELS = [
  { key: 'blackPoint', label: 'black point', min: 0, max: 255, default: 0, step: 1 },
  { key: 'whitePoint', label: 'white point', min: 0, max: 255, default: 255, step: 1 },
  { key: 'gamma', label: 'gamma', min: 0.2, max: 4, default: 1, step: 0.05 },
];

const SIZE = 200;
const identityPoints = () => [[0, 0], [255, 255]];

export default function CurvesPanel({ onApply }) {
  const [curves, setCurves] = useState({
    master: identityPoints(), r: identityPoints(), g: identityPoints(), b: identityPoints(),
  });
  const [channel, setChannel] = useState('master');
  const [levels, setLevels] = useState({
    blackPoint: 0, whitePoint: 255, gamma: 1,
  });
  const canvasRef = useRef(null);
  const dragIdxRef = useRef(-1);

  const currentPoints = curves[channel];
  const ch = CHANNELS.find((c) => c.key === channel);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const p = (i / 4) * SIZE;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(SIZE, p); ctx.stroke();
    }

    // Identity diagonal
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, SIZE); ctx.lineTo(SIZE, 0); ctx.stroke();
    ctx.setLineDash([]);

    // Curve (from the same LUT builder used at apply time)
    const lut = buildCurveLut(currentPoints);
    ctx.strokeStyle = ch.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= 255; x++) {
      const px = (x / 255) * SIZE;
      const py = SIZE - (lut[x] / 255) * SIZE;
      if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Control points
    currentPoints.forEach(([x, y]) => {
      const px = (x / 255) * SIZE;
      const py = SIZE - (y / 255) * SIZE;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = ch.color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [currentPoints, ch.color]);

  useEffect(() => { redraw(); }, [redraw]);

  const canvasToPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return [Math.round(x * 255), Math.round((1 - y) * 255)];
  };

  const nearestIndex = (x, y, pts) => {
    let idx = -1, best = 12; // ~12px hit radius
    pts.forEach(([px, py], i) => {
      const dist = Math.hypot(px - x, py - y) * (SIZE / 255);
      if (dist < best) { best = dist; idx = i; }
    });
    return idx;
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const [x, y] = canvasToPoint(e);
    let pts = currentPoints;
    let idx = nearestIndex(x, y, pts);
    if (idx < 0) {
      pts = [...pts, [x, y]];
      idx = pts.length - 1;
    }
    dragIdxRef.current = idx;
    setCurves((prev) => ({ ...prev, [channel]: pts }));
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (dragIdxRef.current < 0) return;
    const [x, y] = canvasToPoint(e);
    setCurves((prev) => {
      const pts = prev[channel].map((p, i) => (i === dragIdxRef.current ? [x, y] : p));
      return { ...prev, [channel]: pts };
    });
  };

  const handlePointerUp = () => { dragIdxRef.current = -1; };

  const handleDoubleClick = (e) => {
    const [x, y] = canvasToPoint(e);
    setCurves((prev) => {
      const pts = prev[channel];
      const idx = nearestIndex(x, y, pts);
      if (idx < 0 || pts.length <= 2) return prev;
      return { ...prev, [channel]: pts.filter((_, i) => i !== idx) };
    });
  };

  const resetChannel = () => setCurves((prev) => ({ ...prev, [channel]: identityPoints() }));

  const handleApply = () => {
    onApply?.({
      curves: { master: curves.master, r: curves.r, g: curves.g, b: curves.b },
      levels,
    });
  };

  const pct = (v, min, max) => ((v - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
        curves & levels
      </span>

      {/* Channel selector */}
      <div className="flex gap-1">
        {CHANNELS.map((c) => (
          <button
            key={c.key}
            onClick={() => setChannel(c.key)}
            className={`flex-1 px-1 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
              channel === c.key
                ? 'bg-[var(--pink)] text-black'
                : 'text-[var(--text-dim)] hover:text-white hover:bg-[var(--surface-2)]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Curve canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          aria-label={`${ch.label} curve editor`}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] touch-none select-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
        />
        <button
          onClick={resetChannel}
          className="absolute top-1.5 right-1.5 text-[10px] text-[var(--text-dim)] hover:text-white flex items-center gap-1 bg-black/40 rounded px-1.5 py-1"
        >
          <FiRotateCcw className="w-3 h-3" /> reset
        </button>
      </div>
      <p className="text-[10px] text-[var(--text-dim)] leading-snug">
        click to add a point · drag to move · double-click to remove
      </p>

      {/* Levels */}
      <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">levels</span>
        {LEVELS.map((l) => (
          <div key={l.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--text-dim)]">{l.label}</span>
              <span className="text-[11px] text-[var(--text-dim)] tabular-nums font-mono">
                {levels[l.key]}
              </span>
            </div>
            <input
              type="range" min={l.min} max={l.max} step={l.step} value={levels[l.key]}
              aria-label={l.label}
              onChange={(e) => setLevels((prev) => ({ ...prev, [l.key]: Number(e.target.value) }))}
              className="slider"
              style={{
                background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${pct(levels[l.key], l.min, l.max)}%, #222 ${pct(levels[l.key], l.min, l.max)}%)`,
              }}
            />
          </div>
        ))}

        <button onClick={handleApply} className="btn btn-pink w-full py-2.5 text-xs">
          <FiCheck className="w-3.5 h-3.5" /> apply curves
        </button>
      </div>
    </div>
  );
}
