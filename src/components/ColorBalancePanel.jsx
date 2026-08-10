import React, { useState, useCallback } from 'react';
import { FiCheck } from 'react-icons/fi';

const HSL_SLIDERS = [
  { key: 'hue', label: 'Hue', min: -180, max: 180, default: 0 },
  { key: 'saturation', label: 'Saturation', min: 0, max: 200, default: 100 },
  { key: 'lightness', label: 'Lightness', min: 0, max: 200, default: 100 },
];

const BALANCE_BANDS = [
  { key: 'shadows', label: 'Shadows' },
  { key: 'midtones', label: 'Midtones' },
  { key: 'highlights', label: 'Highlights' },
];

const BALANCE_CHANNELS = [
  { key: 'c', label: 'Cyan / Red' },
  { key: 'm', label: 'Magenta / Green' },
  { key: 'y', label: 'Yellow / Blue' },
];

const SliderRow = ({ label, value, min, max, onChange }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="group mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[var(--text-dim)] group-hover:text-white font-medium">{label}</span>
        <span className="text-[11px] text-[var(--text-dim)] tabular-nums w-8 text-right font-mono">{value}</span>
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

export default function ColorBalancePanel({ onApplyColorBalance, onPreviewColorBalance }) {
  const [hsl, setHsl] = useState({ hue: 0, saturation: 100, lightness: 100 });
  const [balance, setBalance] = useState({
    shadows: { c: 0, m: 0, y: 0 },
    midtones: { c: 0, m: 0, y: 0 },
    highlights: { c: 0, m: 0, y: 0 },
  });

  // Live preview on every slider change (parent debounces); "apply" commits a history step.
  const preview = useCallback((nextHsl, nextBalance) => {
    onPreviewColorBalance?.({ hsl: nextHsl, balance: nextBalance });
  }, [onPreviewColorBalance]);

  const handleApply = useCallback(() => {
    onApplyColorBalance?.({ hsl, balance });
  }, [onApplyColorBalance, hsl, balance]);

  return (
    <div className="border-t border-[var(--border)] pt-3 mt-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
        color balance & hsl
      </span>

      {HSL_SLIDERS.map((s) => (
        <SliderRow
          key={s.key}
          label={s.label}
          min={s.min} max={s.max}
          value={hsl[s.key]}
          onChange={(v) => {
            const next = { ...hsl, [s.key]: v };
            setHsl(next);
            preview(next, balance);
          }}
        />
      ))}

      {BALANCE_BANDS.map((band) => (
        <div key={band.key} className="mt-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">{band.label}</span>
          {BALANCE_CHANNELS.map((ch) => (
            <SliderRow
              key={ch.key}
              label={ch.label}
              min={-100} max={100}
              value={balance[band.key][ch.key]}
              onChange={(v) => {
                const next = { ...balance, [band.key]: { ...balance[band.key], [ch.key]: v } };
                setBalance(next);
                preview(hsl, next);
              }}
            />
          ))}
        </div>
      ))}

      <button onClick={handleApply} className="btn btn-pink w-full mt-4 py-2.5 text-xs">
        <FiCheck className="w-3.5 h-3.5" /> apply color balance
      </button>
    </div>
  );
}
