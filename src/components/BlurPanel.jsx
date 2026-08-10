import React, { useState } from 'react';
import { FiCheck, FiRotateCcw, FiAperture, FiMove } from 'react-icons/fi';

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

const DEFAULT_BOKEH = { radius: 12, intensity: 85, focusX: 50, focusY: 50 };
const DEFAULT_MOTION = { angle: 0, distance: 20 };

/**
 * Selective Blur / Bokeh controls.
 * Live preview on every slider drag via onPreviewBlur (parent debounces);
 * only the "apply blur" button commits a revertable history step.
 */
export default function BlurPanel({ onApplyBlur, onPreviewBlur }) {
  const [mode, setMode] = useState('bokeh');
  const [bokeh, setBokeh] = useState(DEFAULT_BOKEH);
  const [motion, setMotion] = useState(DEFAULT_MOTION);

  const buildOpts = (m, b = bokeh, mt = motion) => ({
    type: m,
    ...(m === 'bokeh'
      ? {
          radius: b.radius,
          intensity: b.intensity / 100,
          centerX: b.focusX / 100,
          centerY: b.focusY / 100,
        }
      : {
          angle: mt.angle,
          distance: mt.distance,
        }),
  });

  const updateBokeh = (patch) => {
    const next = { ...bokeh, ...patch };
    setBokeh(next);
    onPreviewBlur?.(buildOpts('bokeh', next, motion));
  };

  const updateMotion = (patch) => {
    const next = { ...motion, ...patch };
    setMotion(next);
    onPreviewBlur?.(buildOpts('motion', bokeh, next));
  };

  const handleReset = () => {
    if (mode === 'bokeh') {
      setBokeh(DEFAULT_BOKEH);
      onPreviewBlur?.(buildOpts('bokeh', DEFAULT_BOKEH, motion));
    } else {
      setMotion(DEFAULT_MOTION);
      onPreviewBlur?.(buildOpts('motion', bokeh, DEFAULT_MOTION));
    }
  };

  const handleApply = () => onApplyBlur?.(buildOpts(mode));

  return (
    <div className="border-t border-[var(--border)] pt-3 mt-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
          selective blur
        </span>
        <button
          onClick={handleReset}
          className="text-[11px] text-[var(--text-dim)] hover:text-white flex items-center gap-1"
        >
          <FiRotateCcw className="w-3 h-3" /> reset
        </button>
      </div>

      {/* mode toggle */}
      <div className="flex gap-1 mb-3">
        {[
          { key: 'bokeh', label: 'bokeh · dof', icon: FiAperture },
          { key: 'motion', label: 'motion', icon: FiMove },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
              mode === m.key
                ? 'bg-[var(--pink)] text-black'
                : 'text-[var(--text-dim)] hover:text-white hover:bg-[var(--surface-2)]'
            }`}
          >
            <m.icon className="w-3.5 h-3.5" /> {m.label}
          </button>
        ))}
      </div>

      {mode === 'bokeh' ? (
        <div className="flex flex-col gap-3">
          <Slider label="blur radius" value={bokeh.radius} min={1} max={20} onChange={(v) => updateBokeh({ radius: v })} />
          <Slider label="intensity" value={bokeh.intensity} min={0} max={100} onChange={(v) => updateBokeh({ intensity: v })} />
          <Slider label="focus x" value={bokeh.focusX} min={0} max={100} onChange={(v) => updateBokeh({ focusX: v })} />
          <Slider label="focus y" value={bokeh.focusY} min={0} max={100} onChange={(v) => updateBokeh({ focusY: v })} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Slider label="angle" value={motion.angle} min={0} max={360} onChange={(v) => updateMotion({ angle: v })} />
          <Slider label="distance" value={motion.distance} min={1} max={100} onChange={(v) => updateMotion({ distance: v })} />
        </div>
      )}

      <button onClick={handleApply} className="btn btn-pink w-full mt-4 py-2.5 text-xs">
        <FiCheck className="w-3.5 h-3.5" /> apply blur
      </button>
    </div>
  );
}
