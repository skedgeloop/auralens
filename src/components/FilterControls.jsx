import React, { useEffect, useState } from 'react';
import { createFilterPreviews } from '../lib/imageFilters';

const FilterControls = ({
  filters, categories, activeCategory = 'all', onCategoryChange,
  activeFilter, onFilterSelect, filterIntensity = 100, onIntensityChange,
  previewImage,
}) => {
  const [previews, setPreviews] = useState({});

  useEffect(() => {
    let cancelled = false;
    setPreviews({});
    if (!previewImage) return;
    createFilterPreviews(previewImage, 100).then((result) => {
      if (!cancelled) setPreviews(result);
    });
    return () => { cancelled = true; };
  }, [previewImage]);

  const entries = Object.entries(filters).filter(([key]) => key !== 'none');
  const filtered = activeCategory === 'all'
    ? entries
    : entries.filter(([, f]) => f.category === activeCategory);

  return (
    <div className="flex flex-col gap-3">
      {/* Categories */}
      {categories && categories.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => onCategoryChange?.(cat.key)}
              className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                activeCategory === cat.key
                  ? 'bg-[var(--pink)] text-black'
                  : 'text-[var(--text-dim)] hover:text-white hover:bg-[var(--surface-2)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Filter grid */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => onFilterSelect('none')}
          className={`flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-all ${
            activeFilter === 'none'
              ? 'bg-[rgba(255,45,111,0.08)] ring-1 ring-[var(--pink)]/40'
              : 'hover:bg-[var(--surface-2)]'
          }`}
        >
          <div className="w-full aspect-square rounded-md overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center">
            <span className="text-[10px] text-[var(--text-dim)] font-bold">none</span>
          </div>
        </button>

        {filtered.map(([key, filter]) => {
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => onFilterSelect(key)}
              className={`flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-all ${
                isActive
                  ? 'bg-[rgba(255,45,111,0.08)] ring-1 ring-[var(--pink)]/40'
                  : 'hover:bg-[var(--surface-2)]'
              }`}
            >
              <div className="relative w-full aspect-square rounded-md overflow-hidden border border-[var(--border)] bg-[var(--surface-2)]">
                {previews[key] ? (
                  <img src={previews[key]} alt={filter.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[var(--surface-2)]" />
                )}
              </div>
              <span className={`text-[10px] font-bold leading-tight text-center ${
                isActive ? 'text-[var(--pink)]' : 'text-[var(--text-dim)]'
              }`}>
                {filter.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Intensity */}
      {activeFilter && activeFilter !== 'none' && onIntensityChange && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[var(--text-dim)] font-bold uppercase tracking-wider">intensity</span>
            <span className="text-[11px] text-[var(--text-dim)] tabular-nums font-mono">{filterIntensity}%</span>
          </div>
          <input
            type="range" min={0} max={100} value={filterIntensity}
            onChange={(e) => onIntensityChange(Number(e.target.value))}
            className="slider"
            style={{
              background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${filterIntensity}%, #222 ${filterIntensity}%)`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default FilterControls;
