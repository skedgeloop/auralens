/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
import React, { useState } from 'react';
import { FiRotateCcw, FiZap } from 'react-icons/fi';

const Slider = ({ label, value, min, max, step = 1, onChange }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[var(--text-dim)] group-hover:text-white transition-colors font-medium">
          {label}
        </span>
        <span className="text-[11px] text-[var(--text-dim)] tabular-nums w-10 text-right font-mono">
          {value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
        style={{
          background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${pct}%, #222 ${pct}%)`,
        }}
      />
    </div>
  );
};

const DEFAULT = { amount: 50, radius: 1, threshold: 0 };

/**
 * Advanced Sharpen / Clarity controls (unsharp mask).
 * Every slider move live-previews instantly via onPreviewSharpen (debounced
 * in the parent); onApplySharpen still commits a revertable history step.
 */
export default function SharpenPanel({ onApplySharpen, onPreviewSharpen }) {
  const [amount, setAmount] = useState(DEFAULT.amount);   // 0-200 → 0-2.0
  const [radius, setRadius] = useState(DEFAULT.radius);   // 0.5-5 px
  const [threshold, setThreshold] = useState(DEFAULT.threshold); // 0-100

  // Live preview on every slider move (debounced in the parent, no history).
  const update = (key, value) => {
    const next = { amount, radius, threshold, [key]: value };
    if (key === 'amount') setAmount(value);
    else if (key === 'radius') setRadius(value);
    else setThreshold(value);
    onPreviewSharpen?.({ amount: next.amount / 100, radius: next.radius, threshold: next.threshold });
  };

  const handleReset = () => {
    setAmount(DEFAULT.amount);
    setRadius(DEFAULT.radius);
    setThreshold(DEFAULT.threshold);
    onPreviewSharpen?.({ amount: DEFAULT.amount / 100, radius: DEFAULT.radius, threshold: DEFAULT.threshold });
  };

  return (
    <div className="border-t border-[var(--border)] pt-3 mt-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
          sharpen / clarity
        </span>
        <button
          onClick={handleReset}
          className="text-[11px] text-[var(--text-dim)] hover:text-white flex items-center gap-1"
        >
          <FiRotateCcw className="w-3 h-3" /> reset
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <Slider label="amount" value={amount} min={0} max={200} onChange={(v) => update('amount', v)} />
        <Slider label="radius" value={radius} min={0.5} max={5} step={0.1} onChange={(v) => update('radius', v)} />
        <Slider label="threshold" value={threshold} min={0} max={100} onChange={(v) => update('threshold', v)} />
      </div>

      <p className="mt-3 text-[10px] text-[var(--text-dim)]">
        <FiZap className="w-3 h-3 inline mr-1 text-[var(--pink)]" />
        classic unsharp mask — radius 0.5–5px, threshold suppresses noise.
      </p>
    </div>
  );
}
