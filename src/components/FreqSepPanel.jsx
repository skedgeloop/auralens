import React, { useState, useCallback } from 'react';
import { FiCheck } from 'react-icons/fi';

const Slider = ({ label, value, min, max, onChange }) => {
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
        type="range" min={min} max={max} value={value}
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

const VIEWS = [
  { key: 'low', label: 'color' },
  { key: 'high', label: 'detail' },
  { key: 'combined', label: 'combined' },
];

/**
 * Frequency separation controls.
 * Live preview on every slider/view change via onPreview (parent debounces);
 * the "apply separation" button commits `combined` as a revertable history step.
 */
export default function FreqSepPanel({ onApply, onPreview }) {
  const [blurRadius, setBlurRadius] = useState(5);
  const [textureAmount, setTextureAmount] = useState(100);
  const [view, setView] = useState('combined');

  const preview = useCallback((r, t, v) => {
    onPreview?.({ blurRadius: r, textureAmount: t, view: v });
  }, [onPreview]);

  const handleSlider = (patch) => {
    const next = { blurRadius, textureAmount, ...patch };
    setBlurRadius(next.blurRadius);
    setTextureAmount(next.textureAmount);
    preview(next.blurRadius, next.textureAmount, view);
  };

  const handleView = (v) => {
    setView(v);
    preview(blurRadius, textureAmount, v);
  };

  const handleApply = () => onApply?.({ blurRadius, textureAmount });

  return (
    <div className="border-t border-[var(--border)] pt-3 mt-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
        frequency separation
      </span>

      <div className="flex flex-col gap-3 mt-3">
        <Slider label="blur radius" value={blurRadius} min={1} max={20} onChange={(v) => handleSlider({ blurRadius: v })} />
        <Slider label="texture amount" value={textureAmount} min={0} max={100} onChange={(v) => handleSlider({ textureAmount: v })} />
      </div>

      {/* layer preview toggle */}
      <div className="flex gap-1 mt-3">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => handleView(v.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
              view === v.key
                ? 'bg-[var(--pink)] text-black'
                : 'text-[var(--text-dim)] hover:text-white hover:bg-[var(--surface-2)]'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <button onClick={handleApply} className="btn btn-pink w-full mt-4 py-2.5 text-xs">
        <FiCheck className="w-3.5 h-3.5" /> apply separation
      </button>
    </div>
  );
}
