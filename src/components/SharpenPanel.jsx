/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
import React, { useState } from 'react';
import { FiCheck, FiRotateCcw, FiZap } from 'react-icons/fi';

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
 * "apply sharpen" commits a revertable history step via onApplySharpen.
 */
export default function SharpenPanel({ onApplySharpen }) {
  const [amount, setAmount] = useState(DEFAULT.amount);   // 0-200 → 0-2.0
  const [radius, setRadius] = useState(DEFAULT.radius);   // 0.5-5 px
  const [threshold, setThreshold] = useState(DEFAULT.threshold); // 0-100

  const handleApply = () =>
    onApplySharpen?.({ amount: amount / 100, radius, threshold });

  const handleReset = () => {
    setAmount(DEFAULT.amount);
    setRadius(DEFAULT.radius);
    setThreshold(DEFAULT.threshold);
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
        <Slider label="amount" value={amount} min={0} max={200} onChange={setAmount} />
        <Slider label="radius" value={radius} min={0.5} max={5} step={0.1} onChange={setRadius} />
        <Slider label="threshold" value={threshold} min={0} max={100} onChange={setThreshold} />
      </div>

      <button onClick={handleApply} className="btn btn-pink w-full mt-4 py-2.5 text-xs">
        <FiCheck className="w-3.5 h-3.5" /> apply sharpen
      </button>
      <p className="mt-2 text-[10px] text-[var(--text-dim)]">
        <FiZap className="w-3 h-3 inline mr-1 text-[var(--pink)]" />
        classic unsharp mask — radius 0.5–5px, threshold suppresses noise.
      </p>
    </div>
  );
}
