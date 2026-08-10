/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
import React, { useState, useCallback } from 'react';
import { FiCheck, FiRotateCcw, FiLayers } from 'react-icons/fi';

const Slider = ({ label, value, min, max, onChange, display }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[var(--text-dim)] group-hover:text-white transition-colors font-medium">
          {label}
        </span>
        <span className="text-[11px] text-[var(--text-dim)] tabular-nums w-10 text-right font-mono">
          {display ?? value}
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

const DEFAULT_VIGNETTE = { strength: 40, radius: 0.5, feather: 0.7 };
const DEFAULT_GRAIN = { amount: 20, size: 1 };

/**
 * Vignette & Film Grain finishing tools.
 * Live preview on every slider drag via onPreview (parent debounces ~60ms);
 * only the "apply finish" button commits one revertable history step via
 * onApplyFinish — both effects are applied together as a single edit.
 */
export default function FinishPanel({ onPreview, onApplyFinish }) {
  const [vignette, setVignette] = useState(DEFAULT_VIGNETTE);
  const [grain, setGrain] = useState(DEFAULT_GRAIN);

  const buildOpts = useCallback(
    (v = vignette, g = grain) => ({ vignette: { ...v }, grain: { ...g } }),
    [vignette, grain]
  );

  const updateVignette = (patch) => {
    const next = { ...vignette, ...patch };
    setVignette(next);
    onPreview?.(buildOpts(next, grain));
  };

  const updateGrain = (patch) => {
    const next = { ...grain, ...patch };
    setGrain(next);
    onPreview?.(buildOpts(vignette, next));
  };

  const handleReset = () => {
    setVignette(DEFAULT_VIGNETTE);
    setGrain(DEFAULT_GRAIN);
    onPreview?.(buildOpts(DEFAULT_VIGNETTE, DEFAULT_GRAIN));
  };

  const handleApply = () => onApplyFinish?.(buildOpts());

  return (
    <div className="border-t border-[var(--border)] pt-3 mt-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <FiLayers className="w-3 h-3 text-[var(--pink)]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            finish · vignette & grain
          </span>
        </div>
        <button
          onClick={handleReset}
          className="text-[11px] text-[var(--text-dim)] hover:text-white flex items-center gap-1"
        >
          <FiRotateCcw className="w-3 h-3" /> reset
        </button>
      </div>

      {/* Vignette */}
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">vignette</span>
      <div className="flex flex-col gap-3 mt-2">
        <Slider
          label="strength" value={vignette.strength} min={0} max={100}
          onChange={(v) => updateVignette({ strength: v })}
        />
        <Slider
          label="radius" value={Math.round(vignette.radius * 100)} min={20} max={100}
          display={vignette.radius.toFixed(2)}
          onChange={(v) => updateVignette({ radius: v / 100 })}
        />
        <Slider
          label="feather" value={Math.round(vignette.feather * 100)} min={0} max={100}
          display={vignette.feather.toFixed(2)}
          onChange={(v) => updateVignette({ feather: v / 100 })}
        />
      </div>

      {/* Film grain */}
      <div className="mt-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">film grain</span>
        <div className="flex flex-col gap-3 mt-2">
          <Slider
            label="amount" value={grain.amount} min={0} max={100}
            onChange={(v) => updateGrain({ amount: v })}
          />
          <Slider
            label="size" value={grain.size} min={1} max={3}
            onChange={(v) => updateGrain({ size: v })}
          />
        </div>
      </div>

      <button onClick={handleApply} className="btn btn-pink w-full mt-4 py-2.5 text-xs">
        <FiCheck className="w-3.5 h-3.5" /> apply finish
      </button>
    </div>
  );
}
